let x = 400;
let y = 300;

let speedx = 4;
let speedY = 2;

function setup() {
  const canvas = createCanvas(800, 600);
  canvas.parent("sketch-holder");
}

function draw() {
  background(0, 100, 0);

  stroke(0);
  strokeWeight(3);
  fill(0, 500, 0);

  fill(0, 400, 0);
  circle(x, y, 80);

  x = x + speedx;
  y = y + speedY;

  if (x > width) {
    x = 0;
  } else if (x < 0) {
    x = width;
  }

  if (y > height) {
    y = 0;
  } else if (y < 0) {
    y = height;
  }
}
