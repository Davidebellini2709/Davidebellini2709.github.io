console.log("nothing important here");

let frames = [];
let numFrames = 7;
let currentFrame = 0;
let frameSpeed = 8;

async function setup() {
  let canvas = createCanvas(500, 400);
  canvas.parent("sketch-holder");

  // Load all animation frames
  for (let i = 1; i <= numFrames; i++) {
    let frame = await loadImage(`dance_frames/punch_${i}.png`);
    frames.push(frame);
  }

  console.log("All frames loaded:", frames.length);

  if (frames.length > 0) {
    console.log("Dimensioni frame 1:", frames[0].width, "x", frames[0].height);
  }
}

function draw() {
  background(255);

  if (frames.length === 0) {
    return;
  }

  // Change frame every few draw cycles
  currentFrame = floor(frameCount / frameSpeed) % frames.length;
  let img = frames[currentFrame];

  // Skip if the image isn't ready yet
  if (!img || img.width === 0 || img.height === 0) {
    return;
  }

  // Keep the original aspect ratio and fit the image inside the canvas
  let scale = min(width / img.width, height / img.height);

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
