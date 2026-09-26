let circleX = 50;
let circleY = 50;
let speedX = 5;
let speedY = 5;
let size = 100;
let sizeIncrement = 1;
let radius = size / 2;

// cooler neon colors instead of basic red and blue (as you suggested).
let rightColor = "#00f5d4";
let leftColor = "#70d6ff";
let ballColor;

// So that the "game" is not paused when it starts.
let isPaused = false;

function setup() {
  const canvas = createCanvas(800, 600);
  canvas.parent("sketch-holder");
}

function draw() {
  // I added also the channel alpha (30) to the background for having a smoother trail effect.
  background(20, 20, 25, 30);

  // For this I used AI: I wanted a background that felt more vintage and retrogaming, but didn't want to add external files, so I asked AI to draw a digital retro grid for me.
  stroke(40, 40, 50, 50);
  strokeWeight(1);
  for (let i = 0; i < width; i += 40) {
    line(i, 0, i, height);
  }
  for (let j = 0; j < height; j += 40) {
    line(0, j, width, j);
  }

  // left half is one color, right half is the other
  if (circleX > width / 2) {
    ballColor = rightColor;
  } else {
    ballColor = leftColor;
  }
  fill(ballColor);

  // If it's not paused...
  if (!isPaused) {
    // move
    circleX = circleX + speedX;
    circleY = circleY + speedY;

    // grow (or shrink)
    size = size + sizeIncrement;
    radius = size / 2;

    // bounce off the left and right walls, and flip growing/shrinking
    if (circleX >= width - radius || circleX < radius) {
      speedX = speedX * -1;
      sizeIncrement = sizeIncrement * -1;
    }

    // bounce off the top and bottom walls
    if (circleY >= height - radius || circleY < radius) {
      speedY = speedY * -1;
    }
  }

  // Draw the ball
  circle(circleX, circleY, size);

  // My idea with AI help. I wanted text to appear when paused, AI helped me structure the alignment and text size.
  if (isPaused) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("PAUSED", width / 2, height / 2);
  }
}

// The mouse click change the ball direction randomly, with some limits so it doesn't get stuck with a speed of 0.
function mousePressed() {
  speedX = random([-7, -4, 4, 7]);
  speedY = random([-7, -4, 4, 7]);
}

// A keyPressed function to toggle the pause variable using the Spacebar.
function keyPressed() {
  if (key === " ") {
    isPaused = !isPaused;
  }
}
