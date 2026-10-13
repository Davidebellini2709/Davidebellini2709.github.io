let bearX = 400;
let bearY = 300;
let speedX = 4;
let speedY = 3;
// position and speed of the bear like the previous exercise with the ball.

let halfWidth = 150;
let topSpace = 160;
let bottomSpace = 140;
// general measures for the bear.

let backgroundColors = [
  // ARRAY: colors for background.
  "#ffffff",
  "#0039a6",
  "#d52b1e",
];
let bgColor = backgroundColors[0];

let wordColors = [
  // ARRAY: colors for words.
  "#001a5c",
  "#6fa0ff",
  "#7a0f08",
  "#ff8a80",
];

let words = [];
let isYawning = false; // true while yawning.
let song;

function setup() {
  const canvas = createCanvas(800, 600);
  canvas.parent("sketch-holder");

  song = new Audio("song.mp3");
  song.loop = true;
  // If I press the spacebar for too long, the song will loop and not stop until I release the spacebar again.
}
function draw() {
  background(bgColor);

  if (isYawning && frameCount % 8 === 0 && words.length < 80) {
    spawnWord();
    // while I press the spacebar, every 8 frames a new word is created, up to a maximum of 80 words.
  }

  drawWords();

  if (!isYawning) {
    bearX = bearX + speedX;
    bearY = bearY + speedY;
    // If I'm not pressing the spacebar, the bear moves around.

    if (bearX >= width - halfWidth || bearX <= halfWidth) {
      speedX = speedX * -1;
    }
    // If the bear reaches the left or right edge, it bounces back by inverting its horizontal speed.

    if (bearY >= height - bottomSpace || bearY <= topSpace) {
      speedY = speedY * -1;
    }
    // If the bear reaches the top or bottom edge, it bounces back by inverting its vertical speed (like in the ball exercise)
  }

  drawBear(bearX, bearY, isYawning);
}
// If I draw the bear after it's not gonna be covered by the texts.

function spawnWord() {
  let newWord = {
    x: random(150, width - 150), // random position on the x-axis, with a margin of 150 pixels on both sides.
    y: random(50, height - 50),
    vx: random([-4, -2, 2, 2, 4]), // random velocity (never 0).
    vy: random([-3, -1.5, 1.5, 3]),
    size: random(20, 70), // random size.
    col: random(wordColors), // random color from the list above.
  };
  words.push(newWord); // push = add the new word to the end of the words array. AI helped me with this part, I'm not sure I understood it.
}
function drawWords() {
  noStroke();
  textAlign(CENTER, CENTER);
  // The text is centered on its position, horizontally and vertically.

  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    // cycle through all the words in the array and draw them on the canvas.

    w.x = w.x + w.vx;
    w.y = w.y + w.vy;
    // how the word moves according to its velocity.

    let halfW = w.size * 3.3;
    if (w.x < halfW || w.x > width - halfW) {
      w.vx = w.vx * -1;
    }
    if (w.y < w.size / 2 || w.y > height - w.size / 2) {
      w.vy = w.vy * -1;

      // how the word bounces off the edges of the canvas.
    }

    fill(w.col);
    textSize(w.size);
    text("TRI POLOSKI", w.x, w.y);
    // this draws the text at the position of the word, with its size and color. The text is always "TRI POLOSKI" because I wanted to make a joke about the bear's favorite food, which is salmon, and TRI POLOSKI is a brand of salmon in Italy.
  }
}
function drawBear(x, y, yawning) {
  noStroke();

  fill(130, 85, 50);
  circle(x - 110, y - 120, 80);
  circle(x + 110, y - 120, 80);
  fill(200, 150, 110);
  circle(x - 110, y - 120, 40);
  circle(x + 110, y - 120, 40);
  // ears

  fill(130, 85, 50);
  rect(x - 60, y + 20, 120, 80, 40);
  // body

  fill(130, 85, 50);
  circle(x, y, 280);
  // head

  fill(200, 150, 110);
  ellipse(x, y + 50, 140, 110);

  fill(30);
  triangle(x - 22, y + 20, x + 22, y + 20, x, y + 45);
  // Nose

  if (yawning) {
    fill(90, 20, 30);
    ellipse(x, y + 85, 70, 80); // bocca spalancata
    fill(230, 110, 120);
    ellipse(x, y + 100, 44, 30); // lingua
  } else {
    stroke(30);
    strokeWeight(4);
    noFill();
    arc(x, y + 60, 50, 30, 0, PI); // sorriso (mezza ellisse)
    noStroke();
  }
  // mouth, if it's yawning (pressing the space bar) or not.

  drawEye(x - 60, y - 40, yawning);
  drawEye(x + 60, y - 40, yawning);
  // Eyes, same function for both.
}

// draw the eyes, if it's yawning they become a line.
function drawEye(ex, ey, closed) {
  if (closed) {
    stroke(30);
    strokeWeight(5);
    line(ex - 20, ey, ex + 20, ey);
    noStroke();
  } else {
    fill(255);
    circle(ex, ey, 56);
    // White part of the eye.

    let offsetX = constrain((mouseX - ex) / 10, -12, 12);
    let offsetY = constrain((mouseY - ey) / 10, -12, 12);
    // The pupil moves towards the mouse and constrain() keeps it between -12 and +12.

    fill(20);
    circle(ex + offsetX, ey + offsetY, 24);
  }
}

// When the mouse is pressed, the bear's speed changes randomly.
function mousePressed() {
  speedX = random([-6, -3, 3, 6]);
  speedY = random([-5, -3, 3, 5]);
}

// it starts yawning when the spacebar is pressed, and stops when released. The background color changes randomly from the list, and the song plays while yawning.
function keyPressed() {
  if (key === " ") {
    isYawning = true;
    bgColor = random(backgroundColors);
    song.play();
    return false;
  }
}

// When the spacebar is released, the bear stops yawning and the music pauses.
function keyReleased() {
  if (key === " ") {
    isYawning = false;
    song.pause();
    words = [];
  }
}
