// CANOPY — audio.js
// Listens to the track with the browser's Web Audio API. Every value is 0..1.
//
//   AUD.low / mid / high   energy of the three bands, each measured against its own recent range
//   AUD.intensity          how intense the music is right now (fast to rise, slower to fall)
//   AUD.kick, AUD.hit      kick envelope / true on the frame a kick is detected (spectral flux)
//   AUD.drive              how steadily the kicks keep coming
//   AUD.power              "hard" gate: high only when the track is intense AND driven by the kick.
//                          The dry pulses of the visual (light flashes, camera punches) use this,
//                          so they only happen in the strongest moments.
//   AUD.drop, AUD.lift     true on the frame a drop lands (intense after a quiet stretch) / its afterglow
//
// Levels are measured in decibels (the analyser already reports dB), relative to a range that adapts to the
// track over about half a minute: quiet parts read low and full parts read high whatever the master volume.

const AUD = {
  mode: "sim",
  snd: null,
  mic: null,
  ac: null,
  an: null,
  freq: null,
  prev: null,
  srcNode: null,
  stream: null,
  sens: 1,
  showHUD: false,
  low: 0,
  mid: 0,
  high: 0,
  intensity: 0,
  kick: 0,
  hit: false,
  drive: 0,
  power: 0,
  drop: false,
  lift: 0,
  spec: new Float32Array(64),
  time: 0,
  R: {},
  _raw: 0,
  _kp: 0,
  _fluxAvg: 0.02,
  _lastHit: -1,
  _calm: 0,
  _pp: 1,

  ensureCtx() {
    // created on the first click (browsers require a gesture)
    if (!this.ac) {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.an = this.ac.createAnalyser();
      this.an.fftSize = 2048;
      this.an.smoothingTimeConstant = 0.45;
      this.freq = new Uint8Array(this.an.frequencyBinCount);
      this.prev = new Uint8Array(this.an.frequencyBinCount);
    }
    if (this.ac.state === "suspended" && !(this.snd && this.snd.paused))
      this.ac.resume();
  },
  stopInputs() {
    if (this.snd) {
      this.snd.stop ? this.snd.stop() : this.snd.pause();
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
        this.srcNode.connect(this.an);
        this.mode = "mic"; // analysed only, never played back
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
  playBuffer(buf) {
    // a whole decoded file (fallback when the <audio> element fails, e.g. Safari + a local server)
    this.ensureCtx();
    this.stopInputs();
    const ac = this.ac,
      s = ac.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.connect(this.an);
    s.connect(ac.destination);
    s.start();
    this.srcNode = s;
    this.mode = "file";
    this.snd = {
      paused: false,
      play() {
        this.paused = false;
        return ac.resume();
      },
      pause() {
        this.paused = true;
        ac.suspend();
      },
      stop() {
        try {
          s.stop();
        } catch (e) {}
        if (ac.state === "suspended") ac.resume();
      },
    };
  },
  useFile(f) {
    // an audio file dropped on the canvas
    if (!f || !(f.type || "").startsWith("audio")) return;
    const a = new Audio(URL.createObjectURL(f));
    a.loop = true;
    this.playElement(a);
    a.play();
  },

  // map a dB-like value into 0..1 against its own adaptive range
  adapt(name, v, dt) {
    const r = this.R[name] || (this.R[name] = { lo: v, hi: v + 0.05 });
    const slow = (this.time < 8 ? 0.002 : 0.00015) * dt,
      fast = (this.time < 8 ? 0.05 : 0.006) * dt; // remembers the last couple of minutes
    r.hi = v > r.hi ? U.lerp(r.hi, v, fast) : U.lerp(r.hi, v, slow);
    r.lo = v < r.lo ? U.lerp(r.lo, v, fast) : U.lerp(r.lo, v, slow);
    return U.clamp(((v - r.lo) / Math.max(0.2, r.hi - r.lo)) * this.sens);
  },

  // built-in test track: 126 BPM techno structure, intro / build / drop / breakdown / build / drop...
  sim(t) {
    const beat = (t * 126) / 60,
      ph = beat % 1,
      sec = Math.floor(beat / 64) % 6,
      prog = (beat % 64) / 64;
    const S = ["intro", "build", "drop", "break", "build", "drop"][sec];
    const kickOn = S === "build" || S === "drop";
    const r = prog,
      env = kickOn ? Math.pow(1 - ph, 4) : 0,
      hat = Math.pow(1 - ((beat * 2) % 1), 6);
    const n = () => (Math.random() - 0.5) * 0.04;
    const L = {
      intro: [0.35, 0.45, 0.45, 0.42],
      build: [0.5 + 0.3 * r, 0.5 + 0.2 * r, 0.5 + 0.35 * r, 0.5 + 0.3 * r],
      drop: [0.88, 0.72, 0.78, 0.88],
      break: [0.25, 0.62, 0.32, 0.48],
    }[S];
    const hit = kickOn && ph < this._pp;
    this._pp = ph;
    for (let i = 0; i < 64; i++)
      this.spec[i] = U.clamp(
        (i < 10 ? L[0] * (0.5 + env) : i < 36 ? L[1] : L[2] * (0.4 + hat)) *
          (0.6 + 0.6 * U.noise(i * 0.4, t * 3)),
      );
    return {
      low: L[0] * (0.62 + 0.38 * env) + n(),
      mid: L[1] + n(),
      high: L[2] * (0.7 + 0.3 * hat) + n(),
      full: L[3] + 0.05 * env + n(),
      hit,
    };
  },

  analyse(dt) {
    this.an.getByteFrequencyData(this.freq);
    const fr = this.freq,
      hz = this.ac.sampleRate / this.an.fftSize;
    const band = (f0, f1) => {
      const i0 = Math.max(1, Math.floor(f0 / hz)),
        i1 = Math.min(fr.length - 1, Math.ceil(f1 / hz));
      let s = 0;
      for (let i = i0; i <= i1; i++) s += fr[i];
      return s / (i1 - i0 + 1) / 255;
    };
    // kick: spectral flux (how much the low bins jumped since the last frame), against its own running average
    const k0 = Math.max(1, Math.floor(35 / hz)),
      k1 = Math.ceil(150 / hz);
    let flux = 0;
    for (let i = k0; i <= k1; i++) flux += Math.max(0, fr[i] - this.prev[i]);
    flux /= (k1 - k0 + 1) * 255;
    this.prev.set(fr);
    this._fluxAvg = U.lerp(this._fluxAvg, flux, 0.04 * dt);
    const hit =
      flux > this._fluxAvg * 1.7 + 0.012 && this.time - this._lastHit > 0.2;
    for (let i = 0; i < 64; i++)
      this.spec[i] = U.clamp(
        ((fr[Math.floor(Math.pow(i / 64, 1.8) * 300) + 2] || 0) / 255) * 1.3,
      );
    return {
      low: band(35, 150),
      mid: band(250, 2500),
      high: band(4000, 14000),
      full: band(30, 16000),
      hit,
    };
  },

  update(dt) {
    this.time += dt / 60;
    const raw =
      this.mode === "sim" || !this.an ? this.sim(this.time) : this.analyse(dt);
    const lo = this.adapt("low", raw.low, dt),
      md = this.adapt("mid", raw.mid, dt),
      hi = this.adapt("high", raw.high, dt),
      fu = this.adapt("full", raw.full, dt);
    const ease = (cur, v, up, down) =>
      U.lerp(cur, v, (v > cur ? up : down) * dt);
    this.low = ease(this.low, lo, 0.25, 0.06);
    this.mid = ease(this.mid, md, 0.25, 0.05);
    this.high = ease(this.high, hi, 0.5, 0.12);

    // kicks
    this.hit = raw.hit && lo > 0.3;
    if (this.hit) this._lastHit = this.time;
    this.kick = Math.max(this.kick * Math.pow(0.86, dt), this.hit ? 1 : 0);
    this._kp = Math.min(
      1.3,
      this._kp * Math.pow(0.988, dt) + (this.hit ? 0.38 : 0),
    );
    this.drive = ease(this.drive, U.sstep(0.3, 0.85, this._kp), 0.05, 0.02);

    // intensity: low end and overall loudness, rising fast and falling slowly
    this._raw = ease(
      this._raw,
      0.38 * lo + 0.3 * fu + 0.14 * hi + 0.18 * this.drive,
      0.04,
      0.012,
    );
    this.intensity = U.clamp(this._raw * 1.08);
    this.power =
      U.sstep(0.55, 0.85, this.intensity) * U.sstep(0.35, 0.75, this.drive);

    // drop: full power comes back after at least four seconds without it (a breakdown, a pause before the drop)
    this.drop = false;
    if (this.power < 0.3) this._calm += dt / 60;
    else if (this.power > 0.75) {
      if (this._calm > 4) {
        this.drop = true;
        this.lift = 1;
      }
      this._calm = 0;
    }
    this.lift *= Math.pow(0.985, dt);
  },

  hud(ctx, lines) {
    // debug read-out, key H
    if (!this.showHUD) return;
    const bar = (v) => "█".repeat(Math.round(U.clamp(v) * 14)).padEnd(14, "·");
    const rows = [
      `CANOPY  src:${this.mode}  sens:${this.sens.toFixed(2)}  fps:${Math.round(frameRate())}`,
      `LOW       ${bar(this.low)}`,
      `MID       ${bar(this.mid)}`,
      `HIGH      ${bar(this.high)}`,
      `KICK      ${bar(this.kick)}`,
      `DRIVE     ${bar(this.drive)}`,
      `INTENSITY ${bar(this.intensity)}`,
      `POWER     ${bar(this.power)}`,
      `LIFT      ${bar(this.lift)}`,
      ...lines,
    ];
    ctx.save();
    ctx.font = "11px monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(4,10,8,0.62)";
    ctx.fillRect(8, 8, 360, 16 + rows.length * 14);
    ctx.fillStyle = "rgba(255,196,120,0.95)";
    rows.forEach((r, i) => ctx.fillText(r, 16, 16 + i * 14));
    ctx.restore();
  },
};
