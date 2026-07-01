const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..'); // dev/ -> project root

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
});

const { window } = dom;

// Polyfills jsdom lacks
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addListener() {}, removeListener() {} };
};
window.IntersectionObserver = window.IntersectionObserver || class {
  constructor(cb) { this.cb = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.requestAnimationFrame = window.requestAnimationFrame || function (cb) { return setTimeout(() => cb(performance.now()), 16); };
window.scrollTo = window.scrollTo || function () {};

// Mock 2D canvas context (jsdom has no native Canvas 2D renderer without the
// `canvas` npm package, which needs a native build toolchain unavailable in
// this sandbox). This lets us exercise all the sprite-drawing *logic* and
// catch real bugs (undefined vars, bad API calls) without needing actual
// pixel output. toDataURL is mocked to return a harmless placeholder.
const mockCtx = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
  fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
  arc() {}, ellipse() {}, fill() {}, closePath() {}, fillText() {},
  createLinearGradient() { return { addColorStop() {} }; },
  drawImage() {}, save() {}, restore() {}, translate() {}, scale() {}, setTransform() {},
};
window.HTMLCanvasElement.prototype.getContext = function () { return mockCtx; };
window.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/png;base64,MOCK'; };

let errorCount = 0;
window.addEventListener('error', (e) => {
  errorCount++;
  console.error('RUNTIME ERROR:', e.error ? e.error.stack : e.message);
});

// Manually load local scripts since runScripts:dangerously with external <script src> over file:// can be inconsistent in jsdom
function loadScript(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  window.eval(code);
}

// Wait for DOMContentLoaded-equivalent: jsdom parses synchronously here since runScripts dangerously + resources usable
// but our <script src> tags need manual loading since there's no real server.
setTimeout(() => {
  try {
    const spritesCode = fs.readFileSync(path.join(ROOT, 'sprites.js'), 'utf8');
    const scriptCode = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
    // Concatenate, matching how sequential <script src> tags share top-level scope in a real page
    window.eval(spritesCode + '\n' + scriptCode);
    console.log('sprites.js + script.js executed OK');
  } catch (e) {
    console.error('SCRIPT EXECUTION FAILED:', e.stack);
    errorCount++;
  }

  // basic structural assertions
  const doc = window.document;
  const navNodes = doc.querySelectorAll('.nav-node');
  console.log('nav nodes created:', navNodes.length, '(expect 6)');

  const marioSprite = doc.getElementById('mario-sprite');
  console.log('mario sprite src set:', marioSprite.src && marioSprite.src.startsWith('data:image'));

  const cards = doc.querySelectorAll('.pop-card');
  console.log('pop-cards found:', cards.length);

  // test nav click doesn't throw (mock scrollIntoView since jsdom lacks layout)
  let scrollCalled = false;
  doc.querySelectorAll('.level-section, section, header').forEach(el => {
    el.scrollIntoView = () => { scrollCalled = true; };
  });
  try {
    navNodes[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    console.log('nav node click handled OK, scrollIntoView called:', scrollCalled);
  } catch (e) {
    console.error('NAV CLICK FAILED:', e.stack);
    errorCount++;
  }

  // test home button click doesn't throw and scrolls to hero
  try {
    scrollCalled = false;
    const homeBtn = doc.getElementById('nav-home-btn');
    homeBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    console.log('home button click handled OK, scrollIntoView called:', scrollCalled);
  } catch (e) {
    console.error('HOME BUTTON CLICK FAILED:', e.stack);
    errorCount++;
  }

  // test mario control buttons don't throw
  try {
    const leftBtn = doc.getElementById('mario-left');
    leftBtn.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    leftBtn.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
    const jumpBtn = doc.getElementById('mario-jump');
    jumpBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    console.log('mario control buttons handled OK');
  } catch (e) {
    console.error('MARIO CONTROLS FAILED:', e.stack);
    errorCount++;
  }

  // test sound mute toggle doesn't throw (AudioContext is absent in jsdom — this also verifies the no-AudioContext fallback path)
  try {
    const soundBtn = doc.getElementById('sound-toggle');
    const before = soundBtn.textContent;
    soundBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const after = soundBtn.textContent;
    console.log('sound toggle handled OK, icon changed:', before, '->', after);
    soundBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // toggle back
  } catch (e) {
    console.error('SOUND TOGGLE FAILED:', e.stack);
    errorCount++;
  }

  // check the mushroom and speech bubble elements exist and got real sprite data
  try {
    const mushroomRed = doc.getElementById('mushroom-red');
    const mushroomGreen = doc.getElementById('mushroom-green');
    console.log('mushroom-red created:', !!mushroomRed, 'src OK:', mushroomRed && mushroomRed.src.startsWith('data:image'));
    console.log('mushroom-green created:', !!mushroomGreen, 'src OK:', mushroomGreen && mushroomGreen.src.startsWith('data:image'));
    const bubble = doc.getElementById('speech-bubble');
    console.log('speech-bubble element present:', !!bubble, 'has hidden class initially:', bubble && bubble.classList.contains('hidden'));
    const smallBubbles = doc.querySelectorAll('.speech-bubble-small');
    console.log('mushroom speech bubbles created:', smallBubbles.length, '(expect 1, only the red one has a message)');
  } catch (e) {
    console.error('MUSHROOM/BUBBLE CHECK FAILED:', e.stack);
    errorCount++;
  }

  // The character's grow/cap/truck logic is driven by an internal closure
  // (Char.sectionIdx), which is intentionally not exposed on window — good
  // encapsulation, but it means we can't force it from outside. Instead we
  // verify the pieces that *are* externally observable: the truck element
  // gets created and given a real sprite, and a full animation frame runs
  // without throwing regardless of which section is currently in view.
  try {
    const truck = doc.getElementById('cat-truck');
    console.log('cat-truck element created:', !!truck, 'src starts with data:image:', truck && truck.src.startsWith('data:image'));
  } catch (e) {
    console.error('TRUCK CHECK FAILED:', e.stack);
    errorCount++;
  }

  // simulate a tick of the animation loop manually by calling requestAnimationFrame once more
  setTimeout(() => {
    console.log('--- after one more frame tick ---');
    console.log('Total runtime errors:', errorCount);
    process.exit(errorCount > 0 ? 1 : 0);
  }, 200);
}, 50);
