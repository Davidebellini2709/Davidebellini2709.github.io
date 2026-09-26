function setup() {
  createCanvas(800, 500);
}

function draw() {
  background(135, 206, 235);

  stroke(0);
  strokeWeight(5);

  fill(255, 215, 0);
  circle(400, 250, 200);

  fill(255);
  circle(360, 220, 35);
  circle(440, 220, 35);

  fill(0);
  circle(360, 220, 15);
  circle(440, 220, 15);

  fill(0);
  ellipse(400, 290, 40, 60);
}
