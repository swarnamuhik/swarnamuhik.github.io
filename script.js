

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------- SOUND ----------------
  // Synthesized 8-bit-style bleeps via Web Audio  no audio files needed.
  // Browsers block audio before any user interaction, so we lazily create
  // the AudioContext on the first click/keypress/touch anywhere on the
  // page, then it stays ready for the rest of the session. The mute
  // button reflects the user's own on/off choice independently of that.
  const Sound = (() => {
    let ctx = null;
    let muted = false; // user-facing state; defaults to "on"
    const STORAGE_KEY = 'ssw-muted';

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === '1') muted = true;
    } catch (e) { /* localStorage unavailable (private mode, etc.)  default stands */ }

    function ensureCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(freq, dur, type, vol, delay = 0) {
      if (muted) return;
      const c = ensureCtx();
      if (!c) return;
      try {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = vol;
        o.connect(g); g.connect(c.destination);
        const t0 = c.currentTime + delay;
        o.start(t0);
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.stop(t0 + dur + 0.02);
      } catch (e) { /* ignore: audio not critical to function */ }
    }

    // Unlock audio on the very first user gesture anywhere on the page.
    ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, ensureCtx, { once: true, passive: true });
    });

    return {
      jump: () => tone(440, 0.12, 'square', 0.07),
      click: () => tone(660, 0.05, 'square', 0.06),
      isMuted: () => muted,
      toggle() {
        muted = !muted;
        try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (e) {}
        if (!muted) ensureCtx();
        return muted;
      },
    };
  })();

  // mute button wiring
  const muteBtn = document.getElementById('sound-toggle');
  function refreshMuteBtn() {
    muteBtn.textContent = Sound.isMuted() ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', Sound.isMuted() ? 'Unmute sound' : 'Mute sound');
    muteBtn.setAttribute('aria-pressed', String(Sound.isMuted()));
  }
  muteBtn.addEventListener('click', () => { Sound.toggle(); refreshMuteBtn(); });
  refreshMuteBtn();

  // ---------------- SECTION REGISTRY ----------------
  // Order matters: drives nav nodes left-to-right.
  const SECTIONS = [
    { id: 'about',      icon: '👩🏽‍🦱', label: 'ABOUT' },
    { id: 'experience', icon: '💼', label: 'EXPERIENCE' },
    { id: 'projects',   icon: '🍄', label: 'PROJECTS' },
    { id: 'skills',     icon: '🏰', label: 'SKILLS' },
    { id: 'education',  icon: '👩🏽‍🎓', label: 'EDUCATION' },
    { id: 'contact',    icon: '🏁', label: 'CONTACT' },
  ];

  const PREVIEW_TEXT = {
    about: 'Master of IT (AI) @ UNSW | ex Caterpillar Data Scientist',
    experience: '3 roles : Caterpillar, Intimiti CELYS, research asst',
    projects: ' IEEE paper, Parkinson\u2019s detection, music recommender',
    skills: 'Python, ML/AI stack, cloud, analytics, web dev',
    education: 'UNSW Master of IT (AI) | B.Tech CSE (AI)',
    contact: 'Email, LinkedIn, GitHub',
  };

  // ---------------- NAV: build nodes ----------------
  const navNodesEl = document.getElementById('nav-nodes');
  const navPreview = document.getElementById('nav-preview');
  const navNodeEls = {};

  const navHomeBtn = document.getElementById('nav-home-btn');
  if (navHomeBtn) {
    navHomeBtn.addEventListener('click', () => {
      Sound.click();
      document.getElementById('hero').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  SECTIONS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'nav-node';
    btn.type = 'button';
    btn.textContent = s.icon;
    btn.setAttribute('aria-label', s.label);
    btn.dataset.target = s.id;

    btn.addEventListener('click', () => {
      Sound.click();
      document.getElementById(s.id).scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      hidePreview();
    });
    btn.addEventListener('mouseenter', (e) => showPreview(s.id, btn));
    btn.addEventListener('focus', (e) => showPreview(s.id, btn));
    btn.addEventListener('mouseleave', hidePreview);
    btn.addEventListener('blur', hidePreview);
    // touch: tap shows preview briefly is unnecessary  tap just navigates (handled by click)

    navNodesEl.appendChild(btn);
    navNodeEls[s.id] = btn;
  });

  function showPreview(id, btn) {
    navPreview.textContent = PREVIEW_TEXT[id] || '';
    navPreview.classList.remove('hidden');
    const rect = btn.getBoundingClientRect();
    const previewWidth = 220;
    let left = rect.left + rect.width / 2 - previewWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - previewWidth - 8));
    navPreview.style.left = left + 'px';
    navPreview.style.top = (rect.bottom + 10) + 'px';
  }
  function hidePreview() {
    navPreview.classList.add('hidden');
  }

  // ---------------- ACTIVE NAV HIGHLIGHT on scroll ----------------
  const sectionEls = SECTIONS.map(s => document.getElementById(s.id));
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      if (entry.isIntersecting) {
        Object.values(navNodeEls).forEach(el => el.classList.remove('active'));
        if (navNodeEls[id]) navNodeEls[id].classList.add('active');
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  sectionEls.forEach(el => navObserver.observe(el));

  // ---------------- CARD REVEAL on scroll ----------------
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.pop-card').forEach((el, i) => {
    el.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
    cardObserver.observe(el);
  });

  // ---------------- DECORATIVE CLOUDS & BUSHES ----------------
  function scatterDecor() {
    document.querySelectorAll('.parallax-clouds').forEach(layer => {
      layer.innerHTML = '';
      const count = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const c = document.createElement('div');
        c.className = 'cloud-el';
        c.style.setProperty('--cloud-img', `url(${Sprites.cloud})`);
        c.style.left = (8 + i * (85 / count) + Math.random() * 6) + '%';
        c.style.top = (8 + Math.random() * 28) + '%';
        const scale = 0.7 + Math.random() * 0.6;
        c.style.transform = `scale(${scale})`;
        layer.appendChild(c);
      }
    });
    document.querySelectorAll('.parallax-bushes').forEach(layer => {
      layer.innerHTML = '';
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const b = document.createElement('div');
        b.className = 'bush-el';
        b.style.setProperty('--bush-img', `url(${Sprites.bush})`);
        b.style.left = (5 + i * (90 / count) + Math.random() * 8) + '%';
        layer.appendChild(b);
      }
    });
  }
  scatterDecor();
  window.addEventListener('resize', debounce(scatterDecor, 400));

  // ---------------- CHARACTER: persistent ambient + lightly controllable ----------------
  const charLayer = document.getElementById('mario-layer');
  const charSprite = document.getElementById('mario-sprite');
  const allSections = [document.getElementById('hero'), ...sectionEls];
  const allSectionIds = ['hero', ...SECTIONS.map(s => s.id)];

  charSprite.src = Sprites.character[0];

  const Char = {
    x: 60,                // px from left edge of current section
    sectionIdx: 0,
    vx: 1.1,              // current horizontal speed (px/frame), sign = direction
    baseSpeed: 1.1,
    facing: 1,
    frame: 0,
    frameTimer: 0,
    jumpPhase: 0,          // 0 = grounded, else animating a jump arc
    jumpT: 0,
    manualUntil: 0,        // timestamp until which auto-jump is suppressed after manual steering
    manualDir: 0,          // -1, 0, 1 while a control button is held
  };

  function currentSection() {
    return allSections[Char.sectionIdx] || allSections[0];
  }
  function currentSectionId() {
    return allSectionIds[Char.sectionIdx] || allSectionIds[0];
  }

  // Reposition the character's section index based on which section is centered in viewport.
  function syncSectionToScroll() {
    const viewportMid = window.scrollY + window.innerHeight * 0.5;
    let bestIdx = 0, bestDist = Infinity;
    allSections.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const elMid = window.scrollY + rect.top + rect.height / 2;
      const dist = Math.abs(elMid - viewportMid);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    });
    if (bestIdx !== Char.sectionIdx) {
      Char.sectionIdx = bestIdx;
      // keep character roughly where they are horizontally; clamp will fix bounds next frame
    }
  }
  window.addEventListener('scroll', throttle(syncSectionToScroll, 120), { passive: true });

  // Random ambient jump every few seconds while grounded and on autopilot
  let nextAutoJumpAt = performance.now() + 2000 + Math.random() * 3000;

  function maybeAutoJump(now) {
    if (Char.jumpPhase === 0 && now > nextAutoJumpAt && Date.now() > Char.manualUntil) {
      startJump();
      nextAutoJumpAt = now + 3000 + Math.random() * 4000;
    }
  }

  function startJump() {
    if (Char.jumpPhase !== 0) return;
    Char.jumpPhase = 1;
    Char.jumpT = 0;
    Sound.jump();
  }

  // ---- manual controls ----
  const leftBtn = document.getElementById('mario-left');
  const rightBtn = document.getElementById('mario-right');
  const jumpBtn = document.getElementById('mario-jump');

  function setManual(dir) {
    Char.manualDir = dir;
  }
  function bindHold(el, dir) {
    const start = (e) => { e.preventDefault(); setManual(dir); };
    const end = (e) => { if (Char.manualDir === dir) Char.manualDir = 0; };
    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
    el.addEventListener('touchend', end);
  }
  bindHold(leftBtn, -1);
  bindHold(rightBtn, 1);
  jumpBtn.addEventListener('click', startJump);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') setManual(-1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') setManual(1);
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); startJump(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { if (Char.manualDir === -1) Char.manualDir = 0; }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { if (Char.manualDir === 1) Char.manualDir = 0; }
  });

  // ---------------- CATERPILLAR TRUCK: shared state so the character can ride along ----------------
  // Declared above the character's tick() so it can read Truck.x/visible each frame
  // and snap the character's position to sit "in" the truck during Experience.
  const Truck = { x: 0, visible: false, docLeft: 0, docTop: 0, cssW: 130, cssH: 130 * (14 / 27) };
  (() => {
    const expSection = document.getElementById('experience');
    if (!expSection) return;
    const truckEl = document.createElement('img');
    truckEl.src = Sprites.truck;
    truckEl.id = 'cat-truck';
    truckEl.alt = '';
    truckEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(truckEl);

    if (prefersReducedMotion) {
      truckEl.style.display = 'none';
      return;
    }

    let wasVisible = false;
    const truckSpeed = 1.8; // px/frame  brisk enough to read as "driving by", not crawling
    const entryX = 60; // already on-screen the instant the section appears  no drive-on delay

    function truckTick() {
      const rect = expSection.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.top < window.innerHeight;
      truckEl.style.display = visible ? 'block' : 'none';
      Truck.visible = visible;

      // The moment the section enters view, place her already on-screen
      // (not off to the left) so visitors see her immediately, no wait.
      if (visible && !wasVisible) {
        Truck.x = entryX;
      }
      wasVisible = visible;

      if (visible) {
        const travel = rect.width + 280;
        Truck.x += truckSpeed;
        if (Truck.x > travel) Truck.x = -200; // only the looping re-entries drive in from off-screen
        const groundOffset = 56;
        const top = rect.top + window.scrollY + rect.height - groundOffset - Truck.cssH;
        const left = rect.left + window.scrollX + Truck.x;
        truckEl.style.transform = `translate(${left}px, ${top}px)`;
        Truck.docLeft = left;
        Truck.docTop = top;
      }
      requestAnimationFrame(truckTick);
    }
    requestAnimationFrame(truckTick);
  })();

  // ---------------- MUSHROOMS: ambient decoration, Skills section ----------------
  // Reusable spawner  each mushroom sits at a fixed spot (set via posFrac)
  // with just a gentle bob, no side-to-side movement.
  function spawnStaticMushroom(opts) {
    const { sectionId, sprite, idSuffix, posFrac, message } = opts;
    const section = document.getElementById(sectionId);
    if (!section) return;

    const mushroomEl = document.createElement('img');
    mushroomEl.src = sprite;
    mushroomEl.id = 'mushroom-' + idSuffix;
    mushroomEl.className = 'patrol-mushroom';
    mushroomEl.alt = '';
    mushroomEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mushroomEl);

    let bubbleEl = null;
    if (message) {
      bubbleEl = document.createElement('div');
      bubbleEl.className = 'speech-bubble-small hidden';
      bubbleEl.textContent = message;
      bubbleEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bubbleEl);
    }

    if (prefersReducedMotion) {
      mushroomEl.style.display = 'none';
      if (bubbleEl) bubbleEl.style.display = 'none';
      return;
    }

    const cssW = 60;
    const cssH = cssW * (12 / 16);
    let bobT = Math.random() * 1000;

    function mushroomTick() {
      const rect = section.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.top < window.innerHeight;
      mushroomEl.style.display = visible ? 'block' : 'none';
      if (bubbleEl) bubbleEl.style.display = visible ? 'block' : 'none';

      if (visible) {
        const usableWidth = Math.max(120, rect.width - 220);
        const x = usableWidth * posFrac; // fixed spot, no horizontal movement

        bobT += 16;
        const bob = Math.sin(bobT / 480) * 6;
        const groundOffset = 56;
        const top = rect.top + window.scrollY + rect.height - groundOffset - cssH + bob;
        const left = rect.left + window.scrollX + 60 + x;
        mushroomEl.style.transform = `translate(${left}px, ${top}px)`;

        if (bubbleEl) {
          bubbleEl.classList.remove('hidden');
          const bw = bubbleEl.offsetWidth, bh = bubbleEl.offsetHeight;
          const bubbleLeft = left + cssW / 2 - bw / 2;
          const bubbleTop = top - bh - 10;
          bubbleEl.style.transform = `translate(${bubbleLeft}px, ${bubbleTop}px)`;
        }
      }
      requestAnimationFrame(mushroomTick);
    }
    requestAnimationFrame(mushroomTick);
  }

  spawnStaticMushroom({
    sectionId: 'skills', sprite: Sprites.mushroom, idSuffix: 'red',
    posFrac: 0.75, message: 'Level up!',
  });
  spawnStaticMushroom({
    sectionId: 'skills', sprite: Sprites.mushroomGreen, idSuffix: 'green',
    posFrac: 0.15, message: null,
  });

  // Sections that trigger a visual "power-up": higher jump + sparkle trail (size stays constant).
  const HIGH_JUMP_SECTIONS = new Set(['skills']);
  const CAPPED_SECTIONS = new Set(['education']);
  const SPARKLE_SECTIONS = new Set(['skills', 'education']);
  const RIDE_SECTIONS = new Set(['experience']);
  const SPEECH_MESSAGES = new Map([
    ['about', "Hi, this is Swarna!"],
    ['experience', "Let's gooo!"],
    ['projects', "A few things I worked on"],
    ['education', "Feathers on my cap!"],
    ['contact', "Excited to connect with you!"],
  ]);
  const speechBubble = document.getElementById('speech-bubble');
  let lastSpeechSecId = null;

  // ---- sparkle effect: lightweight DOM particles spawned around the character ----
  function spawnSparkle(left, top, size = 22) {
    const el = document.createElement('img');
    el.src = Sprites.sparkle;
    el.className = 'sparkle-fx';
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    // safety net in case animationend doesn't fire (e.g. element hidden mid-animation)
    setTimeout(() => { if (el.isConnected) el.remove(); }, 1200);
  }

  // Burst of several sparkles scattered around the character  used for the
  // more eye-catching power-up moments (Skills / Education) so the effect
  // reads clearly instead of a single small twinkle easy to miss.
  function spawnSparkleBurst(centerLeft, centerTop, boxW, boxH) {
    const count = 4;
    for (let i = 0; i < count; i++) {
      const dx = (Math.random() - 0.5) * boxW * 1.3;
      const dy = (Math.random() - 0.3) * boxH * 0.8;
      const size = 16 + Math.random() * 16;
      spawnSparkle(centerLeft + boxW / 2 + dx, centerTop + dy, size);
    }
  }

  // ---- main animation loop ----
  let lastT = performance.now();
  let sparkleCooldown = 0;
  function tick(now) {
    const dt = Math.min(32, now - lastT); // clamp for tab-switch hiccups
    lastT = now;

    const sec = currentSection();
    const secId = currentSectionId();
    const isHighJump = HIGH_JUMP_SECTIONS.has(secId);
    const isCapped = CAPPED_SECTIONS.has(secId);
    const wantsSparkle = SPARKLE_SECTIONS.has(secId);
    const isRiding = RIDE_SECTIONS.has(secId) && Truck.visible;

    const rect = sec.getBoundingClientRect();
    const sectionWidth = Math.max(160, rect.width - 80); // keep margin from edges
    const manualActive = Char.manualDir !== 0;
    if (manualActive) Char.manualUntil = Date.now() + 600; // keep a short grace window after release

    let left, top, jumpY = 0;
    const charScale = 1; // size stays consistent across all sections  only Skills/Education get jump-height + sparkle flair
    const charW = 56 * charScale;
    const charBoxH = charW * (22 / 16); // preserve the sprite's native 16x22 aspect ratio
    const groundOffset = 56; // matches .ground-strip height

    if (isRiding) {
      // Riding the truck: position is borrowed from Truck's own animation
      // instead of the usual walk/bounce logic  she just sits on board.
      Char.facing = 1; // truck always drives left-to-right
      Char.frame = 0;  // calm seated/standing pose, no walk cycle while riding
      left = Truck.docLeft + Truck.cssW * 0.32;
      top = Truck.docTop - charBoxH * 0.62; // perched on the cab roof
    } else {
      // --- horizontal movement (normal walk/jump autopilot) ---
      let speed;
      if (manualActive) {
        speed = Char.manualDir * (Char.baseSpeed * 2.1);
      } else {
        speed = Char.vx; // autopilot continues its current direction
      }
      Char.x += speed * (dt / 16.7);
      Char.facing = speed < 0 ? -1 : (speed > 0 ? 1 : Char.facing);

      // bounce off edges (autopilot reverses direction; manual just clamps)
      if (Char.x < 10) {
        Char.x = 10;
        if (!manualActive) Char.vx = Math.abs(Char.vx);
      } else if (Char.x > sectionWidth) {
        Char.x = sectionWidth;
        if (!manualActive) Char.vx = -Math.abs(Char.vx);
      }
      if (!manualActive) {
        // occasionally vary autopilot a little for organic feel
        Char.vx = Math.sign(Char.vx) * Char.baseSpeed;
      }

      // --- jump arc (power-up sections jump a little higher) ---
      const jumpHeight = isHighJump || isCapped ? 110 : 70;
      if (Char.jumpPhase !== 0) {
        Char.jumpT += dt;
        const dur = 620; // ms
        const p = Math.min(1, Char.jumpT / dur);
        jumpY = -Math.sin(p * Math.PI) * jumpHeight;
        if (p >= 1) { Char.jumpPhase = 0; Char.jumpT = 0; }
      } else if (wantsSparkle) {
        // gentle continuous bob/float so the power-up feels alive even
        // between jumps, not just during the brief jump arc itself
        Char.bobT = (Char.bobT || 0) + dt;
        jumpY = -Math.abs(Math.sin(Char.bobT / 420)) * 14;
      }
      if (!prefersReducedMotion) maybeAutoJump(now);

      // --- walk animation frame ---
      if (Char.jumpPhase !== 0) {
        Char.frame = 2;
      } else {
        Char.frameTimer += dt;
        if (Char.frameTimer > 110) { Char.frame = (Char.frame + 1) % 2; Char.frameTimer = 0; }
      }

      const baseTop = rect.top + window.scrollY + rect.height - groundOffset - charBoxH;
      left = rect.left + window.scrollX + 40 + Char.x;
      top = baseTop + jumpY;
    }

    const spriteSet = isCapped ? Sprites.characterCapped : Sprites.character;
    charSprite.src = spriteSet[Char.frame];

    charLayer.style.width = charW + 'px';
    charLayer.style.height = charBoxH + 'px';
    charLayer.style.transform = `translate(${left}px, ${top}px) scaleX(${Char.facing})`;

    // --- speech bubble above her head in the Contact section ---
    // --- speech bubble above her head, message depends on current section ---
    if (SPEECH_MESSAGES.has(secId)) {
      if (secId !== lastSpeechSecId) {
        speechBubble.textContent = SPEECH_MESSAGES.get(secId);
        lastSpeechSecId = secId;
      }
      speechBubble.classList.remove('hidden');
      const bubbleLeft = left + charW / 2 - speechBubble.offsetWidth / 2;
      const bubbleTop = top - speechBubble.offsetHeight - 14;
      speechBubble.style.transform = `translate(${bubbleLeft}px, ${bubbleTop}px)`;
    } else {
      lastSpeechSecId = null;
      if (!speechBubble.classList.contains('hidden')) {
        speechBubble.classList.add('hidden');
      }
    }

    // --- sparkle burst around the character in power-up sections  runs
    // continuously (not just mid-jump) so the effect is clearly noticeable ---
    if (wantsSparkle && !prefersReducedMotion) {
      sparkleCooldown -= dt;
      if (sparkleCooldown <= 0) {
        sparkleCooldown = Char.jumpPhase !== 0 ? 70 : 220; // denser burst while jumping
        spawnSparkleBurst(left, top, charW, charBoxH);
      }
    }

    requestAnimationFrame(tick);
  }

  if (!prefersReducedMotion) {
    requestAnimationFrame(tick);
  } else {
    // Static placement, no animation loop, respects reduced-motion users
    charLayer.style.display = 'none';
  }

  // ---------------- utils ----------------
  function throttle(fn, wait) {
    let last = 0, pending = null;
    return function (...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      } else {
        clearTimeout(pending);
        pending = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, wait - (now - last));
      }
    };
  }
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // initial sync
  syncSectionToScroll();

})();
