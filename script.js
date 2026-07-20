/* =========================================================
   AKASH'S BIRTHDAY SITE — SCRIPT
   Sections: config, GA4 helper, confetti, balloon/curtain game,
   bullet bike ride, curve lights + hero highlight, gallery +
   lightbox, cake candles, curated messages.
========================================================= */
(function(){
  "use strict";

  /* ---------------------------------------------------------
     0. CONFIG — edit here to customise
  --------------------------------------------------------- */
  var PERSON_NAME = "Akash";
  var BIRTHDAY_MONTH = 6;   // 0-indexed: June=5, July=6
  var BIRTHDAY_DAY = 21;

  // Edit captions here. Filenames map to /images/photoN.jpg
  var PHOTOS = [
    { src: "images/photo1.jpg", caption: "Golden hour, better company" },
    { src: "images/photo2.jpg", caption: "Chasing waterfalls together" },
    { src: "images/photo3.jpg", caption: "Coffee, pistachios, peace signs" },
    { src: "images/photo4.jpg", caption: "Self-care Sunday, mask and all" },
    { src: "images/photo5.jpg", caption: "Close-ups with my favorite person" }
  ];

  var BALLOON_COUNT = 6;
  var CANDLE_COUNT = 6;
  var BALLOON_COLORS = ["#FF6F91", "#F4B740", "#4ECDC4", "#C99530", "#FF8FA8", "#6FE0D6"];

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     0b. SOUND ENGINE — synthesized SFX (no audio files needed),
     built to survive iOS Safari's autoplay/gesture restrictions.
     A single shared AudioContext is created lazily and unlocked
     on the very first touch/click/key anywhere on the page, then
     resumed defensively before every sound.
  --------------------------------------------------------- */
  var SoundEngine = (function(){
    var ctx = null;
    var unlocked = false;

    function getCtx(){
      if (!ctx){
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        try{ ctx = new AudioCtx(); } catch(e){ return null; }
      }
      return ctx;
    }

    function unlock(){
      var c = getCtx();
      if (!c) return;
      if (c.state === "suspended"){ c.resume(); }
      if (!unlocked){
        // iOS needs an actual sound buffer played inside the gesture
        // to fully unlock audio — a near-silent 1-sample blip does it.
        try{
          var buffer = c.createBuffer(1, 1, 22050);
          var src = c.createBufferSource();
          src.buffer = buffer;
          src.connect(c.destination);
          src.start(0);
        } catch(e){ /* no-op */ }
        unlocked = true;
      }
    }

    // unlock on the first user gesture of any kind
    ["touchend", "mousedown", "keydown", "click"].forEach(function(evt){
      window.addEventListener(evt, unlock, { once: true, passive: true });
    });

    function tone(opts){
      var c = getCtx();
      if (!c) return;
      if (c.state === "suspended"){ c.resume(); }

      var startTime = c.currentTime + (opts.delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = opts.type || "sine";

      if (opts.freq != null) osc.frequency.setValueAtTime(opts.freq, startTime);
      if (opts.freqTo != null){
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(opts.freqTo, 1), startTime + (opts.freqRampTime || opts.duration)
        );
      }

      var peak = opts.peak != null ? opts.peak : 0.22;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(peak, startTime + (opts.attack || 0.012));
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + opts.duration);

      if (opts.filterFreq){
        var filter = c.createBiquadFilter();
        filter.type = opts.filterType || "lowpass";
        filter.frequency.value = opts.filterFreq;
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(c.destination);

      osc.start(startTime);
      osc.stop(startTime + opts.duration + 0.05);
    }

    // short burst of filtered white noise — used for the "pop" snap
    function noiseBurst(opts){
      var c = getCtx();
      if (!c) return;
      if (c.state === "suspended"){ c.resume(); }

      var startTime = c.currentTime + (opts.delay || 0);
      var duration = opts.duration || 0.12;
      var bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
      var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++){
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // fade-out noise
      }

      var src = c.createBufferSource();
      src.buffer = buffer;

      var filter = c.createBiquadFilter();
      filter.type = opts.filterType || "bandpass";
      filter.frequency.value = opts.filterFreq || 1200;
      filter.Q.value = opts.q || 0.9;

      var gain = c.createGain();
      var peak = opts.peak != null ? opts.peak : 0.5;
      gain.gain.setValueAtTime(peak, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);

      src.start(startTime);
      src.stop(startTime + duration + 0.02);
    }

    /* --- named sound effects --- */

    // balloon pop: a bright noise "snap" plus a quick downward chirp
    function balloonPop(){
      noiseBurst({ duration: 0.09, filterFreq: 1800, q: 1.1, peak: 0.55 });
      tone({ type: "triangle", freq: 620, freqTo: 90, freqRampTime: 0.12, duration: 0.14, peak: 0.28, attack: 0.005 });
    }

    // candle catching light: a soft rising spark/sparkle
    function candleLight(){
      tone({ type: "sine", freq: 780, freqTo: 1500, freqRampTime: 0.16, duration: 0.18, peak: 0.16, attack: 0.01 });
      tone({ type: "sine", freq: 1500, duration: 0.22, peak: 0.12, delay: 0.08, attack: 0.01 });
    }

    // small generic UI "pop" — used for confirmations / reveals
    function uiPop(){
      tone({ type: "sine", freq: 520, freqTo: 880, freqRampTime: 0.1, duration: 0.12, peak: 0.18, attack: 0.008 });
    }

    // little celebratory chime — used when all candles are lit
    function chime(){
      [880, 1108, 1318].forEach(function(freq, i){
        tone({ type: "sine", freq: freq, duration: 0.5, peak: 0.14, delay: i * 0.09, attack: 0.01 });
      });
    }

    return { balloonPop: balloonPop, candleLight: candleLight, uiPop: uiPop, chime: chime, unlock: unlock };
  })();

  /* ---------------------------------------------------------
     1. GA4 EVENT HELPER (safe no-op if gtag hasn't loaded)
  --------------------------------------------------------- */
  function track(eventName, params){
    if (typeof window.gtag === "function"){
      window.gtag("event", eventName, params || {});
    }
  }

  /* ---------------------------------------------------------
     2. CONFETTI BURST
  --------------------------------------------------------- */
  var confettiLayer = document.getElementById("confetti-layer");
  var CONFETTI_COLORS = ["#F4B740", "#FF6F91", "#4ECDC4", "#FBF3E6"];

  function burstConfetti(originXPercent, count){
    if (prefersReducedMotion) return;
    count = count || 26;
    for (var i = 0; i < count; i++){
      var piece = document.createElement("div");
      piece.className = "confetti-piece";
      var x = (originXPercent != null ? originXPercent : Math.random() * 100);
      piece.style.left = (x + (Math.random() * 16 - 8)) + "vw";
      piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      var duration = 2.2 + Math.random() * 1.6;
      var delay = Math.random() * 0.4;
      piece.style.animationDuration = duration + "s";
      piece.style.animationDelay = delay + "s";
      piece.style.width = (6 + Math.random() * 6) + "px";
      piece.style.height = (10 + Math.random() * 6) + "px";
      confettiLayer.appendChild(piece);
      (function(el, total){
        setTimeout(function(){ el.remove(); }, total * 1000 + 100);
      })(piece, duration + delay);
    }
  }

  /* ---------------------------------------------------------
     3. BALLOON-POP CURTAIN GAME
  --------------------------------------------------------- */
  var stage = document.getElementById("stage");
  var balloonField = document.getElementById("balloon-field");
  var popCountEl = document.getElementById("pop-count");
  var popTotalEl = document.getElementById("pop-total");
  var popped = 0;

  popTotalEl.textContent = BALLOON_COUNT;
  document.body.classList.add("stage-active");

  function balloonSVG(color){
    return (
      '<svg viewBox="0 0 64 78" xmlns="http://www.w3.org/2000/svg">' +
        '<ellipse cx="32" cy="30" rx="26" ry="30" fill="' + color + '"/>' +
        '<ellipse cx="23" cy="18" rx="7" ry="9" fill="rgba(255,255,255,.35)"/>' +
        '<path d="M32 60 L26 68 L38 68 Z" fill="' + color + '"/>' +
        '<line x1="32" y1="68" x2="32" y2="78" stroke="rgba(251,243,230,.5)" stroke-width="1.5"/>' +
      '</svg>'
    );
  }

  function layoutBalloons(){
    var w = balloonField.clientWidth || window.innerWidth;
    var margin = w < 420 ? 32 : 60;
    var usable = Math.max(w - margin * 2, 160);
    var slots = [];
    for (var i = 0; i < BALLOON_COUNT; i++){
      slots.push(margin + (usable / (BALLOON_COUNT - 1)) * i);
    }
    // shuffle slightly for natural look
    slots.sort(function(){ return Math.random() - 0.5; });
    return slots;
  }

  // pace ramps up with every pop — balloons rise faster and faster
  var speedMultiplier = 1;
  var SPEED_STEP = 0.09;      // ~9% faster per pop
  var MIN_SPEED_MULTIPLIER = 0.4; // cap so it never gets impossible

  function createBalloons(){
    var slots = layoutBalloons();
    for (var i = 0; i < BALLOON_COUNT; i++){
      var b = document.createElement("div");
      b.className = "balloon";
      b.style.left = slots[i] + "px";

      var baseDuration = 8 + Math.random() * 3; // seconds for a full rise
      b.dataset.baseDuration = baseDuration;

      if (prefersReducedMotion){
        // no animation: just place them visibly spread across the stage
        b.style.animation = "none";
        b.style.bottom = (12 + Math.random() * 55) + "%";
      } else {
        b.style.animationDuration = baseDuration + "s";
        // negative delay so balloons start mid-flight, already visible
        // on the stage instead of clustered at the bottom on load
        b.style.animationDelay = "-" + (Math.random() * baseDuration).toFixed(2) + "s";
      }

      var color = BALLOON_COLORS[i % BALLOON_COLORS.length];
      b.innerHTML = balloonSVG(color);
      b.dataset.index = i;
      b.addEventListener("click", onBalloonPop, { once: true });
      balloonField.appendChild(b);
    }
  }

  function speedUpRemainingBalloons(){
    if (prefersReducedMotion) return;
    speedMultiplier = Math.max(MIN_SPEED_MULTIPLIER, speedMultiplier - SPEED_STEP);
    var remaining = balloonField.querySelectorAll(".balloon:not(.popped)");
    remaining.forEach(function(rb){
      var baseDuration = parseFloat(rb.dataset.baseDuration) || 9;
      rb.style.animationDuration = (baseDuration * speedMultiplier).toFixed(2) + "s";
    });
  }

  function onBalloonPop(e){
    var b = e.currentTarget;
    if (b.classList.contains("popped")) return;
    b.classList.add("popped");
    popped++;
    popCountEl.textContent = popped;

    SoundEngine.balloonPop();

    var rect = b.getBoundingClientRect();
    var xPercent = (rect.left / window.innerWidth) * 100;
    burstConfetti(xPercent, 14);

    speedUpRemainingBalloons();

    var progress = popped / BALLOON_COUNT;
    stage.style.setProperty("--progress", progress.toFixed(3));

    track("balloon_pop", { balloons_popped: popped, total: BALLOON_COUNT, pace: speedMultiplier });

    if (popped >= BALLOON_COUNT){
      setTimeout(openCurtain, 550);
    }
  }

  /* ---------------------------------------------------------
     3b. "HAPPY BIRTHDAY TO YOU" — synthesized tune (no lyrics,
     no audio file, just the well-known public-domain melody
     played as tones) — plays once the curtain opens
  --------------------------------------------------------- */
  var NOTE = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99
  };

  // classic "Happy Birthday" melody, [note, beats]
  var HBD_MELODY = [
    ["G4", 0.5], ["G4", 0.5], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
    ["G4", 0.5], ["G4", 0.5], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
    ["G4", 0.5], ["G4", 0.5], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2],
    ["F5", 0.5], ["F5", 0.5], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2]
  ];

  var tuneCtx = null;
  var tuneLoopTimer = null;
  var tuneMuted = false;
  var GAP_BETWEEN_LOOPS_MS = 900;

  function playHappyBirthdayTune(){
    if (tuneMuted) return;
    try{
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!tuneCtx) tuneCtx = new AudioCtx();
      if (tuneCtx.state === "suspended") tuneCtx.resume();

      var beatSeconds = 0.34;
      var t = tuneCtx.currentTime + 0.1;

      HBD_MELODY.forEach(function(pair){
        var freq = NOTE[pair[0]];
        var dur = pair[1] * beatSeconds;

        var osc = tuneCtx.createOscillator();
        var gain = tuneCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.22, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.92);

        osc.connect(gain).connect(tuneCtx.destination);
        osc.start(t);
        osc.stop(t + dur);

        t += dur * 1.05; // tiny gap between notes
      });

      var totalMs = (t - tuneCtx.currentTime) * 1000;
      tuneLoopTimer = setTimeout(playHappyBirthdayTune, totalMs + GAP_BETWEEN_LOOPS_MS);
    } catch(e){
      /* Web Audio unavailable — fail silently, visuals still play */
    }
  }

  function stopHappyBirthdayTune(){
    if (tuneLoopTimer) clearTimeout(tuneLoopTimer);
    tuneLoopTimer = null;
  }

  /* small floating button so the person can mute the looping tune */
  var musicToggle = document.createElement("button");
  musicToggle.id = "music-toggle";
  musicToggle.type = "button";
  musicToggle.setAttribute("aria-label", "Mute birthday tune");
  musicToggle.textContent = "🔊";
  musicToggle.addEventListener("click", function(){
    tuneMuted = !tuneMuted;
    musicToggle.classList.toggle("muted", tuneMuted);
    musicToggle.textContent = tuneMuted ? "🔇" : "🔊";
    musicToggle.setAttribute("aria-label", tuneMuted ? "Unmute birthday tune" : "Mute birthday tune");
    if (tuneMuted){
      stopHappyBirthdayTune();
    } else {
      playHappyBirthdayTune();
    }
  });
  document.body.appendChild(musicToggle);

  /* ---------------------------------------------------------
     3c. BULLET BIKE — rides across the screen after the curtain opens
  --------------------------------------------------------- */
  var bikeLayer = document.getElementById("bike-layer");

  function rideBike(){
    if (prefersReducedMotion || !bikeLayer) return;
    bikeLayer.classList.remove("bike-riding");
    // force reflow so the animation restarts cleanly
    void bikeLayer.offsetWidth;
    bikeLayer.classList.add("bike-riding");
    track("bike_ride", {});
  }

  function openCurtain(){
    stage.classList.add("stage-open");
    burstConfetti(50, 60);
    track("curtain_opened", {});
    setTimeout(function(){
      stage.classList.add("stage-removed");
      document.body.classList.remove("stage-active");
      playHappyBirthdayTune();
      setTimeout(rideBike, 250);
    }, 1150);
  }

  createBalloons();
  window.addEventListener("resize", function(){
    // reposition any remaining (unpopped) balloons on resize
    var remaining = balloonField.querySelectorAll(".balloon:not(.popped)");
    var w = balloonField.clientWidth || window.innerWidth;
    remaining.forEach(function(b){
      var max = Math.max(w - 120, 200);
      var left = parseFloat(b.style.left);
      if (left > max) b.style.left = (Math.random() * max + 60) + "px";
    });
  });

  /* ---------------------------------------------------------
     4a. CURVE FASHION LIGHTS — hanging bulb string swagged
     into a curve, built as SVG and reused across sections
  --------------------------------------------------------- */
  function buildCurveLights(mountEl, opts){
    if (!mountEl) return;
    opts = opts || {};
    var bulbCount = opts.bulbCount || 8;
    var width = opts.width || 480;
    var height = opts.height || 60;
    var colors = ["var(--gold)", "var(--coral)", "var(--mint)", "#B38CFF"];

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("class", "curve-lights-svg");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    var path = document.createElementNS(svgNS, "path");
    var topY = height * 0.12;
    var d = "M2," + topY + " C " + (width * 0.25) + "," + height + " " + (width * 0.75) + "," + height + " " + (width - 2) + "," + topY;
    path.setAttribute("d", d);
    path.setAttribute("class", "curve-lights-wire");
    svg.appendChild(path);
    mountEl.appendChild(svg);

    var totalLength = path.getTotalLength();

    for (var i = 0; i < bulbCount; i++){
      var t = i / (bulbCount - 1);
      var pt = path.getPointAtLength(t * totalLength);

      var g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "curve-bulb");
      g.style.setProperty("--bulb-color", colors[i % colors.length]);
      g.style.animationDelay = (i * 0.18) + "s";

      var cable = document.createElementNS(svgNS, "line");
      cable.setAttribute("x1", pt.x); cable.setAttribute("y1", pt.y - 7);
      cable.setAttribute("x2", pt.x); cable.setAttribute("y2", pt.y);
      cable.setAttribute("class", "bulb-cable");
      g.appendChild(cable);

      var glow = document.createElementNS(svgNS, "circle");
      glow.setAttribute("cx", pt.x); glow.setAttribute("cy", pt.y + 2); glow.setAttribute("r", 7);
      glow.setAttribute("class", "bulb-glow");
      g.appendChild(glow);

      var bulb = document.createElementNS(svgNS, "circle");
      bulb.setAttribute("cx", pt.x); bulb.setAttribute("cy", pt.y + 2); bulb.setAttribute("r", 3.2);
      bulb.setAttribute("class", "bulb-core");
      g.appendChild(bulb);

      svg.appendChild(g);
    }
  }

  buildCurveLights(document.getElementById("hero-curve-lights"), { bulbCount: 7, width: 420, height: 56 });
  buildCurveLights(document.getElementById("gallery-curve-lights"), { bulbCount: 11, width: 640, height: 48 });
  buildCurveLights(document.getElementById("messages-curve-lights"), { bulbCount: 7, width: 420, height: 56 });

  /* ---------------------------------------------------------
     4b. HERO HIGHLIGHT ROTATOR — replaces the old countdown timer
     with a short rotating line about Akash
  --------------------------------------------------------- */
  var HERO_HIGHLIGHTS = [
    "One more year of your infectious energy 🎉",
    "Cheers to the memories already made 🥂",
    "And here's to the ones still coming ✨",
    "Every year is better with you around 🎂"
  ];
  var heroHighlightEl = document.getElementById("hero-highlight");

  function rotateHeroHighlight(){
    if (!heroHighlightEl) return;
    var idx = 0;
    heroHighlightEl.textContent = HERO_HIGHLIGHTS[0];

    if (prefersReducedMotion || HERO_HIGHLIGHTS.length < 2) return;

    setInterval(function(){
      heroHighlightEl.classList.add("is-changing");
      setTimeout(function(){
        idx = (idx + 1) % HERO_HIGHLIGHTS.length;
        heroHighlightEl.textContent = HERO_HIGHLIGHTS[idx];
        heroHighlightEl.classList.remove("is-changing");
      }, 500);
    }, 4200);
  }

  rotateHeroHighlight();

  /* ---------------------------------------------------------
     4c. SCROLL INDICATOR — fades once the person starts scrolling,
     so it doesn't linger over the rest of the page
  --------------------------------------------------------- */
  var scrollIndicator = document.getElementById("scroll-indicator");
  if (scrollIndicator){
    var heroEl = document.getElementById("hero");
    if (typeof IntersectionObserver !== "undefined" && heroEl){
      var heroObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          scrollIndicator.classList.toggle("is-hidden", entry.intersectionRatio < 0.6);
        });
      }, { threshold: [0, 0.6] });
      heroObserver.observe(heroEl);
    } else {
      window.addEventListener("scroll", function(){
        scrollIndicator.classList.toggle("is-hidden", window.scrollY > 80);
      }, { passive: true });
    }
  }

  /* ---------------------------------------------------------
     5. GALLERY + LIGHTBOX
  --------------------------------------------------------- */
  var galleryGrid = document.getElementById("gallery-grid");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var currentPhotoIndex = 0;

  PHOTOS.forEach(function(photo, i){
    var card = document.createElement("figure");
    card.className = "photo-card reveal-up";
    card.style.transitionDelay = prefersReducedMotion ? "0s" : (i % 3) * 0.08 + "s";
    card.innerHTML =
      '<img src="' + photo.src + '" alt="' + photo.caption.replace(/"/g, "&quot;") + '" loading="lazy"/>' +
      '<figcaption>' + photo.caption + '</figcaption>';
    card.addEventListener("click", function(){ openLightbox(i); });
    galleryGrid.appendChild(card);
  });

  function openLightbox(index){
    currentPhotoIndex = index;
    lightboxImg.src = PHOTOS[index].src;
    lightboxImg.alt = PHOTOS[index].caption;
    lightbox.classList.remove("hidden");
    SoundEngine.uiPop();
    track("gallery_photo_view", { photo_index: index });
  }
  function closeLightbox(){ lightbox.classList.add("hidden"); }
  function showPhoto(delta){
    currentPhotoIndex = (currentPhotoIndex + delta + PHOTOS.length) % PHOTOS.length;
    lightboxImg.src = PHOTOS[currentPhotoIndex].src;
    lightboxImg.alt = PHOTOS[currentPhotoIndex].caption;
  }

  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox-prev").addEventListener("click", function(){ showPhoto(-1); });
  document.getElementById("lightbox-next").addEventListener("click", function(){ showPhoto(1); });
  lightbox.addEventListener("click", function(e){ if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", function(e){
    if (lightbox.classList.contains("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPhoto(-1);
    if (e.key === "ArrowRight") showPhoto(1);
  });

  /* ---------------------------------------------------------
     6. CAKE + CANDLES
  --------------------------------------------------------- */
  var cakeScene = document.getElementById("cake-scene");
  var wishReveal = document.getElementById("wish-reveal");
  var litCount = 0;
  var revealed = false;

  function buildCake(){
    var startX = 138, endX = 282;
    var step = CANDLE_COUNT > 1 ? (endX - startX) / (CANDLE_COUNT - 1) : 0;
    var candleGroups = "";
    for (var i = 0; i < CANDLE_COUNT; i++){
      var cx = startX + step * i;
      candleGroups +=
        '<g class="candle" data-index="' + i + '" tabindex="0" role="button" ' +
           'aria-label="Light candle ' + (i + 1) + '">' +
          '<ellipse cx="' + cx + '" cy="90" rx="7" ry="2.4" fill="rgba(0,0,0,.18)"/>' +
          '<rect x="' + (cx - 4) + '" y="52" width="8" height="38" rx="3" fill="url(#candleStripe' + (i % 3) + ')"/>' +
          '<rect x="' + (cx - 4) + '" y="52" width="8" height="38" rx="3" fill="url(#candleSheen)"/>' +
          '<path d="M' + (cx - 5) + ' 53 q5 -6 10 0 q-2 4 -5 3 q-3 1 -5 -3 Z" fill="#FBF3E6"/>' +
          '<line x1="' + cx + '" y1="45" x2="' + cx + '" y2="52" stroke="#4a3420" stroke-width="1.6" stroke-linecap="round"/>' +
          '<g class="flame">' +
            '<ellipse cx="' + cx + '" cy="38" rx="15" ry="17" fill="url(#flameGlow)"/>' +
            '<ellipse cx="' + cx + '" cy="35" rx="6.5" ry="13" fill="url(#flameOuter)"/>' +
            '<ellipse cx="' + cx + '" cy="39" rx="3.6" ry="7.5" fill="url(#flameInner)"/>' +
            '<ellipse cx="' + cx + '" cy="41" rx="1.6" ry="3.4" fill="#3B4E9E" opacity=".85"/>' +
          '</g>' +
          '<rect x="' + (cx - 17) + '" y="18" width="34" height="80" fill="transparent"/>' + // easier hit target
        '</g>';
    }

    var svg =
      '<svg viewBox="0 -36 420 296" width="100%" style="max-width:480px" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<radialGradient id="plateGrad" cx="50%" cy="35%" r="65%">' +
            '<stop offset="0" stop-color="#3a2e6e"/><stop offset="1" stop-color="#1c1444"/>' +
          '</radialGradient>' +
          '<linearGradient id="bottomTierGrad" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#FF9AB4"/><stop offset=".55" stop-color="#FF6F91"/><stop offset="1" stop-color="#D8446B"/>' +
          '</linearGradient>' +
          '<linearGradient id="bottomTierTopGrad" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#FFE3EB"/><stop offset="1" stop-color="#FFC1D2"/>' +
          '</linearGradient>' +
          '<linearGradient id="bottomFrostGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FBF3E6"/>' +
          '</linearGradient>' +
          '<linearGradient id="topTierGrad" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#FFD97A"/><stop offset=".55" stop-color="#F4B740"/><stop offset="1" stop-color="#D4941F"/>' +
          '</linearGradient>' +
          '<linearGradient id="topTierTopGrad" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#FFF3D6"/><stop offset="1" stop-color="#FFE2A0"/>' +
          '</linearGradient>' +
          '<linearGradient id="topFrostGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#FFFDF6"/><stop offset="1" stop-color="#FFF3D6"/>' +
          '</linearGradient>' +
          '<linearGradient id="candleStripe0" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF6F91"/><stop offset="1" stop-color="#FBF3E6"/></linearGradient>' +
          '<linearGradient id="candleStripe1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4ECDC4"/><stop offset="1" stop-color="#FBF3E6"/></linearGradient>' +
          '<linearGradient id="candleStripe2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F4B740"/><stop offset="1" stop-color="#FBF3E6"/></linearGradient>' +
          '<linearGradient id="candleSheen" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset=".4" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".12"/>' +
          '</linearGradient>' +
          '<radialGradient id="flameGlow" cx="50%" cy="55%" r="55%">' +
            '<stop offset="0" stop-color="#FFD98A" stop-opacity=".55"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<linearGradient id="flameOuter" x1="0" y1="1" x2="0" y2="0">' +
            '<stop offset="0" stop-color="#FF6F3D"/><stop offset=".55" stop-color="#FFB13D"/><stop offset="1" stop-color="#FFE9A0"/>' +
          '</linearGradient>' +
          '<linearGradient id="flameInner" x1="0" y1="1" x2="0" y2="0">' +
            '<stop offset="0" stop-color="#FFC24D"/><stop offset="1" stop-color="#FFF6D8"/>' +
          '</linearGradient>' +
        '</defs>' +

        '<ellipse cx="210" cy="230" rx="176" ry="16" fill="rgba(0,0,0,.4)"/>' +
        '<ellipse cx="210" cy="222" rx="172" ry="15" fill="url(#plateGrad)"/>' +
        '<ellipse cx="210" cy="218" rx="172" ry="15" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/>' +

        // bottom tier body + top cap for cylindrical volume
        '<rect x="66" y="140" width="288" height="76" fill="url(#bottomTierGrad)"/>' +
        '<path d="M66 140 a144 15 0 0 0 288 0 Z" fill="url(#bottomTierTopGrad)"/>' +
        '<path d="M66 216 a144 15 0 0 0 288 0" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="3"/>' +
        // bottom tier frosting drip
        '<path d="M66 140 q12 22 24 0 q12 22 24 0 q12 22 24 0 q12 22 24 0 q12 22 24 0 q12 22 24 0 q12 22 24 0 q12 22 24 0 q12 22 24 0 q12 22 24 0 q12 22 24 0 q12 22 24 0 L354 140 a144 15 0 0 1 -288 0 Z" fill="url(#bottomFrostGrad)"/>' +

        // top tier body + cap
        '<rect x="112" y="88" width="196" height="56" fill="url(#topTierGrad)"/>' +
        '<path d="M112 88 a98 12 0 0 0 196 0 Z" fill="url(#topTierTopGrad)"/>' +
        '<path d="M112 144 a98 12 0 0 0 196 0" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="3"/>' +
        // top tier frosting drip
        '<path d="M112 88 q10 18 20 0 q10 18 20 0 q10 18 20 0 q10 18 20 0 q10 18 20 0 q10 18 20 0 q10 18 20 0 q10 18 20 0 q10 18 20 0 L308 88 a98 12 0 0 1 -196 0 Z" fill="url(#topFrostGrad)"/>' +

        // sprinkles across both tiers
        '<g>' +
          '<rect x="96" y="176" width="8" height="3" rx="1.5" fill="#4ECDC4" transform="rotate(20 100 177)"/>' +
          '<rect x="130" y="192" width="8" height="3" rx="1.5" fill="#F4B740" transform="rotate(-15 134 193)"/>' +
          '<rect x="168" y="180" width="8" height="3" rx="1.5" fill="#FBF3E6" transform="rotate(35 172 181)"/>' +
          '<rect x="210" y="196" width="8" height="3" rx="1.5" fill="#4ECDC4" transform="rotate(-25 214 197)"/>' +
          '<rect x="248" y="182" width="8" height="3" rx="1.5" fill="#F4B740" transform="rotate(15 252 183)"/>' +
          '<rect x="286" y="194" width="8" height="3" rx="1.5" fill="#FBF3E6" transform="rotate(-30 290 195)"/>' +
          '<rect x="318" y="178" width="8" height="3" rx="1.5" fill="#4ECDC4" transform="rotate(25 322 179)"/>' +
          '<circle cx="150" cy="112" r="2.6" fill="#FF6F91"/>' +
          '<circle cx="188" cy="120" r="2.6" fill="#4ECDC4"/>' +
          '<circle cx="232" cy="114" r="2.6" fill="#FBF3E6"/>' +
          '<circle cx="270" cy="122" r="2.6" fill="#FF6F91"/>' +
        '</g>' +

        candleGroups +
      '</svg>';

    cakeScene.innerHTML = svg;

    cakeScene.querySelectorAll(".candle").forEach(function(candle){
      candle.addEventListener("click", function(){ lightCandle(candle); });
      candle.addEventListener("keydown", function(e){
        if (e.key === "Enter" || e.key === " "){ e.preventDefault(); lightCandle(candle); }
      });
    });
  }

  function lightCandle(candle){
    if (candle.classList.contains("lit")) return;
    candle.classList.add("lit");
    litCount++;
    SoundEngine.candleLight();
    track("candle_lit", { candles_lit: litCount, total: CANDLE_COUNT });

    if (litCount >= CANDLE_COUNT && !revealed){
      revealed = true;
      setTimeout(function(){
        wishReveal.classList.add("revealed");
        burstConfetti(50, 50);
        SoundEngine.chime();
        wishReveal.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
        track("all_candles_lit", {});
      }, 400);
    }
  }

  buildCake();

  /* ---------------------------------------------------------
     7. MESSAGES — curated notes for Akash (static, no form)
  --------------------------------------------------------- */
  var messageList = document.getElementById("message-list");

  // Edit these to change what shows up in the "Messages for Akash" section.
  var MESSAGES = [
    { name: "Friends & Family", message: "Wishing you the happiest birthday, " + PERSON_NAME + "! 🎉" },
    { name: "The Group Chat", message: "Cheers to another year of you being awesome. Let's celebrate!" },
    { name: "The Squad", message: "Every hangout is better with you around. Here's to more of them." },
    { name: "Home Team", message: "Proud of who you're becoming. Go make this year count, " + PERSON_NAME + "." }
  ];

  function escapeHTML(str){
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderMessages(){
    if (!messageList) return;
    messageList.innerHTML = "";
    MESSAGES.forEach(function(m, i){
      var item = document.createElement("div");
      item.className = "message-item reveal-up";
      item.style.transitionDelay = prefersReducedMotion ? "0s" : (i % 2) * 0.1 + "s";
      item.innerHTML =
        '<span class="message-item-name">' + escapeHTML(m.name) + '</span>' +
        '<p class="message-item-msg">' + escapeHTML(m.message) + '</p>';
      messageList.appendChild(item);
    });
  }

  renderMessages();

  /* ---------------------------------------------------------
     8. SCROLL REVEAL — fades/rises .reveal-up elements in as
     they enter the viewport (section headers, gallery cards,
     message cards). Falls back to showing everything instantly
     if IntersectionObserver isn't available or motion is reduced.
  --------------------------------------------------------- */
  (function initScrollReveal(){
    var revealEls = document.querySelectorAll(".reveal-up");

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined"){
      revealEls.forEach(function(el){ el.classList.add("in-view"); });
      return;
    }

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    revealEls.forEach(function(el){ observer.observe(el); });
  })();

})();
