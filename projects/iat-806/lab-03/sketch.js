let frames = [];
let totalFrames = 8; // change to 5 if you only want frame_1 to frame_5

function preload() {
  for (let i = 1; i <= totalFrames; i++) {
    frames.push(
      loadImage(
        "dance_frames/frame_" + i + ".png",
        () => console.log("loaded frame_" + i),
        () => console.log("FAILED to load frame_" + i),
      ),
    );
  }
}

function setup() {
  createCanvas(800, 450);
}

function draw() {
  background(120);
  fill(140);

  // thumbnail strip of all frames
  for (let i = 0; i < frames.length; i++) {
    let xPosition = i * 100;
    image(frames[i], xPosition, 20, 100, 125);
  }

  // animation
  let speed = 10;
  let index = floor(frameCount / speed) % frames.length;
  image(frames[index], 100, 160, 200, 250);

  // debug info (delete these lines once it works)
  fill("white");
  textSize(16);
  text("frames loaded: " + frames.length, 500, 200);
  text("current index: " + index, 500, 220);
  if (frames[index]) {
    text(
      "image size: " + frames[index].width + " x " + frames[index].height,
      500,
      240,
    );
  }
}
