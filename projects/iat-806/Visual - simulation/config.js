// CANOPY — config.js
// Everything that can be changed without touching the engine lives here.
// The visual is MODULAR: each part (sky, forest, road, creatures, light, rain...) is a module in its own
// file, registered with the engine. Take a name out of a list below and that part disappears;
// add a new module in its file (each file ends with an example) and list it here.
// Nothing is switched by hand while it runs: the time of day, the weather, the forest floor and the
// roads all change by themselves. The music changes the intensity of everything.

const CONFIG = {
  track: 'liverpool-street-in-the-rain.mp3',   // mp3 in the same folder as index.html; PLAY loads it
  render: { maxWidth: 1440 },                  // internal resolution; the canvas is stretched to fit the page

  // layers, in drawing order
  scene: ['sky', 'ground', 'forest', 'road', 'creatures', 'fogdrift', 'light', 'dust', 'rain', 'film'],

  // the day: a loop through these moments (defined in PHASES below), each blending into the next
  cycle: ['predawn', 'dawn', 'day', 'sunset', 'night'],
  cycleSeconds: 300,

  world: { depth: 64, width: 90, trees: 300, ferns: 1100, logs: 30 },

  // every so often the forest opens onto a two-lane road with one building beside it
  road: { first: 15, every: [25, 40], buildings: ['diner', 'bodyshop', 'store'] },

  // apparitions in the forest and how often each is picked
  creatures: { deer: 3, bear: 2, crows: 2, wreck: 1.4 },

  // camera speed in metres per frame (60 fps): walk when the track is quiet, run when it is intense
  camera: { walk: 0.03, run: 0.075, kickPush: 0.05, surge: 0.08, wander: 0.45, look: 0.12 }
};

// ---------------------------------------------------------------------------------------------
// MOMENTS OF THE DAY — colours and sun. Add one here and put its name in CONFIG.cycle.
//   sky      [top, horizon]          fog     fog colour            ground  forest floor colour
//   amb      multiplier on every painted object (how lit the forest is)
//   light    colour of the light that filters through the trees (rims, rays, motes)
//   sun      az: left/right of the way the camera walks (radians), el: height above the horizon,
//            power: how strong, cloudy: how much the clouds hide it (0..1)
// ---------------------------------------------------------------------------------------------
const PHASES = {
  predawn: {                                    // blue hour: cold, still, almost no light
    sky: [[16, 22, 34], [58, 70, 86]], fog: [52, 64, 78], ground: [12, 15, 18],
    amb: [0.36, 0.42, 0.52], light: [150, 172, 210],
    sun: { az: -0.5, el: -0.03, power: 0.15, cloudy: 0.6 }
  },
  dawn: {                                       // low amber sun cutting through the trunks, pink-grey mist
    sky: [[46, 52, 66], [214, 168, 128]], fog: [150, 138, 128], ground: [30, 26, 22],
    amb: [0.78, 0.7, 0.64], light: [246, 188, 128],
    sun: { az: -0.3, el: 0.05, power: 1, cloudy: 0.25 }
  },
  day: {                                        // overcast Pacific Northwest day: soft grey, light breaks now and then
    sky: [[104, 114, 118], [186, 192, 188]], fog: [150, 158, 156], ground: [34, 38, 32],
    amb: [0.86, 0.9, 0.88], light: [240, 222, 180],
    sun: { az: 0.12, el: 0.5, power: 0.6, cloudy: 0.8 }
  },
  sunset: {                                     // amber light low on the horizon, long rays, warm haze
    sky: [[48, 46, 56], [226, 150, 76]], fog: [144, 116, 92], ground: [28, 22, 18],
    amb: [0.74, 0.62, 0.52], light: [246, 172, 96],
    sun: { az: 0.32, el: 0.04, power: 1, cloudy: 0.25 }
  },
  night: {                                      // dark blue-green; the moon is faint, neon signs take over
    sky: [[6, 11, 16], [26, 38, 44]], fog: [32, 44, 50], ground: [7, 9, 10],
    amb: [0.24, 0.3, 0.36], light: [140, 170, 200],
    sun: { az: -0.15, el: 0.35, power: 0.25, cloudy: 0.5 }
  }
};
