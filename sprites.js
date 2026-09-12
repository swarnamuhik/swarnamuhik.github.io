// ===================================================================
// SPRITES.JS — generates pixel-art sprites on offscreen canvases
// so the whole game ships with zero external image dependencies.
// ===================================================================

const Sprites = (() => {

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // Draw a grid of pixels. grid = array of strings, each char = color key or '.' for transparent
  function drawGrid(ctx, grid, palette, scale) {
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' ) continue;
        ctx.fillStyle = palette[ch];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  // ---------- CHARACTER (Swarna) ----------
  // 16x22 grid: hair bun w/ scrunchie, smart-casual top + skirt.
  // Frame 0 = stand/idle, 1 = walk, 2 = jump. Shared base grid, legs vary per frame.
  const charPalette = {
    'k': '#101010', // outline
    'h': '#2a1810', // hair
    's': '#f4c28a', // skin
    't': '#3a8a8a', // teal top
    'b': '#2a2a3a', // navy skirt
    'w': '#fcfcfc', // white collar / eye whites
    'y': '#3a2410', // shoe brown
    'g': '#e85d75', // coral scrunchie
    'c': '#19193c', // graduation cap navy
    'm': '#fcd800', // tassel gold
  };

  function characterGrid(frame) {
    const base = [
      "......kkkk......", //0  bun top
      ".....kggggk.....", //1  bun w/ scrunchie band
      ".....khhhhk.....", //2  bun
      "....kkhhhhkk....", //3  hair crown
      "...khhhhhhhhk...", //4  hair sides
      "..khhssssssshk..", //5  forehead
      "..khssssssssshk.", //6  upper face
      "..khsswkskwsshk.", //7  eyes
      "..khsssssssshk..", //8  cheeks
      "..khssssssssk...", //9  lower cheeks
      "...kkssssskk....", //10 jaw
      "....kktwtkk.....", //11 collar start
      "...ktwwwwwtk....", //12 collar
      "..ktttwwwtttk...", //13 shoulders
      "..ktttttttttk...", //14 top
      "..ktttttttttk...", //15 top
      "...kbbbbbbbk....", //16 skirt
      "...kbbbbbbbk....", //17 skirt
      "....kbbbbbk.....", //18 hem
      ".....kssssk.....", //19 legs (stand)
      ".....kyyyyk.....", //20 shoes (stand)
      "....kyyyyyyk....", //21 shoes base (stand)
    ];
    if (frame === 1) {
      base[19] = "....kss..sk.....";
      base[20] = "....ky....yk....";
      base[21] = "...kyy....yyk...";
    } else if (frame === 2) {
      base[18] = "....kbbbbbk.....";
      base[19] = ".....kssssk.....";
      base[20] = ".....kyyyk......";
      base[21] = "................";
    }
    return base;
  }

  // Graduation-cap variant: replaces the bun (rows 0-3) with a mortarboard + tassel,
  // keeps the same face/body/legs so it drops in for the Education section.
  function cappedGrid(frame) {
    const base = characterGrid(frame);
    base[0] = "....kkkkkkkkk...";
    base[1] = "....kccccccck...";
    base[2] = ".......kmk......";
    base[3] = ".....kkkkkkk....";
    return base;
  }

  function buildCharacterSprite(frame, capped) {
    const scale = 4;
    const c = makeCanvas(16 * scale, 22 * scale);
    const ctx = c.getContext('2d');
    drawGrid(ctx, capped ? cappedGrid(frame) : characterGrid(frame), charPalette, scale);
    return c.toDataURL();
  }

  // ---------- MUSHROOM (skills section decoration) ----------
  function buildMushroom(capColor) {
    const palette = {
      'k': '#101010',
      'r': capColor, // cap color — varies per variant (red, green, ...)
      'w': '#FCFCFC', // spots / stem dots
      't': '#f4c28a', // stem
    };
    const scale = 5;
    const grid = [
      "....kkkkkkkk....",
      "..kkrrrrrrrrkk..",
      ".krrwrrrrrwrrk..",
      "krrrrrrrrrrrrrk.",
      "krrwrrrrrwrrrrk.",
      "krrrrrrrrrrrrrk.",
      ".kkkkkkkkkkkkk..",
      "...ktttttttk....",
      "...ktwtwtwtk....",
      "...ktttttttk....",
      "...ktwtwtwtk....",
      "....kkkkkkk.....",
    ];
    const c = makeCanvas(16 * scale, 12 * scale);
    const ctx = c.getContext('2d');
    drawGrid(ctx, grid, palette, scale);
    return c.toDataURL();
  }

  // ---------- SPARKLE (skills power-up / grad twinkle) ----------
  const sparklePalette = { 'y': '#fcd800', 'w': '#ffffff' };
  function buildSparkle() {
    const scale = 4;
    const grid = [
      "...y....",
      "...y....",
      "..ywy...",
      "yyywyyy.",
      "..ywy...",
      "...y....",
      "...y....",
      "........",
    ];
    const c = makeCanvas(8 * scale, 8 * scale);
    const ctx = c.getContext('2d');
    drawGrid(ctx, grid, sparklePalette, scale);
    return c.toDataURL();
  }

  // ---------- CATERPILLAR TOY TRUCK (experience section decoration) ----------
  const truckPalette = {
    'k': '#101010',
    'y': '#fcb800', // Caterpillar-style yellow (generic, not the brand mark)
    'd': '#282828', // cab window
    'r': '#b41e14', // small detail stripe
  };
  function buildTruck() {
    const scale = 5;
    const grid = [
      "............kkkkkkkkk......",
      "..........kkyyyyyyyk.......",
      "..........kydddddyk.k......",
      "..........kydddddyk.k......",
      ".....kkkkkkyyyyyyyyykk.....",
      "....kyyyyyyyyyyyyyyyyk.....",
      "....kyyyyyyyyyyyyyyyyk.....",
      "....kyyrkkkkkkkkkkkyyk.....",
      "....kkkkkkkkkkkkkkkkkk.....",
      ".....kk............kk......",
      "....kkkk..........kkkk.....",
      "...kkkkkk........kkkkkk....",
      "...kkkkkk........kkkkkk....",
      "....kkkk..........kkkk.....",
    ];
    const c = makeCanvas(28 * scale, 14 * scale);
    const ctx = c.getContext('2d');
    drawGrid(ctx, grid, truckPalette, scale);
    return c.toDataURL();
  }

  // ---------- BLOCK (question block) ----------
  function buildQuestionBlock(hit) {
    const scale = 4;
    const c = makeCanvas(16 * scale, 16 * scale);
    const ctx = c.getContext('2d');
    const fill = hit ? '#8a5a2a' : '#d89048';
    const dark = hit ? '#5c3a18' : '#883800';
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 16 * scale, 16 * scale);
    ctx.strokeStyle = dark;
    ctx.lineWidth = scale;
    ctx.strokeRect(scale / 2, scale / 2, 16 * scale - scale, 16 * scale - scale);
    // rivets
    ctx.fillStyle = dark;
    const rivetPos = [2, 13];
    rivetPos.forEach(rx => rivetPos.forEach(ry => {
      ctx.fillRect(rx * scale, ry * scale, scale, scale);
    }));
    if (!hit) {
      ctx.fillStyle = '#fff8d8';
      ctx.font = `bold ${10 * scale}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 8 * scale, 8.5 * scale);
      ctx.strokeStyle = '#5c3a18';
      ctx.lineWidth = 1;
    }
    return c.toDataURL();
  }

  // ---------- BRICK ----------
  function buildBrick() {
    const scale = 4;
    const c = makeCanvas(16 * scale, 16 * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b85318';
    ctx.fillRect(0, 0, 16 * scale, 16 * scale);
    ctx.strokeStyle = '#6e2d0a';
    ctx.lineWidth = scale * 0.7;
    // brick lines
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 4 * scale);
      ctx.lineTo(16 * scale, i * 4 * scale);
      ctx.stroke();
    }
    return c.toDataURL();
  }

  // ---------- PIPE (top segment) ----------
  function buildPipe(height) {
    const scale = 4;
    const w = 32, h = height;
    const c = makeCanvas(w * scale, h * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#00a800';
    ctx.fillRect(0, 0, w * scale, h * scale);
    ctx.fillStyle = '#006800';
    ctx.fillRect(0, 0, scale * 2, h * scale);
    ctx.fillRect((w - 2) * scale, 0, scale * 2, h * scale);
    ctx.fillStyle = '#00a800';
    ctx.fillRect(0, 0, w * scale, scale * 6);
    ctx.fillStyle = '#006800';
    ctx.fillRect(0, 0, scale * 2, scale * 6);
    ctx.fillRect((w - 2) * scale, 0, scale * 2, scale * 6);
    ctx.strokeStyle = '#003c00';
    ctx.lineWidth = scale * 0.6;
    ctx.strokeRect(0, 0, w * scale, h * scale);
    return c.toDataURL();
  }

  // ---------- GROUND TILE ----------
  function buildGroundTile() {
    const scale = 4;
    const c = makeCanvas(16 * scale, 16 * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b85318';
    ctx.fillRect(0, 0, 16 * scale, 16 * scale);
    ctx.fillStyle = '#d89048';
    ctx.fillRect(0, 0, 16 * scale, 4 * scale);
    ctx.fillStyle = '#6e2d0a';
    ctx.fillRect(0, 0, scale, 16 * scale);
    ctx.fillRect(15 * scale, 0, scale, 16 * scale);
    ctx.fillRect(0, 15 * scale, 16 * scale, scale);
    return c.toDataURL();
  }

  // ---------- COIN ----------
  function buildCoin(frame) {
    const scale = 4;
    const c = makeCanvas(16 * scale, 16 * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fcd800';
    const widths = [10, 6, 10, 6];
    const w = widths[frame % 4];
    ctx.beginPath();
    ctx.ellipse(8 * scale, 8 * scale, w * scale / 2, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a87000';
    ctx.lineWidth = scale * 0.5;
    ctx.stroke();
    return c.toDataURL();
  }

  // ---------- CLOUD ----------
  // fillColor/outlineColor are parameterized so GAME MODE's platform clouds
  // can use a warm, distinct tint instead of the same flat white as the
  // page's plain decorative sky clouds  otherwise the two blend together
  // and it's hard to tell "background" from "thing you can jump on." The
  // outline (when given) is drawn as a slightly-larger silhouette BEHIND
  // the main shape, not a stroke on top of it  stroking the three
  // overlapping lobe-circles directly leaves visible seams where they
  // overlap; a solid larger shape underneath just peeks out as a clean
  // border with no seams.
  function cloudPath(ctx, scale, pad, grow = 0) {
    ctx.beginPath();
    ctx.arc(pad + 7 * scale, pad + 10 * scale, 6 * scale + grow, 0, Math.PI * 2);
    ctx.arc(pad + 14 * scale, pad + 6 * scale, 7 * scale + grow, 0, Math.PI * 2);
    ctx.arc(pad + 21 * scale, pad + 10 * scale, 6 * scale + grow, 0, Math.PI * 2);
  }
  function buildCloud(fillColor = '#fcfcfc', outlineColor = null) {
    const scale = 4;
    const growAmt = outlineColor ? scale : 0; // thin border, padded so it isn't clipped
    const pad = growAmt;
    const c = makeCanvas(28 * scale + pad * 2, 16 * scale + pad * 2);
    const ctx = c.getContext('2d');
    if (outlineColor) {
      ctx.fillStyle = outlineColor;
      cloudPath(ctx, scale, pad, growAmt);
      ctx.fill();
    }
    ctx.fillStyle = fillColor;
    cloudPath(ctx, scale, pad, 0);
    ctx.fill();
    return c.toDataURL();
  }

  // ---------- BUSH ----------
  function buildBush() {
    const scale = 4;
    const c = makeCanvas(28 * scale, 14 * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#00a800';
    ctx.beginPath();
    ctx.arc(7 * scale, 9 * scale, 6 * scale, 0, Math.PI * 2);
    ctx.arc(14 * scale, 5 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.arc(21 * scale, 9 * scale, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
    return c.toDataURL();
  }

  // ---------- FLAGPOLE ----------
  function buildFlag() {
    const scale = 4;
    const c = makeCanvas(20 * scale, 16 * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#00a800';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(16 * scale, 8 * scale);
    ctx.lineTo(0, 16 * scale);
    ctx.fill();
    return c.toDataURL();
  }

  // ---------- GOOMBA-style ICON badge background (not enemy, used decoratively) ----------
  function buildStar() {
    const scale = 4;
    const c = makeCanvas(16 * scale, 16 * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fce800';
    ctx.strokeStyle = '#a87000';
    ctx.lineWidth = scale * 0.5;
    const cx = 8 * scale, cy = 8 * scale, spikes = 5, outerR = 7 * scale, innerR = 3 * scale;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return c.toDataURL();
  }

  return {
    // Raw grid + palette for frame 0 (stand pose), exposed so the hero
    // section can build a real particle-portrait out of Swarna's own
    // pixel-art colors instead of a generic dot field.
    characterPixelData: { grid: characterGrid(0), palette: charPalette },
    character: [buildCharacterSprite(0, false), buildCharacterSprite(1, false), buildCharacterSprite(2, false)],
    characterCapped: [buildCharacterSprite(0, true), buildCharacterSprite(1, true), buildCharacterSprite(2, true)],
    truck: buildTruck(),
    mushroom: buildMushroom('#B81000'),
    mushroomGreen: buildMushroom('#00A800'),
    sparkle: buildSparkle(),
    questionBlock: buildQuestionBlock(false),
    questionBlockHit: buildQuestionBlock(true),
    brick: buildBrick(),
    pipe: (h) => buildPipe(h),
    ground: buildGroundTile(),
    coin: [buildCoin(0), buildCoin(1), buildCoin(2), buildCoin(3)],
    cloud: buildCloud(),
    // GAME MODE's jump-on platforms: a warm peachy-gold tint with a soft
    // tan outline, so they read as distinct "things to land on" against
    // both the blue sky and the page's plain white ambient clouds, instead
    // of blending in.
    gameCloud: buildCloud('#ffe3ad', '#e0a83c'),
    bush: buildBush(),
    flag: buildFlag(),
    star: buildStar(),
  };
})();
