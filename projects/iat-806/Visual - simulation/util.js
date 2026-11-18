// CANOPY — util.js
// Small helpers shared by every module: maths, colour, noise, offscreen canvases, sprites.

const U = {
  TAU: Math.PI * 2,
  rand(a = 1, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; },   // soft bell, -1..1
  lerp(a, b, t) { return a + (b - a) * t; },
  clamp(v, a = 0, b = 1) { return v < a ? a : v > b ? b : v; },
  smooth(v) { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); },
  sstep(e0, e1, x) { return U.smooth((x - e0) / (e1 - e0)); },
  mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; },
  mul(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; },
  rgba(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)})`; },
  wrap(v, p) { return ((v + p / 2) % p + p) % p - p / 2; },      // into -p/2 .. p/2
  mod(v, p) { return ((v % p) + p) % p; },                        // into 0 .. p
  canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; },
  weighted(obj) {                                                  // pick a key of {name: weight}
    const keys = Object.keys(obj).filter(k => obj[k] > 0);
    let r = Math.random() * keys.reduce((s, k) => s + obj[k], 0);
    for (const k of keys) { r -= obj[k]; if (r <= 0) return k; }
    return keys[0];
  }
};

// ---------- value noise (no dependency on p5, so it behaves the same with p5 1.x and 2.x) ----------
(() => {
  const P = new Uint16Array(512), G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = Math.random(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const f = t => t * t * (3 - 2 * t);
  U.noise = (x, y = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = f(x - xi), v = f(y - yi), X = xi & 255, Y = yi & 255;
    const a = G[P[P[X] + Y]], b = G[P[P[X + 1] + Y]], c = G[P[P[X] + Y + 1]], d = G[P[P[X + 1] + Y + 1]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  U.fbm = (x, y = 0, oct = 4) => {
    let s = 0, a = 0.5, n = 0;
    for (let i = 0; i < oct; i++) { s += a * U.noise(x, y); n += a; x *= 2.03; y *= 2.03; a *= 0.5; }
    return s / n;
  };
})();

// ---------- batched strokes: thousands of small marks drawn with a handful of fills ----------
// Used by the painters: marks of similar colour go into the same Path2D, so painting a tree costs
// a few dozen canvas calls instead of tens of thousands.
class Batch {
  constructor() { this.b = new Map(); }
  line(key, x0, y0, x1, y1) { this.get(key).moveTo(x0, y0); this.get(key).lineTo(x1, y1); }
  dot(key, x, y, r) { const p = this.get(key); p.moveTo(x + r, y); p.arc(x, y, r, 0, U.TAU); }
  get(key) { let p = this.b.get(key); if (!p) { p = new Path2D(); this.b.set(key, p); } return p; }
  // key format: 'S|r,g,b|alpha|width' for strokes, 'F|r,g,b|alpha' for fills
  flush(ctx) {
    for (const [key, p] of this.b) {
      const [mode, col, a, w] = key.split('|');
      if (mode === 'S') { ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = +w; ctx.lineCap = 'round'; ctx.stroke(p); }
      else { ctx.fillStyle = `rgba(${col},${a})`; ctx.fill(p); }
    }
    this.b.clear();
  }
}
const ckey = (c, steps = 10) => c.map(v => Math.round(U.clamp(v, 0, 255) / steps) * steps).join(',');   // quantised colour

// ---------- sprites ----------
// A sprite is a picture painted once at start-up, in metres (k pixels per metre), standing on a ground anchor.
//   a  albedo (its own colours, kept as pixel data)
//   b  the albedo multiplied by the current ambient light (re-made slowly as the day changes)
//   l  light mask: the parts that catch light from behind (rims, needle tips, moss). Re-coloured with the light colour.
//   e  optional emissive layer (neon, lit windows): never tinted
const Sprites = {
  all: [], key: '', amb: [1, 1, 1], lit: [255, 255, 255], cursor: 0,
  create(wm, hm, k, axm, aym = 0.3) {
    const w = Math.max(2, Math.ceil(wm * k)), h = Math.max(2, Math.ceil(hm * k));
    const sp = { w, h, k, ax: axm * k, ay: h - aym * k, a: U.canvas(w, h), l: U.canvas(w, h) };
    sp.A = sp.a.getContext('2d'); sp.L = sp.l.getContext('2d');
    sp.X = xm => sp.ax + xm * k; sp.Y = ym => sp.ay - ym * k;
    return sp;
  },
  soften(cv, amount) {                                      // a cheap blur laid back over itself: soft, painterly edges
    if (amount <= 0) return;
    const t = U.canvas(cv.width / 3, cv.height / 3), x = t.getContext('2d'), c = cv.getContext('2d');
    x.imageSmoothingQuality = 'high'; x.drawImage(cv, 0, 0, t.width, t.height);
    c.save(); c.globalAlpha = amount; c.imageSmoothingQuality = 'high'; c.drawImage(t, 0, 0, cv.width, cv.height); c.restore();
  },
  // turns a painted sprite into particles: a sparse stipple of points over a faint ghost of the shape,
  // bases dissolving into the ground mist, and a point cloud kept for drawing up close (like a LiDAR scan)
  particlize(sp, o) {
    const { w, h, k } = sp, ad = sp.A.getImageData(0, 0, w, h), d = ad.data, ld = sp.L.getImageData(0, 0, w, h), l = ld.data;
    let n = 0; for (let q = 3; q < d.length; q += 4) if (d[q] > 90) n++;
    const sample = Math.min(1, (o.points || 2200) / Math.max(1, n)), pts = [];
    for (let j = 0; j < h; j++) {
      const ym = (sp.ay - j) / k, base = o.base ? U.lerp(0.15, 1, U.sstep(-0.1, o.base, ym)) : 1;
      for (let i = 0; i < w; i++) {
        const q = 4 * (j * w + i), a = d[q + 3];
        if (!a && !l[q + 3]) continue;
        const keep = Math.random() < o.keep;
        if (a > 90 && Math.random() < sample) pts.push([(i - sp.ax) / k, ym, l[q + 3] > 50 ? 1 : 0]);
        d[q + 3] = a * (keep ? U.rand(0.75, 1) : o.ghost) * base;
        if (keep) { d[q] *= 1.15; d[q + 1] *= 1.15; d[q + 2] *= 1.15; }
        l[q + 3] = l[q + 3] * (Math.random() < o.keep * 1.4 ? 1.25 : 0.12) * base;
      }
    }
    sp.A.putImageData(ad, 0, 0); sp.L.putImageData(ld, 0, 0); sp.pts = pts;
  },
  finish(sp, soft = 0.35, part = { keep: 0.45, ghost: 0.5, base: 1.2, points: 4200 }) {
    this.soften(sp.a, soft); this.soften(sp.l, soft * 1.4);
    if (part) this.particlize(sp, part);
    sp.ad = sp.A.getImageData(0, 0, sp.w, sp.h);            // albedo pixels, kept for re-tinting
    sp.b = U.canvas(sp.w, sp.h); sp.tk = '';
    delete sp.A; delete sp.L; sp.a = null;
    this.all.push(sp); this.tint(sp);
    return sp;
  },
  tint(sp) {
    const src = sp.ad.data, out = new ImageData(sp.w, sp.h), d = out.data, [r, g, b] = this.amb;
    for (let i = 0; i < src.length; i += 4) { d[i] = src[i] * r; d[i + 1] = src[i + 1] * g; d[i + 2] = src[i + 2] * b; d[i + 3] = src[i + 3]; }
    sp.b.getContext('2d').putImageData(out, 0, 0);
    const x = sp.l.getContext('2d');
    x.globalCompositeOperation = 'source-in'; x.fillStyle = U.rgba(this.lit); x.fillRect(0, 0, sp.w, sp.h);
    x.globalCompositeOperation = 'source-over';
    sp.tk = this.key;
  },
  // called every frame: re-tints at most `budget` sprites whose colours are out of date
  update(amb, lit, budget = 2) {
    const q = v => Math.round(v * 40) / 40, ql = v => Math.round(v / 8) * 8;
    this.amb = amb.map(q); this.lit = lit.map(ql); this.key = this.amb.join() + '/' + this.lit.join();
    for (let n = 0, i = 0; n < budget && i < this.all.length; i++) {
      const sp = this.all[this.cursor = (this.cursor + 1) % this.all.length];
      if (sp.tk !== this.key) { this.tint(sp); n++; }
    }
  },
  // draw one layer of a sprite standing on (sx, gy), sc = screen pixels per sprite pixel, shear = sway
  draw(ctx, img, sp, sx, gy, sc, flip = 1, shear = 0) {
    ctx.setTransform(sc * flip, 0, -shear * sc, sc, sx - flip * sp.ax * sc + shear * sp.ay * sc, gy - sp.ay * sc);
    ctx.drawImage(img, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
};
