// Pizza.js
// This class is ONE falling pizza.

class Pizza {
  // CONSTRUCTOR: picks a random type, position and speed
  constructor() {
    this.type = random([
      "margherita",
      "salamino",
      "rucola",
      "bianca",
      "ananas",
    ]);
    this.good = this.type !== "ananas";

    this.x = random(40, width - 40);
    this.y = -40;
    this.speed = random(2, 4);

    // the color of the topping depends on the type
    if (this.type === "margherita") this.topping = color(255, 250, 220); // mozzarella
    if (this.type === "salamino") this.topping = color(120, 0, 20); // salami
    if (this.type === "rucola") this.topping = color(50, 150, 40); // rocket
    if (this.type === "bianca") this.topping = color(230, 200, 120); // cheese
    if (this.type === "ananas") this.topping = color(255, 220, 0); // pineapple
  }

  // UPDATE: the pizza falls down
  update() {
    this.y += this.speed;
  }

  // SHOW: crust, sauce, 4 toppings, and the name under it
  show() {
    noStroke();
    fill(210, 150, 70); // crust
    circle(this.x, this.y, 70);

    // sauce: white for bianca, red for the others
    if (this.type === "bianca") fill(250, 245, 225);
    else fill(200, 40, 30);
    circle(this.x, this.y, 58);

    fill(this.topping); // toppings
    circle(this.x - 12, this.y - 10, 14);
    circle(this.x + 12, this.y - 8, 14);
    circle(this.x - 8, this.y + 12, 14);
    circle(this.x + 12, this.y + 12, 14);

    fill(255);
    textAlign(CENTER);
    textSize(13);
    text(this.type, this.x, this.y + 50);
  }

  // TOUCHES: true if the pizza is close to the mouth
  touches(mx, my) {
    return dist(this.x, this.y, mx, my) < 60;
  }

  // IS OFF SCREEN: true when the pizza fell below the canvas
  isOffScreen() {
    return this.y > height + 40;
  }
}
