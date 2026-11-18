// CANOPY — creatures.js
// Apparitions in the forest: deer and bears made of light and mist, crows crossing the sky, old cars the
// forest is taking back.
// Deer and bears are built from a VOLUME (overlapping ellipsoids and limbs, blended smoothly): each pixel knows
// how deep inside the body it is, so the core is translucent and the edges glow, like something seen through
// fog. Their eyes are amber points of light.
//
//   to add a creature: Canopy.creature('name', { spawn(c, layer) { return entity } }) and give it a weight
//   in CONFIG.creatures. An entity is { alive(c), items(c, list) }.
//
// Sound: they come more often and glow more when the music is intense; the eyes pulse on the kick.

// shapes in metres, facing right, feet on y = 0.  e: ellipse [x, y, rx, ry, rotation]   c: limb [x1, y1, x2, y2, r1, r2]
const DEER = [
  { e: [0.0, 0.8, 0.5, 0.25, 0.03] }, { e: [0.36, 0.82, 0.25, 0.29, -0.25] }, { e: [-0.38, 0.84, 0.27, 0.26, 0.2] }, { e: [-0.44, 0.74, 0.18, 0.22, 0] },
  { c: [0.42, 0.95, 0.62, 1.3, 0.15, 0.09] }, { e: [0.72, 1.36, 0.13, 0.09, -0.5] }, { c: [0.76, 1.33, 0.93, 1.22, 0.065, 0.038] },
  { e: [0.63, 1.5, 0.11, 0.04, 0.85] }, { e: [0.69, 1.5, 0.1, 0.035, 0.35] },
  { c: [0.42, 0.72, 0.45, 0.34, 0.08, 0.042] }, { c: [0.45, 0.34, 0.45, 0.03, 0.04, 0.028] },
  { c: [0.3, 0.72, 0.27, 0.34, 0.07, 0.038] }, { c: [0.27, 0.34, 0.31, 0.03, 0.036, 0.026] },
  { c: [-0.42, 0.85, -0.32, 0.5, 0.15, 0.07] }, { c: [-0.32, 0.5, -0.46, 0.3, 0.06, 0.042] }, { c: [-0.46, 0.3, -0.42, 0.03, 0.038, 0.028] },
  { c: [-0.3, 0.85, -0.2, 0.5, 0.13, 0.06] }, { c: [-0.2, 0.5, -0.34, 0.3, 0.052, 0.038] }, { c: [-0.34, 0.3, -0.3, 0.03, 0.034, 0.026] },
  { e: [-0.6, 0.9, 0.05, 0.09, 0.4] }
];
const ANTLERS = [[[0.7, 1.45], [0.64, 1.65], [0.68, 1.81], [0.8, 1.91], [0.92, 1.93]], [[0.66, 1.73], [0.57, 1.91]], [[0.76, 1.89], [0.73, 2.09]], [[0.86, 1.92], [0.9, 2.09]],
  [[0.64, 1.45], [0.56, 1.63], [0.58, 1.77], [0.68, 1.86], [0.78, 1.89]], [[0.57, 1.69], [0.48, 1.84]], [[0.66, 1.85], [0.62, 2.01]]];
const BEAR = [
  { e: [0.0, 0.78, 0.7, 0.38, 0] }, { e: [0.4, 0.92, 0.36, 0.34, 0] }, { e: [-0.52, 0.82, 0.38, 0.36, 0] }, { e: [0, 0.6, 0.55, 0.2, 0] },
  { c: [0.6, 0.86, 0.86, 0.76, 0.26, 0.19] }, { e: [0.94, 0.76, 0.22, 0.18, 0.1] }, { c: [1.02, 0.72, 1.3, 0.64, 0.095, 0.06] },
  { e: [0.88, 0.95, 0.05, 0.05, 0] }, { e: [1.0, 0.94, 0.045, 0.045, 0] },
  { c: [0.52, 0.66, 0.6, 0.06, 0.16, 0.1] }, { e: [0.64, 0.05, 0.12, 0.05, 0] }, { c: [0.28, 0.64, 0.22, 0.06, 0.14, 0.09] }, { e: [0.25, 0.05, 0.11, 0.05, 0] },
  { c: [-0.52, 0.68, -0.4, 0.06, 0.19, 0.11] }, { e: [-0.36, 0.05, 0.13, 0.05, 0] }, { c: [-0.3, 0.66, -0.38, 0.06, 0.16, 0.1] }, { e: [-0.36, 0.05, 0.11, 0.05, 0] }
];

// volume -> sprite: translucent core, glowing edges, a little fur texture, an emissive halo
function volumeSprite(prims, o) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of prims) {
    if (p.e) { const r = Math.max(p.e[2], p.e[3]); x0 = Math.min(x0, p.e[0] - r); x1 = Math.max(x1, p.e[0] + r); y0 = Math.min(y0, p.e[1] - r); y1 = Math.max(y1, p.e[1] + r); }
    else { const [a, b, c, d, r1, r2] = p.c, r = Math.max(r1, r2); x0 = Math.min(x0, a - r, c - r); x1 = Math.max(x1, a + r, c + r); y0 = Math.min(y0, b - r, d - r); y1 = Math.max(y1, b + r, d + r); }
  }
  y1 = Math.max(y1, o.top || 0); x0 -= 0.25; x1 += 0.25; y0 = Math.min(y0, 0) - 0.15; y1 += 0.25;
  const k = o.k || 110, sp = Sprites.create(x1 - x0, y1 - y0, k, -x0, -y0);
  const w = sp.w, h = sp.h, ia = sp.A.createImageData(w, h), il = sp.L.createImageData(w, h);
  sp.e = U.canvas(w, h); const E = sp.e.getContext('2d'), ie = E.createImageData(w, h);
  const field = (x, y) => {
    let s = 0;
    for (const p of prims) {
      let d;
      if (p.e) {
        const [cx, cy, rx, ry, rot] = p.e, dx = x - cx, dy = y - cy, cs = Math.cos(rot), sn = Math.sin(rot);
        const u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry; d = Math.sqrt(u * u + v * v);
      } else {
        const [ax, ay, bx, by, r1, r2] = p.c, vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
        const t = U.clamp(((x - ax) * vx + (y - ay) * vy) / L2), px = ax + vx * t - x, py = ay + vy * t - y;
        d = Math.sqrt(px * px + py * py) / (r1 + (r2 - r1) * t);
      }
      s += Math.exp(10 * (1 - d));
    }
    return Math.log(s + 1e-9) / 10;                                   // smooth union: limbs melt into the body
  };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = x0 + (i + 0.5) / k, y = y1 - (j + 0.5) / k, F = field(x, y), q = 4 * (j * w + i);
    const a = U.sstep(-0.1, 0.08, F); if (a <= 0) continue;
    const thick = U.clamp(F / 0.5), rim = 1 - thick, fur = 0.82 + 0.36 * U.noise(x * 22, y * 7), speck = 0.75 + 0.25 * U.noise(x * 60, y * 60);
    const mist = 0.5 + 0.5 * U.fbm(x * 3.5 + 7, y * 3.5);              // patchy, like a body made of fog
    const shade = (0.5 + 0.5 * rim) * fur * (0.8 + 0.3 * U.clamp((y - 0.4) / 1.1));
    ia.data[q] = o.col[0] * shade; ia.data[q + 1] = o.col[1] * shade; ia.data[q + 2] = o.col[2] * shade;
    ia.data[q + 3] = 255 * a * (0.22 + 0.45 * Math.pow(rim, 1.3)) * speck * mist;
    il.data[q] = il.data[q + 1] = il.data[q + 2] = 255; il.data[q + 3] = 255 * a * Math.pow(rim, 2.2) * 0.55 * mist;
    ie.data[q] = 196; ie.data[q + 1] = 226; ie.data[q + 2] = 216; ie.data[q + 3] = 255 * a * (Math.pow(rim, 2) * 0.35 + thick * 0.08) * mist * speck;
  }
  sp.A.putImageData(ia, 0, 0); sp.L.putImageData(il, 0, 0); E.putImageData(ie, 0, 0);
  if (o.antlers) for (const ctx of [sp.A, sp.L, E]) {                  // antlers: pale strokes
    ctx.strokeStyle = ctx === sp.A ? 'rgba(200,196,180,0.75)' : ctx === sp.L ? 'rgba(255,255,255,0.45)' : 'rgba(210,236,226,0.3)';
    ctx.lineWidth = 0.024 * k; ctx.lineCap = 'round'; ctx.globalAlpha = 0.7;
    for (const line of o.antlers) { ctx.beginPath(); line.forEach(([x, y], n) => n ? ctx.lineTo(sp.X(x), sp.Y(y)) : ctx.moveTo(sp.X(x), sp.Y(y))); ctx.stroke(); }
  }
  Sprites.soften(sp.e, 0.6);
  sp.edge = [];                                                        // points on the outline, where the mist leaves the body
  for (let n = 0; n < 4000 && sp.edge.length < 160; n++) {
    const x = U.rand(x0, x1), y = U.rand(0, y1), F = field(x, y);
    if (F > -0.03 && F < 0.06) sp.edge.push([x, y]);
  }
  sp.eyes = o.eyes;
  return Sprites.finish(sp, 0.25, false);
}

// ---------- an apparition standing in the forest (deer, bear) ----------
class Ghost {
  constructor(c, sp, x, z, o = {}) {
    Object.assign(this, { sp, x, z, born: c.t, life: o.life || U.rand(14, 22), flip: U.rand() < 0.5 ? -1 : 1, sc: o.sc || 1,
      vx: (o.walk || 0) * (U.rand() < 0.5 ? -1 : 1), ph: U.rand(U.TAU) });
    this.flip = this.vx ? Math.sign(this.vx) : this.flip;
  }
  rel(c) { const cam = Canopy.cam, dx = this.x - cam.x, dz = this.z - cam.z; return [dx * c.cos - dz * c.sin, dx * c.sin + dz * c.cos]; }
  alive(c) { const [, cz] = this.rel(c); return cz > 1.5 && c.t < this.born + this.life; }
  items(c, list) {
    this.x += this.vx * c.dt;
    const [cx, cz] = this.rel(c); if (cz < 1.5) return;
    list.push({ z: cz, draw: c => this.draw(c, cx, cz) });
  }
  draw(c, cx, cz) {
    const { ctx, t } = c, sp = this.sp, s = c.f / cz, sx = c.W / 2 + cx * s, sc = s / sp.k * this.sc;
    if (sx < -sp.w * sc || sx > c.W + sp.w * sc) return;
    const gy = c.hz + c.camH * s - Math.sin(t * 1.2 + this.ph) * 0.02 * s;
    const env = U.sstep(50, 36, cz) * U.sstep(2.5, 8, cz) * U.sstep(0, 3, t - this.born) * U.sstep(0, 3, this.born + this.life - t);
    if (env < 0.01) return;
    const dark = 1 - (c.P.amb[0] + c.P.amb[1] + c.P.amb[2]) / 3, I = c.I;
    const flick = 0.85 + 0.15 * U.noise(t * 2.5, this.ph);
    ctx.globalAlpha = env * 0.9 * flick; Sprites.draw(ctx, sp.b, sp, sx, gy, sc, this.flip);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, env * (c.lightAt(sx, cz) * 0.8 + 0.15)); Sprites.draw(ctx, sp.l, sp, sx, gy, sc, this.flip);
    ctx.globalAlpha = Math.min(1, env * (0.4 + 0.35 * dark + 0.35 * I) * flick); Sprites.draw(ctx, sp.e, sp, sx, gy, sc, this.flip);
    const mist = new Path2D(), ms = Math.max(0.8, 0.02 * s * this.sc);     // mist rising from the outline
    for (let i = 0; i < sp.edge.length; i += 3) {
      const [ex, ey] = sp.edge[i], u = (t * 0.25 + i * 0.137) % 1;
      mist.rect(sx + (ex + Math.sin(i + t) * 0.05 * u) * s * this.sc * this.flip, gy - (ey + u * 0.7) * s * this.sc, ms, ms);
    }
    ctx.globalAlpha = env * 0.35 * (0.5 + 0.5 * dark); ctx.fillStyle = 'rgb(200,226,218)'; ctx.fill(mist);
    for (const [ex, ey] of sp.eyes) {                                    // amber eyes
      const X = sx + ex * s * this.sc * this.flip, Y = gy - ey * s * this.sc;
      const pu = U.clamp(0.5 + 0.3 * Math.sin(t * 2.4 + this.ph) + 0.4 * AUD.high + 0.8 * AUD.kick * AUD.power, 0, 1.4);
      const d = U.clamp(0.035 * s * this.sc, 1.5, 6), g = ctx.createRadialGradient(X, Y, 0, X, Y, d * 4);
      g.addColorStop(0, `rgba(255,214,140,${0.9 * env})`); g.addColorStop(0.25, `rgba(255,170,70,${0.5 * env * pu})`); g.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(X - d * 4, Y - d * 4, d * 8, d * 8);
    }
  }
}
const spawnAhead = (dist, lat) => { const cam = Canopy.cam, s = Math.sin(cam.yaw), c = Math.cos(cam.yaw); return [cam.x + s * dist + c * lat, cam.z + c * dist - s * lat]; };
const sideOf = () => (U.rand() < 0.5 ? -1 : 1);

Canopy.creature('deer', {
  spawn(c, L) {
    const out = [], side = sideOf(), d = U.rand(26, 40), lat = side * U.rand(3, 8);
    for (let i = 0, n = U.rand() < 0.4 ? Math.floor(U.rand(2, 4)) : 1; i < n; i++) {
      const [x, z] = spawnAhead(d + U.rand(-3, 3), lat + side * U.rand(-1.5, 3));
      out.push(new Ghost(c, U.pick(L.spr.deer), x, z, { sc: U.rand(0.95, 1.15), walk: U.rand() < 0.5 ? U.rand(0.004, 0.01) : 0 }));
    }
    return out;
  }
});
Canopy.creature('bear', {
  spawn(c, L) {
    const [x, z] = spawnAhead(U.rand(24, 38), sideOf() * U.rand(3, 7));
    return [new Ghost(c, U.pick(L.spr.bear), x, z, { sc: U.rand(1.0, 1.25), walk: U.rand(0.003, 0.008) })];
  }
});
Canopy.creature('wreck', {                                             // an old car the forest has taken back
  spawn(c, L) {
    const [x, z] = spawnAhead(U.rand(30, 42), sideOf() * U.rand(3.5, 7));
    const sp = U.pick(L.spr.wreck), flip = sideOf(), born = c.t, life = 60;
    const e = new Ghost(c, sp, x, z, { life }); e.flip = flip;
    e.draw = function (c, cx, cz) {
      const { ctx } = c, s = c.f / cz, sx = c.W / 2 + cx * s, sc = s / sp.k, gy = c.hz + c.camH * s;
      const env = U.sstep(52, 40, cz) * U.sstep(2, 6, cz) * U.sstep(0, 3, c.t - born);
      ctx.globalAlpha = env; Sprites.draw(ctx, sp.b, sp, sx, gy, sc, flip);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, env * c.lightAt(sx, cz)); Sprites.draw(ctx, sp.l, sp, sx, gy, sc, flip);
    };
    return [e];
  }
});
Canopy.creature('crows', {                                             // a flock crossing high up
  spawn(c) {
    const dir = sideOf(), zr = U.rand(14, 24), birds = Array.from({ length: Math.floor(U.rand(5, 11)) }, () => ({
      x: -dir * (24 + U.rand(12)), y: U.rand(5, 11), v: U.rand(0.06, 0.1), ph: U.rand(U.TAU), s: U.rand(0.8, 1.2) }));
    return [{
      alive: () => !birds.every(b => b.x * dir > 34),
      items: (c, list) => list.push({ z: zr, draw: c => {
        const { ctx, t } = c, s = c.f / zr, path = new Path2D();
        for (const b of birds) {
          b.x += dir * b.v * (0.7 + 0.8 * c.I) * c.dt;
          const sx = c.W / 2 + (b.x - c.view * zr) * s, sy = c.hz + (c.camH - b.y) * s, w = 0.45 * s * b.s, fl = Math.sin(t * 8 + b.ph);
          if (sx < -80 || sx > c.W + 80) continue;
          path.moveTo(sx - w, sy - fl * w * 0.5);                         // wings as one curved stroke shape
          path.quadraticCurveTo(sx - w * 0.4, sy - w * 0.15 - fl * w * 0.2, sx, sy);
          path.quadraticCurveTo(sx + w * 0.4, sy - w * 0.15 - fl * w * 0.2, sx + w, sy - fl * w * 0.5);
          path.quadraticCurveTo(sx + w * 0.4, sy + w * 0.05, sx, sy + w * 0.12);
          path.quadraticCurveTo(sx - w * 0.4, sy + w * 0.05, sx - w, sy - fl * w * 0.5);
          path.moveTo(sx + dir * w * 0.25, sy); path.ellipse(sx + dir * w * 0.1, sy + w * 0.04, w * 0.28, w * 0.08, 0, 0, U.TAU);
        }
        ctx.globalAlpha = 0.85; ctx.fillStyle = U.rgba(U.mul(c.P.fog, 0.25)); ctx.fill(path);
      } })
    }];
  }
});

// ---------------------------------------------------------------------------------------------
// CREATURES LAYER — decides when something appears. More often, and closer, when the music is intense.
// ---------------------------------------------------------------------------------------------
Canopy.layer('creatures', {
  init() {
    const pale = [206, 220, 214], dark = [120, 130, 126];
    this.spr = {
      deer: [volumeSprite(DEER, { col: pale, antlers: ANTLERS, top: 2.15, eyes: [[0.76, 1.39]] }), volumeSprite(DEER, { col: pale, eyes: [[0.76, 1.39]] })],
      bear: [volumeSprite(BEAR, { col: dark, eyes: [[1.04, 0.79]] })],
      wreck: ['pickup50', 'cadillac59', 'coupe68'].map(m => paintCar(m, U.pick(PAINTS), true))
    };
    this.ents = []; this.next = 8;
  },
  items(c, list) {
    const I = c.I;
    if (AUD.drop) this.next = 0;                                       // a drop calls an apparition at once
    if (c.t > this.next && this.ents.length < 2 + 3 * I) {
      const kind = Canopy.creatures[U.weighted(CONFIG.creatures)];
      if (kind) this.ents.push(...kind.spawn(c, this));
      this.next = c.t + U.lerp(14, 4, I) * U.rand(0.7, 1.3);
    }
    this.ents = this.ents.filter(e => e.alive(c));
    for (const e of this.ents) e.items(c, list);
  }
});
