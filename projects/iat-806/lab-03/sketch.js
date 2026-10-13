console.log("nothing important here");

let frames = [];
<<<<<<< Updated upstream
let numFrames = 7;
let currentFrame = 0;
let frameSpeed = 8;

function preload() {
  for (let i = 1; i <= numFrames; i++) {
    frames.push(loadImage(`dance_frames/punch_${i}.png`));
=======
let numFrames = 8;
let currentFrame = 0;
let frameSpeed = 8;

async function setup() {
  let canvas = createCanvas(500, 400);
  canvas.parent("sketch-holder");

  // Load all animation frames
  for (let i = 1; i <= numFrames; i++) {
    let number = String(i).padStart(2, "0");
    let frame = await loadImage(`dance_frames/punch_${number}.png`);
    frames.push(frame);
>>>>>>> Stashed changes
  }

<<<<<<< Updated upstream
function setup() {
  let canvas = createCanvas(500, 400);
  canvas.parent("sketch-holder");

  console.log("Totale frame caricati:", frames.length);

  if (frames.length > 0) {
    console.log("Dimensioni frame 1:", frames[0].width, "x", frames[0].height);
  }
=======
  console.log("All frames loaded:", frames.length);
>>>>>>> Stashed changes
}

function draw() {
  background(255);

  if (frames.length === 0) {
    return;
  }

<<<<<<< Updated upstream
  currentFrame = floor(frameCount / frameSpeed) % frames.length;
  let img = frames[currentFrame];

  if (!img || img.width === 0 || img.height === 0) {
    return;
  }

  let scale = min(width / img.width, height / img.height);
=======
  // Change frame every few draw cycles
  currentFrame = floor(frameCount / frameSpeed) % frames.length;

  let img = frames[currentFrame];

  // Keep the original aspect ratio and fit the image inside the canvas
  let scale = min(width / img.width, height / img.height);

>>>>>>> Stashed changes
  let imgWidth = img.width * scale;
  let imgHeight = img.height * scale;

  let x = (width - imgWidth) / 2;
  let y = (height - imgHeight) / 2;

  image(img, x, y, imgWidth, imgHeight);
}

function keyPressed() {
  if (key === "s" || key === "S") {
    saveGif("character-animation", 2.67);
  }
}
