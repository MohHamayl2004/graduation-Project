// @ts-nocheck
/* eslint-disable */
// Built from src/kitPageAssets.ts so plain node can run the kit. Do not edit.
const PANEL_PAGE_MARKUP = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Boosthis</title>
<style>
  :root {
    --bg: #0e1116; --panel: #161b22; --border: #30363d;
    --text: #e6edf3; --muted: #7d8590;
    --good: #2ea043; --warn: #d29922; --poor: #f85149; --link: #58a6ff;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, sans-serif;
    background: var(--bg); color: var(--text); padding: 24px; }
  .wrap { max-width: 880px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .sub { color: var(--muted); margin-bottom: 24px; font-size: 13px; }
  .card { background: var(--panel); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .hero { display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    margin-bottom: 4px; }
  .score { font-size: 44px; font-weight: 600; line-height: 1;
    font-variant-numeric: tabular-nums; }
  .score.pending { font-size: 20px; color: var(--muted); font-weight: 500; }
  .heroMeta { color: var(--muted); font-size: 13px; }
  .projline { color: var(--muted); font-size: 13px; margin-bottom: 16px;
    word-break: break-word; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 600; text-transform: capitalize; }
  .pill.good { background: rgba(46,160,67,0.15); color: var(--good); }
  .pill.needs-work { background: rgba(210,153,34,0.15); color: var(--warn); }
  .pill.poor { background: rgba(248,81,73,0.15); color: var(--poor); }
  .pill.pending { background: rgba(125,133,144,0.15); color: var(--muted); }
  /* Two silences that are NOT "come back later". Grey means a score is still
     coming; these two mean it is not, so neither may share grey with pending
     or a permanent state reads as progress. */
  .pill.not-available { background: rgba(163,113,247,0.15); color: #a371f7; }
  .pill.not-scored { background: rgba(88,166,255,0.15); color: #58a6ff; }
  /* The third silence that is not "come back later": this meter's collector
     never ran. It is the one a developer can fix, so it is drawn as an empty
     outline — visibly unlike pending's filled grey, and unlike the two
     permanent states' colours. */
  .pill.not-started { background: transparent; color: var(--warn);
    box-shadow: inset 0 0 0 1px var(--warn); }
  h2 { margin: 0 0 12px; font-size: 15px; }
  table { width: 100%; border-collapse: collapse;
    font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 8px 10px;
    border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  th { color: var(--muted); font-weight: 500; font-size: 12px;
    text-transform: uppercase; letter-spacing: 0.5px; }
  td.num { text-align: right; width: 64px; }
  td.pillcell { width: 110px; }
  /* A PHONE IS THE FIRST SCREEN THIS PAGE MEETS. The two tables below carry
     fixed-width score and rating columns, so on a narrow screen the Detail
     column beside them has nowhere to go: it is squeezed to one word a line,
     or pushed off the edge of a page that declares no horizontal overflow at
     all and so cannot be scrolled back. Each table therefore sits in its own
     scrolling box with a min-width it will not go below, and the box says so
     — a styled scrollbar where the platform draws one, and a line underneath
     for the phones that draw an overlay scrollbar only when you already know
     to swipe. */
  .tablebox { overflow-x: auto; overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch; scrollbar-width: thin;
    scrollbar-color: var(--border) transparent; }
  .tablebox::-webkit-scrollbar { height: 8px; }
  .tablebox::-webkit-scrollbar-thumb { background: var(--border);
    border-radius: 999px; }
  .tablebox > table { min-width: 460px; }
  .tablebox.narrow > table { min-width: 300px; }
  /* Shown ONLY once the box has measured itself wider than the screen, so the
     cue can never claim a table continues when it does not. */
  .moreright { display: none; color: var(--muted); font-size: 12px;
    margin-top: 8px; }
  .moreright.on { display: block; }
  @media (max-width: 600px) {
    body { padding: 14px; }
    th, td { padding: 8px 8px; }
  }
  .caption { color: var(--muted); font-size: 12px; }
  .notice { border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;
    border: 1px solid var(--border); background: var(--panel); }
  .notice.warn { border-color: var(--warn);
    background: rgba(210,153,34,0.08); }
  .notice.stop { border-color: var(--poor);
    background: rgba(248,81,73,0.08); }
  .notice h3 { margin: 0 0 4px; font-size: 14px; }
  .notice p { margin: 0; color: var(--muted); font-size: 13px; }
  .empty { color: var(--muted); font-style: italic; padding: 8px 0; }
  footer { color: var(--muted); font-size: 12px; margin-top: 28px; }
  a { color: var(--link); }
</style>
</head>
<body>
<div class="wrap">
  <h1>Boosthis is running</h1>
  <div class="sub" id="sub">Reading this app&rsquo;s live numbers&hellip;</div>

  <!-- WHICH PROJECT this kit feeds, and WHETHER anything is reaching it. Both
       sit ABOVE the score on purpose: the score is measured on this machine and
       climbs to 100 whether or not a single byte ever left it, so a developer
       must be able to see "nothing is being sent" without scrolling past a
       healthy-looking number. -->
  <div class="projline" id="projLine">Project: Not received from Boosthis yet</div>

  <!-- WHICH INSTALL the verdict below is about. A developer comparing this page
       with their dashboard, and an assisting AI reading a "not registered"
       line, both need the identity in hand — without it the usual reaction to
       a bad verdict is to change the id, which mints a SECOND install that is
       also reported as not registered. -->
  <div class="projline" id="installLine">Install ID: not assigned yet</div>

  <div id="notices"></div>

  <div class="card" id="heroCard">
    <div class="hero">
      <div class="score pending" id="score">&mdash;</div>
      <div>
        <span class="pill pending" id="rating">pending</span>
        <div class="heroMeta" id="samples">no requests measured yet</div>
      </div>
    </div>
    <div class="heroMeta" id="scoreCaption">Measured on this device. Not proof anything reached Boosthis.</div>
  </div>

  <div class="card" id="dropsCard" style="display:none">
    <h2>Measurements dropped</h2>
    <div class="heroMeta" id="dropsValue"></div>
  </div>

  <!-- THE OTHER HALF OF THE SAME HOLE. Above: rows the server accepted the
       batch for and then refused. Here: rows this kit gathered and never got
       out at all. Separate cards on purpose — the fixes differ, and a total
       that merged them would ask for neither. Hidden entirely when this
       process has lost nothing. -->
  <div class="card" id="undeliveredCard" style="display:none">
    <h2>Measurements never delivered</h2>
    <div class="heroMeta" id="undeliveredValue"></div>
  </div>

  <!-- WHAT THE DEVELOPER SAID MUST STAY TRUE. The promises they wrote down on
       their dashboard, carried here so the one thing in Boosthis that IS a
       standing instruction reaches the app they are working in. Hidden
       entirely when this project holds none, or when they could not be read:
       this page shows nothing rather than an error. -->
  <div class="card" id="promisesCard" style="display:none">
    <h2>Promises on this project</h2>
    <div class="tablebox narrow" id="promisesBox">
      <table id="promisesTable">
        <thead><tr><th>Promise</th><th>Standing</th></tr></thead>
        <tbody id="promises"></tbody>
      </table>
    </div>
    <div class="moreright" id="promisesMoreRight">Wider than this screen &mdash; scroll the table sideways for the rest of it.</div>
    <div class="heroMeta" id="promisesMore"></div>
  </div>

  <div class="card">
    <h2>Meters</h2>
    <div class="tablebox" id="axesBox">
      <table id="axesTable">
        <thead><tr>
          <th>Meter</th><th class="num">Score</th><th>Rating</th><th>Detail</th>
        </tr></thead>
        <tbody id="axes"></tbody>
      </table>
    </div>
    <div class="moreright" id="axesMoreRight">Wider than this screen &mdash; scroll the table sideways for the rest of it.</div>
    <div class="empty" id="axesEmpty">Warming up &mdash; meters appear as this app handles requests.</div>
  </div>

  <!-- WHAT THIS PAGE DOES NOT SHOW, said out loud. This page has never had a
       scheduled-jobs section and never will: it is a local view of one
       process, while a job's run history, rhythm and lateness are assembled
       server-side across every install of the project. An AI agent asked what
       this page said about three healthy jobs answered "absent" six times in
       twenty minutes, correctly reading a page that could not have shown them
       and did not admit it. A section that cannot answer a question has to say
       so rather than return nothing, so this card is ALWAYS drawn — whether or
       not the app has jobs, and whether or not this kit can report them. The
       sentence below is the one this page shows before it has heard from the
       kit at all, and it is the same sentence an unrecognised answer gets:
       "cannot tell" is a third state, never a guess at either real one. See
       docs/decisions/kit-page-says-where-jobs-live.md. -->
  <div class="card" id="jobsCard">
    <h2>Scheduled jobs</h2>
    <div class="heroMeta" id="jobsValue">Not shown on this page. This page cannot tell whether this kit reports jobs to Boosthis, so neither this section nor its silence says whether this app has any. The dashboard is where jobs are listed.</div>
  </div>

  <footer>
    <!-- WHERE TO GO NEXT, instead of a silence. This page shows the install ID
         and no token, which is correct: it is mounted on one of your app&rsquo;s own
         routes, and although it opens only for a switched-on browser or the
         machine itself, one opt-in or a same-machine proxy opens it to anyone who
         can reach the app, so a credential drawn here would be one setting away
         from published. Saying only
         "no token here" is what sent an assistant looking for a card that does
         not exist on this runtime, so the next step is named. -->
    This page is served by the Boosthis kit on one of your own app&rsquo;s routes. It
    opens only in a browser you switched on with the owner link, or on the machine
    the app runs on, but one setting can open it to anyone who can reach the app.
    That is why it shows the install ID above and never a token. No sign-in needed.
    <br>
    To read these numbers from outside the app &mdash; or to hand them to an AI
    assistant &mdash; the read-only token that goes with the install ID above comes
    from the <strong>Connect AI</strong> card on this project&rsquo;s row in your
    Boosthis dashboard. <strong>Connect AI once</strong> there issues a different
    credential instead: one durable account token covering every project you own.
    Your dashboard lives at
    <a href="https://www.boosthis.com/dashboard" rel="noreferrer noopener" target="_blank">boosthis.com</a>.
  </footer>
</div>

<script>
(function () {
  "use strict";

  // Resolved from wherever this page is served, so it works at both
  // "/_boosthis" and "/_boosthis/" and at any custom mount path the host
  // chose, without hard-coding the prefix.
  var PANEL = window.location.pathname.replace(/\\/+$/, "") + "/panel";
  var RATINGS = { good: "good", "needs-work": "needs-work", poor: "poor",
    "not-available": "not-available", "not-scored": "not-scored",
    "not-started": "not-started" };
  // A rating is a machine label; a pill is read by a person. "pending" already
  // reads as English. The permanent silences do not, and printing them raw
  // would swap one unreadable word for another. "not-started" is the fourth
  // state and the only one the developer can DO something about, so its words
  // say what is missing rather than what is absent.
  var RATING_WORDS = {
    "not-available": "not available here",
    "not-scored": "no score by design",
    "not-started": "never started"
  };

  var NOTICES = {
    "not-registered": {
      level: "warn",
      title: "Not connected to your Boosthis account yet",
      body: "This kit is measuring locally but has not registered with " +
            "Boosthis, so nothing reaches your dashboard. Check that a valid " +
            "project key was supplied when the kit was started."
    },
    "install-id-not-uuid": {
      level: "warn",
      title: "This install's id was rejected",
      body: "Boosthis refused the install id this app supplied, so it cannot " +
            "register. Let the kit generate the id, or supply a valid one."
    },
    // We asked Boosthis whether this install is on file and got no answer at
    // all. That is NOT the same as being told "no", so it gets its own state
    // and its own words — in particular it must never carry the claim that
    // nothing is reaching the dashboard, which this page cannot know here.
    "registration-unknown": {
      level: "warn",
      title: "Can't check right now",
      body: "Boosthis could not be reached to confirm whether this app is " +
            "registered, so this page cannot say either way yet. This is not " +
            "a failed install and it does not mean anything stopped \\u2014 it " +
            "settles by itself once the check goes through. Do not change the " +
            "install line's id while this is showing."
    },
    "sharing-off": {
      level: "warn",
      title: "Registered, but nothing is being sent",
      body: "This app is connected, but sharing is switched off, so the " +
            "numbers below stay on this machine and your dashboard stays " +
            "empty. Turn sharing on from your Boosthis dashboard."
    }
  };

  // Rows the server accepted the batch for and then refused. The panel reply
  // carries only a count and CODE-DEFINED cause markers, exactly like the
  // notice above, so no server-supplied text is ever drawn on this page. The
  // words below are the SAME words the Boosthis web dashboard uses.
  var DROPTXT = {
    labelRejected: "route names the privacy guard refused",
    traceCapReached: "spans past the 20-span limit",
    snapshotEntryFiltered: "snapshot entries the privacy guard refused"
  };

  /** Why a gathered measurement never left this process. Four closed causes,
   *  because a developer's answer differs for each — the wire carries only the
   *  marker, these words are the kit's own. */
  var UNDTXT = {
    bufferFull: "buffer full, oldest measurements dropped",
    sendFailed: "an upload failed and its rows were already out of the buffer",
    heldTooLong: "held too long without reaching Boosthis, then given up on",
    processEnded: "the process ended with measurements still waiting"
  };

  // Where a promise stands with Boosthis. EXACTLY TWO, everywhere — the
  // dashboard, the block Boosthis writes into a repository and this page all
  // say it in these words. The wire carries only the closed token, never a
  // sentence, so these literals are the kit's own; a test in the repo holds
  // them byte-equal to the server's vocabulary, so no surface can invent a
  // third wording. The promise TEXT beside them is the developer's own and is
  // set with textContent, exactly like the project name.
  var STANDING = {
    "watched": {
      label: "watched",
      explains: "Boosthis can see this one and knows the line it is held to"
    },
    "remembered-only": {
      label: "remembered only",
      explains: "Boosthis is NOT checking this one"
    }
  };

  /** WHERE JOBS LIVE. Three answers, because a page has three states to be in
   *  and two of them are not "this app has no jobs":
   *
   *    reported      this kit reports named job runs, and they are on the
   *                  dashboard rather than here.
   *    not-reported  this kit reports no named job at all, so the dashboard's
   *                  scheduled-jobs list stays empty for this app whatever it
   *                  runs. Stated, never dressed up as an invitation: these
   *                  kits export no job call to point at.
   *    (anything else, including no answer at all) the sentence already in the
   *                  markup above, which says this page cannot tell.
   *
   *  The wire carries only the closed token, exactly like the drop causes and
   *  the promise standings above; every word here is the kit's own. */
  var JOBTXT = {
    "reported":
      "Not shown on this page. This kit does report named background jobs to " +
      "Boosthis, and their runs, rhythm and lateness are listed on this " +
      "project's dashboard \\u2014 this page showing none is not evidence that " +
      "this app has none.",
    "not-reported":
      "Not shown on this page, and this kit reports no named job at all. " +
      "Background work reaches Boosthis only as the combined background-work " +
      "meter above, so this project's scheduled-jobs list stays empty however " +
      "many jobs this app runs. That is this kit, not your app."
  };

  function el(id) { return document.getElementById(id); }

  /** Say that a table continues past the right-hand edge — but only when it
   *  actually does. The scrolling boxes above are measured after every draw
   *  and on every resize, so the cue follows the screen the reader is on
   *  rather than a guess made when the page was written. A box the reader
   *  cannot see (its card is hidden) measures zero and is left alone. */
  function markOverflow() {
    var pairs = [["axesBox", "axesMoreRight"],
                 ["promisesBox", "promisesMoreRight"]];
    for (var i = 0; i < pairs.length; i++) {
      var box = el(pairs[i][0]);
      var cue = el(pairs[i][1]);
      if (!box || !cue) continue;
      var more = box.clientWidth > 0 && box.scrollWidth > box.clientWidth + 1;
      cue.className = more ? "moreright on" : "moreright";
    }
  }

  function text(node, value) {
    node.textContent = value;
  }

  function ratingClass(rating) {
    return RATINGS[rating] ? rating : "pending";
  }

  /** The "not registered" notice used to state, flatly, that this kit "is
   *  measuring locally but has not registered". On an app whose start was
   *  refused, the first half was untrue — most collectors had never been
   *  armed — and it pointed the reader at delivery while the real problem sat
   *  in the table below. So the sentence is DERIVED from the rows on this
   *  page: it claims local measurement only while the meters say they are
   *  running, and otherwise says how many never started. */
  function noticeBody(kind, notice, data) {
    if (kind !== "not-registered") return notice.body;
    var axes = (data && data.axes) || [];
    var stopped = 0;
    for (var i = 0; i < axes.length; i++) {
      if (axes[i] && axes[i].rating === "not-started") stopped++;
    }
    if (!stopped) return notice.body;
    return "This kit has not registered with Boosthis, so nothing reaches " +
      "your dashboard \\u2014 and " + stopped + " of the " + axes.length +
      " meters below never started, so most of what this page shows is not " +
      "being measured either. Check that a valid project key was supplied " +
      "when the kit was started.";
  }

  function renderNotice(level, title, body) {
    var box = document.createElement("div");
    box.className = "notice " + level;
    var h = document.createElement("h3");
    h.textContent = title;
    var p = document.createElement("p");
    p.textContent = body;
    box.appendChild(h);
    box.appendChild(p);
    return box;
  }

  /** The running "Measurements dropped" figure, or nothing at all when the
   *  server has never refused a row in this process — a healthy app shows no
   *  card here. Never a ratio: the accepted tally counts uploads while the
   *  dropped tally counts rows, so the two cannot be divided. */
  function renderDrops(drops) {
    var card = el("dropsCard");
    if (!card) return;
    var count = drops && typeof drops.count === "number" ? drops.count : 0;
    if (count <= 0) {
      card.style.display = "none";
      return;
    }
    var words = [];
    var causes = (drops.causes && drops.causes.length) ? drops.causes : [];
    for (var i = 0; i < causes.length; i++) {
      var word = DROPTXT[causes[i]];
      if (word) words.push(word);
    }
    text(
      el("dropsValue"),
      String(count) + (words.length ? " \\u2014 " + words.join("; ") : "")
    );
    card.style.display = "";
  }

  /** The running "Measurements never delivered" figure: rows this kit gathered
   *  and gave up on, which never reached Boosthis at all. Hidden when this
   *  process has lost none. Never added to the card above — the server
   *  refusing what we sent and us never sending it ask for different fixes. */
  function renderUndelivered(und) {
    var card = el("undeliveredCard");
    if (!card) return;
    var count = und && typeof und.count === "number" ? und.count : 0;
    if (count <= 0) {
      card.style.display = "none";
      return;
    }
    var words = [];
    var causes = (und.causes && und.causes.length) ? und.causes : [];
    for (var i = 0; i < causes.length; i++) {
      var word = UNDTXT[causes[i]];
      if (word) words.push(word);
    }
    text(
      el("undeliveredValue"),
      String(count) + (words.length ? " \\u2014 " + words.join("; ") : "")
    );
    card.style.display = "";
  }

  /** The developer's own standing promises, or nothing at all. Hidden when the
   *  project holds none and when the reply does not carry them — this page is
   *  a local view, and a promise it cannot read is shown as nothing, never as
   *  an error and never as "none". No verdict is drawn: the kit reads these at
   *  registration, so "currently broken" would be a claim this page cannot
   *  stand behind. The dashboard is where a promise's verdict lives. */
  function renderPromises(promises) {
    var card = el("promisesCard");
    if (!card) return;
    var items = (promises && promises.items && promises.items.length)
      ? promises.items : null;
    if (!items) {
      card.style.display = "none";
      return;
    }
    var body = el("promises");
    body.textContent = "";
    var shown = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item || typeof item !== "object") continue;
      var words = STANDING[item.standing];
      // A standing this page does not know is dropped rather than guessed at:
      // rendering it as either of the two would be a claim about whether
      // Boosthis is checking the promise.
      if (!words || typeof item.text !== "string" || !item.text) continue;

      var row = document.createElement("tr");
      var wording = document.createElement("td");
      wording.textContent = item.text;
      row.appendChild(wording);

      var standing = document.createElement("td");
      var pill = document.createElement("span");
      pill.className = "pill " + (item.standing === "watched" ? "good" : "pending");
      pill.textContent = words.label;
      standing.appendChild(pill);
      var explains = document.createElement("div");
      explains.className = "caption";
      explains.textContent = words.explains;
      standing.appendChild(explains);
      row.appendChild(standing);

      body.appendChild(row);
      shown++;
    }
    if (shown === 0) {
      card.style.display = "none";
      return;
    }
    // A shortened list says so, for the same reason the dropped-rows line
    // never renders a ratio: a reader who takes it for the whole list stops
    // looking. The full set is on the project's own dashboard.
    var total = typeof promises.total === "number" ? promises.total : shown;
    text(
      el("promisesMore"),
      total > shown
        ? "Showing " + shown + " of " + total +
          "; the rest are on this project's dashboard."
        : ""
    );
    card.style.display = "";
  }

  /** Say where scheduled jobs are, always. The card is never hidden: a project
   *  with no jobs and a project with sixty both need this page to say that
   *  jobs are not shown here, because the reader cannot tell the two apart
   *  from an absence. An answer this page does not know keeps the markup's own
   *  "cannot tell" sentence rather than borrowing either real one. */
  function renderJobs(jobs) {
    var card = el("jobsCard");
    if (!card) return;
    var token = jobs && typeof jobs.reporting === "string" ? jobs.reporting : "";
    if (JOBTXT[token]) text(el("jobsValue"), JOBTXT[token]);
    card.style.display = "";
  }

  function renderAxes(axes) {
    var body = el("axes");
    var empty = el("axesEmpty");
    body.textContent = "";

    if (!axes || !axes.length) {
      empty.style.display = "";
      return;
    }
    empty.style.display = "none";

    axes.forEach(function (axis) {
      if (!axis || typeof axis !== "object") return;
      var row = document.createElement("tr");

      var name = document.createElement("td");
      name.textContent = String(axis.label || axis.key || "");
      row.appendChild(name);

      var score = document.createElement("td");
      score.className = "num";
      score.textContent =
        typeof axis.score === "number" ? String(Math.round(axis.score)) : "\\u2014";
      row.appendChild(score);

      var rating = document.createElement("td");
      rating.className = "pillcell";
      var pill = document.createElement("span");
      pill.className = "pill " + ratingClass(axis.rating);
      pill.textContent = axis.rating
        ? (RATING_WORDS[axis.rating] || String(axis.rating))
        : "pending";
      rating.appendChild(pill);
      row.appendChild(rating);

      var caption = document.createElement("td");
      caption.className = "caption";
      caption.textContent = axis.caption ? String(axis.caption) : "";
      row.appendChild(caption);

      body.appendChild(row);
    });
  }

  function render(data) {
    var notices = el("notices");
    notices.textContent = "";

    // A locked install shows the lock and nothing else — the kit deliberately
    // omits the meters from the payload in that state.
    if (data.lock) {
      var title = data.lock.title || "Boosthis is unavailable";
      var body = data.lock.body ||
        "This project's Boosthis access is not currently available. " +
        "Check the account status at boosthis.com.";
      notices.appendChild(renderNotice("stop", title, body));
      el("heroCard").style.display = "none";
      el("dropsCard").style.display = "none";
      el("undeliveredCard").style.display = "none";
      // The jobs card STAYS. A locked install is exactly the reader who can
      // check nothing else, and a page that drops the section here is once
      // again a page that reads as "this app has no scheduled jobs". The
      // sentence is about where jobs live, which a lock does not change.
      renderJobs(data.jobs);
      renderPromises(null);
      text(el("sub"), "Paused");
      return;
    }
    el("heroCard").style.display = "";

    if (data.notice && NOTICES[data.notice.kind]) {
      var n = NOTICES[data.notice.kind];
      notices.appendChild(
        renderNotice(n.level, n.title, noticeBody(data.notice.kind, n, data)));
    }

    // Where this project's key came from. One codebase can hold two projects,
    // so a developer looking at this page must be able to tell WHICH key the
    // kit is actually using — masked to its last four characters, never whole.
    // WHICH PROJECT this kit feeds, in the developer's own words. The name is
    // the ONE developer-authored string this page draws from the wire: the kit
    // sanitises it and already spells the whole line out (name + short code, or
    // its own "not received yet" wording), and it is set with textContent here,
    // so it can only ever be read as text.
    var projLine = el("projLine");
    if (projLine) {
      text(
        projLine,
        "Project: " +
          (typeof data.project === "string" && data.project
            ? data.project
            : "Not received from Boosthis yet")
      );
    }

    // WHICH INSTALL the verdict above is about. Opaque identifier only — the
    // kit's credentials are never drawn on this page.
    var installLine = el("installLine");
    if (installLine) {
      text(
        installLine,
        "Install ID: " +
          (typeof data.installId === "string" && data.installId
            ? data.installId
            : "not assigned yet")
      );
    }

    if (data.projectKey && data.projectKey.source) {
      var keyTitle = data.projectKey.display
        ? "Project key " + data.projectKey.display
        : "Project key";
      notices.appendChild(renderNotice("", keyTitle, data.projectKey.source));
    }

    var score = el("score");
    if (typeof data.score === "number") {
      score.className = "score";
      score.textContent = String(Math.round(data.score));
    } else {
      score.className = "score pending";
      score.textContent = "\\u2014";
    }

    var rating = el("rating");
    rating.className = "pill " + ratingClass(data.rating);
    rating.textContent = data.rating ? String(data.rating) : "pending";

    var count = typeof data.sampleCount === "number" ? data.sampleCount : 0;
    text(
      el("samples"),
      count === 0
        ? "no requests measured yet"
        : count === 1
          ? "1 request measured"
          : count + " requests measured"
    );

    renderDrops(data.drops);
    renderUndelivered(data.undelivered);
    renderPromises(data.promises);
    renderJobs(data.jobs);
    renderAxes(data.axes);
    text(el("sub"), "Live from this app. Refreshes every few seconds.");
    markOverflow();
  }

  function fail(message) {
    var notices = el("notices");
    notices.textContent = "";
    notices.appendChild(
      renderNotice(
        "stop",
        "Could not read this app's numbers",
        message
      )
    );
    text(el("sub"), "Not reading");
  }

  function poll() {
    var done = false;
    var xhr = new XMLHttpRequest();
    // Relative to this page so a custom mount path keeps working.
    xhr.open("GET", PANEL, true);
    xhr.timeout = 8000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4 || done) return;
      done = true;
      if (xhr.status !== 200) {
        fail(
          "The kit answered with status " + xhr.status + ". The page is " +
          "served, but the data endpoint next to it is not answering."
        );
        return;
      }
      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (err) {
        fail("The kit's reply could not be read.");
        return;
      }
      if (!data || typeof data !== "object") {
        fail("The kit's reply was empty.");
        return;
      }
      try {
        render(data);
      } catch (err) {
        fail("This page could not draw the kit's reply.");
      }
    };
    xhr.ontimeout = function () {
      if (done) return;
      done = true;
      fail("The kit did not answer in time.");
    };
    xhr.onerror = function () {
      if (done) return;
      done = true;
      fail("The kit could not be reached from this page.");
    };
    try {
      xhr.send();
    } catch (err) {
      if (!done) {
        done = true;
        fail("This page could not contact the kit.");
      }
    }
  }

  poll();
  setInterval(poll, 5000);
  // A rotated phone is a different screen: what fitted in landscape does not
  // fit in portrait, so the cue is re-measured rather than left as it was.
  if (window.addEventListener) {
    window.addEventListener("resize", markOverflow, false);
  }
})();
<\/script>
</body>
</html>
`;
const DASHBOARD_MARKUP = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Boosthis — Node perf dashboard</title>
<style>
  :root {
    --bg: #0e1116; --panel: #161b22; --border: #30363d;
    --text: #e6edf3; --muted: #7d8590;
    --good: #2ea043; --warn: #d29922; --poor: #f85149;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, sans-serif;
    background: var(--bg); color: var(--text); padding: 24px; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .sub { color: var(--muted); margin-bottom: 24px; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px; margin-bottom: 24px; }
  .card { background: var(--panel); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px; }
  .label { color: var(--muted); font-size: 12px; text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 4px; }
  .value { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .panel { background: var(--panel); border: 1px solid var(--border);
    border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .panel h2 { margin: 0 0 12px; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 500; font-size: 12px;
    text-transform: uppercase; letter-spacing: 0.5px; }
  td.num { text-align: right; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px;
    font-size: 12px; font-weight: 500; }
  .tag.good { background: rgba(46,160,67,0.15); color: var(--good); }
  .tag.needs-work { background: rgba(210,153,34,0.15); color: var(--warn); }
  .tag.poor { background: rgba(248,81,73,0.15); color: var(--poor); }
  .tag.regressed { background: rgba(248,81,73,0.15); color: var(--poor); }
  .tag.improved { background: rgba(46,160,67,0.15); color: var(--good); }
  .tag.declared { background: rgba(125,133,144,0.15); color: var(--muted); }
  .tag.stable { background: rgba(125,133,144,0.15); color: var(--muted); }
  .tag.learning { background: rgba(125,133,144,0.15); color: var(--muted); }
  .err { background: rgba(248,81,73,0.1); border: 1px solid var(--poor);
    padding: 12px; border-radius: 8px; color: var(--poor); }
  .empty { color: var(--muted); font-style: italic; padding: 16px 0; }
  footer { color: var(--muted); font-size: 12px; margin-top: 32px; }
  a { color: #58a6ff; }
  pre { background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    padding: 12px; margin: 4px 0 12px; overflow-x: auto; color: var(--text);
    font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre-wrap; word-break: break-all; }
  .hint { color: var(--muted); font-size: 13px; margin: 0 0 12px; }
</style>
</head>
<body>
<h1>Boosthis — Node perf dashboard</h1>
<div class="sub" id="sub">Loading…</div>

<div id="error" class="err" style="display:none"></div>

<div class="grid" id="kpis"></div>

<div class="panel" id="connect" style="display:none">
  <h2>Connect your AI</h2>
  <p class="hint">
    Let your own AI read this app's live performance picture over Boosthis's
    hosted MCP. Paste the config into your AI tool, then give it the install id
    and read token as tool arguments. The read token is read-only and scoped to
    this app — it can read only this app's own data and cannot delete or ingest.
  </p>
  <div class="label">MCP config (replace &lt;YOUR_INVITE_KEY&gt;)</div>
  <pre id="connectConfig"></pre>
  <div class="label">Install id</div>
  <pre id="connectInstall"></pre>
  <div class="label">Read token (read-only)</div>
  <pre id="connectToken"></pre>
</div>

<div class="panel">
  <h2>Per-route summary</h2>
  <table id="routes"><thead><tr>
    <th>Route</th><th class="num">Samples</th><th class="num">Max ms</th><th>Worst</th>
  </tr></thead><tbody></tbody></table>
  <p class="sub" id="declaredNote" style="display:none;margin:12px 0 0">
    Declared: a route you said waits on purpose. Its calls are kept out of every
    speed reading, so the count is the calls kept out and the time is the
    longest wait. Errors still count.
  </p>
</div>

<div class="panel">
  <h2>Auto budgets</h2>
  <table id="budgets"><thead><tr>
    <th>Route</th><th>State</th>
    <th class="num">Baseline p95</th><th class="num">Recent p95</th>
  </tr></thead><tbody></tbody></table>
</div>

<div class="panel">
  <h2>Recent samples</h2>
  <table id="recent"><thead><tr>
    <th>When</th><th>Route</th><th class="num">ms</th><th>Rating</th>
  </tr></thead><tbody></tbody></table>
</div>

<!-- WHAT THIS VIEW DOES NOT SHOW. Same answer as the shared page's jobs
     card and the status page's jobs row: this is a local view of one process,
     and a job's runs, rhythm and lateness are assembled server-side. Always
     drawn, because a view that simply omits jobs reads as a view reporting
     there are none. See docs/decisions/kit-page-says-where-jobs-live.md. -->
<div class="panel">
  <h2>Scheduled jobs</h2>
  <p class="hint">
    Not listed here. This kit reports named job runs to Boosthis, so they
    appear on your dashboard &mdash; this page showing none is not evidence
    there are none.
  </p>
</div>

<footer>
  Read-only. Auto-refreshes every 5 s. Data:
  <a id="lnkSummary" href="">/summary</a> · <a id="lnkRecent" href="">/recent</a> ·
  <a id="lnkBudgets" href="">/budgets</a><br>
  This detailed view is specific to the Node kit and stays on this machine.
  The shared Boosthis page is at <a id="lnkPage" href="">/_boosthis</a>.
</footer>

<script>
(function () {
  // This view is served at <prefix>/dev; every read it makes lives one level
  // up, next to the shared in-app page at <prefix>. Strip the trailing /dev
  // (and any trailing slash) so the reads resolve wherever the kit is mounted.
  const base = window.location.pathname
    .replace(/\\/+$/, "")
    .replace(/\\/dev$/, "");
  const $ = (id) => document.getElementById(id);

  function tag(cls, text) {
    return '<span class="tag ' + cls + '">' + text + '</span>';
  }
  function fmt(n) { return n == null ? "—" : Math.round(n); }
  function timeAgo(ms) {
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.round(s / 60) + "m ago";
    return Math.round(s / 3600) + "h ago";
  }

  async function load() {
    try {
      const [summary, recent, budgets] = await Promise.all([
        fetch(base + "/summary").then((r) => r.json()),
        fetch(base + "/recent?limit=30").then((r) => r.json()),
        fetch(base + "/budgets").then((r) => r.json()),
      ]);
      $("error").style.display = "none";

      $("sub").textContent = summary.total + " samples · refreshed " + new Date().toLocaleTimeString();

      // All sample/route fields are attacker-controlled (req.path fallback),
      // so build DOM with text nodes rather than HTML string concatenation.
      function cell(text, cls) {
        var td = document.createElement("td");
        if (cls) td.className = cls;
        td.textContent = String(text);
        return td;
      }
      function tagCell(rating) {
        var td = document.createElement("td");
        var span = document.createElement("span");
        span.className = "tag " + (rating || "");
        span.textContent = String(rating || "");
        td.appendChild(span);
        return td;
      }
      function setRows(tbody, rows, emptyMsg) {
        tbody.textContent = "";
        if (!rows.length) {
          var tr = document.createElement("tr");
          var td = document.createElement("td");
          td.colSpan = 4; td.className = "empty"; td.textContent = emptyMsg;
          tr.appendChild(td); tbody.appendChild(tr);
          return;
        }
        for (var i = 0; i < rows.length; i++) {
          var tr = document.createElement("tr");
          rows[i].forEach(function (c) { tr.appendChild(c); });
          tbody.appendChild(tr);
        }
      }

      // Additive dashboard gauges (Code Health + Resilience). Captions carry
      // only counts/ratios (no route names), but build with text nodes anyway.
      function axisCard(ax) {
        var card = document.createElement("div"); card.className = "card";
        var label = document.createElement("div"); label.className = "label"; label.textContent = ax.label;
        var value = document.createElement("div"); value.className = "value";
        value.textContent = ax.score == null ? "—" : String(ax.score);
        value.style.color =
          ax.rating === "good" ? "var(--good)" :
          ax.rating === "needs-work" ? "var(--warn)" :
          ax.rating === "poor" ? "var(--poor)" : "var(--muted)";
        var sub = document.createElement("div");
        sub.className = "label";
        sub.style.textTransform = "none"; sub.style.letterSpacing = "0"; sub.style.marginTop = "6px";
        sub.textContent = ax.caption;
        card.appendChild(label); card.appendChild(value); card.appendChild(sub);
        return card;
      }

      var kpis = $("kpis");
      kpis.textContent = "";
      var axes = summary.axes || {};
      [axes.codeHealth, axes.resilience].forEach(function (ax) {
        if (ax) kpis.appendChild(axisCard(ax));
      });
      [["Total", summary.total], ["Good", summary.good], ["Needs work", summary.needsWork],
       ["Poor", summary.poor], ["p50 ms", fmt(summary.p50_ms)],
       ["p95 ms", fmt(summary.p95_ms)], ["p99 ms", fmt(summary.p99_ms)]].forEach(function (kv) {
        var card = document.createElement("div"); card.className = "card";
        var label = document.createElement("div"); label.className = "label"; label.textContent = kv[0];
        var value = document.createElement("div"); value.className = "value"; value.textContent = String(kv[1]);
        card.appendChild(label); card.appendChild(value); kpis.appendChild(card);
      });

      var routes = Object.entries(summary.byRoute || {}).sort(function (a, b) { return b[1].max_ms - a[1].max_ms; });
      // Routes declared as waiting on purpose have no samples by design: they
      // are listed as declared, never left to read as missing.
      var declared = ((summary.declaredWaits || {}).routes || []);
      $("declaredNote").style.display = declared.length ? "block" : "none";
      setRows($("routes").querySelector("tbody"),
        routes.map(function (pair) {
          return [cell(pair[0]), cell(pair[1].count, "num"), cell(pair[1].max_ms, "num"), tagCell(pair[1].worst_rating)];
        }).concat(declared.map(function (d) {
          return [cell(d.name), cell(d.excluded, "num"), cell(d.excluded > 0 ? d.worstMs : "—", "num"), tagCell("declared")];
        })),
        "No samples yet. Add app.use(boosthis()) to start recording.");

      setRows($("budgets").querySelector("tbody"),
        (budgets.all || []).map(function (b) {
          return [cell(b.route), tagCell(b.state), cell(fmt(b.baseline_p95_ms), "num"), cell(fmt(b.recent_p95_ms), "num")];
        }),
        "No budgets yet. Need ≥20 samples per route.");

      setRows($("recent").querySelector("tbody"),
        (recent || []).map(function (s) {
          return [cell(timeAgo(s.timestamp_ms)), cell(s.name), cell(s.duration_ms, "num"), tagCell(s.rating)];
        }),
        "No samples yet.");
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      $("error").style.display = "block";
      $("error").textContent =
        "Could not load Boosthis data: " + msg +
        ". If this dashboard is loaded over the public internet, you need to mount() with { allowRemote: true } and put auth in front.";
    }
  }

  // "Connect your AI" card. Loopback-only endpoint; if it 403s (remote) or has
  // no read token yet, the panel stays hidden. Uses textContent (never innerHTML)
  // since it renders a credential.
  async function loadConnect() {
    try {
      const c = await fetch(base + "/connect").then((r) => r.ok ? r.json() : null);
      if (!c || !c.connected) { $("connect").style.display = "none"; return; }
      $("connectConfig").textContent = c.mcpConfig || "";
      $("connectInstall").textContent = c.installId || "";
      $("connectToken").textContent = c.readToken || "";
      $("connect").style.display = "block";
    } catch (e) {
      $("connect").style.display = "none";
    }
  }

  // Footer links, resolved against the mounted prefix rather than this page's
  // own address (which sits one level deeper, at <prefix>/dev).
  $("lnkSummary").href = base + "/summary";
  $("lnkRecent").href = base + "/recent";
  $("lnkBudgets").href = base + "/budgets";
  $("lnkPage").href = base + "/";
  $("lnkPage").textContent = base || "/";

  load();
  loadConnect();
  setInterval(load, 5000);
  setInterval(loadConnect, 15000);
})();
<\/script>
</body>
</html>
`;
export {
  DASHBOARD_MARKUP,
  PANEL_PAGE_MARKUP
};
