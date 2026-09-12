

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared with the GAME MODE overlay near the bottom of this file: while
  // that's on, arrow keys / space drive the game character instead of the
  // ambient one, so the ambient character's own controls stand down.
  const GameMode = { active: false };

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
      coin: () => { tone(988, 0.06, 'square', 0.06); tone(1319, 0.09, 'square', 0.05, 0.05); },
      fail: () => { tone(200, 0.1, 'sawtooth', 0.07); tone(140, 0.16, 'sawtooth', 0.07, 0.09); },
      win: () => {
        [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.07, i * 0.11));
      },
      isMuted: () => muted,
      toggle() {
        muted = !muted;
        try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (e) {}
        if (!muted) ensureCtx();
        return muted;
      },
    };
  })();

  // mute button wiring  same clean line-icon style as the social links
  const muteBtn = document.getElementById('sound-toggle');
  const SOUND_ON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
  const SOUND_OFF_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  function refreshMuteBtn() {
    muteBtn.innerHTML = Sound.isMuted() ? SOUND_OFF_SVG : SOUND_ON_SVG;
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

  // SECTIONS labels are stored ALL CAPS (used as-is for aria-label/preview
  // text); the visible nav text is titlecased from that so it reads as
  // "About" rather than shouty "ABOUT".
  function titleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  SECTIONS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'nav-node';
    btn.type = 'button';
    btn.textContent = titleCase(s.label);
    btn.setAttribute('aria-label', s.label);
    btn.dataset.target = s.id;

    btn.addEventListener('click', () => {
      Sound.click();
      document.getElementById(s.id).scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      hidePreview();
      closeNavMenu();
    });
    btn.addEventListener('mouseenter', (e) => showPreview(PREVIEW_TEXT[s.id], btn));
    btn.addEventListener('focus', (e) => showPreview(PREVIEW_TEXT[s.id], btn));
    btn.addEventListener('mouseleave', hidePreview);
    btn.addEventListener('blur', hidePreview);
    // touch: tap shows preview briefly is unnecessary  tap just navigates (handled by click)

    navNodesEl.appendChild(btn);
    navNodeEls[s.id] = btn;
  });

  function showPreview(text, btn) {
    navPreview.textContent = text || '';
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

  // ---------------- NAV: external / social links (own group, own spot) ----------------
  // Deliberately a separate container from nav-nodes, not mixed into that
  // scrolling row  page sections on one side, personal/social links on
  // the other, same split as the site this was modelled on.
  const navSocialEl = document.getElementById('nav-social');
  const SOCIAL_LINKS = [
    { icon: 'mail', title: 'Email me', href: 'mailto:kswarnamuhi18@gmail.com' },
    { icon: 'linkedin', title: 'LinkedIn', href: 'https://www.linkedin.com/in/swarnamuhi-kannan/' },
    { icon: 'github', title: 'GitHub', href: 'https://github.com/swarnamuhik' },
    { icon: 'write', title: 'My Substack writings', href: 'https://substack.com/@swarnamuhik?r=8ms253&utm_campaign=profile&utm_medium=profile-page' },
  ];
  // Small clean line icons (stroke = currentColor) standing in for the old
  // emoji, matching a minimal portfolio-nav look.
  const SOCIAL_SVGS = {
    mail: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7.5" y1="10" x2="7.5" y2="17"/><circle cx="7.5" cy="6.8" r="0.9" fill="currentColor" stroke="none"/><path d="M11.5 17v-4.2c0-1.6 1-2.6 2.4-2.6 1.4 0 2.1 1 2.1 2.6V17"/></svg>',
    github: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.4 9.4 0 0 1 5 0c1.9-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>',
    write: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/><path d="M14.5 5.5l3 3"/></svg>',
  };
  if (navSocialEl) {
    SOCIAL_LINKS.forEach(s => {
      const a = document.createElement('a');
      a.className = 'nav-social-link';
      a.innerHTML = SOCIAL_SVGS[s.icon] || '';
      a.href = s.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', s.title);
      a.addEventListener('click', () => { Sound.click(); closeNavMenu(); });
      a.addEventListener('mouseenter', () => showPreview(s.title, a));
      a.addEventListener('focus', () => showPreview(s.title, a));
      a.addEventListener('mouseleave', hidePreview);
      a.addEventListener('blur', hidePreview);
      navSocialEl.appendChild(a);
    });
  }

  // ---------------- NAV: mobile hamburger (collapsible nav-menu) ----------------
  const navHamburger = document.getElementById('nav-hamburger');
  const navMenuEl = document.getElementById('nav-menu');
  function closeNavMenu() {
    if (!navMenuEl || !navMenuEl.classList.contains('open')) return;
    navMenuEl.classList.remove('open');
    document.body.classList.remove('nav-menu-open');
    if (navHamburger) navHamburger.setAttribute('aria-expanded', 'false');
  }
  function openNavMenu() {
    navMenuEl.classList.add('open');
    // The GAME MODE HUD is a fixed element with its own high z-index so it
    // can float above the page; without this the open dropdown  a
    // descendant of the nav's own, lower stacking context  would render
    // underneath it instead of on top.
    document.body.classList.add('nav-menu-open');
    navHamburger.setAttribute('aria-expanded', 'true');
  }
  if (navHamburger && navMenuEl) {
    navHamburger.addEventListener('click', () => {
      Sound.click();
      if (navMenuEl.classList.contains('open')) closeNavMenu(); else openNavMenu();
    });
    // Tapping/clicking outside the open menu (and off the hamburger itself) closes it.
    document.addEventListener('click', (e) => {
      if (!navMenuEl.classList.contains('open')) return;
      if (navMenuEl.contains(e.target) || navHamburger.contains(e.target)) return;
      closeNavMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNavMenu();
    });
    // Resizing past the mobile breakpoint (e.g. rotating a tablet) shouldn't
    // leave the menu stuck open once it's shown inline again.
    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) closeNavMenu();
    });
  }

  // ---------------- HERO PORTRAIT: hover-scatter particle field ----------------
  // Built from Swarna's own pixel-art (grid + palette exported by sprites.js),
  // not a generic dot field. Each pixel becomes a particle with a fixed home
  // position; particles near the cursor get pushed away, and continuously
  // spring back toward home with damping  so it reassembles on its own once
  // the mouse moves off, the same feel as the site this was modelled on.
  (function initHeroPortrait() {
    const canvas = document.getElementById('hero-portrait-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { grid, palette } = Sprites.characterPixelData;
    const SCALE = 14;
    const REPEL_RADIUS = 82;
    const REPEL_STRENGTH = 1500;
    const SPRING_K = 0.05;
    const DAMPING = 0.84;

    // Entrance effect: every particle starts flung out from its home spot in
    // a random direction, then the same spring-back-to-home physics used for
    // the hover-scatter (below) pulls it into place on its own  so on page
    // load the whole portrait looks like it's assembling itself out of
    // scattered pixels converging from every direction, no separate
    // animation system needed.
    const particles = [];
    for (let gy = 0; gy < grid.length; gy++) {
      const row = grid[gy];
      for (let gx = 0; gx < row.length; gx++) {
        const ch = row[gx];
        if (ch === '.') continue;
        const hx = gx * SCALE + SCALE / 2;
        const hy = gy * SCALE + SCALE / 2;
        const flungAngle = Math.random() * Math.PI * 2;
        const flungDist = prefersReducedMotion ? 0 : 130 + Math.random() * 260;
        particles.push({
          hx, hy,
          x: hx + Math.cos(flungAngle) * flungDist,
          y: hy + Math.sin(flungAngle) * flungDist,
          vx: 0, vy: 0,
          color: palette[ch],
          r: SCALE * 0.46,
        });
      }
    }

    canvas.width = grid[0].length * SCALE;
    canvas.height = grid.length * SCALE;

    let mouseX = null, mouseY = null;
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    canvas.addEventListener('mouseleave', () => { mouseX = null; mouseY = null; });
    canvas.addEventListener('touchmove', (e) => {
      if (!e.touches || !e.touches[0]) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
      mouseY = e.touches[0].clientY - rect.top;
    }, { passive: true });
    canvas.addEventListener('touchend', () => { mouseX = null; mouseY = null; });

    function drawStatic() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.hx - p.r, p.hy - p.r, p.r * 2, p.r * 2);
      });
    }

    if (prefersReducedMotion) {
      drawStatic();
      return; // skip the physics loop entirely  respect reduced-motion
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        if (mouseX !== null) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (dist < REPEL_RADIUS) {
            const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH / dist;
            p.vx += dx * force * 0.001;
            p.vy += dy * force * 0.001;
          }
        }
        p.vx += (p.hx - p.x) * SPRING_K;
        p.vy += (p.hy - p.y) * SPRING_K;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

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
    if (GameMode.active) return; // GAME MODE owns the keyboard while it's on
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') setManual(-1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') setManual(1);
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); startJump(); }
  });
  window.addEventListener('keyup', (e) => {
    if (GameMode.active) return;
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

  // ---------------- GAME MODE: cloud-hopper overlay, doesn't gate the page ----------------
  // Toggle on: a mushroom  a character of its own, entirely separate from
  // Swarna's ambient sprite, which keeps doing its own thing untouched
  // appears standing on a cloud and hops from cloud to cloud (arrow keys /
  // A-D to move, Space / up-arrow to jump) while the real page stays fully
  // visible and scrollable underneath. Clouds are scattered the whole way
  // down the page in real document coordinates, so scrolling brings new
  // ones into reach instead of ending the game. Miss a jump and it flashes
  // "FAILED" and drops the mushroom back onto solid ground rather than
  // stopping anything  this is a fun extra, never a gate on the content.
  (() => {
    const toggleBtn = document.getElementById('game-mode-toggle');
    const infoBtn = document.getElementById('game-info-btn');
    const infoPopover = document.getElementById('game-info-popover');
    const scorePill = document.getElementById('game-score-pill');
    const scoreVal = document.getElementById('game-score-val');
    const failToast = document.getElementById('game-fail-toast');
    const winBanner = document.getElementById('game-win-banner');
    const canvas = document.getElementById('game-canvas');
    if (!toggleBtn || !canvas) return;

    if (prefersReducedMotion) {
      toggleBtn.addEventListener('click', () => {
        infoPopover.textContent = "Game mode is paused because you've asked for reduced motion.";
        infoPopover.classList.remove('hidden');
      });
      infoBtn.addEventListener('click', () => infoPopover.classList.toggle('hidden'));
      return;
    }

    const ctx = canvas.getContext('2d');
    // Bigger, floatier jump (max height = JUMP_V^2 / (2*GRAVITY)  183px)
    // with clouds spaced further apart both vertically and sideways than
    // before, so the hop actually feels like a jump instead of a hair-short
    // hop between crowded platforms. Still tuned so one jump reliably
    // clears exactly ONE row  never two  with margin to spare, and there's
    // comfortably enough hang time left after the apex to drift sideways
    // onto the next cloud before landing.
    const GRAVITY = 0.7, JUMP_V = -16, SPEED = 3.8;
    const PLAYER_W = 56, PLAYER_H = 45; // prominent but not oversized (smaller again per feedback)
    const CLOUD_W = 92, CLOUD_H = 52;
    const CLOUD_GAP_Y = 130;      // vertical spacing between rows of clouds
    const FAIL_DISTANCE = 320;    // how far below the last safe cloud counts as "missed it"

    function img(src) { const i = new Image(); i.src = src; return i; }
    const playerImg = img(Sprites.mushroom);
    const coinImgs = Sprites.coin.map(img);
    const cloudImg = img(Sprites.gameCloud);

    let W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // player position: x is screen-space (no horizontal scrolling on this
    // site), docY is document-space so it naturally travels with scroll
    // exactly like the site's other page-anchored sprites do.
    const player = { x: 80, docY: 0, vy: 0, facing: 1, onGround: true };
    let clouds = [];    // { x, docY, hasCoin, coinGot, frame }
    let collected = 0;
    let totalCoins = 0;
    let won = false;
    let dancing = false;
    let danceT = 0;
    let sparkleCooldown = 0;
    let lastSafe = { x: 80, docY: 0 };
    const keys = { left: false, right: false };
    let rafId = null;

    function screenY(docY) { return docY - window.scrollY; }

    function buildWorld() {
      clouds = [];
      // Span the ENTIRE page, bottom to top  not just one screen's worth
      // near wherever the toggle happened to be clicked. That's what makes
      // scrolling actually keep the game going: there are clouds waiting
      // the whole length of the page, in both directions, no matter where
      // you scroll to.
      // Floor of one screen-and-change below the current scroll position
      // guards against a same-page-height report of 0 (as some
      // test/headless environments give) ever leaving the world empty.
      const docH = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        window.scrollY + H + 1000,
      );
      let y = docH - 140;
      let prevX = 60;
      let dir = 1;
      let runLeft = 2 + Math.floor(Math.random() * 3); // clouds left before a possible turn
      let first = true;
      while (y > -CLOUD_GAP_Y) {
        let x;
        if (first) {
          x = 60;
          first = false;
        } else {
          // Switchback path, not a strict every-other zig-zag: keep
          // drifting the same way for a few clouds in a row (a diagonal
          // "run"), then turn  like a trail up a hillside  so the
          // ladder actually traverses the width of the page instead of
          // wobbling in place near one edge. Each step still stays inside
          // how far the mushroom can drift sideways during one jump, so
          // every hop is still reachable.
          const step = 55 + Math.random() * 55;
          x = prevX + dir * step;
          const hitEdge = x < 20 || x > W - 20 - CLOUD_W;
          runLeft--;
          if (hitEdge || runLeft <= 0) {
            dir *= -1;
            runLeft = 2 + Math.floor(Math.random() * 3);
            x = prevX + dir * step;
          }
          x = Math.max(20, Math.min(W - 20 - CLOUD_W, x));
        }
        clouds.push({
          x, docY: y,
          hasCoin: Math.random() < 0.45,
          coinGot: false,
          frame: Math.random() * coinImgs.length,
        });
        prevX = x;
        y -= CLOUD_GAP_Y * (0.75 + Math.random() * 0.15);
      }
      collected = 0;
      totalCoins = clouds.reduce((n, c) => n + (c.hasCoin ? 1 : 0), 0);
      won = false;
      dancing = false;
      winBanner.classList.remove('show');
      scoreVal.textContent = '0';
    }

    // Find whichever cloud sits closest to the visitor's current scroll
    // position, so turning game mode on spawns the mushroom right where
    // they already are on the page instead of always at one fixed spot.
    function nearestCloudToViewport() {
      const target = window.scrollY + H - 140;
      let best = clouds[0], bestDist = Infinity;
      clouds.forEach(c => {
        const d = Math.abs(c.docY - target);
        if (d < bestDist) { bestDist = d; best = c; }
      });
      return best;
    }

    function showFail() {
      failToast.innerHTML = 'OUCH! YOU FELL<br><span style="font-size:11px">it’s fine, you can climb up!</span>';
      failToast.classList.add('show');
      clearTimeout(showFail._t);
      showFail._t = setTimeout(() => failToast.classList.remove('show'), 1400);
    }

    function triggerWin() {
      won = true;
      dancing = true;
      danceT = 0;
      Sound.win();
      winBanner.classList.add('show');
      clearTimeout(triggerWin._t);
      triggerWin._t = setTimeout(() => {
        winBanner.classList.remove('show');
        dancing = false;
      }, 3200);
    }

    function respawn() {
      Sound.fail();
      showFail();
      player.x = lastSafe.x;
      player.docY = lastSafe.docY - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
    }

    function onKeyDown(e) {
      if (!GameMode.active) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (player.onGround) { player.vy = JUMP_V; player.onGround = false; Sound.jump(); }
      }
      if (e.code === 'Escape') deactivate();
    }
    function onKeyUp(e) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    }

    function loop() {
      if (!GameMode.active) return;

      if (dancing) {
        // hold still on the winning cloud for the victory jig instead of
        // still falling/walking underneath the celebration
        danceT++;
        sparkleCooldown -= 16.7;
        if (sparkleCooldown <= 0) {
          sparkleCooldown = 90;
          spawnSparkleBurst(player.x, player.docY, PLAYER_W, PLAYER_H);
        }
        draw();
        rafId = requestAnimationFrame(loop);
        return;
      }

      const vx = (keys.left ? -SPEED : 0) + (keys.right ? SPEED : 0);
      if (vx !== 0) player.facing = vx > 0 ? 1 : -1;
      player.x = Math.max(10, Math.min(W - PLAYER_W - 10, player.x + vx));

      const wasFalling = player.vy > 0;
      player.vy += GRAVITY;
      const prevDocY = player.docY;
      player.docY += player.vy;
      player.onGround = false;

      // land on a cloud only when moving downward through its top surface
      if (player.vy > 0) {
        for (const c of clouds) {
          const cloudTop = c.docY;
          const withinX = player.x + PLAYER_W > c.x + 8 && player.x < c.x + CLOUD_W - 8;
          const crossedTop = prevDocY + PLAYER_H <= cloudTop + 10 && player.docY + PLAYER_H >= cloudTop;
          if (withinX && crossedTop) {
            player.docY = cloudTop - PLAYER_H;
            player.vy = 0;
            player.onGround = true;
            lastSafe = { x: player.x, docY: cloudTop };
            if (c.hasCoin && !c.coinGot) {
              c.coinGot = true;
              collected++;
              scoreVal.textContent = String(collected);
              Sound.coin();
              if (totalCoins > 0 && collected >= totalCoins && !won) triggerWin();
            }
            break;
          }
        }
      }

      if (!won && !player.onGround && player.docY > lastSafe.docY + FAIL_DISTANCE) {
        respawn();
      }

      clouds.forEach(c => { if (c.hasCoin && !c.coinGot) c.frame = (c.frame + 0.1) % coinImgs.length; });

      draw();
      rafId = requestAnimationFrame(loop);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      clouds.forEach(c => {
        const sy = screenY(c.docY);
        if (sy < -CLOUD_H || sy > H + CLOUD_H) return; // cull off-screen
        ctx.drawImage(cloudImg, c.x, sy, CLOUD_W, CLOUD_H);
        if (c.hasCoin && !c.coinGot) {
          const fi = Math.floor(c.frame) % coinImgs.length;
          ctx.drawImage(coinImgs[fi], c.x + CLOUD_W / 2 - 12, sy - 26, 24, 24);
        }
      });
      const py = screenY(player.docY);
      ctx.save();
      if (dancing) {
        // a little victory jig: bounce + wobble around the mushroom's own
        // center, alternating facing each beat so it reads as dancing
        // rather than just wiggling in place.
        const cx = player.x + PLAYER_W / 2, cy = py + PLAYER_H / 2;
        const bounce = 1 + Math.sin(danceT / 4) * 0.14;
        const wobble = Math.sin(danceT / 7) * 0.3;
        const flip = Math.sin(danceT / 9) < 0 ? -1 : 1;
        ctx.translate(cx, cy);
        ctx.rotate(wobble);
        ctx.scale(bounce * flip, bounce);
        ctx.drawImage(playerImg, -PLAYER_W / 2, -PLAYER_H / 2, PLAYER_W, PLAYER_H);
      } else if (player.facing < 0) {
        ctx.translate(player.x + PLAYER_W, py);
        ctx.scale(-1, 1);
        ctx.drawImage(playerImg, 0, 0, PLAYER_W, PLAYER_H);
      } else {
        ctx.drawImage(playerImg, player.x, py, PLAYER_W, PLAYER_H);
      }
      ctx.restore();
    }

    function activate() {
      GameMode.active = true;
      resize();
      document.body.classList.add('game-mode-active');
      toggleBtn.classList.add('is-on');
      toggleBtn.setAttribute('aria-pressed', 'true');
      scorePill.classList.remove('hidden');
      buildWorld();
      const spawn = nearestCloudToViewport();
      player.x = spawn.x; player.docY = spawn.docY - PLAYER_H; player.vy = 0; player.onGround = true;
      lastSafe = { x: player.x, docY: spawn.docY };
      rafId = requestAnimationFrame(loop);
    }
    function deactivate() {
      GameMode.active = false;
      if (rafId) cancelAnimationFrame(rafId);
      document.body.classList.remove('game-mode-active');
      toggleBtn.classList.remove('is-on');
      toggleBtn.setAttribute('aria-pressed', 'false');
      scorePill.classList.add('hidden');
      infoPopover.classList.add('hidden');
      failToast.classList.remove('show');
      winBanner.classList.remove('show');
      dancing = false;
      clearTimeout(triggerWin._t);
      ctx.clearRect(0, 0, W, H);
    }

    toggleBtn.addEventListener('click', () => {
      Sound.click();
      GameMode.active ? deactivate() : activate();
    });
    infoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      infoPopover.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!infoPopover.classList.contains('hidden') && e.target !== infoBtn && !infoPopover.contains(e.target)) {
        infoPopover.classList.add('hidden');
      }
    });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', debounce(() => {
      // The toggle itself is hidden below this width (no on-screen controls
      // exist for it there); if someone's already playing and resizes down
      // past that point  narrowing a window, rotating a tablet  bail out
      // of it cleanly instead of leaving it stuck running unreachably.
      if (GameMode.active && window.innerWidth <= 760) { deactivate(); return; }
      if (GameMode.active) resize();
    }, 200));
  })();

})();
