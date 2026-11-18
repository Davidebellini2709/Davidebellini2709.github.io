// CANOPY — atmosphere.js
// Sky, drifting fog, the light that filters through the trees, dust in the light, rain, film.
//
//   LIGHT   the finished frame is shrunk, the bright gaps around the sun are kept, and they are smeared
//           outward from the sun: shafts of light that the trunks cut into rays. Amber at dawn and sunset.
//           MUSIC: the rays grow with the intensity; in intense, kick-driven moments every kick pushes them;
//           a drop floods the forest with light.
//   DUST    motes floating in the light. MIDS: more of them, brighter.
//   RAIN    from the weather (sometimes none at all). HIGHS: a little heavier and faster when it rains.

// ---------------------------------------------------------------------------------------------
// SKY — gradient, sun, clouds
// ---------------------------------------------------------------------------------------------
Canopy.layer('sky', {
  init() {
    const w = 512, h = 128, cv = U.canvas(w, h), x = cv.getContext('2d'), img = x.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = U.fbm(i * 0.012, j * 0.04, 5), q = 4 * (j * w + i), s = Math.sin((i / w) * Math.PI);   // tiles horizontally
      img.data[q] = img.data[q + 1] = img.data[q + 2] = 255;
      img.data[q + 3] = U.clamp((v * s + U.fbm((w - i) * 0.012, j * 0.04, 5) * (1 - s) - 0.38) * 3) * 255;
    }
    x.putImageData(img, 0, 0); this.tex = cv; this.tinted = U.canvas(w, h);
  },
  back(c) {
    const { ctx, W, hz, P, sun, t } = c;
    const g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, U.rgba(P.sky[0])); g.addColorStop(1, U.rgba(P.sky[1]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 2);
    if (sun.pow > 0.01) {                                              // the sun (or the moon) and its halo
      const R = W * 0.6, gl = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, R);
      gl.addColorStop(0, U.rgba(P.light, 0.5 * sun.pow)); gl.addColorStop(0.12, U.rgba(P.light, 0.18 * sun.pow)); gl.addColorStop(1, U.rgba(P.light, 0));
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gl; ctx.fillRect(0, 0, W, hz + 2);
      ctx.fillStyle = U.rgba(U.mix(P.light, [255, 255, 255], 0.6), sun.pow); ctx.beginPath(); ctx.arc(sun.x, sun.y, c.H * 0.018, 0, U.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    const tx = this.tinted.getContext('2d');                           // clouds, coloured by the moment of the day
    tx.globalCompositeOperation = 'copy'; tx.drawImage(this.tex, 0, 0);
    tx.globalCompositeOperation = 'source-in'; tx.fillStyle = U.rgba(U.mul(U.mix(P.sky[0], P.fog, 0.45), 0.85)); tx.fillRect(0, 0, 512, 128);
    const cw = W * 1.6, off = U.mod(-c.view * c.f * 0.5 - t * 4, cw);
    ctx.globalAlpha = 0.4 + 0.5 * P.sun.cloudy;
    for (let x = off - cw; x < W; x += cw) ctx.drawImage(this.tinted, x, 0, cw, hz * 0.95);
    ctx.globalAlpha = 1;
  }
});

// ---------------------------------------------------------------------------------------------
// FOG DRIFT — big soft banks of mist moving slowly between the trees (the BASS swells them)
// ---------------------------------------------------------------------------------------------
Canopy.layer('fogdrift', {
  init() {
    this.spr = U.canvas(64, 64); this.lit = U.canvas(64, 64);
    this.p = Array.from({ length: 150 }, () => ({ x: U.rand(-XW / 2, XW / 2), z: U.rand(ZFAR), h: U.rand(-0.5, 4), s: U.rand(3, 12), ph: U.rand(U.TAU), v: U.rand(0.004, 0.014) }));
  },
  items(c, list) {
    const x = this.spr.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, U.rgba(c.P.fog, 1)); g.addColorStop(1, U.rgba(c.P.fog, 0));
    x.clearRect(0, 0, 64, 64); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const y = this.lit.getContext('2d'), gl = y.createRadialGradient(32, 32, 0, 32, 32, 32);
    gl.addColorStop(0, U.rgba(c.P.light, 1)); gl.addColorStop(1, U.rgba(c.P.light, 0)); y.clearRect(0, 0, 64, 64); y.fillStyle = gl; y.fillRect(0, 0, 64, 64);
    const cam = Canopy.cam, amt = (0.07 + 0.16 * c.wx.fog) * (1 + 0.8 * AUD.low);
    for (const p of this.p) {
      p.x += p.v * c.dt;
      const dx = U.wrap(p.x - cam.x, XW), dz = (U.mod(p.z - cam.z + 8, ZFAR) - 8), cx = dx * c.cos - dz * c.sin, cz = dx * c.sin + dz * c.cos;
      if (cz < 2) continue;
      list.push({ z: cz, draw: c => {
        const s = c.f / cz, sx = c.W / 2 + cx * s, w = p.s * s * (1 + 0.15 * Math.sin(c.t * 0.2 + p.ph)), sy = c.hz + (c.camH - p.h) * s;
        if (sx + w < 0 || sx - w > c.W) return;
        c.ctx.globalAlpha = amt * U.sstep(2, 6, cz); c.ctx.drawImage(this.spr, sx - w, sy - w * 0.35, w * 2, w * 0.7);
        const back = c.sun.pow * Math.exp(-(((sx - c.sun.x) / (c.W * 0.35)) ** 2)) * (0.6 + 0.6 * c.I);   // banks between us and the sun glow
        if (back > 0.02) { c.ctx.globalCompositeOperation = 'lighter'; c.ctx.globalAlpha = Math.min(1, back * amt * 0.8); c.ctx.drawImage(this.lit, sx - w, sy - w * 0.35, w * 2, w * 0.7); }
      } });
    }
  }
});

// ---------------------------------------------------------------------------------------------
// LIGHT — rays through the trees, haze (Turner), light scattered in the fog, the flash of a drop
// ---------------------------------------------------------------------------------------------
Canopy.layer('light', {
  bufs(w, h) {
    if (!this.A || this.A.width !== w || this.A.height !== h) { this.A = U.canvas(w, h); this.M = U.canvas(w, h); this.R = U.canvas(w, h); this.R2 = U.canvas(w, h); }
  },
  smear(dst, src, sx, sy, n, step) {                                    // radial smear from the sun
    const d = dst.getContext('2d'), w = dst.width, h = dst.height;
    d.globalCompositeOperation = 'copy'; d.fillStyle = '#000'; d.fillRect(0, 0, w, h);
    d.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const s = 1 + i * step; d.globalAlpha = 0.42 * (1 - i / n);
      d.drawImage(src, sx * (1 - s), sy * (1 - s), w * s, h * s);
    }
    d.globalAlpha = 1;
  },
  front(c) {
    const { ctx, W, H, sun, P, wx, I } = c, bw = Math.ceil(W / 8), bh = Math.ceil(H / 8);
    this.bufs(bw, bh);
    const A = this.A.getContext('2d');
    A.globalCompositeOperation = 'copy'; A.imageSmoothingQuality = 'high'; A.drawImage(ctx.canvas, 0, 0, bw, bh);

    // auto exposure: how bright is the frame already? bright frames get less added light, so it never burns to white
    if (!this.E) this.E = U.canvas(32, 18);
    const Ex = this.E.getContext('2d', { willReadFrequently: true }); Ex.drawImage(this.A, 0, 0, 32, 18);
    const px = Ex.getImageData(0, 0, 32, 18).data; let lum = 0;
    for (let i = 0; i < px.length; i += 4) lum += (px[i] * 0.3 + px[i + 1] * 0.55 + px[i + 2] * 0.15) / 255;
    this.lum = U.lerp(this.lum ?? 0.4, lum / 576, 0.08);
    const expo = U.lerp(1, 0.25, U.sstep(0.42, 0.72, this.lum));
    const strength = expo * 0.62 * U.clamp(sun.pow * (0.45 + 0.6 * wx.haze) * (0.55 + 0.6 * I) + AUD.kick * AUD.power * 0.35 + AUD.lift * 0.2 + Canopy.flash * 0.25, 0, 1.0);
    if (strength > 0.02) {
      const M = this.M.getContext('2d'), sx = sun.x / 8, sy = sun.y / 8;
      M.globalCompositeOperation = 'copy'; M.drawImage(this.A, 0, 0);
      M.globalCompositeOperation = 'saturation'; M.fillStyle = '#808080'; M.fillRect(0, 0, bw, bh);             // brightness only
      M.globalCompositeOperation = 'multiply'; M.drawImage(this.M, 0, 0); M.drawImage(this.M, 0, 0);     // keep only the brightest gaps
      const g = M.createRadialGradient(sx, sy, 0, sx, sy, bw * 0.8);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#000'); M.fillStyle = g; M.fillRect(0, 0, bw, bh);
      this.smear(this.R, this.M, sx, sy, 12, 0.07);
      this.smear(this.R2, this.R, sx, sy, 6, 0.025);
      const R2 = this.R2.getContext('2d');
      R2.globalCompositeOperation = 'multiply'; R2.fillStyle = U.rgba(P.light); R2.fillRect(0, 0, bw, bh);
      ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingQuality = 'high';
      for (let s = strength * 1.4; s > 0.01; s -= 1) { ctx.globalAlpha = Math.min(1, s); ctx.drawImage(this.R2, 0, 0, W, H); }
    }
    // haze: the picture softened and its lights spread, as in Turner's paintings (two scales of blur)
    if (!this.B || this.B.width !== Math.ceil(bw / 3)) this.B = U.canvas(Math.ceil(bw / 3), Math.ceil(bh / 3));
    const B = this.B.getContext('2d'); B.imageSmoothingQuality = 'high'; B.globalCompositeOperation = 'copy'; B.drawImage(this.A, 0, 0, this.B.width, this.B.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.26 + 0.24 * wx.haze; ctx.drawImage(this.A, 0, 0, W, H);
    ctx.globalAlpha = 0.18 + 0.2 * wx.haze; ctx.drawImage(this.B, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.05 + 0.07 * wx.haze) * expo; ctx.drawImage(this.A, 0, 0, W, H);
    ctx.globalAlpha = (0.04 + 0.08 * wx.haze + 0.05 * I) * expo; ctx.drawImage(this.B, 0, 0, W, H);
    // light scattered in the fog around the sun
    if (sun.pow > 0.02) {
      const g = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, W * 0.75);
      g.addColorStop(0, U.rgba(P.light, expo * sun.pow * (0.09 + 0.16 * wx.fog) * (0.7 + 0.5 * I))); g.addColorStop(1, U.rgba(P.light, 0));
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (Canopy.flash > 0.01) { ctx.globalAlpha = Canopy.flash * 0.15 * expo; ctx.fillStyle = U.rgba(P.light); ctx.fillRect(0, 0, W, H); }
    if (this.lum > 0.55) {                                               // pull very bright frames back down
      const v = Math.round(255 * U.clamp(1 - (this.lum - 0.55) * 0.9, 0.7, 1));
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(0, 0, W, H);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// DUST — motes floating in the light. MIDS: more of them, brighter.
// ---------------------------------------------------------------------------------------------
Canopy.layer('dust', {
  init() { this.p = Array.from({ length: 900 }, () => ({ x: U.rand(-XW / 2, XW / 2), y: U.rand(0.2, 6), z: U.rand(ZFAR), s: U.rand(100) })); },
  front(c) {
    const { ctx, W, f, hz, camH, sun, P, t } = c, cam = Canopy.cam, mid = AUD.mid;
    const n = Math.floor(this.p.length * (0.25 + 0.75 * mid)), paths = [new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < n; i++) {
      const m = this.p[i];
      m.x += Math.sin(t * 0.3 + m.s) * 0.003; m.y += Math.sin(t * 0.4 + m.s * 2) * 0.002;
      const dx = U.wrap(m.x - cam.x, XW), dz = (U.mod(m.z - cam.z + 8, ZFAR) - 8), cx = dx * c.cos - dz * c.sin, cz = dx * c.sin + dz * c.cos;
      if (cz < 1 || cz > 24) continue;
      const s = f / cz, sx = W / 2 + cx * s; if (sx < 0 || sx > W) continue;
      const near = Math.exp(-(((sx - sun.x) / (W * 0.45)) ** 2)), b = near * (0.5 + 0.5 * Math.sin(t * 1.3 + m.s)) ;
      const sz = U.clamp(0.012 * s, 0.8, 2.4);
      paths[b > 0.6 ? 2 : b > 0.25 ? 1 : 0].rect(sx, hz + (camH - m.y) * s, sz, sz);
    }
    const base = (0.12 + 0.5 * sun.pow) * (0.35 + 0.8 * mid);
    ctx.globalCompositeOperation = 'lighter';
    [0.25, 0.55, 1].forEach((k, i) => { ctx.fillStyle = U.rgba(P.light, base * k); ctx.fill(paths[i]); });
  }
});

// ---------------------------------------------------------------------------------------------
// RAIN — streaks and splashes, desaturated. Amount from the weather; HIGHS add to it while it rains.
// ---------------------------------------------------------------------------------------------
Canopy.layer('rain', {
  init() {
    this.d = Array.from({ length: 1000 }, () => { const l = U.rand(0.35, 1); return { x: U.rand(-0.2, 1.2), y: U.rand(), l, b: l < 0.55 ? 0 : l < 0.8 ? 1 : 2 }; });
    this.sp = Array.from({ length: 90 }, () => ({ x: 0, y: 0, life: 0 })); this.amt = 0;
  },
  front(c) {
    const { ctx, t, W, H, hz, P, wx } = c, sec = c.dt / 60;
    this.amt = U.lerp(this.amt, wx.rain > 0.02 ? U.clamp(wx.rain * (0.75 + 0.5 * AUD.high)) : 0, 0.05 * c.dt);
    if (this.amt < 0.01) return;
    const n = Math.floor(this.d.length * this.amt), lean = 0.12 + 0.1 * Math.sin(t * 0.23);
    const bright = (P.amb[0] + P.amb[1] + P.amb[2]) / 3, col = U.mul(U.mix([176, 182, 184], P.light, 0.12), 0.5 + 0.6 * bright);
    const sty = [[0.7, 9, 0.12], [1, 14, 0.18], [1.3, 22, 0.24]];
    for (let b = 0; b < 3; b++) {
      const [lw, len, al] = sty[b];
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const d = this.d[i]; if (d.b !== b) continue;
        const vy = (0.9 + d.l * 1.3) * (1 + AUD.high * 0.4) * sec;
        d.y += vy; d.x -= lean * vy * H / W;
        if (d.y > 1) { d.y = -0.03; d.x = U.rand(-0.2, 1.2); }
        if (d.x < -0.3) d.x += 1.5;
        ctx.moveTo(d.x * W + lean * len, d.y * H - len); ctx.lineTo(d.x * W, d.y * H);
      }
      ctx.strokeStyle = U.rgba(col, al * (0.6 + 0.4 * this.amt)); ctx.lineWidth = lw; ctx.stroke();
    }
    for (let i = 0, spawned = 0; i < this.sp.length && spawned < 6 * this.amt; i++) {
      const s = this.sp[i];
      if (s.life <= 0) { s.x = U.rand(W); s.y = hz + 4 + Math.pow(U.rand(), 1.6) * (H - hz) * 0.95; s.life = 1; spawned++; }
    }
    for (const s of this.sp) {
      if (s.life <= 0) continue;
      const w = 2 + (s.y - hz) / (H - hz) * 6;
      ctx.fillStyle = U.rgba(col, s.life * 0.25); ctx.fillRect(s.x - w / 2, s.y, w, 1);
      s.life -= 0.12 * c.dt;
    }
  }
});

// ---------------------------------------------------------------------------------------------
// FILM — cool shadows, warm lights, grain, vignette: the faded look of the reference photographs
// ---------------------------------------------------------------------------------------------
Canopy.layer('film', {
  init() {
    this.grain = Array.from({ length: 3 }, () => {
      const g = U.canvas(256, 256), x = g.getContext('2d'), img = x.createImageData(256, 256);
      for (let i = 0; i < img.data.length; i += 4) { img.data[i] = img.data[i + 1] = img.data[i + 2] = U.rand(255); img.data[i + 3] = 255; }
      x.putImageData(img, 0, 0); return g;
    });
  },
  front(c) {
    const { ctx, W, H } = c;
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(40,70,66,0.35)'; ctx.fillRect(0, 0, W, H);     // teal in the shadows
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgb(10,13,12)'; ctx.fillRect(0, 0, W, H);              // lifted blacks
    ctx.globalCompositeOperation = 'source-over';
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.1;
    const g = U.pick(this.grain), ox = -Math.floor(U.rand(256)), oy = -Math.floor(U.rand(256));
    for (let x = ox; x < W; x += 256) for (let y = oy; y < H; y += 256) ctx.drawImage(g, x, y);
  }
});
