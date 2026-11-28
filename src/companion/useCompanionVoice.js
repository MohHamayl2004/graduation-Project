import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../services/api.js";
import { extractWakeCommand } from "./voiceActions.js";

const emit = (name) => window.dispatchEvent(new Event(name));
export function useCompanionVoice({
  token,
  enabled,
  recognition = "auto",
  onText,
  interrupt,
  wakeEnabled = false,
  speechActive = false,
}) {
  const [status, setStatus] = useState("idle"),
    [error, setError] = useState("");
  const [wakeState, setWakeState] = useState("off");
  const [transcript, setTranscript] = useState("");
  useEffect(() => {
    if (!transcript) return;
    const timer = setTimeout(() => setTranscript(""), 6000);
    return () => clearTimeout(timer);
  }, [transcript]);
  const [pageVisible, setPageVisible] = useState(
    () => document.visibilityState === "visible",
  );
  const runtime = useRef({ generation: 0, held: false }),
    latest = useRef(null);
  latest.current = { token, enabled, recognition, onText, interrupt };
  const cleanup = useCallback(() => {
    const r = runtime.current;
    clearTimeout(r.timer);
    r.stream?.getTracks().forEach((track) => track.stop());
    r.stream = null;
  }, []);
  const stop = useCallback(() => {
    const r = runtime.current;
    if (!r.held && !r.browser && r.recorder?.state !== "recording") return;
    r.held = false;
    if (r.recorder?.state === "recording") {
      r.recorder.stop();
      cleanup();
    } else if (r.browser) {
      r.browser.stop();
      cleanup();
    } else {
      r.generation++;
      cleanup();
      setStatus("idle");
      emit("nipras:microphone-stop");
    }
  }, [cleanup]);
  const cancel = useCallback(() => {
    const r = runtime.current;
    r.generation++;
    r.held = false;
    r.upload?.abort();
    r.browser?.abort();
    r.wake?.abort();
    if (r.recorder?.state === "recording") r.recorder.stop();
    cleanup();
    setStatus("idle");
    emit("nipras:microphone-stop");
  }, [cleanup]);
  const start = useCallback(async () => {
    const r = runtime.current,
      options = latest.current;
    if (!options.enabled || !options.token || r.held || r.uploading) return;
    r.held = true;
    const generation = ++r.generation;
    setError("");
    setStatus("requesting");
    setTranscript("");
    options.interrupt();
    emit("nipras:microphone-start");
    try {
      const BrowserRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (options.recognition === "browser" || !window.MediaRecorder) {
        if (!BrowserRecognition)
          throw Error(
            "التعرف الصوتي في المتصفح غير متاح. استخدم الكتابة أو جرّب متصفحاً آخر.",
          );
        const browser = new BrowserRecognition();
        r.browser = browser;
        browser.lang = "ar";
        browser.interimResults = false;
        browser.continuous = false;
        browser.onresult = (event) => {
          if (generation === r.generation) {
            const text = event.results[0]?.[0]?.transcript;
            if (text) { setTranscript(text); latest.current.onText(text); }
          }
        };
        browser.onerror = () => {
          if (generation === r.generation)
            setError("تعذر التعرف الصوتي في المتصفح. يمكنك كتابة سؤالك.");
        };
        browser.onend = () => {
          if (generation === r.generation) {
            r.held = false;
            r.browser = null;
            setStatus("idle");
            emit("nipras:microphone-stop");
          }
        };
        browser.start();
        setStatus("listening");
        r.timer = setTimeout(stop, 45000);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error("الميكروفون يتطلب اتصال HTTPS أو localhost.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== r.generation || !r.held) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      r.stream = stream;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined,
        ),
        chunks = [];
      let bytes = 0;
      r.recorder = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          bytes += event.data.size;
          if (bytes > 6 * 1024 * 1024) cancel();
        }
      };
      recorder.onerror = () => {
        if (generation === r.generation) {
          setError("تعذر تسجيل الصوت. حاول مرة أخرى.");
          cancel();
        }
      };
      recorder.onstop = async () => {
        cleanup();
        r.recorder = null;
        r.held = false;
        emit("nipras:microphone-stop");
        if (generation !== r.generation) return;
        if (!bytes) {
          setStatus("idle");
          return;
        }
        r.uploading = true;
        r.upload = new AbortController();
        setStatus("transcribing");
        try {
          const form = new FormData();
          form.set(
            "audio",
            new Blob(chunks, { type: recorder.mimeType || "audio/webm" }),
            "question.webm",
          );
          const response = await fetch(
            `${API_BASE_URL}/tutor/speech/transcribe`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${options.token}` },
              body: form,
              signal: r.upload.signal,
            },
          );
          const data = await response.json();
          if (!response.ok)
            throw Error(
              "تعذر تحويل الصوت. تحقق من خدمة الصوت أو اختر التعرف في المتصفح من الإعدادات.",
            );
          if (generation === r.generation && typeof data.text === "string") {
            // STT is finished: allow a new push-to-talk to interrupt a long
            // tutor answer instead of locking the microphone until generation ends.
            r.uploading = false;
            r.upload = null;
            setStatus("idle");
              setTranscript(data.text);
              await latest.current.onText(data.text);
          }
        } catch (e) {
          if (generation === r.generation && e.name !== "AbortError")
            setError(e.message || "تعذر تحويل الصوت إلى نص.");
        } finally {
          if (generation === r.generation) {
            setStatus("idle");
            r.uploading = false;
          }
        }
      };
      recorder.start();
      setStatus("listening");
      r.timer = setTimeout(stop, 45000);
    } catch (e) {
      if (generation === r.generation) {
        cleanup();
        r.held = false;
        setStatus("idle");
        setError(
          e.name === "NotAllowedError"
            ? "اسمح باستخدام الميكروفون من إعدادات المتصفح."
            : e.name === "NotFoundError"
              ? "لم يتم العثور على ميكروفون."
              : e.message,
        );
        emit("nipras:microphone-stop");
      }
    }
  }, [cancel, cleanup, stop]);
  useEffect(() => {
    if (!enabled || !token) cancel();
  }, [enabled, token, cancel]);
  useEffect(() => {
    const change = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    if (!wakeEnabled || !enabled || !token) {
      setWakeState("off");
      return;
    }
    if (status !== "idle" || speechActive || !pageVisible) {
      setWakeState("paused");
      return;
    }
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setWakeState("unsupported");
      return;
    }
    let active = true,
      restart,
      armedTimer,
      armedUntil = 0,
      blocked = false;
    const listen = () => {
      if (!active || runtime.current.held || runtime.current.uploading) return;
      const browser = new Recognition();
      runtime.current.wake = browser;
      browser.lang = navigator.language?.startsWith("en") ? "en-US" : "ar-PS";
      browser.continuous = true;
      browser.interimResults = false;
      browser.onresult = (event) => {
        if (!active) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (!event.results[i].isFinal) continue;
          const result = extractWakeCommand(
            event.results[i][0].transcript,
            armedUntil,
          );
          armedUntil = result.armedUntil;
          if (result.heardWake && !result.command) {
            setWakeState("armed");
            clearTimeout(armedTimer);
            armedTimer = setTimeout(() => {
              armedUntil = 0;
              if (active) setWakeState("listening");
            }, 15000);
          }
          if (result.command) {
            const generation = ++runtime.current.generation;
            blocked = true;
            browser.abort();
            setStatus("transcribing");
            setWakeState("paused");
            latest.current.interrupt();
            Promise.resolve(latest.current.onText(result.command))
              .catch(() => {
                if (generation === runtime.current.generation)
                  setError("تعذر تنفيذ الطلب الصوتي. حاول مجدداً.");
              })
              .finally(() => {
                if (generation === runtime.current.generation)
                  setStatus("idle");
              });
            break;
          }
        }
      };
      browser.onerror = (event) => {
        if (!active) return;
        if (
          [
            "not-allowed",
            "service-not-allowed",
            "audio-capture",
            "network",
          ].includes(event.error)
        ) {
          blocked = true;
          setWakeState("blocked");
          setError(
            "تعذر الاستماع دون لمس في هذا المتصفح. يمكنك استخدام Right Alt أو زر الميكروفون.",
          );
        }
      };
      browser.onend = () => {
        if (active && !blocked) restart = setTimeout(listen, 1200);
      };
      try {
        browser.start();
        setWakeState("listening");
      } catch {
        blocked = true;
        setWakeState("blocked");
      }
    };
    listen();
    return () => {
      active = false;
      clearTimeout(restart);
      clearTimeout(armedTimer);
      const browser = runtime.current.wake;
      if (browser) {
        browser.onend = null;
        browser.onerror = null;
        browser.onresult = null;
        browser.abort();
        runtime.current.wake = null;
      }
    };
  }, [wakeEnabled, enabled, token, status, speechActive, pageVisible]);
  useEffect(() => {
    const blur = () => stop();
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("blur", blur);
      cancel();
    };
  }, [stop, cancel]);
  return { status, error, start, stop, cancel, wakeState, transcript };
}
