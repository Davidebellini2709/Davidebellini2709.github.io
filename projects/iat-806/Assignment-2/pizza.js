class Pizza {
  // CONSTRUCTOR: random type, random position at the top, random rotation
  constructor() {
    this.type = random([
      "margherita",
      "salamino",
      "rucola",
      "bianca",
      "ananas",
    ]);
    this.r = 35; // radius
    this.x = random(this.r, width - this.r);
    this.y = -this.r;
    this.angle = random(TWO_PI);
    this.spin = random(-0.04, 0.04);
  }

  // UPDATE: the pizza falls down and spins a little
  update() {
    this.y += 3;
    this.angle += this.spin;
  }

  // SHOW: draws the pizza with simple shapes (circles, lines, rects)
  show() {
    push();
    translate(this.x, this.y); // move the origin to the pizza center
    rotate(this.angle);
    noStroke();

    // crust (brown circle)
    fill(210, 150, 70);
    circle(0, 0, this.r * 2);

    // sauce: red tomato, but white if the pizza is "bianca"
    if (this.type === "bianca") fill(250, 245, 225);
    else fill(200, 40, 30);
    circle(0, 0, this.r * 1.7);

    // mozzarella (white spots)
    fill(255, 250, 220);
    circle(-10, -8, 16);
    circle(12, -5, 14);
    circle(-4, 12, 15);
    circle(14, 14, 10);

    // toppings: different for each type
    if (this.type === "margherita") {
      // basil leaves
      fill(40, 140, 50);
      ellipse(5, 2, 12, 7);
      ellipse(-14, 6, 12, 7);
    } else if (this.type === "salamino") {
      // salami slices
      fill(150, 20, 30);
      circle(-12, -12, 11);
      circle(10, 8, 11);
      circle(-6, 16, 11);
      circle(16, -12, 11);
    } else if (this.type === "rucola") {
      // green rocket leaves
      stroke(60, 150, 40);
      strokeWeight(3);
      line(-18, -10, -5, -4);
      line(2, -15, 14, -6);
      line(-10, 10, 4, 18);
      line(8, 4, 20, 10);
    } else if (this.type === "ananas") {
      // yellow pineapple cubes (the enemy)
      fill(255, 210, 0);
      rect(-15, -15, 9, 9);
      rect(6, -12, 9, 9);
      rect(-8, 6, 9, 9);
      rect(12, 10, 9, 9);
    }
    pop();

    // the pizza name written under it
    fill(255);
    noStroke();
    textAlign(CENTER);
    textSize(13);
    text(this.type, this.x, this.y + this.r + 15);
  }

  // IS EATEN: true if the mouth is open and close to the pizza
  isEaten(mx, my, open) {
    return open && dist(this.x, this.y, mx, my) < 60;
  }

  // IS OFF SCREEN: true when the pizza fell below the canvas
  isOffScreen() {
    return this.y > height + this.r;
  }
}
