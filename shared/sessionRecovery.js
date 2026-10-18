export async function loadSession(fetchProfile, token, { signal, timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  let timer;
  let onAbort;
  const interrupted = new Promise((_, reject) => {
    onAbort = () => { controller.abort(); reject(new Error("SESSION_CANCELLED")); };
    if (signal?.aborted) onAbort();
    else signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      const error = new Error("تعذر الاتصال بالخادم لاستعادة جلستك. تأكد من تشغيل المشروع وحاول مرة ثانية.");
      error.code = "SESSION_TIMEOUT";
      reject(error); controller.abort();
    }, timeoutMs);
  });
  try { return await Promise.race([fetchProfile(token, { signal: controller.signal }), interrupted]); }
  finally { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); }
}
