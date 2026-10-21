// CANOPY v6 — dreamy rainy forest, projected live during an electronic set.
// Palette: dark emerald, rust orange, overcast grey. Everything is made of particles.
//
// SPACE      A simulated 3D forest. The camera advances forever toward the horizon and drifts left/right at random.
//            The trees are a fixed set that comes back in front of the camera once it has passed them.
// ATMOSPHERE Overcast sky with a faint orange glow behind the clouds, constant fog, an orange particle "wind" in the air,
//            undergrowth made of irregular particle clouds, rain.
// APPARITIONS Every so often: abandoned cars, deer and bears with luminous orange eyes, crows, and the Misty Cove Diner
//            on its road. All are particle clouds with a light mesh displacement.
//
// SOUND (five readings, one family of elements each)
//   KICK    orange glow behind the clouds + a light displacement of the particles (always subtle)
//   BASS    fog and undergrowth particles get denser
//   MIDS    orange wind-particle cloud (speed and amount, inside fixed limits)
//   HIGHS   more rain segments, tree outlines and the eyes of the apparitions glow
//   ENERGY  pulsing camera advance, stronger apparitions, wider left-right drift

const TRACK =
  "Mall Grab - Liverpool Street In The Rain [LFT001] - (320 Kbps).mp3"; // put this mp3 in the same folder as index.html; PLAY loads it by itself
const cv = (g) => g.elt || g.canvas; // works with p5 1.x and 2.x graphics

// ====================================================================================================
//  AUDIO ENGINE — five normalised readings: kick, bass, mid, high, energy (all 0..1)
// ====================================================================================================
const AUD = {
  mode: "sim",
  fft: null,
  mic: null,
  snd: null,
  kick: 0,
  bass: 0,
  mid: 0,
  high: 0,
  energy: 0,
  spec: new Array(64).fill(0),
  sens: 1,
  bpm: 128,
  showHUD: false, // press H for the debug bars
  pk: { lo: 0.25, bs: 0.25, md: 0.25, hi: 0.25 }, // slow-decaying peaks: any track loudness ends up in 0..1
  _ph: 0,
  _on: 1,
  _avgLo: 0,
  _lk: 0,
  _slow: 0.3,
  _eMin: 0.1,
  _eMax: 0.5,

  ac: null,
  an: null,
  freq: null,
  srcNode: null,
  stream: null,
  init() {},
  ensureCtx() {
    // created on the first click (browsers require a gesture)
    if (!this.ac) {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.an = this.ac.createAnalyser();
      this.an.fftSize = 2048;
      this.an.smoothingTimeConstant = 0.7;
      this.freq = new Uint8Array(this.an.frequencyBinCount);
    }
    if (this.ac.state === "suspended") this.ac.resume();
  },
  stopInputs() {
    if (this.snd) {
      this.snd.pause();
      this.snd = null;
    }
    if (this.srcNode) {
      try {
        this.srcNode.disconnect();
      } catch (e) {}
      this.srcNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.mic = null;
  },
  useSim() {
    this.stopInputs();
    this.mode = "sim";
  },
  useMic() {
    this.ensureCtx();
    this.stopInputs();
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((st) => {
        this.stream = st;
        this.mic = true;
        this.srcNode = this.ac.createMediaStreamSource(st);
        this.srcNode.connect(this.an); // analysed only, never played back (no feedback)
        this.mode = "mic";
      })
      .catch(() => {
        this.mode = "sim";
      });
  },
  playElement(a) {
    // an <audio> element: analysed and played
    this.ensureCtx();
    this.stopInputs();
    this.srcNode = this.ac.createMediaElementSource(a);
    this.srcNode.connect(this.an);
    this.srcNode.connect(this.ac.destination);
    this.snd = a;
    this.mode = "file";
  },
  useFile(f) {
    // an audio file dropped on the canvas
    const file = f && (f.file || f);
    if (!file || !(f.type === "audio" || (file.type || "").startsWith("audio")))
      return;
    const a = new Audio(URL.createObjectURL(file));
    a.loop = true;
    this.playElement(a);
    a.play();
  },
  key(k) {
    k = k.toLowerCase();
    if (k === "h") this.showHUD = !this.showHUD;
    if (k === "m") this.useMic();
    if (k === "s") this.useSim();
    if (k === "+" || k === "=") this.sens *= 1.15;
    if (k === "-") this.sens /= 1.15;
  },
  norm(key, v) {
    // divide by a slowly decaying peak
    this.pk[key] = max(v, this.pk[key] * 0.9993, 0.08);
    return constrain((v / this.pk[key]) * this.sens, 0, 1);
  },

  update() {
    const t = millis() / 1000;
    let lo, bs, md, hi; // raw readings 0..1
    if (this.mode === "sim" || !this.an) {
      // 128 BPM beat with a breakdown every 4th phrase
      const bp = (t * this.bpm) / 60,
        ph = bp % 1;
      this._ph = ph;
      const sec = floor(bp / 32) % 4;
      this._on = lerp(this._on, sec === 1 ? 0.12 : 1, 0.02);
      const kickE = pow(1 - ph, 3),
        hatE = floor(bp * 2) % 2 === 1 ? pow(1 - ((bp * 2) % 1), 4) : 0;
      lo = kickE * this._on;
      bs = (0.45 + 0.2 * sin(t * 0.5)) * this._on;
      md = (0.35 + 0.25 * sin(t * 0.9)) * this._on * (0.7 + 0.3 * kickE);
      hi = hatE * (0.25 + 0.75 * this._on);
      for (let i = 0; i < 64; i++) {
        const base = i < 8 ? lo : i < 28 ? md : hi;
        this.spec[i] = constrain(
          base * (0.4 + 0.9 * noise(i * 0.3, t * 3)),
          0,
          1,
        );
      }
    } else {
      this.an.getByteFrequencyData(this.freq);
      const fr = this.freq,
        binHz = this.ac.sampleRate / this.an.fftSize;
      const band = (f0, f1) => {
        // average energy in a frequency range, 0..1
        const i0 = max(1, floor(f0 / binHz)),
          i1 = min(fr.length - 1, ceil(f1 / binHz));
        let sum = 0;
        for (let i = i0; i <= i1; i++) sum += fr[i];
        return sum / (i1 - i0 + 1) / 255;
      };
      lo = band(40, 120);
      bs = band(30, 250);
      md = band(300, 3000);
      hi = band(5000, 14000);
      for (let i = 0; i < 64; i++) {
        const idx = floor(pow(i / 64, 1.8) * 300) + 2;
        this.spec[i] = constrain(((fr[idx] || 0) / 255) * this.sens, 0, 1);
      }
    }
    lo = this.norm("lo", lo);
    bs = pow(this.norm("bs", bs), 1.25);
    md = pow(this.norm("md", md), 1.2);
    hi = constrain(pow(this.norm("hi", hi), 0.95) * 1.2, 0, 1); // power curves: peaks stand out

    // KICK: a short impulse, detected on the low band
    let trig = false;
    if (this.mode === "sim" || !this.an)
      trig = this._ph < (this._pp ?? 1) && this._on > 0.3;
    else {
      this._avgLo = lerp(this._avgLo, lo, 0.05);
      if (
        lo > this._avgLo * 1.18 + 0.06 &&
        lo - (this._pl ?? 0) > 0.025 &&
        lo > 0.3 &&
        millis() - this._lk > 170
      ) {
        trig = true;
        this._lk = millis();
      }
      this._pl = lo;
    }
    this._pp = this._ph;
    this.kick = max(this.kick * 0.86, trig ? 1 : 0);

    // BASS: slow swell (heavy smoothing, so single kicks are mostly averaged out)
    this.bass = lerp(this.bass, bs, 0.09);
    // MIDS and HIGHS: quicker attack, soft release
    this.mid = lerp(this.mid, md, md > this.mid ? 0.4 : 0.1);
    this.high = lerp(this.high, hi, hi > this.high ? 0.7 : 0.2);

    // ENERGY: overall level of the track, very slow, re-scaled to its own recent range
    const mix = 0.5 * bs + 0.3 * md + 0.2 * hi;
    this._slow = lerp(this._slow, mix, 0.006);
    this._eMax = max(this._slow, this._eMax * 0.9998);
    this._eMin = min(
      this._slow,
      this._eMin + (this._eMax - this._eMin) * 0.0002,
    );
    this.energy = constrain(
      (this._slow - this._eMin) / max(0.12, this._eMax - this._eMin),
      0,
      1,
    );
  },

  hud() {
    if (!this.showHUD) return;
    push();
    noStroke();
    textAlign(LEFT, TOP);
    textFont("monospace");
    textSize(11);
    fill(10, 16, 12, 120);
    rect(8, 8, 300, 112, 3);
    const bar = (v) =>
      "█".repeat(round(constrain(v, 0, 1) * 14)).padEnd(14, "·");
    fill(236, 150, 60, 225);
    text(
      `CANOPY // SRC:${this.mode.toUpperCase()} // SENS:${this.sens.toFixed(2)} // FPS:${round(frameRate())}`,
      16,
      16,
    );
    text(
      `KICK   ${bar(this.kick)}\nBASS   ${bar(this.bass)}\nMIDS   ${bar(this.mid)}\nHIGHS  ${bar(this.high)}\nENERGY ${bar(this.energy)}`,
      16,
      34,
    );
    fill(150, 175, 160, 170);
    text(
      "[M] mic  [S] simulated beat  [drop] audio file  [space] pause  [F] fullscreen  [+/-] sensitivity  [H] hud",
      16,
      height - 20,
    );
    pop();
  },
};

// ====================================================================================================
//  FX — fog tint, vignette, film grain
// ====================================================================================================
const FX = {
  grain: [],
  vig: null,
  fog: null,
  init() {
    this.resize();
    for (let k = 0; k < 4; k++) {
      const g = createGraphics(256, 256);
      g.pixelDensity(1);
      g.loadPixels();
      for (let i = 0; i < g.pixels.length; i += 4) {
        g.pixels[i] = g.pixels[i + 1] = g.pixels[i + 2] = random(255);
        g.pixels[i + 3] = 255;
      }
      g.updatePixels();
      this.grain.push(g);
    }
  },
  resize() {
    const w = width,
      h = height;
    this.vig = createGraphics(w, h);
    this.vig.pixelDensity(1);
    let c = this.vig.drawingContext;
    let g = c.createRadialGradient(
      w / 2,
      h / 2,
      min(w, h) * 0.3,
      w / 2,
      h / 2,
      max(w, h) * 0.7,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.45)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    this.fog = createGraphics(w, h);
    this.fog.pixelDensity(1);
    c = this.fog.drawingContext;
    g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(16,60,44,0)");
    g.addColorStop(0.5, "rgba(16,60,44,0.5)");
    g.addColorStop(0.9, "rgba(16,60,44,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  },
  draw(grain = 22, fog = 0.18) {
    push();
    tint(255, 255 * fog);
    image(this.fog, 0, sin(frameCount * 0.008) * 14);
    tint(255, 255);
    image(this.vig, 0, 0);
    blendMode(OVERLAY);
    tint(255, grain);
    const g = random(this.grain),
      ox = -floor(random(256)),
      oy = -floor(random(256));
    for (let x = ox; x < width; x += 256)
      for (let y = oy; y < height; y += 256) image(g, x, y);
    pop();
  },
};

// ====================================================================================================
//  WORLD
// ====================================================================================================
const ZFAR = 60,
  XW = 70; // the forest is periodic: 70 wide, 60 deep
const TREE_DARK = [8, 30, 22],
  FOG = [108, 122, 114]; // dark emerald, overcast grey-green
const ORANGE = [236, 138, 44];
let trees = [],
  motes = [],
  ents = [],
  drops = [],
  splashes = [],
  puffs = [],
  fogs = [];
let camX = 0,
  camZ = 0,
  heading = 0,
  speed = 0,
  nextEv = 3,
  lastDiner = -99,
  rainAmt = 0.4,
  pulse = 0;
let skyBase, clouds, mist, fogSpr, glowSpr, hz;
let prevHit = false,
  beatN = 0,
  lod = 1,
  vlat = 0,
  vtarget = 0,
  nextWeave = 2,
  dodgeCd = 0,
  roll = 0; // lod: automatic quality scaling

const wrapC = (v, p) => ((((v + p / 2) % p) + p) % p) - p / 2;
const smooth = (v) => {
  v = constrain(v, 0, 1);
  return v * v * (3 - 2 * v);
};
const foggy = (zr) =>
  constrain(pow(zr / ZFAR, 0.75) * (1.25 - AUD.energy * 0.15), 0, 1);

function holderEl() {
  return document.getElementById("sketch-holder") || document.body;
}
function holderSize() {
  // 16:9 inside the page; the whole screen in fullscreen
  const h = holderEl();
  if (document.fullscreenElement === h)
    return [window.innerWidth, window.innerHeight];
  const w = max(320, floor(h.clientWidth || window.innerWidth));
  return [w, floor((w * 9) / 16)];
}
function setup() {
  const [w0, h0] = holderSize();
  const c = createCanvas(w0, h0);
  pixelDensity(1);
  c.parent(holderEl());
  c.elt.style.display = "block";
  c.elt.style.maxWidth = "100%";
  holderEl().style.position = "relative";
  holderEl().style.background = "#101814";
  if (c.drop) c.drop((f) => AUD.useFile(f));
  document.addEventListener("fullscreenchange", onResize);
  AUD.init();
  FX.init();
  buildBackdrop();
  makeGate();
  for (let i = 0; i < 230; i++) trees.push(makeTree());
  for (let i = 0; i < 1100; i++)
    motes.push({
      x: random(-XW / 2, XW / 2),
      y: random(0.2, 5),
      z: random(ZFAR),
      s: random(100),
      th: random(),
    });
  for (let i = 0; i < 750; i++) {
    const l = random(0.35, 1);
    drops.push({
      x: random(-0.2, 1.2) * width,
      y: random(height),
      l,
      b: l < 0.55 ? 0 : l < 0.8 ? 1 : 2,
    });
  }
  for (let i = 0; i < 90; i++) splashes.push({ x: 0, y: 0, life: 0 });
  // undergrowth: irregular clouds of particles, in clumps of different size and colour
  for (let c = 0; c < 480; c++) {
    const cx = random(-XW / 2, XW / 2),
      cz = random(ZFAR),
      tone = random(),
      spread = random(1.2, 3.8),
      cs = random(0.07, 0.24);
    const n = floor(random(28, 50));
    for (let i = 0; i < n; i++)
      puffs.push({
        cx,
        cz,
        tone,
        ox: (random() + random() - 1) * spread,
        oz: (random() + random() - 1) * spread,
        h: pow(random(), 1.6) * random(0.6, 1.9),
        s: cs * random(0.6, 1.4),
        ph: random(TWO_PI),
        th: random(),
      });
  }
  for (let i = 0; i < 220; i++)
    fogs.push({
      x: random(-XW / 2, XW / 2),
      z: random(ZFAR),
      h: random(0.1, 3.2),
      s: random(0.5, 1.5),
      ph: random(TWO_PI),
      th: random(),
    });
}
function onResize() {
  const [w, h] = holderSize();
  resizeCanvas(w, h);
  FX.resize();
  buildBackdrop();
}
function windowResized() {
  onResize();
}
function mousePressed() {
  if (AUD.ac) AUD.ensureCtx();
}
function toggleFullscreen() {
  const h = holderEl();
  if (document.fullscreenElement) document.exitFullscreen();
  else if (h.requestFullscreen) h.requestFullscreen();
}
function doubleClicked() {
  if (overCanvas()) toggleFullscreen();
}
function overCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}
function keyPressed() {
  // keys only act while the pointer is over the canvas, so the page keeps working
  if (!overCanvas()) return;
  if (key === " " && AUD.snd) {
    AUD.snd.paused ? AUD.snd.play() : AUD.snd.pause();
    return false;
  }
  if (key === "f" || key === "F") {
    toggleFullscreen();
    return false;
  }
  AUD.key(key);
}

// ---------- start screen: browsers allow audio only after a click ----------
function startTrack(cb) {
  const a = new Audio();
  a.loop = true;
  a.preload = "auto";
  a.addEventListener("error", () => cb(false), { once: true });
  a.addEventListener(
    "canplay",
    () => {
      AUD.playElement(a);
      a.play()
        .then(() => cb(true))
        .catch(() => cb(false));
    },
    { once: true },
  );
  a.src = TRACK;
}
function makeGate() {
  // start screen: just PLAY, it loads the linked mp3 by itself
  if (typeof document === "undefined") return;
  const d = document.createElement("div");
  d.style.cssText =
    'position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(10,18,14,.6);color:#ece8da;font-family:Georgia,"Times New Roman",serif';
  d.innerHTML =
    '<button id="gGo" style="font:inherit;letter-spacing:.3em;font-size:15px;padding:16px 44px;border:1px solid rgba(236,150,60,.8);background:rgba(236,150,60,.1);color:#ece8da;cursor:pointer">PLAY</button>' +
    '<div id="gMsg" style="font-size:12px;opacity:.65;min-height:1.2em"></div>';
  holderEl().appendChild(d);
  const msg = d.querySelector("#gMsg"),
    go = d.querySelector("#gGo");
  go.onclick = () => {
    go.disabled = true;
    msg.textContent = "loading…";
    startTrack((ok) => {
      if (ok) d.remove();
      else {
        go.disabled = false;
        msg.textContent =
          "mp3 not found next to the page: drop an audio file on it";
      }
    });
  };
}

// ---------- geometry helpers ----------
function sampleLine(a, b, dens, out) {
  const n = max(1, floor(Math.hypot(b[0] - a[0], b[1] - a[1]) * dens));
  for (let i = 0; i < n; i++) {
    const u = (i + random()) / n;
    out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
  }
}
function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      c = !c;
  }
  return c;
}
function fillPoly(poly, count, out) {
  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  for (const p of poly) {
    x0 = min(x0, p[0]);
    x1 = max(x1, p[0]);
    y0 = min(y0, p[1]);
    y1 = max(y1, p[1]);
  }
  let got = 0,
    tries = 0;
  while (got < count && tries < count * 60) {
    tries++;
    const x = random(x0, x1),
      y = random(y0, y1);
    if (inPoly(x, y, poly)) {
      out.push([x, y]);
      got++;
    }
  }
}

// ---------- backdrop: dark overcast sky, clouds that let an orange glow through, horizon mist ----------
function buildBackdrop() {
  const hf = 0.56;
  hz = height * hf;
  skyBase = createGraphics(width, height);
  skyBase.pixelDensity(1);
  let c = skyBase.drawingContext,
    g = c.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "rgb(18,26,26)");
  g.addColorStop(0.3, "rgb(48,58,57)");
  g.addColorStop(hf, "rgb(104,116,110)");
  g.addColorStop(hf + 0.001, "rgb(70,84,76)");
  g.addColorStop(0.72, "rgb(20,34,28)");
  g.addColorStop(1, "rgb(6,12,9)");
  c.fillStyle = g;
  c.fillRect(0, 0, width, height);

  // clouds on a transparent layer: the orange glow is painted between the sky and this layer, so it shows through the gaps
  const cw = 170,
    ch = 48,
    cg = createGraphics(cw, ch);
  cg.pixelDensity(1);
  cg.loadPixels();
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const v =
          noise(x * 0.04, y * 0.11) * 0.65 +
          noise(x * 0.12 + 40, y * 0.25) * 0.35,
        i = 4 * (y * cw + x);
      const light = v > 0.52;
      cg.pixels[i] = light ? 150 : 22;
      cg.pixels[i + 1] = light ? 160 : 32;
      cg.pixels[i + 2] = light ? 156 : 31;
      cg.pixels[i + 3] = light ? (v - 0.52) * 300 : (0.52 - v) * 400;
    }
  cg.updatePixels();
  clouds = createGraphics(floor(width * 1.14), floor(hz));
  clouds.pixelDensity(1);
  c = clouds.drawingContext;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(cv(cg), 0, 0, clouds.width, clouds.height);

  fogSpr = createGraphics(64, 64);
  fogSpr.pixelDensity(1); // soft round sprite for the fog particles
  c = fogSpr.drawingContext;
  g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(160,176,168,1)");
  g.addColorStop(1, "rgba(160,176,168,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);

  glowSpr = createGraphics(48, 48);
  glowSpr.pixelDensity(1); // round orange halo for the string-light effect
  c = glowSpr.drawingContext;
  g = c.createRadialGradient(24, 24, 0, 24, 24, 24);
  g.addColorStop(0, "rgba(255,190,90,1)");
  g.addColorStop(0.25, "rgba(255,140,40,0.55)");
  g.addColorStop(1, "rgba(255,110,20,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 48, 48);

  mist = createGraphics(width, height);
  mist.pixelDensity(1);
  c = mist.drawingContext;
  g = c.createLinearGradient(0, 0, 0, height);
  g.addColorStop(hf - 0.26, "rgba(150,166,158,0)");
  g.addColorStop(hf, "rgba(150,166,158,0.62)");
  g.addColorStop(hf + 0.2, "rgba(150,166,158,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, width, height);
}

// orange light behind the clouds: faint but present; the kick pulses it, the overall energy lifts it
function drawGlow(t, pass) {
  const ctx = drawingContext,
    k = AUD.kick,
    E = AUD.energy;
  const a = (0.34 + E * 0.22 + k * 0.55) * (pass ? 0.4 : 1);
  const cx = width * (0.5 + 0.16 * sin(t * 0.045)),
    cy = hz * 0.86,
    R = width * 0.7;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(cx, cy);
  ctx.scale(1, 0.62);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, `rgba(255,128,30,${a})`);
  g.addColorStop(0.35, `rgba(214,92,20,${a * 0.6})`);
  g.addColorStop(1, "rgba(190,84,22,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R * 1.2, R * 2, R * 2.6);
  ctx.restore();
}

// ====================================================================================================
//  TREES — dark emerald fir clouds with a faint orange particle outline
// ====================================================================================================
function makeTree() {
  const H = random(9, 17),
    base = H * random(0.14, 0.22),
    Wc = H * random(0.11, 0.16);
  const n = floor(random(13, 19)),
    tw = random(0.12, 0.22),
    step = (H - base) / n;
  const side = () => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1),
        y = H - (H - base) * u;
      const hw = Wc * (0.06 + 0.94 * pow(u, 0.85)),
        drop = step * random(0.9, 1.8);
      pts.push([hw * random(0.85, 1.15), y - drop]);
      pts.push([hw * random(0.28, 0.45), y - drop * 0.35 - step * 0.2]);
    }
    pts.push([tw, base]);
    return pts;
  };
  const R = side(),
    L = side(),
    apex = [0, H + 0.3];
  const Lm = L.map((p) => [-p[0], p[1]]);
  const pr = [],
    pl = [],
    pi = [],
    pt = [];
  const pathR = [apex, ...R],
    pathL = [apex, ...Lm];
  for (let i = 0; i < pathR.length - 1; i++)
    sampleLine(pathR[i], pathR[i + 1], 13, pr);
  for (let i = 0; i < pathL.length - 1; i++)
    sampleLine(pathL[i], pathL[i + 1], 13, pl);
  fillPoly([apex, ...R, ...Lm.slice().reverse()], 800, pi);
  for (let i = 0; i < 70; i++) pt.push([random(-tw, tw), random(0, base)]);
  const all = [...pr, ...pl, ...pi, ...pt];
  return {
    x: random(-XW / 2, XW / 2),
    z: random(ZFAR),
    H,
    Wc,
    tw,
    R,
    L,
    N: all.length,
    nOut: pr.length + pl.length, // the first nOut particles are the outline
    X: Float32Array.from(all, (p) => p[0]),
    Y: Float32Array.from(all, (p) => p[1]),
    JX: Float32Array.from(all, () => random(-1, 1)),
    JY: Float32Array.from(all, () => random(-1, 1)),
    ph: random(TWO_PI),
    bin: 22 + floor(random(40)), // each tree listens to its own slice of the spectrum
  };
}

function drawTree(tr, rx, zr, f, camH, t) {
  const s = f / zr,
    sx = width / 2 + rx * s,
    gy = hz + camH * s;
  const half = (tr.Wc * 1.3 + 0.5) * s;
  if (sx < -half || sx > width + half) return;
  let near = constrain((zr - 1.2) / 2.5, 0, 1);
  if (zr < 9) near *= constrain((abs(rx) - 0.5) / 1.5, 0, 1); // never block the camera when it passes close
  if (near <= 0.01) return;
  const fogF = foggy(zr),
    hi = AUD.high,
    k = AUD.kick;
  const cr = lerp(TREE_DARK[0], FOG[0], fogF),
    cg = lerp(TREE_DARK[1], FOG[1], fogF),
    cb = lerp(TREE_DARK[2], FOG[2], fogF);
  const A =
    sin(t * 0.5 + tr.ph) * (0.12 + hi * 0.16 + AUD.bass * 0.1) +
    sin(t * 1.7 + tr.ph * 2) * 0.03;
  const sw = A / (tr.H * tr.H);
  const ctx = drawingContext;
  ctx.save(); // body, barely there (native path: much faster than p5 vertex())
  ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${(0.12 * near).toFixed(3)})`;
  ctx.beginPath();
  ctx.moveTo(sx + sw * (tr.H + 0.3) * (tr.H + 0.3) * s, gy - (tr.H + 0.3) * s);
  for (const p of tr.R)
    ctx.lineTo(sx + (p[0] + sw * p[1] * p[1]) * s, gy - p[1] * s);
  ctx.lineTo(sx + tr.tw * 1.3 * s, gy);
  ctx.lineTo(sx - tr.tw * 1.3 * s, gy);
  for (let i = tr.L.length - 1; i >= 0; i--) {
    const p = tr.L[i];
    ctx.lineTo(sx + (-p[0] + sw * p[1] * p[1]) * s, gy - p[1] * s);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const step = max(1, round((zr < 9 ? 1 : zr < 22 ? 3 : 8) * lod)),
    sz = constrain(0.02 * s * (1 + step * 0.1), 0.8, 1.9);
  const jw = 0.04 + hi * 0.05 + k * 0.04,
    X = tr.X,
    Y = tr.Y,
    JX = tr.JX,
    JY = tr.JY;
  ctx.save();
  ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${0.95 * near})`;
  ctx.beginPath();
  for (let i = 0; i < tr.N; i += step) {
    const y = Y[i];
    ctx.rect(
      sx + (X[i] + JX[i] * jw + sw * y * y) * s,
      gy - (y + JY[i] * jw) * s,
      sz,
      sz,
    );
  }
  ctx.fill();
  // orange outline: always there, and it vibrates with the highs: each tree answers its own slice of the spectrum
  tr.sm = lerp(tr.sm || 0, AUD.spec[tr.bin] || 0, 0.3);
  const sp = tr.sm,
    flare = constrain(hi * 0.8 + sp * 1.1, 0, 1);
  const oa = (0.2 + flare * 0.95 + AUD.mid * 0.3) * (1 - fogF * 0.6) * near;
  if (zr < 56 && oa > 0.02) {
    const warm = flare; // brighter, whiter-orange when it flares
    ctx.fillStyle = `rgba(${(ORANGE[0] + 19 * warm) | 0},${(ORANGE[1] + 60 * warm) | 0},${(ORANGE[2] + 40 * warm) | 0},${min(oa, 1).toFixed(3)})`;
    const rs = sz + flare * 0.9,
      jo = 0.03 + flare * 0.1; // the outline particles shake outward with the highs
    ctx.beginPath();
    for (let i = 0; i < tr.nOut; i += step) {
      const y = Y[i];
      ctx.rect(
        sx + (X[i] + JX[i] * (jw + jo) + sw * y * y) * s,
        gy - (y + JY[i] * (jw + jo)) * s,
        rs,
        rs,
      );
    }
    ctx.fill();
  }
  ctx.restore();
}

// ====================================================================================================
//  APPARITIONS — particle shapes with a light mesh displacement
// ====================================================================================================
let TPL = {};
function tplFromPoly(T) {
  const out = [],
    n = T.poly.length;
  for (let i = 0; i < n; i++)
    sampleLine(T.poly[i], T.poly[(i + 1) % n], T.dens, out);
  fillPoly(T.poly, T.fill, out);
  for (const l of T.lines || []) sampleLine(l[0], l[1], T.dens, out);
  for (const q of T.extra || []) out.push(q);
  let x0 = 1e9,
    x1 = -1e9;
  for (const p of T.poly) {
    x0 = min(x0, p[0]);
    x1 = max(x1, p[0]);
  }
  const cx = (x0 + x1) / 2;
  return {
    pts: out.map((p) => [p[0] - cx, p[1]]),
    eyes: T.eyes.map((p) => [p[0] - cx, p[1]]),
  };
}

// "MISTY COVE DINER" sampled from real text, so the neon sign is also made of particles
const TXT = {};
function textPts(str, SW, w = 380, h = 46, size = 30) {
  // text sampled into particles (neon letters)
  const key = str + SW;
  if (TXT[key]) return TXT[key];
  const out = [];
  try {
    const g = createGraphics(w, h);
    g.pixelDensity(1);
    g.background(0);
    g.fill(255);
    g.noStroke();
    g.textFont("monospace");
    g.textStyle(BOLD);
    g.textAlign(CENTER, CENTER);
    g.textSize(size);
    g.text(str, w / 2, h / 2 + 1);
    g.loadPixels();
    for (let y = 0; y < h; y += 2)
      for (let x = 0; x < w; x += 2) {
        if (g.pixels[4 * (y * w + x)] > 128)
          out.push([((x - w / 2) / w) * SW, ((h / 2 - y) / w) * SW]);
      }
    g.remove();
  } catch (e) {
    out.length = 0;
  }
  if (!out.length)
    for (let x = -SW / 2; x < SW / 2; x += 0.07) out.push([x, 0]); // fallback: a plain line
  return (TXT[key] = out);
}
const gridPts = (x0, y0, x1, y1, st, out, j = 0.02) => {
  st *= 1.25;
  for (let x = x0; x <= x1; x += st)
    for (let y = y0; y <= y1; y += st)
      out.push([x + random(-j, j), y + random(-j, j)]);
};

function buildDiner() {
  const P = [],
    warm = [],
    sign = [];
  const line = (a, b, d = 70, o = P) => sampleLine(a, b, d * 0.7, o);
  const poly = (pl, d, fill, o = P) => {
    for (let i = 0; i < pl.length; i++)
      sampleLine(pl[i], pl[(i + 1) % pl.length], d * 0.7, o);
    fillPoly(pl, fill * 0.6, o);
  };
  // body with a roof overhang
  poly(
    [
      [-3.6, 0],
      [-3.4, 2.2],
      [-3.7, 2.32],
      [-3.7, 2.62],
      [3.7, 2.62],
      [3.7, 2.32],
      [3.4, 2.2],
      [3.6, 0],
    ],
    70,
    1700,
  );
  for (const y of [0.78, 1.95, 2.18]) line([-3.5, y], [3.5, y], 110); // stainless bands
  for (let x = -3.5; x < 3.5; x += 0.3) line([x, 0], [x + 0.22, 0.76], 40); // diagonal lower panel
  for (let x = -3.2; x <= 2.3; x += 0.9) line([x, 0.8], [x, 1.95], 60); // window mullions
  line([-3.2, 0.85], [2.3, 0.85], 110);
  line([-3.2, 1.9], [2.3, 1.9], 110); // window frame
  line([2.4, 0], [2.4, 1.7], 60);
  line([3.1, 0], [3.1, 1.7], 60);
  line([2.4, 1.7], [3.1, 1.7], 60); // door
  line([2.75, 0], [2.75, 1.7], 50);
  for (let x = -2.9; x <= 1.9; x += 0.8) {
    line([x, 0.3], [x, 0.66], 60);
    gridPts(x - 0.14, 0.66, x + 0.14, 0.72, 0.03, P);
  } // counter stools
  line([-3.1, 0.62], [2.2, 0.62], 100); // counter
  line([2.0, 2.62], [2.0, 3.15], 60);
  line([2.45, 2.62], [2.45, 3.15], 60);
  line([2.0, 3.15], [2.45, 3.15], 40); // chimney / vent
  line([-1.9, 2.62], [-1.9, 3.35], 60);
  line([1.9, 2.62], [1.9, 3.35], 60); // posts holding the sign
  for (const lx of [-5.4, 5.6]) {
    line([lx, 0], [lx, 3.1], 60);
    line([lx, 3.1], [lx + (lx < 0 ? 0.5 : -0.5), 3.2], 40);
  } // lamp posts
  line([-4.5, 0], [-4.5, 4.9], 60); // pole sign
  line([-3.6, 0], [-3.6, 0.2], 10);
  line([-4.0, 0], [-5.0, 0], 60);
  // two parked cars at the sides
  const prof = [
    [-1.1, 0.15],
    [-1.12, 0.4],
    [-0.75, 0.48],
    [-0.4, 0.75],
    [0.3, 0.75],
    [0.62, 0.48],
    [1.02, 0.42],
    [1.12, 0.3],
    [1.1, 0.15],
  ];
  for (const [cx, sc, fl] of [
    [-7.4, 1.25, 1],
    [7.5, 1.2, -1],
  ]) {
    poly(
      prof.map((p) => [cx + p[0] * sc * fl, p[1] * sc]),
      40,
      200,
    );
    for (const wx of [-0.62, 0.6])
      for (let a = 0; a < TWO_PI; a += 0.3)
        P.push([
          cx + wx * sc * fl + cos(a) * 0.18 * sc,
          0.17 * sc + sin(a) * 0.18 * sc,
        ]);
  }
  // lit interior and door glass (warm), lamp glows
  gridPts(-3.15, 0.9, 2.25, 1.85, 0.045, warm, 0.018);
  gridPts(2.45, 0.05, 3.05, 1.65, 0.045, warm, 0.018);
  for (const lx of [-4.9, 5.1])
    gridPts(lx - 0.14, 3.02, lx + 0.14, 3.3, 0.035, warm, 0.01);
  // neon, always orange: the name on its board, an "EAT" pole sign, an "OPEN" in the window, the roof edge, an arrow
  for (const p of textPts("MISTY COVE DINER", 4.6))
    sign.push([p[0], p[1] + 3.85]);
  for (let x = -2.5; x <= 2.5; x += 0.06) {
    sign.push([x, 3.35]);
    sign.push([x, 4.35]);
  }
  for (let y = 3.35; y <= 4.35; y += 0.06) {
    sign.push([-2.5, y]);
    sign.push([2.5, y]);
  }
  for (const p of textPts("EAT", 0.8, 120, 46, 34))
    sign.push([p[0] - 4.5, p[1] + 5.45]);
  for (let x = -4.95; x <= -4.05; x += 0.06) {
    sign.push([x, 5.1]);
    sign.push([x, 5.8]);
  }
  for (let y = 5.1; y <= 5.8; y += 0.06) {
    sign.push([-4.95, y]);
    sign.push([-4.05, y]);
  }
  for (const p of textPts("OPEN", 1.3, 160, 46, 32))
    sign.push([p[0] - 0.6, p[1] + 1.4]);
  for (let x = -3.7; x <= 3.7; x += 0.05) {
    sign.push([x, 2.66]);
    sign.push([x, 2.1]);
  }
  line([-3.3, 3.5], [-2.7, 3.5], 60, sign);
  line([-2.7, 3.5], [-2.85, 3.62], 60, sign);
  line([-2.7, 3.5], [-2.85, 3.38], 60, sign);
  return { pts: P, eyes: [], warm, sign };
}

function templates() {
  if (TPL.stag) return TPL;
  TPL.stag = tplFromPoly({
    dens: 64,
    fill: 250,
    poly: [
      [0.1, 0],
      [0.14, 0.5],
      [0.05, 0.85],
      [0.0, 1.05],
      [0.25, 1.12],
      [0.7, 1.12],
      [0.95, 1.15],
      [1.05, 1.55],
      [1.15, 1.75],
      [1.3, 1.72],
      [1.42, 1.55],
      [1.34, 1.5],
      [1.2, 1.45],
      [1.18, 1.25],
      [1.1, 1.0],
      [1.1, 0.5],
      [1.12, 0],
      [1.0, 0],
      [0.98, 0.45],
      [0.9, 0.8],
      [0.5, 0.78],
      [0.3, 0.8],
      [0.28, 0.5],
      [0.2, 0],
    ],
    lines: [
      [
        [1.2, 1.75],
        [1.15, 2.0],
      ],
      [
        [1.15, 2.0],
        [1.05, 2.3],
      ],
      [
        [1.15, 1.95],
        [1.3, 2.15],
      ],
      [
        [1.08, 2.15],
        [0.95, 2.35],
      ],
      [
        [1.05, 2.3],
        [1.15, 2.5],
      ],
    ],
    eyes: [
      [1.27, 1.63],
      [1.34, 1.61],
    ],
  });
  TPL.bear = tplFromPoly({
    dens: 70,
    fill: 430,
    poly: [
      [0.0, 0.0],
      [-0.02, 0.6],
      [0.1, 0.98],
      [0.4, 1.16],
      [0.8, 1.2],
      [1.1, 1.12],
      [1.3, 1.02],
      [1.5, 0.92],
      [1.62, 0.9],
      [1.68, 0.8],
      [1.8, 0.72],
      [1.78, 0.6],
      [1.62, 0.55],
      [1.5, 0.5],
      [1.44, 0.25],
      [1.48, 0.0],
      [1.24, 0.0],
      [1.2, 0.3],
      [1.0, 0.42],
      [0.62, 0.4],
      [0.5, 0.0],
      [0.28, 0.0],
      [0.24, 0.28],
      [0.1, 0.0],
    ],
    extra: [
      [1.56, 0.97],
      [1.6, 1.0],
      [1.52, 1.0],
      [1.7, 0.96],
      [1.66, 1.0],
    ],
    eyes: [
      [1.6, 0.78],
      [1.7, 0.76],
    ],
  });
  const prof = [
    [-2.2, 0.3],
    [-2.25, 0.8],
    [-1.5, 0.95],
    [-0.75, 1.45],
    [0.55, 1.45],
    [1.2, 0.95],
    [2.05, 0.85],
    [2.25, 0.6],
    [2.2, 0.3],
  ];
  const extra = [];
  for (const wx of [-1.4, 1.4])
    for (let a = 0; a < TWO_PI; a += 0.22)
      extra.push([wx + cos(a) * 0.36, 0.36 + sin(a) * 0.36]);
  for (let i = 0; i < 130; i++)
    extra.push([random(-1.7, 1.5), 1.0 + random() * random() * 1.2]); // moss on the roof
  TPL.wreck = tplFromPoly({
    dens: 30,
    fill: 330,
    poly: prof,
    extra,
    eyes: [
      [-2.18, 0.7],
      [-2.18, 0.52],
    ],
  });

  TPL.diner = buildDiner();
  return TPL;
}

function mkEnt(kind, T, sc, x, z, rot, t0, life) {
  const pts = T.pts.map((p) => ({
    x: p[0],
    y: p[1],
    vx: random(-1, 1),
    vy: random(-0.2, 1.6),
    ph: random(TWO_PI),
    th: random(),
    rust: random() < 0.22,
  }));
  const edges = []; // (mesh lines removed: cleaner image)
  return {
    kind,
    sc,
    x,
    z,
    rot,
    flip: random() < 0.5 ? -1 : 1,
    ph: random(TWO_PI),
    eyes: T.eyes,
    warm: T.warm,
    sign: T.sign,
    pts,
    edges,
    t0,
    life,
  };
}

function roadFor(e, side) {
  // road particles on the ground, between the camera and the diner
  const r = [],
    cx = -side * 4.2;
  for (let z = -24; z <= 24; z += 0.14) {
    for (const ex of [-2, 2]) r.push([cx + ex + random(-0.12, 0.12), z, 0]);
    if (floor((z + 24) / 0.14) % 8 < 4)
      r.push([cx + random(-0.06, 0.06), z, 1]);
    for (let i = 0; i < 4; i++)
      r.push([cx + random(-2, 2), z + random(-0.1, 0.1), 2]);
  }
  return r;
}

function spawnEvent(t) {
  const T = templates(),
    side = random() < 0.5 ? -1 : 1,
    E = AUD.energy;
  const spawnAt = (d, lat) => [
    camX + sin(heading) * d + cos(heading) * lat,
    camZ + cos(heading) * d - sin(heading) * lat,
  ];
  const herd = (tpl, n, scLo, scHi) => {
    const d0 = random(34, 44),
      l0 = side * random(3.5, 7);
    for (let i = 0; i < n; i++) {
      const [px, pz] = spawnAt(d0 + random(-4, 4), l0 + side * random(-2, 3));
      ents.push(mkEnt("animal", tpl, random(scLo, scHi), px, pz, 0, t, 60));
    }
  };
  const r = random();
  if (r < 0.12 && t - lastDiner > 25) {
    const [px, pz] = spawnAt(random(40, 46), side * random(6, 8));
    const e = mkEnt("diner", T.diner, 1.35, px, pz, 0, t, 60);
    e.road = roadFor(e, side);
    ents.push(e);
    lastDiner = t;
  } else if (r < 0.28) {
    const dir = random() < 0.5 ? -1 : 1,
      crows = [];
    for (let i = 0, n = floor(random(5, 10)); i < n; i++) {
      crows.push({
        x: -dir * (26 + random(10)),
        y: random(1.8, 5),
        vx: dir * random(0.09, 0.14),
        ph: random(TWO_PI),
        body: Array.from({ length: 10 }, () => [
          random(-0.22, 0.22),
          random(-0.07, 0.07),
        ]),
      });
    }
    ents.push({ kind: "crows", zr: random(13, 22), dir, crows });
  } else if (r < 0.4) {
    const [px, pz] = spawnAt(random(34, 44), side * random(4, 8));
    ents.push(mkEnt("wreck", T.wreck, 1.2, px, pz, side * 0.08, t, 60));
  } else if (r < 0.72)
    herd(T.stag, floor(random(1, 3)), 1.2, 1.5); // deer, sometimes a pair
  else herd(T.bear, 1, 1.2, 1.55); // bears
  nextEv = t + random(3.5, 7) * (1.15 - E * 0.4);
}
function envOf(e, t) {
  // materialise while far, solid in the middle, dissolve as the camera reaches them
  if (t - e.t0 > e.life) return 0;
  const zr = e.z - camZ;
  return smooth((46 - zr) / 12) * smooth((zr - 3) / 7);
}

// an apparition materialises particle by particle and dissolves into the fog
function drawEnt(e, rx, zr, f, camH, t) {
  const s = f / zr,
    sx = width / 2 + rx * s,
    gy = hz + camH * s;
  if (sx < -500 || sx > width + 500) return;
  const env = envOf(e, t),
    near = constrain((zr - 1.5) / 3, 0, 1);
  if (env <= 0.01 || near <= 0) return;
  const E = AUD.energy,
    hi = AUD.high,
    k = AUD.kick;
  const power = 0.6 + E * 0.4; // energy makes apparitions stronger
  const ghost = e.kind === "animal",
    fogF = foggy(zr) * (e.kind === "diner" ? 0.35 : 0.5);
  const base =
    e.kind === "diner"
      ? [200, 214, 204]
      : ghost
        ? [208, 222, 212]
        : [150, 176, 160];
  const cr = lerp(base[0], FOG[0], fogF),
    cg = lerp(base[1], FOG[1], fogF),
    cb = lerp(base[2], FOG[2], fogF);
  const co = cos(e.rot),
    si = sin(e.rot),
    sz = constrain(0.024 * s, 0.9, 2.4),
    ctx = drawingContext,
    dis = 1 - env;
  const flick = ghost ? 0.82 + 0.18 * noise(t * 3, e.ph) : 1;
  const A =
    (e.kind === "diner" ? 0.95 : ghost ? 0.78 : 0.9) * near * flick * power;
  if (e.kind !== "diner") {
    // soft halo behind the shape, so it reads as an apparition
    ctx.save();
    ctx.globalAlpha = 0.1 * env * near;
    const hw = (e.kind === "wreck" ? 6 : 4) * e.sc * s;
    ctx.drawImage(cv(fogSpr), sx - hw / 2, gy - hw * 0.42, hw, hw * 0.62);
    ctx.restore();
  }
  const px = new Float32Array(e.pts.length * 2);
  for (let i = 0; i < e.pts.length; i++) {
    // positions, with the light mesh displacement
    const p = e.pts[i];
    if (p.th > env || (ghost && random() < 0.05)) {
      px[2 * i] = -9999;
      continue;
    }
    const lx = p.x * e.flip,
      ly = p.y;
    const wv =
      (sin(ly * 2.4 + t * 1.1 + e.ph) * 0.03 + sin(lx * 3 + t * 0.7) * 0.015) *
      (1 + k * 1.2); // slow wave, a little stronger on the kick
    const wx =
      (lx * co - ly * si) * e.sc +
      p.vx * dis * 0.9 +
      wv +
      sin(t * 1.3 + p.ph) * 0.02;
    const wy =
      (lx * si + ly * co) * e.sc +
      p.vy * dis * (ghost ? 1.4 : 0.5) +
      wv * 0.6 +
      sin(t * 1.9 + p.ph) * 0.02;
    px[2 * i] = sx + wx * s;
    px[2 * i + 1] = gy - wy * s;
  }
  ctx.save();
  for (let pass = 0; pass < 2; pass++) {
    // pass 0 = body, pass 1 = rust-tinted particles (wrecks only)
    ctx.fillStyle =
      pass === 0
        ? `rgba(${cr | 0},${cg | 0},${cb | 0},${A})`
        : `rgba(150,${(72 + hi * 30) | 0},26,${A * 0.9})`;
    for (let i = 0; i < e.pts.length; i++) {
      if (px[2 * i] < -9000) continue;
      const isRust = e.kind === "wreck" && e.pts[i].rust;
      if ((pass === 1) !== isRust) continue;
      ctx.fillRect(px[2 * i], px[2 * i + 1], sz, sz);
    }
  }
  if (env > 0.4 && e.edges.length) {
    // faint mesh lines
    ctx.strokeStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${0.16 * A * env})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let q = 0; q < e.edges.length; q += 2) {
      const i = e.edges[q],
        j = e.edges[q + 1];
      if (px[2 * i] < -9000 || px[2 * j] < -9000) continue;
      ctx.moveTo(px[2 * i], px[2 * i + 1]);
      ctx.lineTo(px[2 * j], px[2 * j + 1]);
    }
    ctx.stroke();
  }
  // diner: warm windows and the orange neon sign, always orange
  if (e.warm) {
    const al = smooth(env * 1.4) * near;
    ctx.fillStyle = `rgba(226,120,34,${0.5 * al * (0.85 + 0.15 * noise(t * 2, e.ph))})`;
    for (const p of e.warm)
      ctx.fillRect(sx + p[0] * e.flip * e.sc * s, gy - p[1] * e.sc * s, sz, sz);
    const flk = 0.9 + 0.1 * noise(t * 6, e.ph) - (random() < 0.004 ? 0.4 : 0);
    const cxs = sx,
      cys = gy - 3.75 * e.sc * s,
      gr = 3.4 * e.sc * s;
    const g = ctx.createRadialGradient(cxs, cys, 0, cxs, cys, gr);
    g.addColorStop(0, `rgba(255,130,30,${0.3 * al * flk})`);
    g.addColorStop(1, "rgba(255,130,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cxs - gr, cys - gr, gr * 2, gr * 2);
    ctx.fillStyle = `rgba(255,160,64,${al * flk})`;
    const ss = max(0.8, sz * 1.2);
    for (const p of e.sign)
      ctx.fillRect(
        sx + p[0] * e.sc * s,
        gy - (p[1] * e.sc + sin(t * 1.4 + p[0] * 2) * 0.01) * s,
        ss,
        ss,
      );
  }
  ctx.restore();

  // luminous orange eyes
  noStroke();
  for (const q of e.eyes) {
    const lx = q[0] * e.flip,
      ly = q[1];
    const X = sx + (lx * co - ly * si) * e.sc * s,
      Y = gy - (lx * si + ly * co) * e.sc * s;
    const pu = 0.45 + 0.35 * sin(t * 3.4 + e.ph) + hi * 0.5 + k * 0.6;
    const al = smooth(env * 1.5) * near * power,
      d = constrain(0.05 * s * e.sc, 2, 6.5) * (1 + hi * 0.4);
    fill(255, 120, 24, 50 * pu * al);
    circle(X, Y, d * 3.6);
    fill(255, 170, 60, constrain(120 + 135 * pu, 0, 255) * al);
    circle(X, Y, d);
  }
}

function drawRoad(e, f, camH, t) {
  const zr0 = e.z - camZ,
    env = smooth((48 - zr0) / 12) * smooth((zr0 + 24) / 10);
  if (env <= 0.01) return;
  const ctx = drawingContext,
    fog0 = 0.0;
  ctx.save();
  for (const p of e.road) {
    const wz = e.z + p[1] - camZ;
    if (wz < 1.4 || wz > ZFAR) continue;
    const wx = e.x + p[0] - camX,
      s = f / wz,
      sx = width / 2 + wx * s;
    if (sx < -10 || sx > width + 10) continue;
    const sy = hz + camH * s,
      fg = foggy(wz) * 0.5 + fog0,
      sz = constrain(0.027 * s, 0.9, 2.2);
    const a = env * (1 - fg) * 0.95 * constrain((wz - 1.4) / 3, 0, 1);
    ctx.fillStyle =
      p[2] === 1
        ? `rgba(200,112,40,${a})`
        : p[2] === 0
          ? `rgba(150,164,156,${a * 0.9})`
          : `rgba(96,116,104,${a * 0.75})`;
    ctx.fillRect(sx, sy, sz, sz * 0.7);
  }
  ctx.restore();
}

function drawCrows(fl, f, camH, t) {
  const s = f / fl.zr,
    ctx = drawingContext;
  const fogF = foggy(fl.zr) * 0.6,
    sz = constrain(0.022 * s, 0.8, 2);
  ctx.save();
  ctx.fillStyle = `rgba(${lerp(8, FOG[0], fogF) | 0},${lerp(14, FOG[1], fogF) | 0},${lerp(12, FOG[2], fogF) | 0},0.9)`;
  for (const c of fl.crows) {
    c.x += c.vx;
    const sx = width / 2 + c.x * s,
      sy = hz + (camH - c.y) * s;
    if (sx < -80 || sx > width + 80) continue;
    const flap = sin(t * 9 + c.ph);
    for (const b of c.body) ctx.fillRect(sx + b[0] * s, sy - b[1] * s, sz, sz);
    ctx.fillRect(sx + fl.dir * 0.3 * s, sy - 0.03 * s, sz, sz);
    ctx.fillRect(sx + fl.dir * 0.34 * s, sy - 0.02 * s, sz, sz);
    for (let u = 0.1; u <= 1; u += 0.12) {
      for (const sd of [-1, 1]) {
        const wx = sd * (0.08 + u * 0.6),
          wy = flap * 0.4 * u - 0.05 * u * u;
        ctx.fillRect(sx + wx * s, sy - wy * s, sz, sz);
        ctx.fillRect(sx + wx * s, sy - (wy - 0.07 * (1 - u * 0.5)) * s, sz, sz);
      }
    }
  }
  ctx.restore();
}

// ====================================================================================================
//  GROUND, FOG, WIND, RAIN
// ====================================================================================================
// undergrowth: irregular particle clouds in emerald, moss, rust and grey. The bass makes them denser.
function drawGround(f, camH, t, z0, z1) {
  const ctx = drawingContext,
    dens = 0.45 + AUD.bass * 0.55,
    bb = AUD.bass;
  const paths = [];
  for (let i = 0; i < 20; i++) paths.push(new Path2D());
  for (const p of puffs) {
    if (p.th > dens) continue;
    const wz = (((p.cz + p.oz - camZ) % ZFAR) + ZFAR) % ZFAR;
    if (wz < z0 || wz >= z1) continue;
    const wx = wrapC(p.cx + p.ox + sin(t * 0.2 + p.ph) * 0.3 - camX, XW);
    const s = f / wz,
      sx = width / 2 + wx * s;
    if (sx < -12 || sx > width + 12) continue;
    const sy = hz + (camH - p.h - 0.12 * sin(t * 0.4 + p.ph)) * s;
    const band = min(3, floor(pow(wz / ZFAR, 0.6) * 4)),
      tn = p.tone;
    const cls = tn < 0.03 ? 0 : tn < 0.28 ? 1 : tn < 0.65 ? 2 : 3; // a little rust, grey, emerald, moss
    const sz = constrain(p.s * s * 0.22 * (1 + bb * 0.4), 0.8, 2.6);
    paths[cls * 4 + band].rect(sx, sy, sz, sz);
  }
  const col = [
    [84, 52, 30],
    [90, 104, 98],
    [20, 78, 58],
    [34, 96, 66],
  ];
  ctx.save();
  for (let cls = 0; cls < 4; cls++)
    for (let band = 0; band < 4; band++) {
      const fg = (band + 0.5) / 4,
        c = col[cls];
      const r = lerp(c[0], 118, fg),
        g = lerp(c[1], 132, fg),
        b = lerp(c[2], 124, fg);
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${(0.4 + 0.35 * (1 - fg) + bb * 0.2).toFixed(3)})`;
      ctx.fill(paths[cls * 4 + band]);
    }
  ctx.restore();
}

// fog particles: large, very soft squares that drift. The bass thickens them.
function drawFogP(f, camH, t, z0, z1) {
  const ctx = drawingContext,
    dens = 0.1 + AUD.bass * 0.9;
  ctx.save();
  for (const p of fogs) {
    if (p.th > dens) continue;
    const wz = (((p.z - camZ - t * 0.15) % ZFAR) + ZFAR) % ZFAR;
    if (wz < z0 || wz >= z1) continue;
    const wx = wrapC(p.x + sin(t * 0.1 + p.ph) * 2 - camX, XW);
    const s = f / wz,
      sx = width / 2 + wx * s;
    if (sx < -200 || sx > width + 200) continue;
    const sy = hz + (camH - p.h) * s,
      sz = constrain(p.s * s * 1.6, 6, 260);
    ctx.globalAlpha = (0.05 + 0.1 * AUD.bass) * (1 - (wz / ZFAR) * 0.5);
    ctx.drawImage(cv(fogSpr), sx - sz / 2, sy - sz / 4, sz, sz / 2);
  }
  ctx.restore();
}

function drawMist(a, n) {
  tint(255, 255 * a);
  image(mist, 0, sin(frameCount * 0.01 + n) * 6);
  noTint();
}

// orange in the AIR: fine dust streaming past as you run (each speck smeared along its motion), plus soft orange haze
// lit between the trees. The mids make the haze and the dust denser and brighter, inside fixed limits.
function drawWind(f, camH, t) {
  const mid = constrain(AUD.mid, 0, 1),
    ctx = drawingContext,
    cx = width / 2;
  const active = floor(motes.length * (0.4 + 0.6 * mid));
  const gust = (noise(t * 0.1) - 0.5) * 0.03 + (0.008 + 0.03 * mid);
  const aD = 0.35 + 0.45 * mid;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  for (let band = 0; band < 3; band++) {
    ctx.beginPath();
    let any = false;
    for (let i = band; i < active; i += 3) {
      const m = motes[i];
      m.x += gust + sin(t * 0.7 + m.s) * 0.004;
      m.y += sin(t * 0.5 + m.s * 2) * 0.004 - 0.002;
      if (m.y < 0.15) m.y = 6;
      if (m.y > 6.2) m.y = 0.2;
      const zr = (((m.z - camZ) % ZFAR) + ZFAR) % ZFAR;
      if (zr < 0.8) continue;
      const rx = wrapC(m.x - camX, XW),
        s = f / zr,
        sx = cx + rx * s;
      if (sx < -40 || sx > width + 40) continue;
      const sy = hz + (camH - m.y) * s,
        k2 = (speed * 1.8) / zr; // streak = where the speck was a moment ago
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - (sx - cx) * k2, sy - (sy - hz) * k2);
      any = true;
    }
    if (any) {
      ctx.strokeStyle = `rgba(${ORANGE[0]},${ORANGE[1]},${ORANGE[2] + 10},${(aD * (0.45 + 0.2 * band)).toFixed(3)})`;
      ctx.stroke();
    }
  }
  // orange haze in the air, lit between the trunks; blooms with the mids
  ctx.globalCompositeOperation = "lighter";
  const bloom = pow(mid, 1.1);
  for (let i = 0; i < fogs.length; i += 3) {
    const p = fogs[i],
      wz = (((p.z - camZ) % ZFAR) + ZFAR) % ZFAR;
    if (wz < 3) continue;
    const wx = wrapC(p.x - camX + sin(t * 0.13 + p.ph) * 2, XW),
      s = f / wz,
      sx = cx + wx * s;
    if (sx < -300 || sx > width + 300) continue;
    const sy = hz + (camH - (1.4 + p.h * 1.1)) * s,
      sz = constrain(p.s * s * 2.4, 12, 420);
    ctx.globalAlpha =
      (0.02 + bloom * 0.09) *
      (1 - (wz / ZFAR) * 0.6) *
      (0.6 + 0.4 * sin(t * 0.6 + p.ph));
    ctx.drawImage(cv(glowSpr), sx - sz / 2, sy - sz / 2, sz, sz);
  }
  ctx.restore();
}

// rain: the highs add segments
function drawRain(t) {
  const dt = min(deltaTime, 50) / 1000,
    n = floor(drops.length * rainAmt),
    ctx = drawingContext;
  const lean = 0.18 + 0.12 * sin(t * 0.23) + AUD.bass * 0.04;
  for (let i = 0; i < n; i++) {
    const d = drops[i],
      vy = height * (0.8 + d.l * 1.2) * (1 + AUD.high * 0.45) * dt;
    d.y += vy;
    d.x -= lean * vy;
    if (d.y > height) {
      d.y = -20;
      d.x = random(-0.2, 1.2) * width;
    }
    if (d.x < -0.3 * width) d.x += 1.5 * width;
  }
  const sty = [
    [0.7, 9, 0.26, [1.5, 4], "86,104,98"],
    [1, 14, 0.36, [2, 3.5], "176,188,182"],
    [1.4, 22, 0.46, [2.5, 3], "204,214,208"],
  ];
  ctx.save();
  for (let b = 0; b < 3; b++) {
    const [lw, len, al, dash, col] = sty[b];
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const d = drops[i];
      if (d.b !== b) continue;
      ctx.moveTo(d.x + lean * len, d.y - len);
      ctx.lineTo(d.x, d.y);
    }
    ctx.strokeStyle = `rgba(${col},${al})`;
    ctx.lineWidth = lw;
    ctx.setLineDash(dash);
    ctx.stroke();
  }
  ctx.restore();
  for (
    let i = 0, spawned = 0;
    i < splashes.length && spawned < 6 * rainAmt;
    i++
  ) {
    // splashes on the ground
    const sp = splashes[i];
    if (sp.life <= 0) {
      sp.x = random(width);
      sp.y = hz + 4 + pow(random(), 1.6) * (height - hz) * 0.95;
      sp.life = 1;
      spawned++;
    }
  }
  ctx.save();
  for (const sp of splashes) {
    if (sp.life <= 0) continue;
    const w = 2 + ((sp.y - hz) / (height - hz)) * 6;
    ctx.fillStyle = `rgba(170,184,176,${sp.life * 0.35})`;
    ctx.fillRect(sp.x - w / 2, sp.y, w, 1);
    sp.life -= 0.12;
  }
  ctx.restore();
}

// faded film look, slightly green: lifted blacks, dust, scratches
function grade() {
  push();
  noStroke();
  blendMode(MULTIPLY);
  fill(226, 232, 222);
  rect(0, 0, width, height);
  blendMode(SCREEN);
  fill(14, 20, 16);
  rect(0, 0, width, height);
  blendMode(BLEND);
  if (random() < 0.5) {
    fill(225, 230, 215, 34);
    rect(random(width), 0, 1, height);
  }
  fill(20, 26, 20, 90);
  for (let i = 0; i < 3; i++)
    if (random() < 0.5)
      rect(random(width), random(height), random(1, 2.5), random(1, 2.5));
  if (random() < 0.012) {
    fill(0, 0, 0, 36);
    rect(0, 0, width, height);
  }
  pop();
}

// ====================================================================================================
//  FRAME
// ====================================================================================================
function draw() {
  AUD.update();
  const t = millis() / 1000,
    k = AUD.kick,
    E = AUD.energy,
    dt = min(deltaTime, 50) / 16.67;
  rainAmt = lerp(rainAmt, 0.38 + AUD.high * 0.5, 0.08);

  // LOD: if the frame rate drops, draw fewer particles per tree
  const fr = frameRate();
  if (fr > 0 && fr < 40) lod = min(2.6, lod + 0.03);
  else if (fr > 56) lod = max(1, lod - 0.004);

  // camera: steady forward travel with a slow wandering heading (no shaking, no tilt). Energy makes it a bit faster; each kick adds a push.
  const beat = pow(k, 0.8);
  speed = lerp(speed, 0.03 + E * 0.03 + AUD.bass * 0.012, 0.05);
  heading = lerp(
    heading,
    constrain((noise(t * 0.035) - 0.5) * 3.2, -1.1, 1.1),
    0.01,
  );
  const v = (speed + beat * 0.06) * dt;
  const lat = ((noise(80 + t * 0.12) - 0.5) * 0.07 + sin(t * 0.8) * 0.008) * dt; // light, smooth left-right sway (the view never tilts)
  camZ += v * cos(heading);
  camX += v * sin(heading) + lat;
  const camH = 1.7 - k * 0.05 + sin(t * 0.9) * 0.05,
    f = height * 0.8;

  image(skyBase, 0, 0);
  drawGlow(t, 0);
  image(clouds, -width * 0.07 + sin(t * 0.03) * width * 0.05, 0);
  drawGlow(t, 1); // second, weaker pass: the clouds are lit from behind
  drawFogP(f, camH, t, 25, ZFAR + 1);
  drawGround(f, camH, t, 12, ZFAR + 1);

  if (t > nextEv && ents.length < 5) spawnEvent(t);

  const items = [];
  for (const tr of trees) {
    const zr = (((tr.z - camZ) % ZFAR) + ZFAR) % ZFAR;
    if (zr >= 1.2) items.push([zr, tr, 0, wrapC(tr.x - camX, XW)]);
  }
  for (let i = ents.length - 1; i >= 0; i--) {
    const e = ents[i];
    if (e.kind === "crows") {
      if (e.crows.every((c) => c.x * e.dir > 32)) {
        ents.splice(i, 1);
        continue;
      }
      items.push([e.zr, e, 2, 0]);
    } else {
      const zr = e.z - camZ;
      if (t > e.t0 + e.life || zr < (e.road ? -26 : 1.2) || zr > ZFAR + 14) {
        ents.splice(i, 1);
        continue;
      }
      if (zr >= 1.2) items.push([zr, e, 1, e.x - camX]);
      if (e.road) items.push([max(zr, 0.5) + 9, e, 3, 0]); // the road stays while the camera runs past the diner
    }
  }
  items.sort((a, b) => b[0] - a[0]);

  const mistAmt = 0.4 + 0.3 * (1 - E * 0.5),
    breaks = [40, 26, 15, 8];
  let nb = 0;
  for (const [zr, o, kind, rx] of items) {
    while (nb < breaks.length && zr < breaks[nb]) {
      drawMist(mistAmt, nb);
      nb++;
    }
    if (kind === 0) drawTree(o, rx, zr, f, camH, t);
    else if (kind === 1) drawEnt(o, rx, zr, f, camH, t);
    else if (kind === 2) drawCrows(o, f, camH, t);
    else drawRoad(o, f, camH, t);
  }
  drawFogP(f, camH, t, 0.8, 25);
  drawGround(f, camH, t, 0.8, 12);
  drawWind(f, camH, t);
  drawRain(t);
  FX.draw(30, 0.2);
  grade();
  AUD.hud();
}
