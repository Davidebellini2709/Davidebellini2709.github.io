// CANOPY — core.js
// The engine. It knows nothing about trees, roads or deer: it runs MODULES and keeps the shared state
// (camera, time of day, weather, fog). Modules register themselves:
//
//   Canopy.layer(name, def)       a layer of the scene; list its name in CONFIG.scene
//   Canopy.building(name, def)    a building that can appear beside a road (road.js)
//   Canopy.creature(name, def)    something that appears in the forest (creatures.js)
//
// A layer is an object with any of these optional functions:
//   init()            build its sprites and particles once
//   back(c)           draw behind everything
//   items(c, list)    push things that must be sorted by distance: list.push({ z, draw(c) {...} })
//   front(c)          draw on top of the finished scene
// `c` is the frame context: c.ctx, c.t (seconds), c.dt, c.W, c.H, c.hz (horizon y), c.f (focal length),
// c.camH (eye height), c.cos / c.sin (camera rotation), c.P (current colours of the day), c.wx (weather),
// c.sun, c.I (music intensity). Sound readings are in AUD.
//
// Fog is built in: while the sorted items are drawn, a thin veil of fog is laid over the whole picture at
// fixed distances, so far things pass through more veils than near ones. No horizontal fog band.

const ZFAR = CONFIG.world.depth,
  XW = CONFIG.world.width;
const FOG_BREAKS = [
  58, 50, 43, 37, 32, 27.5, 23.5, 20, 17, 14.3, 12, 10, 8.2, 6.6, 5.2, 4,
];

const Canopy = {
  layers: {},
  buildings: {},
  creatures: {},
  cam: { x: 0, z: 0, yaw: 0, vx: 0, speed: 0.03 },
  wave: { r: 999, a: 0 },
  flash: 0,
  avoid: 0,
  look: 0,
  P: null,
  phaseLabel: "",
  wx: { rain: 0, fog: 0.5, haze: 0.5, breaks: 0 },
  force: {},
  clearings: [],
  fogD: 20,
  ready: false,
  phaseOffset: 0,
  q: 1,
  fps: 60,
  qT: 0,
  lodPts: 1,

  layer(name, def) {
    this.layers[name] = def;
  },
  building(name, def) {
    this.buildings[name] = def;
  },
  creature(name, def) {
    this.creatures[name] = def;
  },

  // ---------- time of day: hold each moment, then blend into the next ----------
  phase(t) {
    const names = CONFIG.cycle.filter((n) => PHASES[n]);
    const u = U.mod(
      (t / CONFIG.cycleSeconds) * names.length + this.phaseOffset,
      names.length,
    );
    const i = Math.floor(u),
      a = PHASES[names[i]],
      b = PHASES[names[(i + 1) % names.length]],
      m = U.sstep(0.6, 1, u - i);
    const L = (x, y) =>
      Array.isArray(x)
        ? Array.isArray(x[0])
          ? x.map((v, j) => U.mix(v, y[j], m))
          : U.mix(x, y, m)
        : typeof x === "object"
          ? Object.fromEntries(Object.keys(x).map((k) => [k, L(x[k], y[k])]))
          : U.lerp(x, y, m);
    this.P = L(a, b);
    this.phaseLabel =
      m > 0.02 ? `${names[i]} > ${names[(i + 1) % names.length]}` : names[i];
  },

  // ---------- weather: each element drifts on its own slow noise ----------
  weather(t) {
    const n = (s, sp) => U.fbm(s, t * sp, 3),
      W = this.wx,
      F = this.force;
    W.rain =
      F.rain ??
      U.sstep(0.5, 0.6, n(3.1, 0.008)) *
        (0.3 + 0.7 * U.sstep(0.3, 0.7, n(7.7, 0.03))); // often none at all
    W.fog = F.fog ?? U.clamp(0.3 + 1.0 * (n(11.3, 0.012) - 0.3)); // always some
    W.haze = F.haze ?? U.clamp(0.15 + 1.2 * (n(19.9, 0.015) - 0.3));
    W.breaks = F.breaks ?? U.sstep(0.38, 0.62, n(23.5, 0.02)); // gaps in the clouds
  },

  // ---------- camera: walks forward, wanders sideways and TURNS toward where it is going ----------
  moveCamera(t, dt) {
    const C = CONFIG.camera,
      cam = this.cam,
      I = AUD.intensity;
    cam.speed = U.lerp(
      cam.speed,
      C.walk + I * C.run + AUD.lift * C.surge,
      0.03 * dt,
    );
    const v = (cam.speed + AUD.kick * AUD.power * C.kickPush) * dt;
    const calm = 1 - Math.min(1, Math.abs(this.look) * 5); // while looking at a building the wandering stops
    const vxT =
      (U.noise(t * 0.06, 3.3) - 0.5) * 2 * C.wander * cam.speed * calm +
      this.avoid;
    cam.vx = U.lerp(cam.vx, vxT, 0.02 * dt);
    cam.x += cam.vx * dt;
    cam.z += v;
    const yawT =
      Math.atan2(cam.vx, Math.max(0.01, cam.speed)) * 0.9 +
      (U.noise(t * 0.04, 8.1) - 0.5) *
        2 *
        C.look *
        (1 - Math.min(1, Math.abs(this.look) * 4)) +
      this.look;
    cam.yaw = U.lerp(cam.yaw, U.clamp(yawT, -0.4, 0.4), 0.025 * dt);
  },

  // how much the forest is cleared at a world position (roads and lots), 0..1
  cleared(wx, wz) {
    let m = 0;
    for (const fn of this.clearings) m = Math.max(m, fn(wx, wz));
    return m;
  },
  waveAt(cz) {
    const d = cz - this.wave.r;
    return this.wave.a * Math.exp((-d * d) / 14);
  },

  start() {
    for (const n of CONFIG.scene) {
      const l = this.layers[n];
      if (l && l.init) l.init();
    }
    this.ready = true;
  },

  fogSlice(c, i) {
    const { ctx, W, hz, f, camH, P } = c,
      b = FOG_BREAKS[i],
      prev = i === 0 ? b + 30 : FOG_BREAKS[i - 1];
    const a = 1 - Math.exp(-(prev - b) / this.fogD);
    const yk = hz + (camH * f) / b,
      yn = hz + (camH * f) / (FOG_BREAKS[i + 1] || b * 0.7),
      yb = Math.min(c.H * 1.5, yn);
    const g = ctx.createLinearGradient(0, 0, 0, yb),
      col = P.fog;
    g.addColorStop(0, U.rgba(col, 0.72));
    g.addColorStop(U.clamp(hz / yb), U.rgba(col, 1));
    g.addColorStop(U.clamp(yk / yb), U.rgba(col, 1));
    g.addColorStop(1, U.rgba(col, 0));
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, yb);
    const mh = (1.6 * f) / b,
      gm = ctx.createLinearGradient(0, yk - mh, 0, yk + mh * 0.4); // ground mist band at this distance
    gm.addColorStop(0, U.rgba(col, 0));
    gm.addColorStop(0.7, U.rgba(col, 1));
    gm.addColorStop(1, U.rgba(col, 0));
    ctx.globalAlpha = Math.min(1, a * (1.2 + 1.5 * this.wx.fog));
    ctx.fillStyle = gm;
    ctx.fillRect(0, yk - mh, W, mh * 1.4);
    ctx.globalAlpha = 1;
  },

  frame() {
    const ctx = drawingContext,
      t = millis() / 1000,
      dt = U.clamp((deltaTime || 16.7) / 16.67, 0.25, 3);
    AUD.update(dt);
    this.fps = U.lerp(this.fps, frameRate() || 60, 0.03); // adaptive resolution: keeps it smooth on slower machines
    if (t - this.qT > 3) {
      this.qT = t;
      if (this.fps < 40 && this.q > 0.5) {
        this.q = Math.max(0.5, this.q - 0.1);
        windowResized();
      } else if (this.fps > 57 && this.q < 1) {
        this.q = Math.min(1, this.q + 0.05);
        windowResized();
      }
      this.lodPts = 1 + (1 - this.q) * 4; // fewer points per tree when it struggles
    }
    this.phase(t);
    this.weather(t);
    this.moveCamera(t, dt);
    if (typeof HeadTrack !== "undefined") HeadTrack.update(dt);
    const P = this.P,
      I = AUD.intensity,
      cam = this.cam;

    if (AUD.hit && AUD.power > 0.2) {
      this.wave.r = 0;
      this.wave.a = AUD.power;
    } // a ring of light, only when it is intense
    this.wave.r += 0.9 * dt;
    this.wave.a *= Math.pow(0.97, dt);
    if (AUD.drop) this.flash = 1;
    this.flash *= Math.pow(0.95, dt);
    this.fogD = U.lerp(
      28,
      7,
      U.clamp(this.wx.fog * (1 - 0.3 * I) + 0.12 * AUD.low),
    );

    const H = this.head || { yaw: 0, pitch: 0 }; // head tracking (headtrack.js): looks around, never moves
    const f =
      height * 0.8 * (1 + AUD.kick * AUD.power * 0.035 + AUD.lift * 0.02);
    const hz = height * 0.6 + Math.tan(H.pitch) * f,
      view = U.clamp(cam.yaw + H.yaw, -0.85, 0.85);
    const rel = U.clamp(P.sun.az - view, -1.3, 1.3);
    const sun = {
      x: width / 2 + Math.tan(rel) * f,
      y: hz - Math.tan(P.sun.el) * f,
      el: P.sun.el,
      pow: P.sun.power * (1 - P.sun.cloudy * (1 - this.wx.breaks)),
    };
    Sprites.update(P.amb, P.light);

    const c = {
      ctx,
      t,
      dt,
      W: width,
      H: height,
      hz,
      f,
      camH: 1.7 + Math.sin(t * 0.8) * 0.025,
      P,
      wx: this.wx,
      sun,
      I,
      view,
      cos: Math.cos(view),
      sin: Math.sin(view),
    };
    const spread = width * (0.5 + 2 * Math.max(0, sun.el));
    // how much a thing at screen x and distance cz catches the light (backlight + the kick ring + the drop flash)
    c.lightAt = (sx, cz) =>
      0.78 *
        sun.pow *
        (0.3 + 0.7 * Math.exp(-(((sx - sun.x) / spread) ** 2))) *
        (0.75 + 0.5 * I) +
      0.05 +
      this.waveAt(cz) * 0.9 +
      this.flash * 0.6;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    const active = CONFIG.scene.map((n) => this.layers[n]).filter(Boolean);
    for (const l of active)
      if (l.back) {
        ctx.save();
        l.back(c);
        ctx.restore();
      }
    const list = [];
    for (const l of active) if (l.items) l.items(c, list);
    list.sort((a, b) => b.z - a.z); // far to near, with veils of fog in between
    let bi = 0;
    for (const it of list) {
      while (bi < FOG_BREAKS.length && it.z < FOG_BREAKS[bi])
        this.fogSlice(c, bi++);
      it.draw(c);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    while (bi < FOG_BREAKS.length) this.fogSlice(c, bi++);
    for (const l of active)
      if (l.front) {
        ctx.save();
        l.front(c);
        ctx.restore();
      }
    if (typeof HeadTrack !== "undefined") HeadTrack.draw(ctx);
    const w = this.wx;
    AUD.hud(ctx, [
      `time of day  ${this.phaseLabel}`,
      `rain ${w.rain.toFixed(2)}  fog ${w.fog.toFixed(2)}  haze ${w.haze.toFixed(2)}  sun ${sun.pow.toFixed(2)}`,
      `items ${list.length}  ${(this.layers.road && this.layers.road.label) || ""}`,
    ]);
  },
};

// ---------- p5 entry points ----------
function holderEl() {
  return document.getElementById("sketch-holder") || document.body;
}
function targetSize() {
  // internal size (capped) and the size shown on the page
  const h = holderEl(),
    full = document.fullscreenElement === h;
  const cw = full
    ? window.innerWidth
    : Math.max(320, h.clientWidth || window.innerWidth);
  const ch = full ? window.innerHeight : Math.round((cw * 9) / 16);
  const s = Math.min(1, CONFIG.render.maxWidth / cw) * Canopy.q;
  return [Math.round(cw * s), Math.round(ch * s)];
}
function fitCanvas() {
  const el = drawingContext.canvas,
    full = !!document.fullscreenElement;
  el.style.display = "block";
  el.style.width = "100%";
  el.style.height = full ? "100%" : "auto";
  el.style.objectFit = "contain";
}
function setup() {
  const [w, h] = targetSize();
  createCanvas(w, h);
  pixelDensity(1);
  holderEl().appendChild(drawingContext.canvas); // works with p5 1.x and 2.x
  holderEl().style.position = "relative";
  holderEl().style.background = "#05080a";
  fitCanvas();
  holderEl().addEventListener("dragover", (e) => e.preventDefault());
  holderEl().addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      AUD.useFile(file);
      if (Canopy.gate) Canopy.gate.remove();
    }
  });
  document.addEventListener("fullscreenchange", windowResized);
  makeGate();
}
let bootFrames = 0;
function draw() {
  if (!Canopy.ready) {
    // first frame: show a message, second frame: build the forest
    const ctx = drawingContext;
    ctx.fillStyle = "#05080a";
    ctx.fillRect(0, 0, width, height);
    if (++bootFrames === 2) {
      Canopy.start();
      if (Canopy.onReady) Canopy.onReady();
    }
    return;
  }
  Canopy.frame();
}
function windowResized() {
  const [w, h] = targetSize();
  resizeCanvas(w, h);
  fitCanvas();
}
function overCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}
function toggleFullscreen() {
  const h = holderEl();
  if (document.fullscreenElement) document.exitFullscreen();
  else if (h.requestFullscreen) h.requestFullscreen();
}
function mousePressed() {
  if (AUD.ac) AUD.ensureCtx();
}
function doubleClicked() {
  if (overCanvas()) toggleFullscreen();
}
function keyPressed() {
  // keys act only while the pointer is over the canvas
  if (!overCanvas()) return;
  const k = (key || "").toLowerCase();
  if (k === " " && AUD.snd) {
    AUD.snd.paused ? AUD.snd.play() : AUD.snd.pause();
    return false;
  }
  if (k === "f") toggleFullscreen();
  if (k === "h") AUD.showHUD = !AUD.showHUD;
  if (k === "m") AUD.useMic();
  if (k === "s") AUD.useSim();
  if (k === "c" && typeof HeadTrack !== "undefined") HeadTrack.toggle();
  if (k === "+" || k === "=") AUD.sens *= 1.15;
  if (k === "-") AUD.sens /= 1.15;
}

// ---------- start screen: one PLAY button (browsers allow sound only after a click) ----------
function makeGate() {
  const d = document.createElement("div");
  d.style.cssText =
    'position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(4,8,8,.55);color:#ece8da;font-family:Georgia,"Times New Roman",serif';
  d.innerHTML =
    '<button id="gGo" disabled style="font:inherit;letter-spacing:.3em;font-size:15px;padding:16px 44px;border:1px solid rgba(255,190,110,.8);background:rgba(255,190,110,.1);color:#ece8da;cursor:pointer">PLAY</button>' +
    '<div id="gMsg" style="font-size:12px;opacity:.65;min-height:1.2em">growing the forest…</div>';
  holderEl().appendChild(d);
  Canopy.gate = d;
  const msg = d.querySelector("#gMsg"),
    go = d.querySelector("#gGo");
  Canopy.onReady = () => {
    go.disabled = false;
    msg.textContent = "";
  };
  go.onclick = () => {
    go.disabled = true;
    msg.textContent = "loading…";
    // the sound system is switched on inside the click (Safari demands it), then the whole mp3 is downloaded
    // and decoded: this works the same in every browser and with any server (Safari's <audio> can hang on local ones)
    AUD.ensureCtx();
    const fail = (t) => {
      go.disabled = false;
      msg.textContent = t;
    };
    fetch(CONFIG.track)
      .then(async (r) => {
        if (!r.ok)
          throw new Error(r.status === 404 ? "missing" : "http " + r.status);
        const total = +r.headers.get("content-length") || 0;
        if (!r.body || !total) return r.arrayBuffer();
        const rd = r.body.getReader(),
          parts = [];
        let got = 0; // read it in pieces to show the progress
        for (;;) {
          const { done, value } = await rd.read();
          if (done) break;
          parts.push(value);
          got += value.length;
          msg.textContent =
            "loading the track… " + Math.round((got / total) * 100) + "%";
        }
        const all = new Uint8Array(got);
        let o = 0;
        for (const p of parts) {
          all.set(p, o);
          o += p.length;
        }
        return all.buffer;
      })
      .then((b) => {
        msg.textContent = "preparing the sound…";
        return AUD.ac.decodeAudioData(b);
      })
      .then((buf) => {
        AUD.playBuffer(buf);
        d.remove();
      })
      .catch((e) =>
        fail(
          e.message === "missing"
            ? "mp3 not found next to the page (" +
                CONFIG.track +
                "): drop an audio file on the canvas"
            : "could not play " +
                CONFIG.track +
                " (" +
                (e.message || e.name) +
                ")",
        ),
      );
  };
}
