// Uses a temporary real student session produced through the registration API.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const output = resolve(".agents/check-output/qwen-voice");
mkdirSync(output, { recursive: true });
const { token } = JSON.parse(
  readFileSync(resolve(output, "test-session.json"), "utf8"),
);
const browser = spawn(
  process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless",
    "--mute-audio",
    "--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "--disable-background-networking",
    "--window-size=1440,1100",
    "--remote-debugging-port=0",
    `--user-data-dir=${resolve(output, "unit-browser")}`,
  ],
  { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
);
let socket,
  id = 0;
const tasks = new Map(),
  errors = [];
try {
  const endpoint = await new Promise((done, fail) => {
    let log = "";
    const t = setTimeout(() => fail(Error("Chrome startup timed out")), 20000);
    browser.on("error", fail);
    browser.stderr.on("data", (b) => {
      log += b;
      const m = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(t);
        done(m[1]);
      }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((r, j) => {
    socket.onopen = r;
    socket.onerror = j;
  });
  socket.onmessage = (e) => {
    const d = JSON.parse(e.data),
      t = tasks.get(d.id);
    if (t) {
      tasks.delete(d.id);
      d.error ? t.reject(Error(d.error.message)) : t.resolve(d.result);
    }
    if (d.method === "Runtime.exceptionThrown")
      errors.push(d.params.exceptionDetails.text);
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const key = ++id;
      tasks.set(key, { resolve, reject });
      socket.send(
        JSON.stringify({
          id: key,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });
  const { targetId } = await send("Target.createTarget", {
      url: "about:blank",
    }),
    { sessionId } = await send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
  const command = (m, p) => send(m, p, sessionId);
  const evaluate = async (expression) => {
    const r = await command("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (r.exceptionDetails)
      throw Error(
        r.exceptionDetails.exception?.description || r.exceptionDetails.text,
      );
    return r.result.value;
  };
  const until = async (expression) => {
    const end = Date.now() + 45000;
    while (Date.now() < end) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    await capture("unit-failure.png");
    console.error(
      await evaluate(
        "({url:location.href,text:document.body.innerText.slice(0,1200)})",
      ),
    );
    console.error(errors);
    throw Error("Timed out: " + expression);
  };
  const capture = async (name) => {
    const r = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(output, name), Buffer.from(r.data, "base64"));
  };
  await command("Runtime.enable", {});
  await command("Page.enable", {});
  await command("Page.addScriptToEvaluateOnNewDocument", {
    source: `sessionStorage.setItem('nipras.token',${JSON.stringify(token)});localStorage.setItem('nipras.companion.settings.v1',JSON.stringify({mode:'hidden',voice:false}));`,
  });
  await command("Page.navigate", { url: "http://127.0.0.1:5173/" });
  await until(
    "location.origin==='http://127.0.0.1:5173' && document.readyState!=='loading'",
  );
  await evaluate(
    `sessionStorage.setItem('nipras.token',${JSON.stringify(token)});localStorage.setItem('nipras.companion.settings.v1',JSON.stringify({mode:'hidden',voice:false}));`,
  );
  await command("Page.navigate", { url: "http://127.0.0.1:5173/math-unit" });
  await until("document.querySelectorAll('.unit-lesson-card').length===7");
  await capture("unit-desktop.png");
  const diagrams = [];
  for (let i = 1; i <= 7; i++) {
    await command("Page.navigate", {
      url: `http://127.0.0.1:5173/math-unit/1-${i}`,
    });
    await until("document.querySelector('.unit-tabs')");
    await evaluate(
      "[...document.querySelectorAll('.unit-tabs button')][1].click()",
    );
    await until("document.querySelector('.unit-diagram svg')");
    const result = await evaluate(
      "({label:document.querySelector('.unit-diagram').getAttribute('aria-label'),value:document.querySelector('output').textContent,paths:document.querySelectorAll('.unit-diagram path').length,overflow:document.documentElement.scrollWidth>innerWidth})",
    );
    assert.equal(result.overflow, false);
    assert.ok(result.paths >= 2);
    diagrams.push(result);
    if (i === 1) await capture("rate-diagram.png");
  }
  await command("Page.navigate", {
    url: "http://127.0.0.1:5173/math-unit/1-7",
  });
  await until("document.querySelector('.unit-tabs')");
  await evaluate(
    "[...document.querySelectorAll('.unit-tabs button')].at(-1).click()",
  );
  await until("document.querySelector('.unit-number input')");
  await evaluate(
    "(()=>{const input=document.querySelector('.unit-number input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'٢/٣');input.dispatchEvent(new Event('input',{bubbles:true}));})()",
  );
  await evaluate(
    "document.querySelector('.unit-exercise button[type=submit]').click()",
  );
  await until("document.querySelector('.unit-feedback.correct')");
  await capture("saved-practice.png");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await command("Page.navigate", {
    url: "http://127.0.0.1:5173/math-unit/1-6",
  });
  await until("document.querySelector('.unit-tabs')");
  await evaluate(
    "[...document.querySelectorAll('.unit-tabs button')][1].click()",
  );
  await until("document.querySelector('.unit-diagram svg')");
  assert.equal(
    await evaluate("document.documentElement.scrollWidth>innerWidth"),
    false,
  );
  await capture("unit-mobile.png");
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    lessons: 7,
    diagrams,
    realServerAnswerSaved: true,
    mobileOverflow: false,
    errors,
  };
  writeFileSync(
    resolve(output, "unit-browser-results.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  socket?.close();
  browser.kill();
}
