// CANOPY — road.js
// Every so often the forest opens: a two-lane road crosses the scene from side to side, with a yellow dashed
// centre line, and one building stands beside it. The camera crosses the road and goes back into the trees.
// Buildings are painted procedurally into sprites, like the trees, plus an EMISSIVE layer (neon, lit windows)
// that glows on its own and is reflected on the wet asphalt.
//
//   to add a building: Canopy.building('name', { width, depth, paint() { ... }, cars() { ... } })
//   and add its name to CONFIG.road.buildings.
//
// Sound: neon and windows breathe with the MIDS; in intense moments they pulse on the kick.

const ROAD = { half: 3.7, shoulder: 1.8 };

// ---------- painting helpers for buildings (metres, y up, x = 0 at the centre of the sprite) ----------
function BP(sp) {
  const X = sp.X, Y = sp.Y, k = sp.k;
  return {
    k, X, Y,
    rect(c, x0, y0, x1, y1, col, a = 1) { c.fillStyle = U.rgba(col, a); c.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k); },
    poly(c, pts, col, a = 1) { c.fillStyle = U.rgba(col, a); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.closePath(); c.fill(); },
    line(c, x0, y0, x1, y1, col, w = 0.05, a = 1) { c.strokeStyle = U.rgba(col, a); c.lineWidth = Math.max(0.6, w * k); c.lineCap = 'round'; c.beginPath(); c.moveTo(X(x0), Y(y0)); c.lineTo(X(x1), Y(y1)); c.stroke(); },
    circle(c, x, y, r, col, a = 1) { c.fillStyle = U.rgba(col, a); c.beginPath(); c.arc(X(x), Y(y), Math.max(0.5, r * k), 0, U.TAU); c.fill(); },
    text(c, str, x, y, size, col, a = 1, family = 'Georgia, "Times New Roman", serif', weight = 'bold') {
      c.font = `${weight} ${size * k}px ${family}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = U.rgba(col, a); c.fillText(str, X(x), Y(y));
    },
    neon(E, str, x, y, size, col, family = '"Trebuchet MS", "Helvetica Neue", Arial, sans-serif') {
      E.font = `bold ${size * k}px ${family}`; E.textAlign = 'center'; E.textBaseline = 'middle'; E.lineJoin = 'round';
      E.shadowColor = U.rgba(col, 1);
      for (const [blur, w, a] of [[size * k * 0.7, size * k * 0.14, 0.45], [size * k * 0.25, size * k * 0.07, 0.85]]) {
        E.shadowBlur = blur; E.strokeStyle = U.rgba(col, a); E.lineWidth = w; E.strokeText(str, X(x), Y(y));
      }
      E.shadowBlur = 0; E.strokeStyle = U.rgba(U.mix(col, [255, 255, 255], 0.65), 0.95); E.lineWidth = Math.max(1, size * k * 0.028); E.strokeText(str, X(x), Y(y));
    },
    glow(E, x0, y0, x1, y1, col, a) {                                 // a lit window, brighter toward the ceiling lights
      const g = E.createLinearGradient(0, Y(y1), 0, Y(y0));
      g.addColorStop(0, U.rgba(col, a)); g.addColorStop(1, U.rgba(col, a * 0.5));
      E.fillStyle = g; E.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k);
    },
    dark(E, x0, y0, x1, y1, a = 0.85) {                               // a silhouette inside a lit window
      E.save(); E.globalCompositeOperation = 'destination-out'; E.fillStyle = `rgba(0,0,0,${a})`; E.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k); E.restore();
    },
    bulb(E, x, y, r, col, a = 1) {
      const g = E.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r * k);
      g.addColorStop(0, U.rgba(U.mix(col, [255, 255, 255], 0.5), a)); g.addColorStop(0.3, U.rgba(col, a * 0.6)); g.addColorStop(1, U.rgba(col, 0));
      E.fillStyle = g; E.fillRect(X(x) - r * k, Y(y) - r * k, r * k * 2, r * k * 2);
    },
    grime(c, w, h) {                                                  // rain streaks and dirt, only where something is painted
      c.save(); c.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < w * 0.9; i++) { c.fillStyle = `rgba(24,20,14,${U.rand(0.04, 0.14)})`; c.fillRect(U.rand(w), U.rand(h * 0.1, h), U.rand(1, 3), U.rand(8, 70)); }
      for (let i = 0; i < w * h * 0.006; i++) { c.fillStyle = U.rand() < 0.6 ? `rgba(0,0,0,${U.rand(0.04, 0.12)})` : `rgba(255,250,235,${U.rand(0.03, 0.08)})`; c.fillRect(U.rand(w), U.rand(h), U.rand(1, 3), U.rand(1, 3)); }
      c.restore();
    }
  };
}
function bldSprite(wm, hm, k) {
  const sp = Sprites.create(wm, hm, k, wm / 2, 0.3);
  sp.e = U.canvas(sp.w, sp.h); sp.E = sp.e.getContext('2d');
  return sp;
}
function finishBld(sp, lights) {
  const E = sp.E; delete sp.E;
  Sprites.soften(sp.e, 0.5); sp.lights = lights;
  return Sprites.finish(sp, 0.15, { keep: 0.5, ghost: 0.35, base: 0.6, points: 0 });
}

// ---------- old cars, side view (front toward +x) ----------
const CARS = {
  pickup50: { body: [[-2.45, 0.42], [-2.45, 1.02], [-0.62, 1.02], [-0.62, 1.62], [-0.5, 1.72], [0.35, 1.72], [0.55, 1.6], [0.72, 1.18], [1.55, 1.12], [2.3, 1.0], [2.48, 0.8], [2.45, 0.42]],
    win: [[-0.48, 1.18], [-0.48, 1.58], [0.3, 1.62], [0.52, 1.2]], wheels: [[-1.55, 0.4, 0.4], [1.6, 0.4, 0.4]], fenders: [[1.6, 0.74, 0.72, 0.42], [-1.55, 0.74, 0.62, 0.38]] },
  cadillac59: { body: [[-2.85, 0.42], [-2.88, 0.92], [-2.7, 1.26], [-2.45, 1.0], [-1.25, 1.02], [-0.95, 1.38], [0.3, 1.4], [0.75, 1.04], [2.55, 0.96], [2.85, 0.78], [2.82, 0.42]],
    win: [[-0.85, 1.06], [-0.78, 1.34], [0.28, 1.36], [0.62, 1.06]], wheels: [[-1.8, 0.36, 0.36], [1.75, 0.36, 0.36]], whitewall: true, strip: 0.74 },
  pickup72: { body: [[-2.65, 0.48], [-2.65, 1.15], [-0.55, 1.15], [-0.55, 1.86], [0.35, 1.86], [0.8, 1.3], [2.5, 1.22], [2.65, 1.1], [2.65, 0.48]],
    win: [[-0.45, 1.3], [-0.45, 1.78], [0.3, 1.78], [0.68, 1.3]], wheels: [[-1.7, 0.42, 0.42], [1.7, 0.42, 0.42]] },
  coupe68: { body: [[-2.55, 0.44], [-2.58, 0.9], [-1.55, 0.98], [-0.55, 1.36], [0.3, 1.38], [0.8, 1.0], [2.4, 0.92], [2.56, 0.72], [2.52, 0.44]],
    win: [[-0.45, 1.02], [-0.4, 1.3], [0.28, 1.32], [0.66, 1.02]], wheels: [[-1.6, 0.36, 0.36], [1.6, 0.36, 0.36]], stripe: [176, 54, 42] },
  truck40: { body: [[-2.6, 0.55], [-2.6, 1.15], [-0.7, 1.15], [-0.7, 1.85], [0.3, 1.9], [0.55, 1.4], [1.6, 1.35], [2.3, 1.2], [2.45, 0.9], [2.4, 0.55]],
    win: [[-0.6, 1.32], [-0.6, 1.76], [0.25, 1.8], [0.45, 1.36]], wheels: [[-1.6, 0.45, 0.45], [1.55, 0.45, 0.45]], fenders: [[1.55, 0.86, 0.72, 0.46], [-1.6, 0.86, 0.66, 0.42]], stakes: true }
};
const PAINTS = [[78, 112, 110], [176, 166, 136], [124, 48, 40], [138, 108, 68], [44, 46, 52], [92, 104, 124], [150, 140, 120]];

function drawCar(A, L, b, M, cx, s, col, o = {}) {
  const P = ([x, y]) => [cx + x * s, y * s];
  const path = new Path2D(); M.body.map(P).forEach(([x, y], i) => i ? path.lineTo(b.X(x), b.Y(y)) : path.moveTo(b.X(x), b.Y(y))); path.closePath();
  const top = Math.max(...M.body.map(p => p[1])) * s, g = A.createLinearGradient(0, b.Y(top), 0, b.Y(0.4 * s));
  g.addColorStop(0, U.rgba(U.mix(col, [220, 226, 226], 0.25))); g.addColorStop(0.45, U.rgba(col)); g.addColorStop(1, U.rgba(U.mul(col, 0.55)));
  for (const [wx, wy, wr] of M.wheels) b.circle(A, cx + wx * s, wy * s, wr * s * 1.15, [16, 14, 12]);   // wheel wells
  A.fillStyle = g; A.fill(path);
  for (const f of M.fenders || []) { A.fillStyle = U.rgba(U.mul(col, 0.95)); A.beginPath(); A.ellipse(b.X(cx + f[0] * s), b.Y(f[1] * s), f[2] * s * b.k, f[3] * s * b.k, 0, Math.PI, 0); A.fill(); }
  if (M.stripe) { A.save(); A.clip(path); b.rect(A, cx - 2.6 * s, 0.82 * s, cx + 2.6 * s, 0.9 * s, M.stripe, 0.9); A.restore(); }
  A.save(); A.clip(path);                                            // rust, dents and dirt
  for (let i = 0; i < 900 * s; i++) {
    const x = U.rand(-2.9, 2.9), y = U.rand(0.4, 1.9), r = U.fbm(x * 1.4 + cx, y * 2 + o.seed);
    if (r < 0.52 - (o.rust || 0.3) * 0.25) continue;
    b.circle(A, cx + x * s, y * s, U.rand(0.015, 0.05) * s, U.pick([[132, 70, 38], [104, 54, 32], [150, 90, 50], [70, 44, 30]]), U.rand(0.5, 0.95));
  }
  const dirt = A.createLinearGradient(0, b.Y(0.9 * s), 0, b.Y(0.4 * s)); dirt.addColorStop(0, 'rgba(40,32,24,0)'); dirt.addColorStop(1, 'rgba(40,32,24,0.55)');
  A.fillStyle = dirt; A.fill(path);
  A.restore();
  b.poly(A, M.win.map(P), [28, 34, 38], 0.95);                          // glass, a pale reflection on top
  const w0 = M.win.map(P); b.line(A, w0[1][0], w0[1][1] - 0.05 * s, w0[2][0], w0[2][1] - 0.05 * s, [150, 160, 166], 0.03 * s, 0.5);
  if (M.strip) b.line(A, cx - 2.7 * s, M.strip * s, cx + 2.7 * s, (M.strip + 0.03) * s, [210, 214, 214], 0.035 * s, 0.85);
  const xs = M.body.map(p => p[0]), xmin = Math.min(...xs) * s, xmax = Math.max(...xs) * s;
  b.line(A, cx + xmin - 0.05, 0.5 * s, cx + xmin + 0.3, 0.5 * s, [196, 198, 196], 0.09 * s, 0.9);    // bumpers
  b.line(A, cx + xmax - 0.3, 0.5 * s, cx + xmax + 0.05, 0.5 * s, [196, 198, 196], 0.09 * s, 0.9);
  b.circle(A, cx + (xmax - 0.12), 0.8 * s, 0.09 * s, [190, 186, 170]);                               // headlight
  if (M.stakes) for (let x = -2.5; x < -0.8; x += 0.42) b.line(A, cx + x * s, 1.15 * s, cx + x * s, 1.7 * s, [70, 56, 44], 0.06 * s);
  M.wheels.forEach(([wx, wy, wr], i) => {
    const flat = o.flat && i === 0 ? 0.82 : 1;
    A.fillStyle = 'rgb(20,18,16)'; A.beginPath(); A.ellipse(b.X(cx + wx * s), b.Y(wy * s * flat), wr * s * b.k, wr * s * b.k * flat, 0, 0, U.TAU); A.fill();
    if (M.whitewall) { A.strokeStyle = 'rgba(200,200,190,0.8)'; A.lineWidth = wr * s * b.k * 0.22; A.beginPath(); A.arc(b.X(cx + wx * s), b.Y(wy * s * flat), wr * s * b.k * 0.62, 0, U.TAU); A.stroke(); }
    b.circle(A, cx + wx * s, wy * s * flat, wr * s * 0.42, [120, 116, 108]);
    b.circle(A, cx + wx * s, wy * s * flat, wr * s * 0.18, [170, 168, 160]);
  });
  // light catches the roof line and the chrome
  for (let i = 1; i < M.body.length - 2; i++) { const [x0, y0] = P(M.body[i]), [x1, y1] = P(M.body[i + 1]); if (y0 > 0.9 * s && y1 > 0.9 * s) b.line(L, x0, y0, x1, y1, [255, 255, 255], 0.03 * s, 0.6); }
  if (o.overgrown) {                                                  // the forest taking it back
    for (let i = 0; i < 700 * s; i++) {
      const x = U.rand(-2.6, 2.6), p = M.body.filter(q => Math.abs(q[0] - x) < 0.5);
      if (!p.length) continue;
      const y = Math.max(...p.map(q => q[1])) + U.rand(-0.05, 0.06);
      if (U.fbm(x + o.seed, 3) < 0.4) continue;
      b.circle(A, cx + x * s, y * s, U.rand(0.012, 0.035) * s, U.pick(MOSS), 0.9);
      if (U.rand() < 0.2) b.circle(L, cx + x * s, y * s, 0.02 * s, [255, 255, 255], 0.5);
    }
    for (let i = 0; i < 60; i++) {                                    // ferns and brambles around the wheels
      const x = U.rand(-3, 3), h = U.rand(0.2, 0.9), lean = U.gauss() * 0.4, col2 = U.pick([[46, 86, 48], [60, 96, 46], [80, 70, 44]]);
      b.line(A, cx + x * s, 0, cx + (x + lean) * s, h * s, col2, 0.025 * s, 0.9);
      if (U.rand() < 0.3) b.line(L, cx + (x + lean * 0.6) * s, h * 0.6 * s, cx + (x + lean) * s, h * s, [255, 255, 255], 0.02 * s, 0.5);
    }
  }
}
function paintCar(model, col, overgrown) {
  const sp = Sprites.create(6.6, 2.7, 60, 3.3, 0.25), b = BP(sp);
  drawCar(sp.A, sp.L, b, CARS[model], 0, 1, col, { seed: U.rand(100), rust: overgrown ? 0.8 : U.rand(0.2, 0.6), flat: U.rand() < 0.4, overgrown });
  b.grime(sp.A, sp.w, sp.h);
  return Sprites.finish(sp, 0.18, { keep: 0.45, ghost: 0.3, base: 0.5, points: 0 });
}

// ---------------------------------------------------------------------------------------------
// THE MISTY COVE DINER — cream block walls, big lit windows, flat roof, neon on a rooftop frame
// ---------------------------------------------------------------------------------------------
Canopy.building('diner', {
  width: 18, depth: 10,
  paint() {
    const sp = bldSprite(21, 8.4, 40), A = sp.A, L = sp.L, E = sp.E, b = BP(sp);
    const neon = [255, 104, 58], warm = [255, 196, 130];
    for (let x = 6.6; x < 10.3; x += 0.25) { b.line(A, x, 0, x + 0.9, 1.8, [120, 126, 124], 0.012, 0.35); b.line(A, x + 0.9, 0, x, 1.8, [120, 126, 124], 0.012, 0.35); }   // chain-link fence
    b.line(A, 6.6, 1.8, 10.3, 1.8, [130, 134, 132], 0.03);
    b.line(A, 8.4, 0, 8.4, 5.4, [62, 64, 62], 0.12); b.line(A, 8.4, 5.4, 7.5, 5.55, [62, 64, 62], 0.07);       // street lamp
    b.rect(A, 7.1, 5.38, 7.75, 5.55, [86, 86, 80]); b.bulb(E, 7.42, 5.3, 1.1, [255, 182, 104], 0.9);
    b.line(A, -8.2, 0, -8.2, 3.3, [74, 76, 74], 0.1); b.line(A, -6.2, 0, -6.2, 3.3, [74, 76, 74], 0.1);           // roof posts
    b.rect(A, -5.6, 0, 6, 0.4, [126, 50, 40]);                                                                     // rust-red skirting
    b.rect(A, -5.6, 0.4, 6, 3.3, [194, 186, 162]);                                                                 // cinder blocks
    for (let y = 0.6; y < 3.3; y += 0.2) b.line(A, -5.6, y, 6, y, [150, 142, 120], 0.012, 0.5);
    for (let y = 0.4, r = 0; y < 3.3; y += 0.2, r++) for (let x = -5.6 + (r % 2) * 0.2; x < 6; x += 0.4) b.line(A, x, y, x, y + 0.2, [150, 142, 120], 0.012, 0.4);
    b.rect(A, -5.75, 0.84, 0.75, 0.95, [214, 210, 198]);                                                           // window sill
    b.rect(A, -5.45, 0.95, 0.6, 3.05, [36, 48, 48]);                                                               // the big windows
    b.glow(E, -5.4, 0.98, 0.55, 3.0, warm, 0.8);
    b.dark(E, -5.4, 0.98, 0.55, 1.35, 0.8);                                                                        // counter
    for (let x = -4.8; x < 0.4; x += 0.75) { b.dark(E, x, 0.98, x + 0.08, 1.55, 0.9); b.dark(E, x - 0.14, 1.55, x + 0.22, 1.62, 0.9); }   // stools
    b.dark(E, -2.6, 1.35, -1.6, 1.95, 0.5);                                                                        // pie case
    b.dark(E, -5.2, 2.35, -3.6, 2.85, 0.6);                                                                        // menu board
    for (let x = -4.6; x < 0.4; x += 1.3) b.bulb(E, x, 2.82, 0.35, [255, 220, 170], 0.9);                          // hanging lamps
    for (const x of [-4.2, -3.0, -1.8, -0.6]) { b.rect(A, x - 0.04, 0.95, x + 0.04, 3.05, [190, 186, 176]); b.dark(E, x - 0.05, 0.95, x + 0.05, 3.05, 1); }
    b.neon(E, 'OPEN', -1.25, 2.5, 0.3, [255, 74, 66]);
    b.rect(A, 2.2, 1.6, 3.4, 2.5, [40, 50, 48]); b.glow(E, 2.25, 1.65, 3.35, 2.45, warm, 0.45);                    // side window
    b.rect(A, 4.2, 0.4, 5.2, 2.55, [60, 66, 64]); b.glow(E, 4.3, 1.25, 5.1, 2.45, warm, 0.35);                     // door
    b.rect(A, -8.7, 3.18, 6.4, 3.3, [52, 50, 46]); b.rect(A, -8.7, 3.3, 6.4, 3.64, [216, 212, 200]);              // flat roof
    b.line(L, -8.7, 3.64, 6.4, 3.64, [255, 255, 255], 0.05, 0.7);
    for (let x = -8.2; x < 6.2; x += 1.2) b.bulb(E, x, 3.18, 0.4, [255, 210, 150], 0.7);                            // soffit lights
    for (const [x0, x1] of [[-2.4, -0.8], [4.2, 2.4]]) { b.line(A, x0, 3.64, x1, 4.3, [92, 70, 54], 0.07); }      // sign frame
    b.line(A, -2.2, 3.64, -2.2, 4.3, [92, 70, 54], 0.08); b.line(A, 4.0, 3.64, 4.0, 4.3, [92, 70, 54], 0.08);
    b.rect(A, -3.1, 4.3, 4.9, 6.7, [146, 58, 46]); b.rect(A, -2.95, 4.45, 4.75, 6.55, [168, 70, 54]);              // the sign board
    b.text(A, 'MISTY COVE', 0.9, 5.85, 0.68, [232, 214, 190]); b.text(A, 'DINER', 0.9, 4.98, 0.6, [232, 214, 190]);
    b.neon(E, 'MISTY COVE', 0.9, 5.85, 0.68, neon); b.neon(E, 'DINER', 0.9, 4.98, 0.6, neon);
    for (let x = -2.9; x <= 4.7; x += 0.32) { b.bulb(E, x, 6.6, 0.12, [255, 220, 150], 0.9); b.bulb(E, x, 4.38, 0.12, [255, 220, 150], 0.9); }
    b.line(L, -3.1, 6.7, 4.9, 6.7, [255, 255, 255], 0.04, 0.6);
    b.grime(A, sp.w, sp.h);
    return finishBld(sp, [{ x: 0.9, y: 5.5, r: 5, col: neon }, { x: -2.4, y: 2, r: 4, col: warm }, { x: 7.42, y: 5.3, r: 3, col: [255, 182, 104] }]);
  },
  cars() { return [{ model: 'coupe68', dx: -11.5, dz: -2.5 }, { model: 'pickup72', dx: 3.5, dz: -4.2 }]; }
});

// ---------------------------------------------------------------------------------------------
// CEDAR HOLLOW AUTO BODY — corrugated metal barn, open bay, a lean-to, old trucks and Cadillacs
// ---------------------------------------------------------------------------------------------
Canopy.building('bodyshop', {
  width: 20, depth: 12,
  paint() {
    const sp = bldSprite(24, 8.6, 38), A = sp.A, L = sp.L, E = sp.E, b = BP(sp);
    const tan = [184, 164, 118], sodium = [255, 168, 88];
    b.poly(A, [[0, 0], [0, 4.2], [9.6, 3.0], [9.6, 0]], [30, 26, 22], 0.5);                                          // shade under the lean-to
    drawCar(A, L, b, CARS.truck40, 5.1, 0.95, [96, 56, 42], { seed: 3, rust: 0.8, flat: true });
    b.poly(A, [[0, 4.05], [0, 4.3], [9.7, 3.12], [9.7, 2.9]], [140, 130, 110]);                                        // lean-to roof
    for (const x of [2.8, 6.4, 9.3]) b.line(A, x, 0, x, 4.2 - x * 0.12, [84, 66, 50], 0.12);
    b.poly(A, [[-9, 0], [-9, 4.4], [-4.5, 6.6], [0, 4.4], [0, 0]], tan);                                              // the barn
    for (let x = -9; x < 0; x += 0.11) {
      const top = x < -4.5 ? 4.4 + (x + 9) * 0.489 : 4.4 + (0 - x) * 0.489;
      b.line(A, x, 0, x, top, U.rand() < 0.5 ? [150, 132, 92] : [206, 188, 140], 0.02, 0.45);
    }
    b.line(A, -9.25, 4.3, -4.5, 6.75, [222, 218, 204], 0.12); b.line(A, -4.5, 6.75, 0.25, 4.3, [222, 218, 204], 0.12);
    b.line(L, -9.25, 4.3, -4.5, 6.75, [255, 255, 255], 0.05, 0.6); b.line(L, -4.5, 6.75, 0.25, 4.3, [255, 255, 255], 0.05, 0.6);
    for (let i = 0; i < 40; i++) { const x = U.rand(-9, 0); b.line(A, x, U.rand(2.5, 4.3), x + U.gauss() * 0.05, U.rand(0.3, 2), [120, 66, 36], U.rand(0.02, 0.06), U.rand(0.2, 0.5)); }   // rust runs
    b.rect(A, -7.7, 0, -3.0, 3.95, [24, 21, 18]);                                                                     // open bay
    b.glow(E, -7.6, 0.05, -3.1, 3.9, [255, 176, 100], 0.22); b.bulb(E, -5.35, 3.4, 1.4, [255, 186, 110], 0.85);
    drawCar(A, L, b, CARS.coupe68, -5.35, 0.78, [60, 60, 62], { seed: 7, rust: 0.3 });                               // a car inside
    b.dark(E, -6.9, 0.05, -3.8, 1.2, 0.6);
    b.rect(A, -7.6, 0, -7.0, 1.0, [140, 42, 32]); b.rect(A, -7.62, 1.0, -6.98, 1.1, [70, 70, 70]);                    // red toolbox
    for (let y = 1.6; y < 3.6; y += 0.45) b.line(A, -3.4, y, -3.1, y, [90, 80, 64], 0.04);                           // shelves
    b.rect(A, -7.3, 4.55, -1.7, 5.55, [212, 202, 182]);                                                               // painted sign
    b.text(A, 'CEDAR HOLLOW', -4.5, 5.25, 0.36, [150, 46, 34]); b.text(A, 'AUTO BODY', -4.5, 4.82, 0.4, [150, 46, 34]);
    b.rect(A, -1.5, 0, -0.55, 2.15, [96, 88, 72]); b.rect(A, -2.7, 1.6, -1.85, 2.3, [36, 40, 40]); b.glow(E, -2.65, 1.65, -1.9, 2.25, [255, 190, 120], 0.35);
    for (let i = 0; i < 4; i++) b.circle(A, 1.05, 0.28 + i * 0.26, 0.42, [22, 20, 18]);                              // stacked tyres
    for (const [x, col] of [[-10.1, [60, 80, 110]], [-9.5, [120, 70, 40]]]) { b.rect(A, x - 0.28, 0, x + 0.28, 0.9, col); b.line(A, x - 0.28, 0.45, x + 0.28, 0.45, [30, 30, 30], 0.03, 0.6); }
    b.line(A, -8.6, 4.6, -8.9, 4.85, [60, 60, 58], 0.05); b.rect(A, -9.15, 4.75, -8.75, 4.9, [70, 70, 66]); b.bulb(E, -8.95, 4.68, 1.2, sodium, 0.95);
    b.grime(A, sp.w, sp.h);
    return finishBld(sp, [{ x: -5.35, y: 3, r: 3.5, col: [255, 186, 110] }, { x: -8.95, y: 4.7, r: 3.5, col: sodium }]);
  },
  cars() {
    return [{ model: 'cadillac59', dx: -6.5, dz: -4.5 }, { model: 'pickup50', dx: 0.8, dz: -5.6 }, { model: 'coupe68', dx: 7.2, dz: -4 },
      { model: 'pickup72', dx: -13, dz: -2 }, { model: 'cadillac59', dx: 12.5, dz: -3 }];
  }
});

// ---------------------------------------------------------------------------------------------
// SNAKE CREEK GENERAL STORE — false-front clapboard store, porch, windows lit blue from inside
// ---------------------------------------------------------------------------------------------
Canopy.building('store', {
  width: 17, depth: 10,
  paint() {
    const sp = bldSprite(21, 9, 40), A = sp.A, L = sp.L, E = sp.E, b = BP(sp);
    const blue = [110, 190, 255], cream = [226, 214, 182];
    b.rect(A, -6.5, 0.45, 6.5, 4.6, [110, 120, 104]);                                                                // clapboard body
    for (let y = 0.6; y < 7.2; y += 0.22) b.line(A, -6.5, y, 6.5, y, [76, 84, 72], 0.02, 0.55);
    b.rect(A, -6.5, 4.6, 6.5, 7.2, [116, 126, 110]);                                                                  // false front
    for (let y = 4.7; y < 7.2; y += 0.22) b.line(A, -6.5, y, 6.5, y, [80, 88, 76], 0.02, 0.5);
    b.rect(A, -6.85, 7.2, 6.85, 7.55, [204, 200, 184]); b.line(L, -6.85, 7.55, 6.85, 7.55, [255, 255, 255], 0.05, 0.6);
    for (let x = -6.4; x <= 6.4; x += 1.6) b.rect(A, x - 0.08, 7.0, x + 0.08, 7.2, [190, 186, 170]);                 // cornice brackets
    b.rect(A, -5.9, 4.95, 5.9, 6.95, [214, 204, 176]); b.rect(A, -5.75, 5.1, 5.75, 6.8, [40, 56, 46]);              // sign board
    b.text(A, 'SNAKE CREEK', 0, 6.2, 0.82, cream); b.text(A, 'GENERAL STORE', 0, 5.45, 0.46, cream, 1, 'Georgia, serif', 'bold');
    for (const sx of [-1, 1]) {                                                                                        // a little painted snake each side
      let px = sx * 5.2, py = 5.45; for (let i = 0; i < 10; i++) { const nx = px + sx * 0.04, ny = py + 0.09; b.line(A, px + Math.sin(i) * 0.12, py, nx + Math.sin(i + 1) * 0.12, ny, cream, 0.05, 0.9); px = nx; py = ny; }
    }
    for (const x of [-3.6, 3.6]) {                                                                                    // gooseneck lamps over the sign
      b.line(A, x, 7.0, x, 7.45, [50, 50, 48], 0.05); b.line(A, x, 7.45, x + 0.35, 7.3, [50, 50, 48], 0.05);
      const g = E.createLinearGradient(0, b.Y(7.3), 0, b.Y(5.0)); g.addColorStop(0, 'rgba(255,230,180,0.35)'); g.addColorStop(1, 'rgba(255,230,180,0)');
      E.fillStyle = g; E.beginPath(); E.moveTo(b.X(x + 0.35), b.Y(7.3)); E.lineTo(b.X(x - 1.4), b.Y(5.0)); E.lineTo(b.X(x + 2.1), b.Y(5.0)); E.fill();
      b.bulb(E, x + 0.35, 7.28, 0.3, [255, 230, 180], 0.9);
    }
    b.rect(A, -7, 3.3, 7, 3.62, [92, 86, 76]); b.line(L, -7, 3.62, 7, 3.62, [255, 255, 255], 0.04, 0.5);            // porch roof
    b.rect(A, -7, 0, 7, 0.45, [86, 74, 60]);                                                                          // porch deck
    for (let x = -7; x < 7; x += 0.35) b.line(A, x, 0.05, x, 0.45, [60, 52, 42], 0.015, 0.6);
    for (let i = 0; i < 3; i++) b.rect(A, -1.3 + i * 0.12, 0.15 * i, 1.3 - i * 0.12, 0.15 * i + 0.15, [104, 92, 76]);
    for (const [x0, x1] of [[-5.6, -1.6], [1.6, 5.6]]) {                                                             // the shop windows, blue light inside
      b.rect(A, x0 - 0.1, 0.9, x1 + 0.1, 3.1, [196, 190, 172]); b.rect(A, x0, 1.0, x1, 3.0, [26, 40, 48]);
      b.glow(E, x0, 1.0, x1, 3.0, blue, 0.85);
      for (const y of [1.45, 1.95, 2.45]) {
        b.dark(E, x0, y - 0.04, x1, y, 0.9);
        for (let x = x0 + 0.05; x < x1 - 0.1; x += U.rand(0.12, 0.3)) b.dark(E, x, y, x + U.rand(0.06, 0.2), y + U.rand(0.12, 0.38), U.rand(0.5, 0.85));   // tins, boxes, jars
      }
      b.rect(A, (x0 + x1) / 2 - 0.04, 1.0, (x0 + x1) / 2 + 0.04, 3.0, [196, 190, 172]); b.dark(E, (x0 + x1) / 2 - 0.05, 1.0, (x0 + x1) / 2 + 0.05, 3.0, 1);
    }
    E.save(); E.globalCompositeOperation = 'destination-out';                                                         // lettering painted on the glass
    b.text(E, 'GROCERIES', -3.6, 2.78, 0.26, [0, 0, 0], 0.9, 'Georgia, serif'); b.text(E, 'BAIT · TACKLE · ICE', 3.6, 2.78, 0.22, [0, 0, 0], 0.9, 'Georgia, serif'); E.restore();
    b.text(A, 'GROCERIES', -3.6, 2.78, 0.26, [236, 232, 220], 0.9, 'Georgia, serif'); b.text(A, 'BAIT · TACKLE · ICE', 3.6, 2.78, 0.22, [236, 232, 220], 0.9, 'Georgia, serif');
    b.neon(E, 'OPEN', 3.6, 1.32, 0.34, [90, 176, 255]);
    b.rect(A, -0.9, 0.45, 0.9, 2.95, [176, 168, 148]); b.rect(A, -0.75, 1.5, 0.75, 2.8, [26, 40, 48]); b.glow(E, -0.75, 1.5, 0.75, 2.8, blue, 0.7);
    b.rect(A, -0.75, 0.55, 0.75, 1.4, [120, 110, 94]);
    for (const x of [-6.75, -3.7, 3.7, 6.75]) { b.rect(A, x - 0.09, 0.45, x + 0.09, 3.3, [168, 158, 136]); b.line(L, x - 0.09, 0.45, x - 0.09, 3.3, [255, 255, 255], 0.03, 0.4); }
    b.line(A, -5.2, 0.9, -2.8, 0.9, [96, 80, 60], 0.08); b.line(A, -5.1, 0.45, -5.1, 0.9, [96, 80, 60], 0.05); b.line(A, -2.9, 0.45, -2.9, 0.9, [96, 80, 60], 0.05);   // bench
    b.rect(A, -9.0, 0, -7.5, 1.35, [208, 212, 212]); b.text(A, 'ICE', -8.25, 0.9, 0.36, [60, 110, 170]); b.glow(E, -8.95, 0.05, -7.55, 1.3, [190, 225, 255], 0.12);   // ice chest
    b.rect(A, 7.9, 0, 8.7, 1.9, [146, 42, 36]); b.rect(A, 8.0, 1.1, 8.6, 1.6, [210, 206, 190]);                      // old gas pump
    b.circle(A, 8.3, 2.25, 0.32, [226, 220, 200]); b.bulb(E, 8.3, 2.25, 0.8, [255, 232, 196], 0.8);
    b.line(A, 8.7, 1.4, 9.1, 0.6, [30, 30, 30], 0.04);
    for (let i = 0; i < 4; i++) b.rect(A, -10.3 + i * 0.32, 0, -10.08 + i * 0.32, 1.1, [196, 198, 196]);            // propane tanks in their cage
    for (let x = -10.4; x < -9.1; x += 0.16) b.line(A, x, 0, x, 1.25, [110, 112, 110], 0.012, 0.6);
    b.grime(A, sp.w, sp.h);
    return finishBld(sp, [{ x: -3.6, y: 2, r: 4.5, col: blue }, { x: 3.6, y: 2, r: 4.5, col: blue }, { x: 8.3, y: 2.25, r: 2, col: [255, 232, 196] }, { x: 0, y: 6.4, r: 5, col: [255, 226, 170], a: 0.35 }]);
  },
  cars() { return [{ model: 'pickup50', dx: -10.5, dz: -3.2 }, { model: 'pickup72', dx: 10.5, dz: -4 }]; }
});

// ---------------------------------------------------------------------------------------------
// ROAD LAYER — spawns a road far ahead (inside the fog), clears the forest around it, draws it
// ---------------------------------------------------------------------------------------------
Canopy.layer('road', {
  init() {
    this.spr = {};
    for (const n of CONFIG.road.buildings) if (Canopy.buildings[n]) this.spr[n] = Canopy.buildings[n].paint();
    this.carSpr = {};
    for (const m of Object.keys(CARS)) if (m !== 'truck40') this.carSpr[m] = [paintCar(m, U.pick(PAINTS)), paintCar(m, U.pick(PAINTS))];
    this.next = CONFIG.road.first; this.queue = []; this.active = null; this.label = '';
  },
  spawn(c) {
    if (!this.queue.length) this.queue = CONFIG.road.buildings.filter(n => this.spr[n]).sort(() => Math.random() - 0.5);
    const name = this.queue.shift(); if (!name) return;
    const def = Canopy.buildings[name], cam = Canopy.cam, side = U.rand() < 0.5 ? -1 : 1;
    const z = cam.z + ZFAR - 3, bz = z + ROAD.half + ROAD.shoulder + 3.5, bx = cam.x + side * def.width * U.rand(0.08, 0.22);   // almost in front of the camera
    const r = { z, bz, bx, name, def, sp: this.spr[name], born: c.t };
    r.cars = (def.cars ? def.cars() : []).map(o => ({ x: bx + o.dx, z: bz + o.dz, sp: U.pick(this.carSpr[o.model]), flip: U.rand() < 0.5 ? -1 : 1 }));
    r.clear = (wx, wz) => {
      let m = 1 - U.sstep(0, 3, Math.abs(wz - z) - ROAD.half - ROAD.shoulder);                // the road and its verges
      if (wz > z) {                                                                       // the lot around the building
        const ex = Math.abs(wx - bx) - def.width / 2 - 3, ez = wz - (bz + def.depth);
        m = Math.max(m, (1 - U.sstep(0, 4, ex)) * (1 - U.sstep(0, 4, ez)));
      }
      return m;
    };
    Canopy.clearings.push(r.clear); this.active = r;
  },
  // a flat rectangle of ground (world coordinates), clipped at the camera
  quad(c, x0, x1, z0, z1, style) {
    const cam = Canopy.cam, pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => {
      const dx = x - cam.x, dz = z - cam.z; return [dx * c.cos - dz * c.sin, dx * c.sin + dz * c.cos];
    });
    const near = 0.35, out = [];
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) % 4];
      if (a[1] >= near) out.push(a);
      if ((a[1] >= near) !== (b[1] >= near)) { const t = (near - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, near]); }
    }
    if (out.length < 3) return;
    const ctx = c.ctx; ctx.beginPath();
    out.forEach(([x, z], i) => { const sx = c.W / 2 + x * c.f / z, sy = c.hz + c.camH * c.f / z; i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    ctx.closePath(); ctx.fillStyle = style; ctx.fill();
  },
  drawRoad(c, r, far) {
    const cam = Canopy.cam, a = c.P.amb, tint = col => U.rgba([col[0] * a[0], col[1] * a[1], col[2] * a[2]]);
    const X0 = cam.x - 160, X1 = cam.x + 160, H = ROAD.half, S = ROAD.shoulder, z = r.z, sg = far ? 1 : -1;
    const wet = 0.4 + 0.6 * c.wx.rain;
    this.quad(c, X0, X1, z + sg * H, z + sg * (H + S), tint([88, 82, 72]));                                            // gravel verge
    this.quad(c, X0, X1, z, z + sg * H, tint(U.mix([44, 46, 48], c.P.sky[1], 0.12 * wet)));                           // asphalt, wet sheen
    this.quad(c, X0, X1, z + sg * (H - 0.3), z + sg * (H - 0.18), tint([196, 196, 186]));                              // white edge line
    if (far) {                                                                                                     // yellow dashed centre line
      const step = 12, start = Math.floor(X0 / step) * step;
      for (let x = start; x < X1; x += step) this.quad(c, x, x + 3.5, z - 0.07, z + 0.07, tint([226, 178, 40]));
    } else this.reflections(c, r);
  },
  reflections(c, r) {                                                                                              // neon and windows mirrored on the wet asphalt
    const cam = Canopy.cam, ctx = c.ctx, glow = this.glowLevel(c), wet = 0.35 + 0.65 * c.wx.rain;
    const zN = r.z - ROAD.half - cam.z, zF = r.z + ROAD.half - cam.z;
    for (const l of r.sp.lights) {
      const dx = r.bx + l.x - cam.x, dz = r.bz - cam.z, cx = dx * c.cos - dz * c.sin, cz = dx * c.sin + dz * c.cos;
      if (cz < 1) continue;
      const sx = c.W / 2 + cx * c.f / cz, yF = c.hz + c.camH * c.f / Math.max(0.5, zF), yN = zN > 0.5 ? c.hz + c.camH * c.f / zN : c.H;
      const w = l.r * c.f / cz * 0.35, g = ctx.createLinearGradient(0, yF, 0, yN);
      g.addColorStop(0, U.rgba(l.col, 0.35 * wet * glow * (l.a || 1))); g.addColorStop(1, U.rgba(l.col, 0));
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(sx - w / 2, yF, w, yN - yF);
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  glowLevel(c) {                                                                                                   // neon brighter at night, breathing with the mids
    const dark = 1 - (c.P.amb[0] + c.P.amb[1] + c.P.amb[2]) / 3;
    return (0.45 + 0.75 * dark) * (0.85 + 0.25 * AUD.mid + 0.6 * AUD.kick * AUD.power) * (U.noise(c.t * 7, 3) > 0.12 ? 1 : 0.6);
  },
  drawBuilding(c, r, sp, wx, wz, flip, isCar) {
    const cam = Canopy.cam, dx = wx - cam.x, dz = wz - cam.z, cx = dx * c.cos - dz * c.sin, cz = dx * c.sin + dz * c.cos;
    if (cz < 1.5) return;
    const s = c.f / cz, sx = c.W / 2 + cx * s, gy = c.hz + c.camH * s, sc = s / sp.k, ctx = c.ctx;
    if (sx + sp.w * sc < 0 || sx - sp.w * sc > c.W) return;
    const env = U.sstep(ZFAR + 2, ZFAR - 14, cz) * U.sstep(2, 6, cz);   // emerges from the fog, fades as the camera passes
    ctx.globalAlpha = env; Sprites.draw(ctx, sp.b, sp, sx, gy, sc, flip);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, c.lightAt(sx, cz) * 0.7 * env); Sprites.draw(ctx, sp.l, sp, sx, gy, sc, flip);
    if (sp.e) {
      const glow = this.glowLevel(c);
      ctx.globalAlpha = Math.min(1, env * glow); Sprites.draw(ctx, sp.e, sp, sx, gy, sc, flip);
      for (const l of sp.lights) {                                                                                    // halos in the fog
        const lx = sx + l.x * s * flip, ly = gy - l.y * s, R = l.r * s * (1.4 + c.wx.fog);
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, R);
        g.addColorStop(0, U.rgba(l.col, 0.3 * env * glow * (l.a || 1) * (0.5 + c.wx.fog))); g.addColorStop(1, U.rgba(l.col, 0));
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(lx - R, ly - R, R * 2, R * 2);
      }
    }
  },
  items(c, list) {
    const cam = Canopy.cam;
    if (!this.active && c.t > this.next) this.spawn(c);
    const r = this.active;
    if (!r) { this.label = `next road in ${Math.max(0, Math.round(this.next - c.t))} s`; return; }
    this.label = `road: ${r.name}  ${Math.round(r.z - cam.z)} m`;
    if (cam.z > r.bz + 14) {                                                                      // passed: back into the forest
      Canopy.clearings = Canopy.clearings.filter(f => f !== r.clear); Canopy.avoid = 0; Canopy.look = 0;
      this.active = null; this.next = c.t + U.rand(...CONFIG.road.every); return;
    }
    const dB = r.bz - cam.z, gap = Math.abs(cam.x - r.bx) - (r.def.width / 2 + 1.5);
    // the camera turns to look at the building while it approaches, then slips past its side as it fades
    Canopy.look = U.clamp(Math.atan2(r.bx - cam.x, Math.max(4, dB)), -0.3, 0.3) * U.sstep(55, 40, dB) * U.sstep(6, 16, dB);
    Canopy.avoid = dB < 18 && dB > -12 && gap < 0 ? Math.sign(cam.x - r.bx || 1) * Math.min(0.03, 0.006 * -gap) : 0;
    const dz = r.z - cam.z, czc = dz * c.cos;
    list.push({ z: czc + ROAD.half + 1, draw: c => this.drawRoad(c, r, true) });
    list.push({ z: Math.max(0.5, czc - 0.5), draw: c => this.drawRoad(c, r, false) });
    list.push({ z: (r.bz - cam.z) * c.cos + 1, draw: c => {                                      // the lot: packed gravel and puddles
      const a = c.P.amb, H = ROAD.half + ROAD.shoulder;
      this.quad(c, r.bx - r.def.width / 2 - 3, r.bx + r.def.width / 2 + 3, r.z + H, r.bz + 0.5, U.rgba([70 * a[0], 66 * a[1], 60 * a[2]]));
    } });
    const bcz = (r.bx - cam.x) * c.sin + (r.bz - cam.z) * c.cos;
    list.push({ z: bcz, draw: c => this.drawBuilding(c, r, r.sp, r.bx, r.bz, 1) });
    for (const car of r.cars) {
      const ccz = (car.x - cam.x) * c.sin + (car.z - cam.z) * c.cos;
      if (ccz > 1.5) list.push({ z: ccz, draw: c => this.drawBuilding(c, r, car.sp, car.x, car.z, car.flip, true) });
    }
  }
});
