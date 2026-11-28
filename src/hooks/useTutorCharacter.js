import { useCallback, useEffect, useRef, useState } from "react";
import { TutorIntegration } from "../character-engine/TutorIntegration.js";
import { FishSpeechClient } from "../character-engine/FishSpeechClient.js";
import { API_BASE_URL } from "../services/api.js";

import { SpeechAuthorization, isSpeechRequest } from "../companion/teacherPolicy.js";

export function useTutorCharacter(state, token, options = {}) {
  const viewport = useRef(null),
    bridge = useRef(null),
    latest = useRef(null),
    authorization = useRef(new SpeechAuthorization(state.messages)),
    identity = useRef({ token, chatId: state.chatId }),
    welcomed = useRef(false);
  const [playback, setPlayback] = useState("idle"),
    [speechError, setSpeechError] = useState("");
  latest.current = state;
  const speechEnabled =
    options.voice ?? import.meta.env?.VITE_NIPRAS_TUTOR_SPEECH === "true";
  const autoGestures = options.gestures !== false;
  const reportError = useCallback((error) => {
    setSpeechError(
      "تعذر تشغيل الصوت. حاول مرة أخرى؛ يمكنك متابعة المحادثة النصية.",
    );
    window.dispatchEvent(
      new CustomEvent("nipras:speech-error", {
        detail: {
          code: error.code || "TTS_UNAVAILABLE",
          message: error.message,
        },
      }),
    );
  }, []);
  useEffect(() => {
    const client = new FishSpeechClient({
      endpoint: `${API_BASE_URL}/tutor/speech`,
    });
    const integration = new TutorIntegration({
      getControllers: () => viewport.current?.getControllers(),
      synthesize: (text, options) => client.synthesizeSpeech(text, options),
      onStatus: setPlayback,
    });
    bridge.current = integration;
    const point = (event) => {
      const { element, targetId, side } = event.detail || {};
      viewport.current?.pointAtElement(
        element || (targetId && document.getElementById(targetId)),
        side || "right",
      );
    };
    const interrupt = () => { authorization.current.revoke(latest.current.messages); integration.interrupt(); };
    const listen = () => { authorization.current.revoke(latest.current.messages); integration.setListening(true); };
    const stopListening = () => integration.setListening(false);
    const encourage = () => {
      const controllers = viewport.current?.getControllers();
      controllers?.face.setExpression("happy", 0.55);
      controllers?.animation.playGesture("encourage", {
        side: controllers.animation.getTeachingSnapshot?.().freeSide || "right",
        duration: 2,
      });
    };
    window.addEventListener("nipras:teacher-point", point);
    window.addEventListener("nipras:speech-stop", interrupt);
    window.addEventListener("nipras:teacher-encourage", encourage);
    const listeningEvents = [
      "nipras:microphone-start",
      "nipras:student-speaking",
      "nipras:student-interrupt",
    ];
    listeningEvents.forEach((name) => window.addEventListener(name, listen));
    window.addEventListener("nipras:microphone-stop", stopListening);
    return () => {
      listeningEvents.forEach((name) =>
        window.removeEventListener(name, listen),
      );
      window.removeEventListener("nipras:microphone-stop", stopListening);
      window.removeEventListener("nipras:teacher-point", point);
      window.removeEventListener("nipras:speech-stop", interrupt);
      window.removeEventListener("nipras:teacher-encourage", encourage);
      integration.dispose();
      if (bridge.current === integration) bridge.current = null;
    };
  }, []);
  useEffect(() => {
    bridge.current?.interrupt();
    bridge.current?.clearSpeechCache();
    // Creating a chat and sending its first local turn can share one render.
    const freshTurn = identity.current.token === token && identity.current.chatId !== state.chatId &&
      latest.current.phase === "streaming" && latest.current.messages.at(-2)?.id?.startsWith("local-user-");
    authorization.current.revoke(freshTurn ? latest.current.messages.slice(0, -2) : latest.current.messages);
    identity.current = { token, chatId: state.chatId };
  }, [token, state.chatId]);
  useEffect(() => {
    bridge.current?.interrupt();
    bridge.current?.setListening(false);
    bridge.current?.setTutorState({ phase: state.phase, error: state.error });
  }, [state.phase, state.chatId, state.error]);
  useEffect(() => {
    const message = authorization.current.observe(state.messages);
    if (!speechEnabled || !token || !message) return;
    setSpeechError("");
    bridge.current
      ?.speak(message.content.slice(0, 2000), {
        token,
        gesture: autoGestures ? message.gesture : "EXPLAINING",
        emotion: message.emotion,
      })
      .catch(reportError);
  }, [state.messages, token, speechEnabled, autoGestures, reportError]);
  useEffect(() => {
    if (!speechEnabled) { authorization.current.revoke(latest.current.messages); bridge.current?.interrupt(); }
  }, [speechEnabled]);
  const playLatest = useCallback(() => {
    if (!speechEnabled || !token) return;
    setSpeechError("");
    if (playback === "blocked") {
      bridge.current?.resume().catch(reportError);
      return;
    }
    const message = [...latest.current.messages]
      .reverse()
      .find(
        (item) =>
          item.role === "assistant" &&
          ["complete", "refused"].includes(item.status) &&
          item.content,
      );
    if (message && token) {
      bridge.current
        ?.speak(message.content.slice(0, 2000), {
          token,
          gesture: autoGestures ? message.gesture : "EXPLAINING",
          emotion: message.emotion,
        })
        .catch(reportError);
    }
  }, [playback, token, speechEnabled, autoGestures, reportError]);
  const onReady = useCallback(() => {
    bridge.current?.setTutorState({
      phase: latest.current.phase,
      error: latest.current.error,
    });
    bridge.current?.update();
    if (!welcomed.current) {
      welcomed.current = true;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        viewport.current?.getControllers()?.animation.greet();
    }
  }, []);
  const onFrame = useCallback(() => bridge.current?.update(), []);
  const interrupt = useCallback(() => {
    authorization.current.revoke(latest.current.messages);
    bridge.current?.interrupt();
  }, []);
  const speakText = useCallback(
    async (text, request) => {
      if (!isSpeechRequest(request) || !token || !speechEnabled || typeof text !== "string" || !text.trim())
        return;
      setSpeechError("");
      try {
        return await bridge.current?.speak(text.trim().slice(0, 2000), {
          token,
          gesture: "EXPLAINING",
          emotion: "neutral",
        });
      } catch (error) {
        reportError(error);
      }
    },
    [token, speechEnabled, reportError],
  );
  return {
    viewport,
    playback,
    speechEnabled,
    speechError,
    playLatest,
    speakText,
    onReady,
    onFrame,
    interrupt,
    animationState:
      playback === "playing"
        ? "speaking"
        : state.phase === "streaming"
          ? "thinking"
          : "idle",
  };
}
