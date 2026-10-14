// IAT 806 · Lab 04: the dancer grid, now with mouse reaction and two dances.
// Run with Live Server. Uses p5 2.x (async setup, await loadImage).

let frames = []; // the 8 dance poses
let frames2 = []; // the 4 jump poses
let numFrames = 8;
let numFrames2 = 4; //how many jump images we load

let numCols = 20;
let numRows = 10;
let colWidth;
let rowHeight;

// (the colors and speeds arrays are gone: colors are black/white,
// and speed now comes from the mouse distance)

async function setup() {
  const canvas = createCanvas(800, 420);

  // puts the canvas inside <div id="sketch-holder"> in index.html
  canvas.parent("sketch-holder");

  rowHeight = height / numRows;
  // set colWidth here too, so it exists before the mouse moves
  colWidth = width / numCols;

  for (let i = 1; i <= numFrames; i++) {
    let fileName = "dance_frames/coffee_frame_" + i + ".png";
    frames.push(await loadImage(fileName));
  }

  // load the jump poses into the second array
  // (check the real folder and file names in your starter!)
  for (let i = 1; i <= numFrames2; i++) {
    let fileName = "jump_frames/coffee_blue_frame_" + i + ".png";
    frames2.push(await loadImage(fileName));
  }
}

function draw() {
  // wait until all images are loaded
  if (frames.length < numFrames || frames2.length < numFrames2) {
    return;
  }

  background(120);
  if (mouseX < width) {
    numCols = Math.floor(map(mouseX, 0, width, 2, 20));
    colWidth = width / numCols;
  }

  for (let i = 0; i < numCols; i++) {
    for (let j = 0; j < numRows; j++) {
      // Only black and white cells, like a chess board.
      // 255 = fully solid, so the color does not mix with the images.
      if ((i + j) % 2 === 0) {
        fill(255);
      } else {
        fill(0);
      }
      rect(i * colWidth, j * rowHeight, colWidth, rowHeight);

      // center of this dancer's cell
      let dancerX = i * colWidth + colWidth / 2;
      let dancerY = j * rowHeight + rowHeight / 2;

      // distance between this dancer and the mouse
      let d = dist(mouseX, mouseY, dancerX, dancerY);

      // turn the distance (0 to 500) into a speed (2 to 20).
      // Close to the mouse = small number = fast dancer.
      let speed = map(d, 0, 500, 2, 20);

      // checkerboard. Even cells get the dance, odd cells get the jump.
      let poses;
      if ((i + j) % 2 === 0) {
        poses = frames;
      } else {
        poses = frames2;
      }

      // same animate() function for both dances, we just pass a different array
      animate(poses, speed, i * colWidth, j * rowHeight, colWidth);
    }
  }
}

// draws one dancer: which poses, how fast, where, and how big
function animate(poses, speed, xPosition, yPosition, imageWidth, imageHeight) {
  // getFrameIndex now also needs to know which poses we use
  let index = getFrameIndex(speed, poses);
  let currentFrame = poses[index];
  let origWidth = currentFrame.width;
  let origHeight = currentFrame.height;
  if (imageWidth && !imageHeight) {
    let scale = imageWidth / origWidth;
    imageHeight = scale * origHeight;
  }
  image(currentFrame, xPosition, yPosition, imageWidth, imageHeight);
}

// which pose to show right now. speed = draw-frames per pose: smaller = faster
// uses the poses array we pass in
// array has 4 poses and the dance array has 8
function getFrameIndex(speed, poses) {
  let slowFrame = Math.floor(frameCount / speed);
  let index = slowFrame % poses.length;

  return index;
}
