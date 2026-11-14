// @ts-nocheck
/* eslint-disable */
// Built from src/supportedSetups.ts so plain node can run the kit. Do not edit.
import {
  PLATFORM_AWS_LAMBDA,
  PLATFORM_VERCEL,
  PROVEN_PLATFORMS,
  platformName,
  recognisedUnprovenFunctionPlatforms
} from "./serverless.js";
const HOSTING_TARGETS = [
  "long-running",
  "vercel",
  "lambda",
  "named-unproven-function-host",
  "unrecognised-function-host"
];
const TARGET_PLATFORM = {
  vercel: PLATFORM_VERCEL,
  lambda: PLATFORM_AWS_LAMBDA
};
const HOSTING_TARGET_LABELS = {
  "long-running": "A Node server you start and keep",
  vercel: platformName(PLATFORM_VERCEL),
  lambda: platformName(PLATFORM_AWS_LAMBDA),
  "named-unproven-function-host": "A function host the kit names but has not proven",
  "unrecognised-function-host": "A function host the kit cannot recognise"
};
const HOSTING_TARGET_IN_PROSE = {
  "long-running": "a Node server you start and keep",
  vercel: platformName(PLATFORM_VERCEL),
  lambda: platformName(PLATFORM_AWS_LAMBDA),
  "named-unproven-function-host": "a function host the kit names but has not proven",
  "unrecognised-function-host": "a function host the kit cannot recognise"
};
function namedUnprovenFunctionHostNames() {
  return recognisedUnprovenFunctionPlatforms().map((code) => platformName(code));
}
const KIT_BASE_PATH = "/_boosthis";
const IMPORT_ATTACH = 'import { attach, enableTelemetry } from "@workspace/boosthis-runtime-node";';
const TELEMETRY_LINES = [
  "enableTelemetry({",
  "  inviteKey: process.env.BOOSTHIS_PROJECT_KEY,",
  '  endpoint: "https://www.boosthis.com/api",',
  '  appName: "My Service",',
  "});"
];
const SUPPORTED_SERVER_SETUPS = [
  {
    id: "express",
    label: "Express",
    proofArm: "express",
    where: "the file that builds the Express app, before the routes are registered",
    code: [
      'import { boosthis, mount, enableTelemetry } from "@workspace/boosthis-runtime-node";',
      "",
      "app.use(boosthis({ bubble: true })); // before your routes",
      "mount(app);                          // in-app page at /_boosthis",
      "",
      ...TELEMETRY_LINES
    ],
    note: "Unchanged. An Express project that is already wired this way needs no edit — `attach()` is for projects that are not Express, and an Express app may use either. `mount(app)` is the optional second line: the middleware alone serves the status page and the badge reads, and mounting adds the in-app page at /_boosthis plus the local JSON reads. Leave it out and those addresses say so themselves rather than falling through to your own 404."
  },
  {
    id: "next",
    label: "Next.js",
    proofArm: "next",
    where: "the custom server file that creates the Node server, before the server is created (a Next app without a custom server file needs one — the standard `createServer` + `getRequestHandler()` file from the Next docs)",
    code: [
      IMPORT_ATTACH,
      "",
      "attach(); // before the server is created",
      "",
      ...TELEMETRY_LINES
    ],
    note: "Node runtime only. Routes running on the edge runtime are a different runtime with no Node server in it, and the kit says so instead of pretending: it refuses to attach and names the reason at startup."
  },
  {
    id: "fastify",
    label: "Fastify",
    proofArm: "fastify",
    where: "the entry file, before the Fastify instance is created",
    code: [IMPORT_ATTACH, "", "attach(); // before Fastify is created", "", ...TELEMETRY_LINES],
    note: "No Fastify plugin to register, and no change to the app's own hooks."
  },
  {
    id: "hono",
    label: "Hono (Node adapter)",
    proofArm: "hono",
    where: "the entry file, before `serve()` is called",
    code: [
      IMPORT_ATTACH,
      "",
      'attach({ serverKind: "hono" }); // before serve()',
      "",
      ...TELEMETRY_LINES
    ],
    note: 'Pass `serverKind: "hono"` exactly as shown. Hono is the one setup the kit cannot name by itself, and the name is only a label on the project page — the measurements do not depend on it, but without the hint the page would call a Hono app a plain Node server.'
  },
  {
    id: "nest",
    label: "NestJS",
    proofArm: "nest",
    where: "the bootstrap file, before `NestFactory.create(...)`",
    code: [
      IMPORT_ATTACH,
      "",
      "attach(); // before NestFactory.create()",
      "",
      ...TELEMETRY_LINES
    ],
    note: "Works on either Nest adapter (Express or Fastify) and needs no Nest middleware, interceptor or module."
  },
  {
    id: "node-http",
    label: "Plain Node server",
    proofArm: "plain-node",
    where: "the entry file, before `createServer(...)`",
    code: [IMPORT_ATTACH, "", "attach(); // before createServer()", "", ...TELEMETRY_LINES],
    note: "This is also the answer for any framework not named above: anything that ends in a Node server is measured. It is named `node-http` on the project page because the kit will not claim to recognise a framework it cannot see."
  }
];
const doorRunItAsAServer = () => `Run the app as a Node server you start yourself — any host that runs \`node …\` and keeps the process (a container or VM host: Cloud Run, Render, Fly.io, Railway, your own machine). Where the table above says proven on a real run, that framework's own recipe then applies unchanged. For ${asList(genericOnAServerFrameworkNames())} it does not: the table gives them no recipe of its own, so what applies is the generic Plain Node server line, and we have never run those frameworks ourselves. What it does not cover: anything you leave behind on the function host stays unmeasured, this is a hosting change rather than a setting, and where the table gives a framework no recipe of its own you are getting the plain-Node line, not an answer anybody has taken on that framework.`;
const DOOR_BROWSER_KIT = "Measure the browser half instead, with the Boosthis browser kit: it is a tag on the page and does not care who hosts the app, Vercel included. What it does not cover: the server side. No per-request timings for your routes, no database or queue work, no background jobs, and nothing that never reaches a browser.";
const DOOR_ASK_US_TO_PROVE_THE_HOST = "Where the kit refused the host outright: ask us to prove it — support@boosthis.com, naming the host. What it does not cover: nothing changes while you wait. The kit stays switched off there, the app runs exactly as it did before, and we will not switch it on until a recorded run on that host shows the measurements really arrive.";
const DOOR_TELL_THE_KIT_IT_IS_A_FUNCTION = "Where the kit did not recognise the host: set `BOOSTHIS_SERVERLESS=1` in that environment. The kit then refuses to start there, exactly as it does on a function host it can name, instead of registering an install that reports almost nothing. What it does not cover: it does not make the host work — it makes the kit stop, so nothing measured is the answer you see rather than the answer you discover a month later.";
const REASONS = {
  "next-on-vercel": {
    title: "No custom server file, and a route handler is not a bare handler",
    text: (combinations) => `${combinations}. Vercel never runs a custom server file, so the Next.js recipe has no file to go in — and a Next.js route handler or page is not the bare \`(event, context)\` handler \`withBoosthis()\` wraps, so there is nowhere to send from before the invocation freezes. Next's own \`instrumentation.ts\` hook does run early enough to patch the server in a Next app you host yourself, but on Vercel each route is served by the platform's own runtime, which we cannot get inside and have never recorded. Unsupported rather than untested: \`docs/decisions/next-on-vercel.md\` says what would reopen it.`
  },
  "framework-owns-the-request": {
    title: "The adapter owns the request, and the kit is not inside it",
    text: (combinations) => `${combinations}. On a function host each of these is deployed through an adapter that hands the framework a request with no Node server of yours in the process, so there is nothing for \`attach()\` to watch — and their route handlers are not the bare \`(event, context)\` handler \`withBoosthis()\` wraps, so there is nowhere to send from before the invocation freezes. We have never recorded a run of any of these combinations.`
  },
  "host-not-proven": {
    title: "The kit refuses a function host it can name but has not proven",
    text: (combinations) => `${combinations} — exactly ${asList(namedUnprovenFunctionHostNames())} today, the function hosts the kit's own detection can name and has not been proven on. It names the host, prints why, and stops: nothing registers, nothing is measured, and no dashboard shows a project that looks measured and is not. That is the kit's own behaviour and it is recorded (\`scripts/live-proofs/serverless-invocation\`, arm \`unproven-platform-refused\`), not advice — following the Express or bare-handler recipe on such a host changes nothing, because the refusal happens before either of them can report. This list is the whole of the refusal: a host not on it is the next column, not this one.`
  },
  "host-not-recognised": {
    title: "A host the kit cannot name does not get refused — it gets misread",
    text: (combinations) => `${combinations}. Detection reads the host's own environment markers, so the only function hosts it knows of are the ones it has markers for: ${asList(
      provenFunctionHostNames()
    )}, which it runs on, and ${asList(namedUnprovenFunctionHostNames())}, which it refuses. Anywhere else there is nothing to read: the kit sees an ordinary Node process, does NOT refuse, starts, registers and then loses almost everything it gathers when the invocation freezes — the silent half-measured install this whole table exists to prevent. An unrecognised function host is unsupported even though nothing stops the kit from starting there. Setting \`BOOSTHIS_SERVERLESS=1\` tells the kit what it cannot detect, and it then refuses by the same path as the column before this one; it is a way to make the kit stop, not a way to make it work.`
  }
};
const REFUSED_BY_HOST = {
  target: "named-unproven-function-host",
  answer: "refused",
  short: "The kit names the host and stops before it registers.",
  wiring: "none",
  reason: "host-not-proven",
  proof: ["serverless-invocation:unproven-platform-refused"]
};
const NOT_RECOGNISED_BY_HOST = {
  target: "unrecognised-function-host",
  answer: "unrefused",
  short: "Nothing stops the install: the kit reads no marker, starts as if on an ordinary Node server, and loses what it gathers when the invocation freezes.",
  wiring: "none",
  reason: "host-not-recognised"
};
const ownsTheRequest = (target) => ({
  target,
  answer: "none",
  short: "The adapter hands the framework the request; no server of yours, and no bare handler.",
  reason: "framework-owns-the-request"
});
const FRAMEWORK_ANSWERS = [
  {
    name: "Express",
    setupId: "express",
    hosting: [
      {
        target: "long-running",
        answer: "proven",
        short: "`app.use(boosthis())` before your routes.",
        how: "`app.use(boosthis())` before your routes.",
        wiring: "express-middleware",
        evidence: "real-run",
        proof: ["node-any-server:express"]
      },
      {
        target: "vercel",
        answer: "proven",
        short: "The same middleware, unchanged.",
        how: "The same middleware, unchanged — `boosthis()` already sits on the request boundary, and on Vercel it hands the rest to the platform's own after-response mechanism rather than making the visitor wait.",
        wiring: "express-middleware",
        evidence: "contract-reproduced",
        proof: ["serverless-invocation:vercel-after-response"]
      },
      {
        target: "lambda",
        answer: "proven",
        short: "The same middleware, unchanged.",
        how: "The same middleware, unchanged — `boosthis()` already sits on the request boundary and holds the response there until the send has finished, which is what the freeze on return demands.",
        wiring: "express-middleware",
        evidence: "contract-reproduced",
        proof: ["serverless-invocation:express-lambda-adapter"]
      },
      REFUSED_BY_HOST,
      NOT_RECOGNISED_BY_HOST
    ]
  },
  {
    name: "Next.js",
    aliases: ["Next.js", "Next"],
    setupId: "next",
    hosting: [
      {
        target: "long-running",
        answer: "proven",
        short: "`attach()` in the custom server file, before `createServer(...)`.",
        how: "`attach()` in the custom server file, before `createServer(...)`. Node runtime; the edge runtime is refused by name at startup.",
        wiring: "attach",
        evidence: "real-run",
        proof: ["node-any-server:next"]
      },
      {
        target: "vercel",
        answer: "none",
        short: "No custom server file to put `attach()` in, and a route handler is not a bare handler.",
        reason: "next-on-vercel"
      },
      ownsTheRequest("lambda"),
      REFUSED_BY_HOST,
      NOT_RECOGNISED_BY_HOST
    ]
  },
  {
    name: "Fastify",
    setupId: "fastify",
    hosting: [
      {
        target: "long-running",
        answer: "proven",
        short: "`attach()` before the Fastify instance is created.",
        how: "`attach()` before the Fastify instance is created.",
        wiring: "attach",
        evidence: "real-run",
        proof: ["node-any-server:fastify"]
      },
      ownsTheRequest("vercel"),
      ownsTheRequest("lambda"),
      REFUSED_BY_HOST,
      NOT_RECOGNISED_BY_HOST
    ]
  },
  {
    name: "Hono",
    setupId: "hono",
    hosting: [
      {
        target: "long-running",
        answer: "proven",
        short: '`attach({ serverKind: "hono" })` before `serve()`, on the Node adapter.',
        how: '`attach({ serverKind: "hono" })` before `serve()`, on the Node adapter.',
        wiring: "attach",
        evidence: "real-run",
        proof: ["node-any-server:hono"]
      },
      ownsTheRequest("vercel"),
      ownsTheRequest("lambda"),
      REFUSED_BY_HOST,
      NOT_RECOGNISED_BY_HOST
    ]
  },
  {
    name: "NestJS",
    aliases: ["NestJS", "Nest"],
    setupId: "nest",
    hosting: [
      {
        target: "long-running",
        answer: "proven",
        short: "`attach()` before `NestFactory.create(...)`, on either adapter.",
        how: "`attach()` before `NestFactory.create(...)`, on either adapter.",
        wiring: "attach",
        evidence: "real-run",
        proof: ["node-any-server:nest"]
      },
      ownsTheRequest("vercel"),
      ownsTheRequest("lambda"),
      REFUSED_BY_HOST,
      NOT_RECOGNISED_BY_HOST
    ]
  },
  {
    name: "Plain Node server",
    aliases: ["plain Node server", "plain Node", "plain `http` server", "plain http server"],
    setupId: "node-http",
    hosting: [
      {
        target: "long-running",
        answer: "proven",
        short: "`attach()` before `createServer(...)`.",
        how: "`attach()` before `createServer(...)`.",
        wiring: "attach",
        evidence: "real-run",
        proof: ["node-any-server:plain-node"]
      },
      {
        target: "vercel",
        answer: "proven",
        short: "Wrap the exported handler in `withBoosthis()`.",
        how: "A bare handler has no server to watch, so wrap it: `export const handler = withBoosthis(async (event, context) => { … })`.",
        wiring: "wrapped-handler",
        evidence: "contract-reproduced",
        proof: ["serverless-invocation:vercel-no-countdown-abstains"]
      },
      {
        target: "lambda",
        answer: "proven",
        short: "Wrap the exported handler in `withBoosthis()`.",
        how: "A bare handler has no server to watch, so wrap it: `export const handler = withBoosthis(async (event, context) => { … })`.",
        wiring: "wrapped-handler",
        evidence: "contract-reproduced",
        proof: ["serverless-invocation:lambda-inline"]
      },
      REFUSED_BY_HOST,
      NOT_RECOGNISED_BY_HOST
    ]
  },
  ...["Remix", "SvelteKit", "Nuxt", "Astro"].map(
    (name) => ({
      name,
      hosting: [
        {
          target: "long-running",
          answer: "generic",
          short: "The Plain Node server line, where the app ends in one — with no run of our own on this framework.",
          how: "Where the app ends in a Node server you start yourself, the Plain Node server recipe measures it — `attach()` before that server is created. We have not run this framework ourselves, so this is the generic answer, not a verified one."
        },
        ownsTheRequest("vercel"),
        ownsTheRequest("lambda"),
        REFUSED_BY_HOST,
        NOT_RECOGNISED_BY_HOST
      ]
    })
  )
];
function provenFunctionHostNames() {
  return PROVEN_PLATFORMS.map((code) => platformName(code));
}
function functionHostSentence() {
  const proven = asList(provenFunctionHostNames()) || "no function host";
  const refused = asList(namedUnprovenFunctionHostNames());
  return `${proven} are recognised automatically — but recognition is not wiring, and they are the only function hosts the kit runs on at all. What earns them that word is the host's published contract — its environment markers, its handler signature, its freeze on response — reproduced here against the shipped kit: we hold no account on either host and have never published to one, so no claim here is a run on a deployment. On ${refused} the kit names the host and stops before registering, rather than draw a panel over nothing. On a function host it has no marker for it cannot tell at all: nothing refuses, the kit starts as if this were an ordinary Node server, and almost everything it gathers dies with the invocation — set \`BOOSTHIS_SERVERLESS=1\` to make it stop instead. A function is frozen the moment it answers, so even on the two recognised hosts the kit can only measure code it is already inside: an Express app's \`boosthis()\` middleware, or a bare handler wrapped with \`withBoosthis()\`. A framework that owns the request itself — a Next.js route handler or page, or the serverless adapter of Remix, SvelteKit, Nuxt or Astro — gives neither of those anywhere to sit, and has no path on either. The table above says which is which, per framework and per host.`;
}
function hostsThisKitCannotMeasureLead() {
  return `HOSTS WHERE THE APP CANNOT BE MEASURED. On ${asList(namedUnprovenFunctionHostNames())} the kit names the host and stops before it registers, so nothing there is measured. On a function host the kit has no marker for, nothing stops it: it starts, registers and then loses almost everything it gathers when the invocation freezes, so the app looks set up and reports almost nothing. An app deployed on one of these, or on a framework and host pair step 5 gives no path, is a fact the developer hears before any file is written, with what does work there: the website half, measured by the browser kit (get_integration_kit runtime "web"), which does not care who hosts the app, or running the app as a Node server it starts and keeps. Step 5 has the answer per framework and host, and every way out in full.`;
}
function frameworkAnswer(name) {
  return FRAMEWORK_ANSWERS.find((f) => f.name === name);
}
function hostingAnswer(framework, target) {
  return framework.hosting.find((h) => h.target === target);
}
const VERDICT = {
  proven: "**Proven.**",
  generic: "**No recipe of its own.**",
  none: "**No path.**",
  refused: "**The kit refuses to start.**",
  unrefused: "**No path, and no refusal either.**"
};
const PROVEN_VERDICT = {
  "real-run": "**Proven on a real run.**",
  "contract-reproduced": "**Proven against this host's contract, not on a deployment.**"
};
const answerCell = (a) => {
  const verdict = a.answer === "proven" && a.evidence ? PROVEN_VERDICT[a.evidence] : VERDICT[a.answer];
  return `${verdict} ${a.short}`.trim();
};
const asList = (items) => items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items[0] ?? "";
function genericOnAServerFrameworkNames() {
  return FRAMEWORK_ANSWERS.filter(
    (f) => f.hosting.find((h) => h.target === "long-running")?.answer === "generic"
  ).map((f) => f.name);
}
const DOORS = [
  doorRunItAsAServer(),
  DOOR_BROWSER_KIT,
  DOOR_ASK_US_TO_PROVE_THE_HOST,
  DOOR_TELL_THE_KIT_IT_IS_A_FUNCTION
];
function reasonCoverage(key) {
  const per = /* @__PURE__ */ new Map();
  for (const f of FRAMEWORK_ANSWERS) {
    for (const a of f.hosting) {
      if (a.reason !== key) continue;
      const seen = per.get(a.target) ?? { names: [], kind: a.answer };
      seen.names.push(f.name);
      per.set(a.target, seen);
    }
  }
  const parts = [];
  for (const target of HOSTING_TARGETS) {
    const group = per.get(target);
    if (!group?.names.length) continue;
    const verdict = group.kind === "refused" ? "the kit refuses to start for" : group.kind === "unrefused" ? "no path, and no refusal either, for" : "no path for";
    const who = group.names.length === FRAMEWORK_ANSWERS.length ? "every framework above" : asList(group.names);
    parts.push(`${verdict} ${who} on ${HOSTING_TARGET_IN_PROSE[target]}`);
  }
  const joined = parts.join("; ");
  return joined ? joined.charAt(0).toUpperCase() + joined.slice(1) : "";
}
function reasonBlocks(bold) {
  const lines = [];
  for (const key of Object.keys(REASONS)) {
    const covers = reasonCoverage(key);
    if (!covers) continue;
    const { title, text } = REASONS[key];
    lines.push("", bold ? `**${title}.**` : `${title}:`, "", text(covers));
  }
  return lines;
}
function frameworkAnswersMarkdown() {
  const lines = [
    `| Framework | ${HOSTING_TARGETS.map((t) => HOSTING_TARGET_LABELS[t]).join(" | ")} |`,
    `|---|${HOSTING_TARGETS.map(() => "---").join("|")}|`
  ];
  for (const f of FRAMEWORK_ANSWERS) {
    const cells = HOSTING_TARGETS.map((target) => {
      const a = hostingAnswer(f, target);
      return a ? answerCell(a).replace(/\n/g, " ") : "";
    });
    lines.push(`| ${f.name} | ${cells.join(" | ")} |`);
  }
  lines.push(
    "",
    "Every cell was earned, or refused, for that exact pair — the framework, the host and the wiring together. Nothing carries across from the column beside it.",
    "",
    "**Proven on a real run** means an app of that kind was started and driven on that host and the measurements arrived. **Proven against this host's contract** means the host's published contract — its environment markers, its handler signature, its freeze on response — was reproduced here against the shipped kit: we hold no account on Vercel or AWS and have never published to either, so those cells are not a run on a deployment of yours or of ours.",
    ...reasonBlocks(true),
    "",
    "Where a cell is not **Proven**, these are the ways out:",
    ""
  );
  for (const door of DOORS) lines.push(`- ${door}`);
  return lines;
}
function frameworkAnswersSteps() {
  const lines = [];
  for (const f of FRAMEWORK_ANSWERS) {
    lines.push(`     ${f.name}:`);
    for (const target of HOSTING_TARGETS) {
      const a = hostingAnswer(f, target);
      if (!a) continue;
      lines.push(`       - ${HOSTING_TARGET_LABELS[target]} — ${answerCell(a).replace(/\*\*/g, "")}`);
    }
  }
  lines.push(
    "",
    "     Every pair above was earned, or refused, for that exact framework, host and",
    "     wiring together. Do not carry an answer across to the host beside it.",
    "",
    "     Proven on a real run: an app of that kind was started and driven on that host",
    "     and the measurements arrived. Proven against this host's contract: the host's",
    "     published contract — environment markers, handler signature, freeze on response",
    "     — was reproduced on our own machine against the shipped kit. We hold no account",
    "     on Vercel or AWS and have never published to either, so those cells are not a",
    "     run on a deployment of yours or of ours.",
    ...reasonBlocks(false).map((line) => line ? `     ${line}` : ""),
    "",
    "     Where a pair is not PROVEN, say so to the developer and offer one of these,",
    "     naming which:"
  );
  for (const door of DOORS) lines.push(`       - ${door.replace(/\*\*/g, "")}`);
  return lines;
}
function supportedSetupsSentence() {
  const labels = SUPPORTED_SERVER_SETUPS.map((s) => s.label);
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
function setupRecipeSteps(setup) {
  return [
    `   ${setup.label.toUpperCase()} — in ${setup.where}:`,
    ...setup.code.map((line) => line ? `     ${line}` : ""),
    ...setup.note ? [`     (${setup.note})`] : []
  ];
}
function setupRecipeMarkdown(setup) {
  return [
    `### ${setup.label}`,
    "",
    `In ${setup.where}:`,
    "",
    "```ts",
    ...setup.code,
    "```",
    ...setup.note ? ["", setup.note] : []
  ];
}
export {
  DOORS,
  FRAMEWORK_ANSWERS,
  HOSTING_TARGETS,
  HOSTING_TARGET_IN_PROSE,
  HOSTING_TARGET_LABELS,
  KIT_BASE_PATH,
  REASONS,
  SUPPORTED_SERVER_SETUPS,
  TARGET_PLATFORM,
  frameworkAnswer,
  frameworkAnswersMarkdown,
  frameworkAnswersSteps,
  functionHostSentence,
  hostingAnswer,
  hostsThisKitCannotMeasureLead,
  namedUnprovenFunctionHostNames,
  provenFunctionHostNames,
  setupRecipeMarkdown,
  setupRecipeSteps,
  supportedSetupsSentence
};
