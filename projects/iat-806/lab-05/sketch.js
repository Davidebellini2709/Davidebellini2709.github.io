let balls = [];
let numberOfBalls = 500;

let dirX = 0;
let dirY = 1;
let pulse = 1;

function setup() {
  createCanvas(600, 600);

  for (let i = 0; i < numberOfBalls; i++) {
    let x = random(0, 600);
    let y = random(0, 600);
    let c = color(
      random(150, 255),
      random(0, 30),
      random(0, 30),
      random(150, 255),
    );
    let r = random(8, 22);
    let ball = new Ball(x, y, c, r);
    balls.push(ball);
  }
}

function draw() {
  background(50, 0, 5);

  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    dirX = -1;
    dirY = 0;
  } else if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    dirX = 1;
    dirY = 0;
  } else if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
    dirX = 0;
    dirY = -1;
  } else if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
    dirX = 0;
    dirY = 1;
  }

  pulse = 0.7 + 2 * pow(max(0, sin(frameCount * 0.1)), 8); // I asked Claude for this formula, I wanted the pulse, but didn't know how to make it.

  for (let ball of balls) {
    ball.move();
    ball.show();
  }
}

function mousePressed() {
  window.focus();
}

function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    dirX = -1;
    dirY = 0;
  } else if (keyCode === RIGHT_ARROW) {
    dirX = 1;
    dirY = 0;
  } else if (keyCode === UP_ARROW) {
    dirX = 0;
    dirY = -1;
  } else if (keyCode === DOWN_ARROW) {
    dirX = 0;
    dirY = 1;
  }
  return false;
}

class Ball {
  constructor(x, y, c, r) {
    this.x = x;
    this.y = y;
    this.color = c;
    this.r = r;
    this.speed = random(1, 3);
  }

  move() {
    this.x += dirX * this.speed * pulse + (dirX === 0 ? random(-1, 1) : 0);
    this.y += dirY * this.speed * pulse + (dirY === 0 ? random(-1, 1) : 0);

    if (this.y > height) {
      this.y = 0;
    }
    if (this.y < 0) {
      this.y = height;
    }
    if (this.x > width) {
      this.x = 0;
    }
    if (this.x < 0) {
      this.x = width;
    }
  }

  show() {
    stroke(90, 0, 0);
    strokeWeight(2);
    fill(this.color);
    circle(this.x, this.y, this.r);
  }
}
