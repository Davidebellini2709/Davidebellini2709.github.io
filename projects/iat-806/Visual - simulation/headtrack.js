// CANOPY — headtrack.js
// Optional: the webcam reads the movements of the viewer's head and turns the view with them, like looking
// around inside the forest. Press C to switch it on (the position of your head at that moment becomes the
// centre) and C again to switch it off. Meant for an installation with one viewer in front of the screen.
//
//   up to 35° left / right and 25° up / down, with a dead zone in the middle and heavy smoothing.
//   It only turns the view: the walk and the music reactions go on as before.
//   Face tracking: MediaPipe Face Landmarker (Google), loaded from a CDN the first time C is pressed.
//   The browser asks permission for the camera; the page must be served over https.

const HeadTrack = {
  on: false,
  ready: false,
  busy: false,
  video: null,
  lm: null,
  last: 0,
  lost: 0,
  raw: { x: 0, y: 0 },
  zero: null,
  samples: [],
  msg: "",
  range: { yaw: (35 * Math.PI) / 180, pitch: (25 * Math.PI) / 180 },
  dead: 0.04,
  gain: { x: 2.4, y: 4 },
  VER: "0.10.14",

  async toggle() {
    if (this.on) {
      this.stop();
      return;
    }
    if (this.busy) return;
    this.on = true;
    this.busy = true;
    this.zero = null;
    this.samples = [];
    this.msg = "starting the camera…";
    try {
      if (!this.ready) await this.load();
      this.video = document.createElement("video");
      this.video.playsInline = true;
      this.video.muted = true;
      this.video.srcObject = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      await this.video.play();
      if (!this.on) {
        this.stop();
        return;
      } // C pressed again while it was loading
      this.msg = "look at the screen: calibrating…";
    } catch (e) {
      console.warn("Canopy head tracking:", e);
      this.msg =
        (this.ready ? "camera not available" : "face tracking could not load") +
        " (" +
        (e.name || "error") +
        ")";
      this.on = false;
      setTimeout(() => {
        if (!this.on) this.msg = "";
      }, 4000);
    } finally {
      this.busy = false;
    }
  },
  async load() {
    this.msg = "loading face tracking…";
    const base = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${this.VER}`;
    const vision = await import(`${base}/vision_bundle.mjs`);
    const files = await vision.FilesetResolver.forVisionTasks(`${base}/wasm`);
    const opts = (d) => ({
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: d,
      },
      runningMode: "VIDEO",
      numFaces: 1,
    });
    try {
      this.lm = await vision.FaceLandmarker.createFromOptions(
        files,
        opts("GPU"),
      );
    } catch (e) {
      this.lm = await vision.FaceLandmarker.createFromOptions(
        files,
        opts("CPU"),
      );
    } // e.g. Safari without WebGL2 support for it
    this.ready = true;
  },
  stop() {
    this.on = false;
    this.msg = "";
    if (this.video && this.video.srcObject)
      this.video.srcObject.getTracks().forEach((t) => t.stop());
    this.video = null;
  },

  // called every frame by the engine: returns how far the view should turn
  update(dt) {
    const out = Canopy.head || (Canopy.head = { yaw: 0, pitch: 0 });
    let ty = 0,
      tp = 0;
    if (this.on && this.ready && this.video && this.video.readyState >= 2) {
      const now = performance.now();
      if (now - this.last > 55) {
        // about 18 readings a second is plenty
        this.last = now;
        let f = null;
        try {
          const r = this.lm.detectForVideo(this.video, now);
          f = r.faceLandmarks && r.faceLandmarks[0];
        } catch (e) {}
        if (f) {
          const nose = f[1],
            le = f[33],
            re = f[263],
            top = f[10],
            chin = f[152];
          const eyeW = Math.hypot(re.x - le.x, re.y - le.y) || 0.1,
            faceH = Math.hypot(chin.x - top.x, chin.y - top.y) || 0.2;
          this.raw.x = (nose.x - (le.x + re.x) / 2) / eyeW; // nose against the eyes: turning
          this.raw.y = (nose.y - (le.y + re.y) / 2) / faceH; // nose against the eyes: nodding
          this.lost = 0;
          if (!this.zero) {
            // the first second of readings is the centre
            this.samples.push({ ...this.raw });
            if (this.samples.length >= 18) {
              this.zero = {
                x:
                  this.samples.reduce((s, p) => s + p.x, 0) /
                  this.samples.length,
                y:
                  this.samples.reduce((s, p) => s + p.y, 0) /
                  this.samples.length,
              };
              this.msg = "head tracking on";
              setTimeout(() => {
                if (this.on && this.zero) this.msg = "";
              }, 2500);
            }
          }
        } else this.lost++;
      }
      if (this.zero && this.lost < 20) {
        const dz = (v) => Math.sign(v) * Math.max(0, Math.abs(v) - this.dead); // small movements are ignored
        ty =
          U.clamp(-dz(this.raw.x - this.zero.x) * this.gain.x, -1, 1) *
          this.range.yaw;
        tp =
          U.clamp(-dz(this.raw.y - this.zero.y) * this.gain.y, -1, 1) *
          this.range.pitch;
      }
    }
    out.yaw = U.lerp(out.yaw, ty, 0.06 * dt); // heavy smoothing; without a face it drifts back to centre
    out.pitch = U.lerp(out.pitch, tp, 0.06 * dt);
  },
  draw(ctx) {
    if (!this.msg && !this.on) return;
    ctx.save();
    ctx.font = "12px Georgia, serif";
    ctx.textBaseline = "bottom";
    if (this.on && this.zero) {
      ctx.fillStyle =
        this.lost < 20 ? "rgba(255,196,120,0.7)" : "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(width - 16, height - 16, 4, 0, U.TAU);
      ctx.fill();
    }
    if (this.msg) {
      ctx.fillStyle = "rgba(236,232,218,0.8)";
      ctx.textAlign = "right";
      ctx.fillText(this.msg, width - 28, height - 10);
    }
    ctx.restore();
  },
};
window.HeadTrack = HeadTrack; // the engine looks for it
