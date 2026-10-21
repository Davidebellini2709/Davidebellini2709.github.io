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

  // Normally the balls run away from the mouse, but holding the button makes them chase it
  let fleeStrength = mouseIsPressed ? -3 : 4;

  for (let ball of balls) {
    ball.change(mouseX, mouseY, pulse, fleeStrength);
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
    this.baseR = r; // return to the original size, so the heartbeat doesn't make it grow forever.
    this.speed = random(1, 3);
  }

  change(mx, my, pulseAmount, fleeStrength) {
    this.move();
    this.fleeFromMouse(mx, my, fleeStrength);
    this.heartbeat(pulseAmount, 0.25);
    this.show();
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

  // When the mouse gets close, the balls run away and the closer it is, the harder the push.
  // With a negative byHowMuch it's the opposite: the balls get sucked toward the mouse. Helped with Claude for this one too and connected it with the hearbeat.
  fleeFromMouse(mx, my, byHowMuch) {
    let d = dist(this.x, this.y, mx, my);
    let range = 100;
    if (d < range && d > 0) {
      let push = ((range - d) / range) * byHowMuch;
      this.x += ((this.x - mx) / d) * push;
      this.y += ((this.y - my) / d) * push;
    }
  }

  // The balls swell on every beat, following the same pulse that speeds them up,
  // so they look like blood cells pumped by a heart for real. byHowMuch sets how much they swell.
  heartbeat(pulseAmount, byHowMuch) {
    this.r = this.baseR * (1 + (pulseAmount - 0.7) * byHowMuch);
  }

  show() {
    stroke(90, 0, 0);
    strokeWeight(2);
    fill(this.color);
    circle(this.x, this.y, this.r);
  }
}
