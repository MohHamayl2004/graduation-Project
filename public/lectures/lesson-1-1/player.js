/* ============================================================
   NIPRAS lecture player.

   Plays a lecture the way a video plays - one timeline, a voice,
   things appearing as the teacher reaches them - from slides and
   audio files instead of a video file.

   Voice: audio/NN.* when the TTS service made one; otherwise the
   browser's own Arabic voice (speechSynthesis), so a lecture is
   usable before any audio exists.

   The focus question stops the lecture until it is answered. It
   is never asked twice, and seeking past it does not skip it
   (docs/contracts/interactive-lesson-v1.md, rules 1-2). Answers
   go to the parent page through postMessage, so the React app
   can store them as progress (rule 4).
   ============================================================ */

(function () {
  "use strict";

  var data = JSON.parse(document.getElementById("lecture-data").textContent);
  var items = data.items;

  var player = document.getElementById("player");
  var stage = document.getElementById("stage");
  var audio = document.getElementById("audio");
  var caption = document.getElementById("caption");
  var cover = document.getElementById("cover");
  var seek = document.getElementById("seek");
  var seekFill = document.getElementById("seek-fill");
  var seekMarks = document.getElementById("seek-marks");
  var timeLabel = document.getElementById("time");
  var nowLabel = document.getElementById("now");
  var speedButton = document.getElementById("speed");
  var ccButton = document.getElementById("cc");
  var slides = items.map(function (item) { return document.getElementById(item.id); });
  var chapters = Array.prototype.slice.call(document.querySelectorAll(".chapter"));

  var SPEEDS = [1, 1.25, 1.5, 0.75];

  var state = {
    index: 0,
    offset: 0,          // seconds into the current item, at speed 1
    playing: false,
    started: false,
    speed: 1,
    waiting: false,     // stopped on an unanswered focus question
    answered: {},       // item index -> { choice, correct, first }
    durations: items.map(function (item) { return item.seconds; }),
    sentence: 0,        // speech mode: which sentence is being read
    lastTick: 0
  };

  // ---------- helpers ----------

  var DIGITS = "٠١٢٣٤٥٦٧٨٩";

  function arabicDigits(text) {
    return String(text).replace(/[0-9]/g, function (d) { return DIGITS[+d]; });
  }

  function clock(seconds) {
    seconds = Math.max(0, Math.round(seconds));
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return arabicDigits(m + ":" + (s < 10 ? "0" : "") + s);
  }

  function total() {
    return state.durations.reduce(function (a, b) { return a + b; }, 0);
  }

  function startOf(index) {
    var sum = 0;
    for (var i = 0; i < index; i++) sum += state.durations[i];
    return sum;
  }

  function sentencesOf(text) {
    // Short pieces: they make captions readable and keep each
    // speechSynthesis utterance under the length Chrome cuts off.
    var parts = String(text || "")
      .split(/(?<=[.،؛:!؟?\n])\s+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    var out = [];
    parts.forEach(function (part) {
      var words = part.split(/\s+/);
      while (words.length > 18) out.push(words.splice(0, 14).join(" "));
      out.push(words.join(" "));
    });
    return out.length ? out : [""];
  }

  items.forEach(function (item) {
    item.speechParts = sentencesOf(item.speech);
    item.captionParts = sentencesOf(item.caption);
  });

  function weightsOf(parts) {
    var lengths = parts.map(function (p) { return Math.max(1, p.length); });
    var sum = lengths.reduce(function (a, b) { return a + b; }, 0);
    var at = 0;
    return lengths.map(function (l) { var start = at / sum; at += l; return start; });
  }

  function partAt(parts, progress) {
    var starts = weightsOf(parts);
    var index = 0;
    for (var i = 0; i < starts.length; i++) if (progress >= starts[i]) index = i;
    return index;
  }

  function isCheck(index) { return items[index] && items[index].kind === "check"; }

  function firstUnansweredCheckBefore(index) {
    for (var i = 0; i < index; i++) if (isCheck(i) && !state.answered[i]) return i;
    return -1;
  }

  function send(event, detail) {
    var message = Object.assign({ type: "nipras-lecture", event: event, lecture: data.code }, detail);
    try { window.parent.postMessage(message, "*"); } catch (e) { /* standalone */ }
  }

  // ---------- drawing ----------

  function drawTimeline() {
    var length = total();
    seekMarks.innerHTML = "";
    items.forEach(function (item, i) {
      if (i === 0) return;
      var mark = document.createElement("span");
      mark.className = "seek-mark" + (item.kind === "check" ? " check" : "");
      mark.style.insetInlineStart = (startOf(i) / length * 100) + "%";
      seekMarks.appendChild(mark);
    });
    document.querySelectorAll("[data-time]").forEach(function (el) {
      el.textContent = clock(startOf(+el.getAttribute("data-time")));
    });
    document.getElementById("cover-meta").textContent =
      clock(length) + " دقيقة — " + arabicDigits(items.length) + " أقسام — فيها سؤال تركيز";
  }

  function showSlide(index) {
    slides.forEach(function (slide, i) {
      var active = i === index;
      slide.classList.toggle("active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    chapters.forEach(function (c, i) { c.classList.toggle("current", i === index); });
    stage.setAttribute("data-kind", items[index].kind);
    nowLabel.textContent = items[index].heading;
    if (isCheck(index)) restoreCheck(index);
    fit(slides[index]);
  }

  // The model decides how much goes on a slide; the stage does not
  // grow. Measured with everything laid out (unrevealed items take
  // their space at opacity 0), so nothing jumps as they appear.
  function fit(slide) {
    var inner = slide.querySelector(".slide-inner");
    inner.style.setProperty("--fit", "1");
    var style = getComputedStyle(slide);
    var room = slide.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    var need = inner.scrollHeight;
    if (need > room && room > 0) {
      inner.style.setProperty("--fit", String(Math.max(0.55, room / need)));
    }
  }

  window.addEventListener("resize", function () { fit(slides[state.index]); });
  if (document.fonts) document.fonts.ready.then(function () { fit(slides[state.index]); });
  document.addEventListener("fullscreenchange", function () { fit(slides[state.index]); });

  function drawProgress() {
    var index = state.index;
    var length = state.durations[index] || 1;
    var progress = Math.min(0.999, state.offset / length);

    // Points, the formula and each step appear in order, spread
    // over the first 85% of what the teacher says about them.
    var reveals = slides[index].querySelectorAll("[data-reveal]");
    var shownCount = 0;
    reveals.forEach(function (el, i) {
      var at = reveals.length > 1 ? (i / reveals.length) * 0.85 : 0;
      var shown = progress >= at || !state.started;
      el.classList.toggle("shown", shown);
      if (shown) shownCount = i + 1;
    });
    var steps = slides[index].querySelectorAll(".step");
    steps.forEach(function (el) { el.classList.remove("current"); });
    var shownSteps = slides[index].querySelectorAll(".step.shown");
    if (shownSteps.length) shownSteps[shownSteps.length - 1].classList.add("current");

    var parts = items[index].captionParts;
    var text = state.started ? parts[partAt(parts, progress)] : "";
    caption.innerHTML = "";
    if (text) {
      var span = document.createElement("span");
      span.textContent = text;
      caption.appendChild(span);
    }

    var now = startOf(index) + Math.min(state.offset, length);
    var fraction = now / total();
    seekFill.style.width = (fraction * 100) + "%";
    seek.setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
    seek.setAttribute("aria-valuetext", clock(now));
    timeLabel.textContent = clock(now) + " / " + clock(total());
  }

  function setPlaying(playing) {
    state.playing = playing;
    player.classList.toggle("playing", playing);
    document.getElementById("play").setAttribute("aria-label", playing ? "إيقاف مؤقت" : "تشغيل");
  }

  // ---------- the voice ----------

  var voice = null;

  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    var voices = window.speechSynthesis.getVoices();
    voice = voices.filter(function (v) { return /^ar/i.test(v.lang); })[0] || null;
  }

  if ("speechSynthesis" in window) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  var speechToken = 0;

  function stopVoice() {
    speechToken++;
    audio.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function speakFrom(index, sentence) {
    var token = ++speechToken;
    var parts = items[index].speechParts;
    var starts = weightsOf(parts);

    if (!("speechSynthesis" in window) || !parts[0]) {
      // No voice at all: the timeline still runs on the estimate.
      return;
    }

    function say(i) {
      if (token !== speechToken) return;
      if (i >= parts.length) { itemEnded(index); return; }
      var u = new SpeechSynthesisUtterance(parts[i]);
      u.lang = voice ? voice.lang : "ar-SA";
      if (voice) u.voice = voice;
      u.rate = state.speed;
      u.onstart = function () {
        if (token !== speechToken) return;
        state.sentence = i;
        // Re-anchor the clock to where this sentence starts, so the
        // reveals follow the voice rather than drift from it.
        state.offset = Math.max(state.offset, starts[i] * state.durations[index]);
      };
      u.onend = function () { say(i + 1); };
      u.onerror = function () { say(i + 1); };
      window.speechSynthesis.speak(u);
    }

    say(sentence);
  }

  function playVoice() {
    var item = items[state.index];
    if (item.audio) {
      if (audio.getAttribute("data-item") !== item.id) {
        audio.src = item.audio;
        audio.setAttribute("data-item", item.id);
      }
      audio.playbackRate = state.speed;
      var go = function () {
        try { audio.currentTime = Math.min(state.offset, (audio.duration || 1e9) - 0.05); } catch (e) {}
        audio.play().catch(function () { setPlaying(false); });
      };
      if (audio.readyState >= 1) go(); else audio.addEventListener("loadedmetadata", go, { once: true });
    } else {
      var parts = item.speechParts;
      var progress = state.offset / (state.durations[state.index] || 1);
      speakFrom(state.index, partAt(parts, progress));
    }
  }

  audio.addEventListener("loadedmetadata", function () {
    var index = items.findIndex(function (it) { return it.id === audio.getAttribute("data-item"); });
    if (index >= 0 && isFinite(audio.duration)) {
      state.durations[index] = audio.duration;
      drawTimeline();
    }
  });

  audio.addEventListener("ended", function () { itemEnded(state.index); });

  // Real durations for the whole timeline, before they are played.
  items.forEach(function (item, i) {
    if (!item.audio) return;
    var probe = new Audio();
    probe.preload = "metadata";
    probe.src = item.audio;
    probe.addEventListener("loadedmetadata", function () {
      if (isFinite(probe.duration)) { state.durations[i] = probe.duration; drawTimeline(); drawProgress(); }
    });
  });

  // ---------- the clock ----------

  function tick(now) {
    if (state.playing && !state.waiting) {
      var item = items[state.index];
      if (item.audio && !audio.paused) {
        state.offset = audio.currentTime;
      } else if (!item.audio) {
        var dt = state.lastTick ? (now - state.lastTick) / 1000 : 0;
        state.offset += dt * state.speed;
        var noVoice = !("speechSynthesis" in window);
        if (noVoice && state.offset >= state.durations[state.index]) itemEnded(state.index);
      }
      drawProgress();
    }
    state.lastTick = now;
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // ---------- moving through the lecture ----------

  function itemEnded(index) {
    if (index !== state.index) return;

    // Speech finished early or late: the estimate becomes the truth.
    if (!items[index].audio && state.offset > 1) {
      state.durations[index] = state.offset;
      drawTimeline();
    }

    if (isCheck(index) && !state.answered[index]) {
      state.waiting = true;
      state.offset = state.durations[index];
      drawProgress();
      var first = slides[index].querySelector(".choice");
      if (first) first.focus({ preventScroll: true });
      return;
    }

    if (index + 1 < items.length) {
      go(index + 1, 0, true);
    } else {
      stopVoice();
      setPlaying(false);
      state.offset = state.durations[index];
      drawProgress();
      send("completed", { answered: answersList() });
    }
  }

  function go(index, offset, keepPlaying) {
    // Never past an unanswered focus question (rule 2).
    var blocked = firstUnansweredCheckBefore(index);
    if (blocked >= 0) { index = blocked; offset = 0; }

    index = Math.max(0, Math.min(items.length - 1, index));
    stopVoice();
    state.index = index;
    state.offset = Math.max(0, offset || 0);
    state.waiting = false;
    showSlide(index);
    drawProgress();
    if (keepPlaying !== false && state.playing) playVoice();
  }

  function seekTo(seconds) {
    var index = 0;
    while (index < items.length - 1 && seconds >= startOf(index + 1)) index++;
    go(index, seconds - startOf(index), true);
  }

  function play() {
    if (!state.started) {
      state.started = true;
      cover.classList.add("gone");
    }
    if (state.waiting) return;
    setPlaying(true);
    playVoice();
  }

  function pause() {
    setPlaying(false);
    stopVoice();
  }

  function toggle() { state.playing ? pause() : play(); }

  // ---------- the focus question ----------

  function answersList() {
    return Object.keys(state.answered).map(function (i) {
      return Object.assign({ checkpointId: items[i].id }, state.answered[i]);
    });
  }

  function restoreCheck(index) {
    var answer = state.answered[index];
    if (!answer) return;
    var slide = slides[index];
    slide.querySelectorAll(".choice").forEach(function (b) {
      b.disabled = true;
      b.classList.toggle("right", items[index].choices[+b.dataset.index].correct);
    });
    slide.querySelector(".continue").hidden = false;
  }

  slides.forEach(function (slide, index) {
    if (!isCheck(index)) return;
    var feedback = slide.querySelector(".feedback");
    var next = slide.querySelector(".continue");

    slide.querySelectorAll(".choice").forEach(function (button) {
      button.addEventListener("click", function () {
        if (state.answered[index]) return;
        var choice = items[index].choices[+button.dataset.index];
        var at = startOf(index) + state.offset;

        feedback.hidden = false;
        feedback.textContent = choice.feedback || (choice.correct ? "صحيح." : "مش هيك.");
        feedback.className = "feedback " + (choice.correct ? "good" : "bad");

        if (!state.firstTry) state.firstTry = {};
        if (state.firstTry[index] === undefined) state.firstTry[index] = choice.correct;

        send("answer", {
          checkpointId: items[index].id,
          answerId: +button.dataset.index,
          correct: choice.correct,
          atSeconds: Math.round(at)
        });

        if (choice.correct) {
          button.classList.add("right");
          state.answered[index] = {
            answerId: +button.dataset.index,
            correct: true,
            firstTry: state.firstTry[index],
            atSeconds: Math.round(at)
          };
          slide.querySelectorAll(".choice").forEach(function (b) { b.disabled = true; });
          next.hidden = false;
          next.focus({ preventScroll: true });
        } else {
          // A wrong answer is marked and explained; the student
          // tries again. The first try is what measures focus.
          button.classList.add("wrong");
          button.disabled = true;
        }
      });
    });

    next.addEventListener("click", function () {
      state.waiting = false;
      if (!state.playing) setPlaying(true);
      go(index + 1, 0, true);
    });
  });

  // ---------- controls ----------

  document.getElementById("start").addEventListener("click", play);
  document.getElementById("play").addEventListener("click", toggle);
  document.getElementById("next").addEventListener("click", function () { go(state.index + 1, 0, true); });
  document.getElementById("prev").addEventListener("click", function () {
    go(state.offset > 3 ? state.index : state.index - 1, 0, true);
  });

  speedButton.addEventListener("click", function () {
    var next = SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length];
    state.speed = next;
    speedButton.textContent = arabicDigits(String(next)) + "×";
    audio.playbackRate = next;
    if (state.playing && !items[state.index].audio) playVoice();
  });

  ccButton.addEventListener("click", function () {
    var on = player.classList.toggle("no-cc") === false;
    ccButton.classList.toggle("on", on);
    ccButton.setAttribute("aria-pressed", String(on));
  });

  document.getElementById("full").addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (player.requestFullscreen) player.requestFullscreen();
  });

  chapters.forEach(function (chapter) {
    chapter.addEventListener("click", function () {
      if (!state.started) { state.started = true; cover.classList.add("gone"); setPlaying(true); }
      go(+chapter.dataset.go, 0, true);
      player.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  function seekFromPointer(event) {
    var rect = seek.getBoundingClientRect();
    // The page is right-to-left: the lecture starts at the right.
    var fraction = (rect.right - event.clientX) / rect.width;
    if (getComputedStyle(seek).direction !== "rtl") fraction = (event.clientX - rect.left) / rect.width;
    fraction = Math.max(0, Math.min(1, fraction));
    if (!state.started) { state.started = true; cover.classList.add("gone"); }
    seekTo(fraction * total());
  }

  seek.addEventListener("click", seekFromPointer);

  seek.addEventListener("keydown", function (event) {
    var now = startOf(state.index) + state.offset;
    if (event.key === "ArrowLeft") { seekTo(now + 5); event.preventDefault(); }
    if (event.key === "ArrowRight") { seekTo(now - 5); event.preventDefault(); }
  });

  document.addEventListener("keydown", function (event) {
    if (event.target.closest && event.target.closest("button, .seek")) {
      if (event.key !== " ") return;
      if (event.target.classList.contains("choice")) return;
    }
    if (event.key === " " || event.key === "k") { toggle(); event.preventDefault(); }
    else if (event.key === "ArrowLeft") go(state.index + 1, 0, true);   // forward, right-to-left
    else if (event.key === "ArrowRight") go(state.index - 1, 0, true);
    else if (event.key === "c") ccButton.click();
    else if (event.key === "f") document.getElementById("full").click();
  });

  // ---------- start ----------

  drawTimeline();
  showSlide(0);
  drawProgress();
})();
