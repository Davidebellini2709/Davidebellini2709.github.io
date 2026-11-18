// CANOPY — forest.js
// The forest and its floor. Every tree, fern and fallen log is PAINTED procedurally once at start-up
// (thousands of bark fibres, needle sprays, moss, hanging lichen, leaves) into a sprite, then placed many
// times. Ten species of tree, five kinds of undergrowth, fallen nurse logs.
//
//   to add a species: add a line to SPECIES (type 'conifer' or 'broadleaf'); its weight says how common it is.
//
// Sound: the trees sway more with the intensity; their light (the rims that catch the sun from behind) grows
// with the intensity and lights up when the ring of a kick passes through them in intense moments.

const SPECIES = [
  { name: 'douglas fir', weight: 3, type: 'conifer', variants: 3, h: [26, 36], r: [0.45, 0.75], crown: [0.42, 0.6], wide: [0.12, 0.16],
    droop: 0.25, rise: 0.06, tipUp: 0.3, bark: [76, 62, 52], fol: [36, 62, 44], moss: 0.4, beard: 0.2, flare: 0.5, furrow: 0.7, style: 'tuft', density: 2.0 },
  { name: 'western red cedar', weight: 3, type: 'conifer', variants: 3, h: [22, 32], r: [0.6, 1.0], crown: [0.2, 0.4], wide: [0.15, 0.21],
    droop: 0.8, rise: 0.16, tipUp: 0.6, bark: [96, 64, 52], fol: [42, 72, 44], moss: 0.5, beard: 0.3, flare: 1.4, furrow: 1.1, style: 'hang', density: 2.4 },
  { name: 'western hemlock', weight: 3, type: 'conifer', variants: 3, h: [20, 30], r: [0.3, 0.5], crown: [0.12, 0.3], wide: [0.13, 0.18],
    droop: 0.65, rise: 0.05, tipUp: 0.12, bark: [86, 70, 60], fol: [30, 58, 42], moss: 0.65, beard: 0.6, flare: 0.6, furrow: 0.5, style: 'hang', density: 2.6, nod: true },
  { name: 'sitka spruce', weight: 2, type: 'conifer', variants: 2, h: [22, 32], r: [0.5, 0.85], crown: [0.08, 0.25], wide: [0.11, 0.15],
    droop: 0.32, rise: 0.1, tipUp: 0.2, bark: [98, 88, 78], fol: [38, 64, 58], moss: 0.8, beard: 0.75, flare: 0.9, furrow: 0.3, style: 'tuft', density: 2.8 },
  { name: 'old growth', weight: 1, type: 'conifer', variants: 2, h: [36, 46], r: [1.2, 1.7], crown: [0.55, 0.7], wide: [0.1, 0.13],
    droop: 0.35, rise: 0.05, tipUp: 0.3, bark: [82, 58, 48], fol: [34, 60, 42], moss: 0.85, beard: 0.45, flare: 1.0, furrow: 1.3, style: 'hang', density: 1.6 },
  { name: 'sapling', weight: 3, type: 'conifer', variants: 3, h: [2.5, 6], r: [0.05, 0.11], crown: [0.04, 0.14], wide: [0.2, 0.28],
    droop: 0.5, rise: 0.05, tipUp: 0.1, bark: [72, 60, 50], fol: [42, 76, 48], moss: 0.2, beard: 0, flare: 0.3, furrow: 0, style: 'hang', density: 6 },
  { name: 'snag', weight: 1, type: 'conifer', dead: true, variants: 2, h: [9, 20], r: [0.35, 0.6], crown: [0.3, 0.6], wide: [0.08, 0.12],
    droop: 0.1, rise: 0.1, bark: [120, 112, 100], fol: [0, 0, 0], moss: 0.7, beard: 0.35, flare: 0.6, furrow: 0.9, density: 0.9 },
  { name: 'bigleaf maple', weight: 2, type: 'broadleaf', variants: 3, h: [13, 19], r: [0.32, 0.5], stems: [1, 2], sweep: [1.5, 4.5],
    bark: [94, 82, 64], leaf: [[184, 146, 60], [136, 140, 54], [100, 114, 48]], leaves: 0.7, moss: 1.0, hangmoss: 0.8, ferns: 0.7 },
  { name: 'vine maple', weight: 2, type: 'broadleaf', variants: 2, h: [5, 8], r: [0.07, 0.12], stems: [3, 6], sweep: [1, 2.5],
    bark: [88, 94, 64], leaf: [[200, 124, 52], [176, 152, 62], [112, 130, 52]], leaves: 0.8, moss: 0.7, hangmoss: 0.3, ferns: 0.1 },
  { name: 'red alder', weight: 1, type: 'broadleaf', variants: 2, h: [14, 20], r: [0.18, 0.3], stems: [1, 2], sweep: [0.2, 1],
    bark: [150, 150, 140], lichen: true, leaf: [[92, 118, 54], [122, 132, 62]], leaves: 0.5, moss: 0.4, hangmoss: 0.1, ferns: 0 }
];

const FERNS = [
  { name: 'sword fern', weight: 5, fronds: [14, 24], len: [0.6, 1.1], spread: 1.3, arch: 0.6, col: [46, 86, 48] },
  { name: 'sword fern, shaded', weight: 3, fronds: [10, 18], len: [0.5, 0.9], spread: 1.2, arch: 0.65, col: [34, 66, 42] },
  { name: 'deer fern', weight: 2, fronds: [8, 14], len: [0.35, 0.6], spread: 0.9, arch: 0.3, col: [54, 94, 50] },
  { name: 'bracken', weight: 2, fronds: [3, 6], len: [0.8, 1.3], spread: 0.7, arch: 0.3, col: [96, 106, 48], tri: true },
  { name: 'salal', weight: 3, shrub: true, col: [40, 72, 42] }
];
const MOSS = [[66, 98, 42], [94, 122, 48], [56, 82, 40], [122, 142, 62], [80, 112, 46]];

// ---------- painting helpers ----------
const sk = (c, m, a = 1, w = 1) => `S|${ckey(U.mul(c, m), 6)}|${a}|${w.toFixed(1)}`;    // stroke key
const fk = (c, m, a = 1) => `F|${ckey(U.mul(c, m), 6)}|${a}`;                        // fill key
const lk = (a, w = 1) => `S|255,255,255|${(Math.round(a * 5) / 5).toFixed(1)}|${w.toFixed(1)}`;   // light-mask stroke
const lf = a => `F|255,255,255|${(Math.round(a * 5) / 5).toFixed(1)}`;

// a woody tube along a list of points [x, y, r] (metres): solid core, bark fibres, moss on the upper side, rim light
function paintTube(sp, bA, bL, pts, bark, o = {}) {
  const X = sp.X, Y = sp.Y, k = sp.k, n = pts.length;
  if (n < 2) return;
  const nor = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [-ty / l, tx / l];
  });
  const core = bA.get(fk(bark, 0.38));
  pts.forEach((p, i) => { const x = p[0] + nor[i][0] * p[2], y = p[1] + nor[i][1] * p[2]; i ? core.lineTo(X(x), Y(y)) : core.moveTo(X(x), Y(y)); });
  for (let i = n - 1; i >= 0; i--) { const p = pts[i]; core.lineTo(X(p[0] - nor[i][0] * p[2]), Y(p[1] - nor[i][1] * p[2])); }
  core.closePath();
  const maxR = Math.max(...pts.map(p => p[2])), ns = U.clamp(Math.round(2 * maxR * k / 1.3), 3, 140), seed = U.rand(100);
  const at = (f, u) => {                                               // a point on the tube: f = 0..n-1 along it, u = -1..1 across
    const j = Math.min(n - 2, Math.floor(f)), w = f - j, p = pts[j], q = pts[j + 1];
    const r = p[2] + (q[2] - p[2]) * w, nx = nor[j][0] + (nor[j + 1][0] - nor[j][0]) * w, ny = nor[j][1] + (nor[j + 1][1] - nor[j][1]) * w;
    return [p[0] + (q[0] - p[0]) * w + nx * r * u, p[1] + (q[1] - p[1]) * w + ny * r * u, nx, ny, r, p[1] + (q[1] - p[1]) * w];
  };
  for (let s = 0; s < ns; s++) {
    const u = ((s + U.rand()) / ns) * 2 - 1;
    let shade = (0.22 + 0.78 * Math.sqrt(1 - u * u)) * U.rand(0.7, 1.2) * (1 + 0.15 * u);
    if (o.furrow) shade *= 1 + o.furrow * 0.35 * Math.sin(u * Math.PI * (3 + maxR * 6) + seed + U.noise(s, 0) * 2);
    const wide = o.furrow && U.rand() < 0.12, path = bA.get(sk(bark, wide ? shade * 0.45 : shade, 1, U.clamp(k * (wide ? 0.06 : 0.03), 0.8, wide ? 3 : 1.8)));
    const end = n - 1 - (Math.abs(u) > 0.8 ? Math.floor(U.rand(n * 0.3)) : 0);
    for (let i = 0; i <= end; i++) {
      const p = pts[i], w = (U.noise(s * 1.7, i * 0.6) - 0.5) * 0.14 * p[2];
      const x = X(p[0] + nor[i][0] * (p[2] * u * 0.98 + w)), y = Y(p[1] + nor[i][1] * (p[2] * u * 0.98 + w));
      i ? path.lineTo(x, y) : path.moveTo(x, y);
    }
  }
  if (o.trunk) for (let i = 0; i < n * 0.08; i++) {                   // knots and old branch scars
    const [x, y, , , r] = at(U.rand(n * 0.15, n - 1), U.rand(-0.6, 0.6));
    const p = bA.get(fk(bark, 0.3, 0.8)); p.moveTo(X(x) + r * 0.12 * k, Y(y)); p.ellipse(X(x), Y(y), r * 0.12 * k, r * 0.2 * k, 0, 0, U.TAU);
  }
  if (o.lichen) for (let i = 0; i < n * maxR * 60; i++) {             // pale lichen patches (alder)
    const f = U.rand(n - 1), u = U.rand(-0.9, 0.9), [x, y] = at(f, u);
    if (U.fbm(f * 0.5 + seed, u * 2) < 0.55) continue;
    bA.dot(fk([206, 208, 196], U.rand(0.8, 1.05), 0.8), X(x), Y(y), U.rand(0.5, 1.6));
  }
  if (o.moss > 0) {                                                    // moss in irregular patches, thicker low on trunks and on top of limbs
    const cnt = Math.floor(o.moss * n * maxR * k * 3);
    for (let i = 0; i < cnt; i++) {
      const f = U.rand(n - 1), u = o.trunk ? U.rand(-1, 1) : U.rand(0.2, 1.1);
      let [x, y, nx, ny, r, yy] = at(f, u);
      if (!o.trunk && ny < 0) [x, y] = at(f, -u);
      const low = o.trunk ? Math.exp(-yy / 6) : 1;
      if (U.fbm(seed + f * 0.35 + u * 0.8, yy * 0.5 + u * 0.6) < 0.66 - o.moss * 0.32 * low) continue;
      const mc = U.pick(MOSS);
      bA.dot(fk(mc, U.rand(0.7, 1.15), 0.92), X(x), Y(y), U.clamp(U.rand(0.012, 0.035) * k, 0.5, 1.8));
      if (Math.abs(u) > 0.7 && U.rand() < 0.4) bL.dot(lf(U.rand(0.3, 0.7)), X(x), Y(y), U.clamp(0.015 * k, 0.5, 1.4));
    }
  }
  for (const side of [-1, 1]) {                                        // rim light along both edges, broken up
    const path = bL.get(lk(U.rand(0.35, 0.6) * U.clamp(maxR * k / 8, 0.25, 1), U.clamp(k * 0.03, 0.8, 1.6)));
    let on = false;
    for (let i = 0; i < n; i++) {
      const p = pts[i], vis = U.noise(seed + side * 9, i * 0.5) > 0.42;
      const x = X(p[0] + nor[i][0] * p[2] * side * 0.96), y = Y(p[1] + nor[i][1] * p[2] * side * 0.96);
      if (vis) { on ? path.lineTo(x, y) : path.moveTo(x, y); on = true; } else on = false;
    }
  }
}

// hanging lichen / moss strands (old man's beard): pale, glowing when backlit
function paintBeard(sp, bA, bL, x, y, count, maxLen) {
  for (let i = 0; i < count; i++) {
    const len = U.rand(0.25, maxLen), x0 = x + U.gauss() * 0.25, p = bA.get(sk([150, 162, 120], U.rand(0.75, 1.1), 0.5, 1)), q = bL.get(lk(U.rand() < 0.35 ? 0.4 : 0, 1));
    let xx = x0, yy = y;
    p.moveTo(sp.X(xx), sp.Y(yy)); q.moveTo(sp.X(xx), sp.Y(yy));
    for (let s = 1; s <= 6; s++) { xx += U.gauss() * 0.04; yy -= len / 6; p.lineTo(sp.X(xx), sp.Y(yy)); q.lineTo(sp.X(xx), sp.Y(yy)); }
  }
}

function paintConifer(S) {
  const H = U.rand(...S.h), R = U.rand(...S.r), y0 = H * U.rand(...S.crown), CW = H * U.rand(...S.wide);
  const seed = U.rand(1000), lean = U.gauss() * 0.025, bend = 0.6 * (0.4 + U.rand());
  const topY = S.dead ? H * U.rand(0.6, 0.85) : H;
  const spine = y => lean * y + (U.fbm(seed, y * 0.07, 3) - 0.5) * 2 * bend * Math.min(1, y / 8)
    + (S.nod && y > H - 2.2 ? Math.pow(y - (H - 2.2), 2) * 0.32 : 0);
  const rad = y => Math.max(0.012, R * Math.pow(Math.max(0, 1 - y / (H * 1.04)), 0.85) * (1 + S.flare * Math.exp(-y / 0.9)));
  const crownW = y => y < y0 ? 0 : CW * Math.pow(Math.max(0, (H - y) / (H - y0)), 0.8) * (0.7 + 0.6 * U.noise(seed + 7, y * 0.35)) + 0.25;
  const half = CW * 1.3 + bend + Math.abs(lean) * H + R * (1 + S.flare) + 1, hm = H + 1.2;
  let k = U.clamp(1000 / hm, 20, 80); if (half * 2 * k > 720) k = 720 / (half * 2);
  const sp = Sprites.create(half * 2, hm, k, half, 0.6), X = sp.X, Y = sp.Y;
  const bA = new Batch(), bL = new Batch();

  // branches
  const branches = [];
  const nB = Math.floor((topY - y0) * S.density * 1.5);
  for (let i = 0; i < nB; i++) {
    const y = y0 + (topY - y0) * Math.pow(U.rand(), 0.8);
    branches.push({ y, side: U.rand() < 0.5 ? -1 : 1, L: crownW(y) * U.rand(0.35, 1.05) * (S.dead ? 0.35 : 1), back: U.rand() < 0.45 });
  }
  for (let y = 1.8; y < y0; y += U.rand(0.4, 1.4))                  // dead twigs on the lower trunk
    branches.push({ y, side: U.rand() < 0.5 ? -1 : 1, L: U.rand(0.3, 1.3), back: U.rand() < 0.5, dead: true });

  const drawBranch = b => {
    const bx = t => spine(b.y) + b.side * (rad(b.y) * 0.6 + b.L * t);
    const by = t => b.y + b.L * S.rise * t - S.droop * b.L * t * t * 0.6 + (S.tipUp || 0) * b.L * Math.max(0, t - 0.6) ** 2 * 2.5;
    const wood = bA.get(sk(S.bark, 0.5, 1, U.clamp(k * 0.04 * (0.4 + b.L * 0.25), 0.6, 3.5)));
    wood.moveTo(X(bx(0)), Y(by(0)));
    for (let t = 0.2; t <= 1.001; t += 0.2) wood.lineTo(X(bx(t)), Y(by(t)));
    if (b.dead || S.dead) {
      if (U.rand() < S.beard) paintBeard(sp, bA, bL, bx(0.6), by(0.6), Math.floor(U.rand(3, 9)), 1.2);
      return;
    }
    const hang = S.style === 'hang', nw = U.clamp(k * 0.02, 0.6, 1.3);
    for (let i = 0, nc = Math.floor(2 + b.L * 2.5); i < nc; i++) {       // soft shaded clumps: the crown reads as one dense, uneven body
      const t = U.rand(0.15, 1), rx = U.rand(0.15, 0.45) * (0.5 + t * 0.6), ry = rx * U.rand(0.5, 1.1);
      if (U.fbm(seed + b.y * 0.7, t * 3) < 0.4) continue;
      const p = bA.get(fk(S.fol, U.rand(0.5, 0.65), 0.2)), x = X(bx(t) + U.gauss() * 0.2), y = Y(by(t) - (hang ? ry * 0.7 : 0) + U.gauss() * 0.15);
      p.moveTo(x + rx * k, y); p.ellipse(x, y, rx * k, ry * k, U.rand(-0.8, 0.8), 0, U.TAU);
    }
    for (let i = 0, ns = Math.floor(b.L * 6); i < ns; i++) {             // side twigs with their needles
      const t = U.rand(0.08, 1), x = bx(t), y = by(t);
      if (U.fbm(seed + x * 0.9, y * 0.9) < 0.33) continue;                  // gaps where the light gets through
      const ang = hang ? -Math.PI / 2 + b.side * U.rand(-0.3, 0.9) : (b.side > 0 ? 0 : Math.PI) + U.gauss() * 1.1;
      const len = U.rand(0.18, 0.55) * (0.45 + t * 0.7), ca = Math.cos(ang), sa = Math.sin(ang);
      bA.line(sk(S.bark, 0.6, 1, nw), X(x), Y(y), X(x + ca * len), Y(y + sa * len));
      const bright = U.rand(0.5, 1.1) * (0.75 + 0.4 * t) * (0.7 + 0.6 * U.noise(seed + i, t * 4));
      for (let j = 0, nd = Math.floor(len * 55); j < nd; j++) {
        const u = U.rand(), px = x + ca * len * u + U.gauss() * 0.09, py = y + sa * len * u + U.gauss() * 0.08;
        const na = hang ? -Math.PI / 2 + U.gauss() * 0.7 : ang + U.gauss() * 1.4, nl = U.rand(0.04, 0.1);
        const tip = u > 0.7 && U.rand() < 0.35;
        const key = sk(tip ? [74, 100, 54] : S.fol, bright * U.rand(0.8, 1.2) * (tip ? 1.2 : 1), 1, nw);
        const qx = px + Math.cos(na) * nl, qy = py + Math.sin(na) * nl;
        bA.line(key, X(px), Y(py), X(qx), Y(qy));
        if (U.rand() < 0.08 + 0.4 * t * u) bL.line(lk(U.rand(0.25, 0.85), nw), X(px), Y(py), X(qx), Y(qy));
      }
    }
    if (U.rand() < S.beard * 0.5) paintBeard(sp, bA, bL, bx(U.rand(0.3, 0.8)), by(0.5), Math.floor(U.rand(3, 10)), 1.4);
  };

  for (const b of branches) if (b.back) drawBranch(b);
  bA.flush(sp.A); bL.flush(sp.L);
  // trunk
  const pts = [];
  for (let y = -0.3; y <= topY; y += 0.35) pts.push([spine(y), y, rad(y)]);
  paintTube(sp, bA, bL, pts, S.bark, { furrow: S.furrow, moss: S.moss, trunk: true });
  if (S.dead) {                                                    // bracket fungi on the dead trunk
    for (let i = 0; i < 6; i++) {
      const y = U.rand(1, topY * 0.7), side = U.rand() < 0.5 ? -1 : 1, x = spine(y) + side * rad(y) * 0.9, w = U.rand(0.12, 0.3);
      const p = bA.get(fk([176, 148, 112], U.rand(0.8, 1.05)));
      p.moveTo(X(x), Y(y)); p.ellipse(X(x + side * w * 0.5), Y(y), w * k * 0.6, w * k * 0.22, 0, 0, Math.PI, side > 0);
      bL.dot(lf(0.6), X(x + side * w * 0.6), Y(y + 0.02), w * k * 0.15);
    }
  } else {
    const top = bA.get(sk(S.fol, 0.8, 1, U.clamp(k * 0.03, 0.8, 1.6)));     // top leader
    for (let i = 0; i < 30; i++) { const y = U.rand(H - 1.5, H), x = spine(y); top.moveTo(X(x), Y(y)); top.lineTo(X(x + U.gauss() * 0.25), Y(y - U.rand(0.1, 0.3))); }
  }
  bA.flush(sp.A); bL.flush(sp.L);
  for (const b of branches) if (!b.back) drawBranch(b);
  bA.flush(sp.A); bL.flush(sp.L);
  return Sprites.finish(sp, 0.3);
}

function paintBroadleaf(S) {
  const H = U.rand(...S.h), R = U.rand(...S.r), nStems = Math.round(U.rand(...S.stems)), sweep = U.rand(...S.sweep), seed = U.rand(1000);
  const tips = [], limbs = [];
  const grow = (x, y, ang, len, r, depth) => {                      // a curved limb, then two or three smaller ones
    const pts = [], n = Math.max(3, Math.round(len * 3));
    let cx = x, cy = y, a = ang;
    for (let i = 0; i <= n; i++) {
      pts.push([cx, cy, Math.max(0.01, r * (1 - 0.6 * i / n))]);
      a += (U.noise(seed + depth * 13 + x, i * 0.4) - 0.5) * 0.55 + (Math.PI / 2 - a) * 0.035;   // wanders, slowly turns upward
      cx += Math.cos(a) * len / n; cy += Math.sin(a) * len / n;
    }
    limbs.push(pts);
    if (depth >= 3 || len < 0.6) { tips.push([cx, cy]); return; }
    const kids = depth === 0 ? Math.round(U.rand(3, 6)) : Math.round(U.rand(2, 3.4));
    for (let j = 0; j < kids; j++) {
      const at = pts[Math.min(n, Math.floor(U.rand(n * 0.45, n + 1)))];
      grow(at[0], at[1], a + (j % 2 ? 1 : -1) * U.rand(0.3, 0.95), len * U.rand(0.45, 0.7), at[2] * 0.75, depth + 1);
    }
  };
  for (let s = 0; s < nStems; s++) {                                  // stems lean out low, then rise (like the bent maples)
    const dir = U.rand() < 0.5 ? -1 : 1, x0 = (s - (nStems - 1) / 2) * R * 1.4, Hs = H * U.rand(0.65, 1);
    const sw = sweep * U.rand(0.5, 1) * (s ? 0.6 : 1), r0 = R * (s ? U.rand(0.55, 0.8) : 1), pts = [];
    for (let u = 0; u <= 1.0001; u += 0.04) {
      const y = Hs * 0.55 * Math.pow(u, 1.3), x = x0 + dir * sw * Math.sin(Math.min(1, u * 1.5) * Math.PI / 2) + (U.fbm(seed + s, u * 3) - 0.5) * 0.9;
      pts.push([x, y - 0.15, r0 * (1 - 0.6 * u) * (1 + 0.6 * Math.exp(-u * 10))]);
    }
    limbs.push(pts);
    const end = pts[pts.length - 1], prev = pts[pts.length - 3];
    grow(end[0], end[1], Math.atan2(end[1] - prev[1], end[0] - prev[0]), Hs * 0.5, end[2], 0);
  }
  // the sprite is sized from the grown shape
  let x0 = 0, x1 = 0, y1 = 0;
  for (const pts of limbs) for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const half = Math.max(-x0, x1) + 1.6, hm = y1 + 1.4;
  let k = U.clamp(1000 / hm, 22, 80); if (half * 2 * k > 760) k = 760 / (half * 2);
  const sp = Sprites.create(half * 2, hm, k, half, 0.6), X = sp.X, Y = sp.Y;
  const bA = new Batch(), bL = new Batch();
  const leafDots = front => {                                          // small leaves in loose clusters, translucent against the light
    for (const [tx, ty] of tips) {
      const n = Math.floor(130 * S.leaves);
      for (let i = 0; i < n; i++) {
        if ((U.rand() < 0.5) !== front) continue;
        const x = tx + U.gauss() * 0.75, y = ty + U.gauss() * 0.5 - 0.1;
        if (U.fbm(seed + x * 0.8, y * 0.8) < 0.4) continue;
        const r = U.clamp(U.rand(0.018, 0.04) * k, 0.5, 1.8), lc = U.mix(U.pick(S.leaf), [70, 96, 52], U.rand(0, 0.5));
        bA.dot(fk(lc, U.rand(0.5, 0.9), 0.75), X(x), Y(y), r);
        if (U.rand() < 0.35) bL.dot(lf(U.rand(0.2, 0.5)), X(x), Y(y), r * 0.8);
      }
    }
  };
  leafDots(false); bA.flush(sp.A); bL.flush(sp.L);
  for (const pts of limbs) paintTube(sp, bA, bL, pts, S.bark, { moss: S.moss, lichen: S.lichen, trunk: pts === limbs[0] });
  bA.flush(sp.A); bL.flush(sp.L);
  for (const pts of limbs) {                                           // hanging moss curtains and licorice ferns on big limbs
    if (pts[0][2] < 0.06) continue;
    for (const p of pts) {
      if (U.rand() < S.hangmoss * 0.12) paintBeard(sp, bA, bL, p[0], p[1] - p[2], Math.floor(U.rand(2, 7)), 1.2);
      if (U.rand() < S.ferns * 0.15) {
        const key = sk([60, 100, 50], U.rand(0.8, 1.1), 1, 1);
        for (let f = 0; f < 4; f++) { const a = U.rand(0.4, 2.7), l = U.rand(0.12, 0.3);
          bA.line(key, X(p[0]), Y(p[1] + p[2]), X(p[0] + Math.cos(a) * l), Y(p[1] + p[2] + Math.sin(a) * l)); }
      }
    }
  }
  leafDots(true);
  bA.flush(sp.A); bL.flush(sp.L);
  return Sprites.finish(sp, 0.3);
}

function paintFern(F) {
  const tall = F.tri ? 1.6 : F.shrub ? 1.2 : 1.3;
  const sp = Sprites.create(2.8, tall, 95, 1.4, 0.05), X = sp.X, Y = sp.Y, bA = new Batch(), bL = new Batch();
  if (F.shrub) {                                                       // salal: arching stems with leathery oval leaves
    for (let s = 0; s < 9; s++) {
      const a = U.gauss() * 0.9, len = U.rand(0.5, 1.0); let x = U.gauss() * 0.15, y = 0;
      for (let i = 0; i < 8; i++) {
        const nx = x + Math.sin(a) * len / 8, ny = y + Math.cos(a) * len / 8 * (1 - i / 12);
        bA.line(sk([70, 60, 40], 0.8, 1, 1), X(x), Y(y), X(nx), Y(ny)); x = nx; y = ny;
        for (const sd of [-1, 1]) { const lx = x + sd * 0.06, ly = y - 0.02;
          const p = bA.get(fk(F.col, U.rand(0.7, 1.2), 0.95)); p.moveTo(X(lx) + 4, Y(ly)); p.ellipse(X(lx), Y(ly), 0.055 * 95, 0.032 * 95, sd * 0.6, 0, U.TAU);
          if (U.rand() < 0.2) bL.dot(lf(0.3), X(lx + sd * 0.02), Y(ly + 0.01), 1.2); }
      }
    }
  } else {
    const nf = Math.round(U.rand(...F.fronds));
    for (let f = 0; f < nf; f++) {
      const a = U.gauss() * F.spread, len = U.rand(...F.len), shade = U.rand(0.65, 1.15), n = Math.round(len * 26);
      const pt = t => [Math.sin(a) * len * t * 1.1, Math.cos(a) * len * t * (1 - F.arch * t * 0.9) + 0.02];
      const rach = bA.get(sk(F.col, shade * 0.8, 1, 1));
      for (let i = 0; i <= n; i++) {
        const t = i / n, [x, y] = pt(t), [x2, y2] = pt(Math.min(1, t + 0.02));
        i ? rach.lineTo(X(x), Y(y)) : rach.moveTo(X(x), Y(y));
        if (t < 0.06) continue;
        const tx = x2 - x, ty = y2 - y, l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
        const size = (F.tri ? 0.26 : 0.11) * len * (1 - t * 0.85);
        for (const sd of [-1, 1]) {
          const ex = x + nx * size * sd + tx / l * size * 0.4, ey = y + ny * size * sd + ty / l * size * 0.4;
          const key = sk(F.col, shade * U.rand(0.85, 1.15) * (0.85 + 0.3 * t), 1, 1.3);
          bA.line(key, X(x), Y(y), X(ex), Y(ey));
          if (F.tri) for (let j = 1; j < 4; j++) { const u = j / 4; bA.line(key, X(x + (ex - x) * u), Y(y + (ey - y) * u), X(x + (ex - x) * u + tx / l * 0.05), Y(y + (ey - y) * u + 0.03)); }
          if (t > 0.45 && U.rand() < 0.4) bL.line(lk(U.rand(0.4, 0.9), 1.2), X(x), Y(y), X(ex), Y(ey));
        }
      }
    }
  }
  bA.flush(sp.A); bL.flush(sp.L);
  return Sprites.finish(sp, 0.2);
}

function paintLog() {                                                  // a fallen, moss-covered nurse log
  const L = U.rand(4.5, 10), D = U.rand(0.5, 1.15), tilt = U.gauss() * 0.04;
  const sp = Sprites.create(L + 1.6, D + 1.8, U.clamp(560 / (L + 1.6), 30, 60), (L + 1.6) / 2, 0.2), X = sp.X, Y = sp.Y;
  const bA = new Batch(), bL = new Batch(), cy = x => D * 0.42 + tilt * x;
  const pts = [];
  for (let x = -L / 2; x <= L / 2 + 0.001; x += 0.3) pts.push([x, cy(x), D / 2 * (1 - 0.15 * (x + L / 2) / L)]);
  paintTube(sp, bA, bL, pts, [84, 64, 50], { moss: 0, furrow: 0.6 });
  bA.flush(sp.A); bL.flush(sp.L);
  const cush = bA.get(fk([58, 86, 42], 0.8, 0.85));                   // moss cushion along the top
  cush.moveTo(X(-L / 2), Y(cy(-L / 2) + D * 0.2));
  for (let x = -L / 2; x <= L / 2; x += 0.25) cush.lineTo(X(x), Y(cy(x) + D * 0.5 + U.fbm(x * 0.8, 3) * 0.12));
  for (let x = L / 2; x >= -L / 2; x -= 0.25) cush.lineTo(X(x), Y(cy(x) + D * (0.05 + 0.25 * U.fbm(x * 0.7, 9))));
  cush.closePath();
  for (let i = 0; i < L * D * sp.k * 14; i++) {                        // fine moss on top, hanging over the sides
    const x = U.rand(-L / 2, L / 2), v = U.rand(-0.2, 1.1), r = D / 2;
    if (U.fbm(x * 0.6, v * 2) < 0.38) continue;
    const y = cy(x) + v * r + (v > 0.95 ? U.rand(0, 0.08) : 0);
    bA.dot(fk(U.pick(MOSS), U.rand(0.7, 1.2), 0.9), X(x), Y(y), U.rand(0.4, 1.3));
    if (v > 0.75 && U.rand() < 0.3) bL.dot(lf(U.rand(0.3, 0.7)), X(x), Y(y + 0.02), 0.9);
  }
  const ex = L / 2, end = bA.get(fk([116, 88, 62], 1));               // the broken end, pale wood with rings
  end.moveTo(X(ex) + D * 0.1 * sp.k, Y(cy(ex))); end.ellipse(X(ex), Y(cy(ex)), D * 0.1 * sp.k, D * 0.4 * sp.k, 0, 0, U.TAU);
  for (let r = 0.2; r < 1; r += 0.2) { const p = bA.get(sk([110, 78, 52], 1, 0.7, 1)); p.moveTo(X(ex) + D * 0.1 * r * sp.k, Y(cy(ex))); p.ellipse(X(ex), Y(cy(ex)), D * 0.1 * r * sp.k, D * 0.4 * r * sp.k, 0, 0, U.TAU); }
  bL.dot(lf(0.3), X(ex), Y(cy(ex) + D * 0.2), D * 0.06 * sp.k);
  for (let s = 0; s < L * 0.8; s++) {                                  // seedlings and little ferns growing on it
    const x = U.rand(-L / 2 + 0.5, L / 2 - 0.5), y = cy(x) + D / 2, h = U.rand(0.15, 0.8), key = sk([46, 84, 46], U.rand(0.8, 1.2), 1, 1.1);
    bA.line(key, X(x), Y(y), X(x), Y(y + h));
    for (let j = 0; j < 6; j++) { const yy = y + h * (0.3 + j * 0.11), w = 0.18 * (1 - j / 7); bA.line(key, X(x - w), Y(yy - 0.05), X(x + w), Y(yy - 0.05)); }
    if (U.rand() < 0.4) bL.line(lk(0.6), X(x), Y(y + h), X(x), Y(y + h * 0.6));
  }
  bA.flush(sp.A); bL.flush(sp.L);
  sp.len = L;
  return Sprites.finish(sp, 0.25);
}

function paintCarpet() {                                               // a low patch of moss, oxalis and needles on the floor
  const sp = Sprites.create(3.4, 0.6, 90, 1.7, 0.1), X = sp.X, Y = sp.Y, bA = new Batch(), bL = new Batch(), seed = U.rand(100);
  for (let i = 0; i < 2600; i++) {
    const x = U.gauss() * 1.6, y = Math.abs(U.gauss()) * 0.12 * (1 - Math.abs(x) / 1.8);
    if (U.fbm(seed + x * 1.5, 1) < 0.35) continue;
    const kind = U.rand();
    if (kind < 0.55) bA.dot(fk(U.pick(MOSS), U.rand(0.6, 1.1), 0.9), X(x), Y(y), U.rand(0.5, 1.4));
    else if (kind < 0.8) { const a = U.rand(U.TAU), l = U.rand(0.03, 0.08); bA.line(sk([110, 80, 52], U.rand(0.7, 1.1), 0.9, 1), X(x), Y(y), X(x + Math.cos(a) * l), Y(y + Math.sin(a) * l * 0.3)); }
    else { bA.dot(fk([70, 112, 52], U.rand(0.8, 1.2), 0.9), X(x), Y(y + 0.04), U.rand(1, 2.2)); if (U.rand() < 0.25) bL.dot(lf(0.5), X(x), Y(y + 0.05), 1); }
  }
  bA.flush(sp.A); bL.flush(sp.L);
  return Sprites.finish(sp, 0.2);
}

function paintWall() {                                                 // the distant forest: layered tree tops, seen through the fog
  const sp = Sprites.create(2400, 300, 1, 0, 0), A = sp.A;
  for (let layer = 0; layer < 3; layer++) {
    A.fillStyle = U.rgba(U.mul([46, 58, 52], 0.7 + layer * 0.15), 1);
    for (let x = -40; x < 2440; x += U.rand(8, 26)) {
      const h = U.rand(70, 260) * (1 - layer * 0.2), w = h * U.rand(0.16, 0.26), base = 300;
      A.beginPath(); A.moveTo(x - w, base);
      for (let i = 0; i <= 8; i++) { const yy = base - h * i / 8, ww = w * (1 - i / 8); A.lineTo(x - ww * U.rand(0.7, 1.1), yy); }
      for (let i = 8; i >= 0; i--) { const yy = base - h * i / 8, ww = w * (1 - i / 8); A.lineTo(x + ww * U.rand(0.7, 1.1), yy); }
      A.fill();
    }
  }
  return Sprites.finish(sp, 0.4);
}

// ---------------------------------------------------------------------------------------------
// FOREST LAYER: places the painted sprites in a world that repeats around the camera
// ---------------------------------------------------------------------------------------------
Canopy.layer('forest', {
  init() {
    this.spr = {};
    for (const S of SPECIES) this.spr[S.name] = Array.from({ length: S.variants }, () => S.type === 'broadleaf' ? paintBroadleaf(S) : paintConifer(S));
    this.fernSpr = FERNS.map(F => ({ F, list: [paintFern(F), paintFern(F)] }));
    this.logSpr = Array.from({ length: 5 }, paintLog);
    this.wall = paintWall();

    const W = CONFIG.world, sw = Object.fromEntries(SPECIES.map(S => [S.name, S.weight]));
    this.trees = Array.from({ length: W.trees }, () => {
      const name = U.weighted(sw);
      return { x: U.rand(-XW / 2, XW / 2), z: U.rand(ZFAR), sp: U.pick(this.spr[name]), flip: U.rand() < 0.5 ? -1 : 1,
        sc: U.rand(0.88, 1.12), ph: U.rand(U.TAU), small: name === 'sapling' || name === 'vine maple' };
    });
    const fw = Object.fromEntries(this.fernSpr.map((f, i) => [i, f.F.weight]));
    this.ferns = [];
    while (this.ferns.length < W.ferns) {                              // ferns grow in patches
      const cx = U.rand(-XW / 2, XW / 2), cz = U.rand(ZFAR), n = Math.floor(U.rand(4, 16)), kind = this.fernSpr[U.weighted(fw)];
      for (let i = 0; i < n; i++) this.ferns.push({ x: cx + U.gauss() * 3, z: U.mod(cz + U.gauss() * 3, ZFAR), sp: U.pick(kind.list),
        flip: U.rand() < 0.5 ? -1 : 1, sc: U.rand(0.85, 1.7), ph: U.rand(U.TAU), small: true });
    }
    this.logs = Array.from({ length: W.logs }, () => ({ x: U.rand(-XW / 2, XW / 2), z: U.rand(ZFAR), sp: U.pick(this.logSpr),
      ang: U.rand(-1.2, 1.2), sc: U.rand(0.85, 1.15) }));
  },
  back(c) {                                                            // distant forest at the horizon (fully inside the fog)
    const { ctx, W, H, hz, f } = c, sp = this.wall, h = H * 0.3, w = sp.w * h / sp.h;
    const off = U.mod(-c.view * f * 1.0 - Canopy.cam.x * 3, w);
    for (let x = off - w; x < W; x += w) ctx.drawImage(sp.b, x, hz + H * 0.03 - h, w, h);
  },
  items(c, list) {
    this.place(c, list, this.trees, 1.6);
    this.placeLogs(c, list);
    this.place(c, list, this.ferns, 0, 30);
  },
  place(c, list, arr, pathClear, maxZ = ZFAR + 1) {
    const cam = Canopy.cam, W = c.W, clr = Canopy.clearings.length > 0;
    for (const o of arr) {
      const dx = U.wrap(o.x - cam.x, XW), dz = (U.mod(o.z - cam.z + 8, ZFAR) - 8);
      const cx = dx * c.cos - dz * c.sin, cz = dx * c.sin + dz * c.cos;
      if (cz < 0.8 || cz > maxZ) continue;
      const s = c.f / cz, sx = W / 2 + cx * s, half = o.sp.w / o.sp.k * 0.55 * o.sc * s;
      if (sx + half < 0 || sx - half > W) continue;
      let vis = 1;
      if (clr) { vis = 1 - Canopy.cleared(cam.x + dx, cam.z + dz); if (vis < 0.02) continue; }
      if (pathClear && cz < 8) vis *= U.sstep(pathClear * 0.4, pathClear, Math.abs(cx));   // never walk into a trunk
      vis *= U.sstep(o.small && !pathClear ? 1.2 : 0.8, o.small && !pathClear ? 3.2 : 2.2, cz);
      if (vis < 0.02) continue;
      list.push({ z: cz, draw: c => this.drawOne(c, o, sx, cz, vis) });
    }
  },
  // fallen logs lie on the ground at an angle: the sprite is stretched between the two projected ends
  placeLogs(c, list) {
    const cam = Canopy.cam;
    for (const o of this.logs) {
      const dx = U.wrap(o.x - cam.x, XW), dz = (U.mod(o.z - cam.z + 8, ZFAR) - 8), half = o.sp.len / 2 * o.sc;
      const ux = Math.cos(o.ang) * half, uz = Math.sin(o.ang) * half;
      const end = (x, z) => [x * c.cos - z * c.sin, x * c.sin + z * c.cos];
      const [ax, az] = end(dx - ux, dz - uz), [bx, bz] = end(dx + ux, dz + uz);
      if (az < 1.2 || bz < 1.2) continue;
      const cz = (az + bz) / 2;
      let vis = U.sstep(1.2, 3, Math.min(az, bz));
      if (Canopy.clearings.length) vis *= 1 - Canopy.cleared(cam.x + dx, cam.z + dz);
      if (vis < 0.02) continue;
      list.push({ z: cz, draw: c => {
        const sA = c.f / az, sB = c.f / bz, sxA = c.W / 2 + ax * sA, sxB = c.W / 2 + bx * sB;
        if (Math.max(sxA, sxB) < 0 || Math.min(sxA, sxB) > c.W) return;
        const gyA = c.hz + c.camH * sA, gyB = c.hz + c.camH * sB, sp = o.sp, k = sp.k, L = sp.len, s = (sA + sB) / 2 * o.sc;
        const dxL = (sxB - sxA) / L, dyL = (gyB - gyA) / L, e = sxA + (L / 2 - sp.ax / k) * dxL, f = gyA + (L / 2 - sp.ax / k) * dyL - sp.ay * s / k;
        const ctx = c.ctx; ctx.globalAlpha = vis;
        ctx.setTransform(dxL / k, dyL / k, 0, s / k, e, f); ctx.drawImage(sp.b, 0, 0);
        const la = c.lightAt((sxA + sxB) / 2, cz) * vis;
        if (la > 0.02) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, la); ctx.drawImage(sp.l, 0, 0); }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } });
    }
  },
  drawOne(c, o, sx, cz, vis) {
    const ctx = c.ctx, s = c.f / cz, sc = s / o.sp.k * o.sc, gy = c.hz + c.camH * s;
    const shear = o.log ? 0 : (Math.sin(c.t * 0.35 + o.ph) * 0.004 + Math.sin(c.t * 1.3 + o.ph * 2) * 0.0015) * (1 + 2 * c.I) * (o.small ? 3 : 1);
    const near = o.sp.pts ? U.lerp(0.4, 1, U.sstep(3, 14, cz)) : 1;   // up close the painted tree gives way to its points
    ctx.globalAlpha = vis * near;
    Sprites.draw(ctx, o.sp.b, o.sp, sx, gy, sc, o.flip, shear);
    const la = c.lightAt(sx, cz) * vis * (0.85 + 0.3 * AUD.high * U.noise(o.ph * 5, c.t * 4)) * (o.small ? 0.6 * U.sstep(1.5, 7, cz) : 1);
    if (la > 0.02) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, la);
      Sprites.draw(ctx, o.sp.l, o.sp, sx, gy, sc, o.flip, shear);
    }
    const pts = o.sp.pts, fade = U.sstep(28, 6, cz) * vis * (o.small ? 0.5 : 1);
    if (pts && fade > 0.03) {                                          // up close the tree becomes a cloud of glowing points
      const m = s * o.sc, sz = U.clamp(0.011 * s, 0.9, 2.2), body = new Path2D(), lit = new Path2D(), jit = 0.006 + 0.02 * AUD.high + 0.03 * AUD.kick * AUD.power;
      const step = Math.max(1, Math.round((Canopy.lodPts || 1) * (cz < 10 ? 1 : cz < 18 ? 2.5 : 5)));
      for (let i = 0; i < pts.length; i += step) {
        const p = pts[i], x = sx + (p[0] * o.flip + shear * p[1] + (U.noise(i, c.t * 2) - 0.5) * jit) * m, y = gy - p[1] * m;
        if (x < -2 || x > c.W + 2 || y < -2 || y > c.H) continue;
        (p[2] ? lit : body).rect(x, y, sz, sz);
      }
      const P = c.P, a = P.amb;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.6; ctx.fillStyle = U.rgba([160 * a[0] + 14, 196 * a[1] + 16, 178 * a[2] + 16]); ctx.fill(body);
      ctx.globalAlpha = Math.min(1, fade * (0.35 + 0.9 * la)); ctx.fillStyle = U.rgba(P.light); ctx.fill(lit);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// GROUND: the forest floor (leaf litter, needles) and pools of light where the sun gets through
// ---------------------------------------------------------------------------------------------
Canopy.layer('ground', {
  init() {
    const sp = Sprites.create(8, 8, 64, 0, 0), A = sp.A;               // an 8 m tile of forest floor made of particles
    A.fillStyle = 'rgb(46,42,34)'; A.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90000; i++) {
      const x = U.rand(512), y = U.rand(512), m = U.fbm(x / 70, y / 70, 3), r = U.rand(0.5, 2.6);
      A.fillStyle = U.rgba(U.mul(m > 0.5 ? U.pick(MOSS) : U.pick([[92, 70, 48], [70, 56, 40], [120, 92, 60], [58, 50, 38]]), U.rand(0.55, 1.15)), U.rand(0.5, 1));
      A.fillRect(x, y, r, r * U.rand(0.4, 1));
    }
    this.floor = Sprites.finish(sp, 0.15, false); this.pat = null; this.patKey = '';
    this.cover = [];
    while (this.cover.length < 30000) {
      const x = U.rand(-XW / 2, XW / 2), z = U.rand(ZFAR), m = U.fbm(x * 0.12 + 50, z * 0.12);
      if (U.rand() > m * 1.6) continue;
      const kind = U.rand() < m ? 0 : U.rand() < 0.6 ? 1 : 2;           // 0 moss, 1 needles/litter, 2 oxalis
      this.cover.push([x, z, kind, U.rand(0.025, 0.09), U.rand(), Math.pow(U.rand(), 2) * 0.45]);
    }
    this.mist = Array.from({ length: 9000 }, () => [U.rand(-XW / 2, XW / 2), U.rand(ZFAR), Math.pow(U.rand(), 2.2) * 1.6, U.rand(U.TAU)]);
    this.pools = Array.from({ length: 46 }, () => ({ x: U.rand(-XW / 2, XW / 2), z: U.rand(ZFAR), r: U.rand(0.6, 2.4), ph: U.rand(U.TAU) }));
  },
  back(c) {                                                            // the floor in perspective, strip by strip
    const { ctx, W, H, hz, f, camH, P } = c, cam = Canopy.cam, sp = this.floor;
    if (!this.pat || this.patKey !== sp.tk) { this.pat = ctx.createPattern(sp.b, 'repeat'); this.patKey = sp.tk; }
    ctx.fillStyle = U.rgba(U.mix(P.ground, P.fog, 0.6)); ctx.fillRect(0, hz, W, H - hz);
    const tan = Math.tan(cam.yaw);
    for (let y0 = hz + 1; y0 < H;) {
      const y1 = Math.min(H, y0 + Math.max(1.5, (y0 - hz) * 0.05)), z0 = camH * f / (y0 - hz), z1 = camH * f / (y1 - hz), z = (z0 + z1) / 2;
      if (z < 40) {
        const K = (y1 - y0) / Math.max(0.001, z0 - z1);
        this.pat.setTransform(new DOMMatrix([f / (z * 64), 0, 0, -K / 64, W / 2 - (cam.x + z * tan) * f / z, (y0 + y1) / 2 + (cam.z + z) * K]));
        ctx.fillStyle = this.pat; ctx.fillRect(0, y0, W, y1 - y0 + 0.5);
      }
      y0 = y1;
    }
  },
  items(c, list) {
    const cam = Canopy.cam;
    for (const [z0, z1] of [[24, 34], [16, 24], [10, 16], [6, 10], [3.5, 6], [0.8, 3.5]]) {
      list.push({ z: z1, draw: c => this.drawCover(c, z0, z1) });
      list.push({ z: z0 + 0.01, draw: c => this.drawMist(c, z0, z1) });
    }
    if (c.sun.pow < 0.05) return;
    for (const p of this.pools) {
      const dx = U.wrap(p.x - cam.x, XW), dz = (U.mod(p.z - cam.z + 8, ZFAR) - 8);
      const cx = dx * c.cos - dz * c.sin, cz = dx * c.sin + dz * c.cos;
      if (cz < 1 || cz > 40) continue;
      if (Canopy.clearings.length && Canopy.cleared(cam.x + dx, cam.z + dz) > 0.5) continue;
      list.push({ z: cz, draw: c => {
        const s = c.f / cz, sx = c.W / 2 + cx * s, sy = c.hz + c.camH * s, rr = p.r * s;
        if (sx < -rr || sx > c.W + rr) return;
        const a = c.sun.pow * (0.45 + 0.35 * c.I) * (0.6 + 0.4 * Math.sin(c.t * 0.5 + p.ph)) * U.sstep(0.05, 0.5, c.sun.pow);
        const g = c.ctx.createRadialGradient(sx, sy, 0, sx, sy, rr);
        g.addColorStop(0, U.rgba(c.P.light, a)); g.addColorStop(1, U.rgba(c.P.light, 0));
        const fl = Math.max(0.05, c.camH / cz);
        c.ctx.globalCompositeOperation = 'lighter'; c.ctx.fillStyle = g;
        c.ctx.setTransform(1, 0, 0, fl, 0, sy * (1 - fl));
        c.ctx.fillRect(sx - rr, sy - rr, rr * 2, rr * 2); c.ctx.setTransform(1, 0, 0, 1, 0, 0);
      } });
    }
  },
  drawCover(c, z0, z1) {                                               // a thick carpet of particles, raised off the ground
    const { ctx, W, hz, f, camH, P } = c, cam = Canopy.cam, paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const clr = Canopy.clearings.length > 0;
    for (const l of this.cover) {
      const dx = U.wrap(l[0] - cam.x, XW), dz = (U.mod(l[1] - cam.z + 8, ZFAR) - 8);
      const cx = dx * c.cos - dz * c.sin, cz = dx * c.sin + dz * c.cos;
      if (cz < z0 || cz >= z1) continue;
      const s = f / cz, sx = W / 2 + cx * s; if (sx < -4 || sx > W + 4) continue;
      if (clr && Canopy.cleared(cam.x + dx, cam.z + dz) > 0.5) continue;
      const sz = U.clamp(l[3] * s * 0.6, 0.8, 4), sy = hz + (camH - l[5]) * s;
      paths[l[2] === 1 ? 1 : l[2] === 0 ? (l[4] < 0.5 ? 0 : 3) : 2].rect(sx, sy, sz, sz);
    }
    const a = P.amb, cols = [[70, 100, 50], [112, 86, 60], [96, 134, 64], [52, 76, 42]];
    cols.forEach((col, i) => { ctx.fillStyle = U.rgba([col[0] * a[0], col[1] * a[1], col[2] * a[2]], 0.8); ctx.fill(paths[i]); });
  },
  drawMist(c, z0, z1) {                                                // ground mist: fine particles hanging low, lit by the sun; BASS swells it
    const { ctx, W, hz, f, camH, P, sun, t } = c, cam = Canopy.cam, near = new Path2D(), far = new Path2D(), lit = new Path2D();
    const swell = 1 + 0.6 * AUD.low, dens = 0.45 + 0.55 * c.wx.fog;
    for (let i = 0; i < this.mist.length; i++) {
      if ((i % 100) / 100 > dens) continue;
      const m = this.mist[i], dx = U.wrap(m[0] + t * 0.08 - cam.x, XW), dz = (U.mod(m[1] - cam.z + 8, ZFAR) - 8);
      const cx = dx * c.cos - dz * c.sin, cz = dx * c.sin + dz * c.cos;
      if (cz < z0 || cz >= z1) continue;
      const s = f / cz, sx = W / 2 + cx * s; if (sx < -4 || sx > W + 4) continue;
      const sy = hz + (camH - m[2] * swell - Math.sin(t * 0.5 + m[3]) * 0.08) * s, sz = U.clamp(0.02 * s, 0.8, 3);
      const nearSun = Math.abs(sx - sun.x) < W * 0.25 && sun.pow > 0.2;
      (nearSun && (i & 1) ? lit : m[2] < 0.5 ? near : far).rect(sx, sy, sz, sz);
    }
    ctx.globalAlpha = 0.32; ctx.fillStyle = U.rgba(U.mix(P.fog, [255, 255, 255], 0.15)); ctx.fill(near);
    ctx.globalAlpha = 0.2; ctx.fill(far);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * sun.pow; ctx.fillStyle = U.rgba(P.light); ctx.fill(lit);
  }
});
