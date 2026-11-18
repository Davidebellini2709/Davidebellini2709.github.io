// =====================================================================
// pizza.js — the Pizza class / la classe Pizza
// =====================================================================
// EN: This file defines a CLASS. A class is a recipe to make objects.
//     Every time the sketch writes "new Pizza()", it makes ONE new pizza.
// IT: Questo file definisce una CLASSE. Una classe è una ricetta per creare oggetti.
//     Ogni volta che lo sketch scrive "new Pizza()", crea UNA nuova pizza.
// EN: Methods of this class: update(), show(), isEaten(), isOffScreen().
// IT: Metodi di questa classe: update(), show(), isEaten(), isOffScreen().
// =====================================================================

// EN: Here the class is defined. Everything inside { } belongs to Pizza.
// IT: Qui viene definita la classe. Tutto dentro { } appartiene a Pizza.
class Pizza {
  // ---------- CONSTRUCTOR ----------
  // EN: Runs ONE time, when a new pizza is created. It sets its starting values.
  //     "this" means "this pizza".
  // IT: Parte UNA volta, quando viene creata una nuova pizza. Imposta i valori iniziali.
  //     "this" vuol dire "questa pizza".
  constructor() {
    // EN: pick a random type from the list (ananas is the bad one)
    // IT: sceglie un tipo a caso dalla lista (l'ananas è quella cattiva)
    this.type = random([
      "margherita",
      "salamino",
      "rucola",
      "bianca",
      "ananas",
    ]);
    this.r = 35; // EN: radius (half the size) / IT: raggio (metà della grandezza)

    // EN: random x from left to right, y just above the screen
    // IT: x a caso da sinistra a destra, y appena sopra lo schermo
    this.x = random(this.r, width - this.r);
    this.y = -this.r;

    // EN: random starting rotation and spin speed
    // IT: rotazione iniziale e velocità di rotazione a caso
    this.angle = random(TWO_PI);
    this.spin = random(-0.04, 0.04);
  }

  // ---------- UPDATE (method / metodo) ----------
  // EN: Runs every frame. The pizza goes down 3 pixels and turns a little.
  // IT: Parte a ogni frame. La pizza scende di 3 pixel e gira un po'.
  update() {
    this.y += 3;
    this.angle += this.spin;
  }

  // ---------- SHOW (method / metodo) ----------
  // EN: Draws the pizza with simple shapes: circles, ellipses, lines, rects.
  // IT: Disegna la pizza con forme semplici: cerchi, ellissi, linee, rettangoli.
  show() {
    // EN: push() saves the settings, pop() brings them back.
    //     So move, rotate and colors only change THIS pizza.
    // IT: push() salva le impostazioni, pop() le ripristina.
    //     Così spostamento, rotazione e colori cambiano solo QUESTA pizza.
    push();
    translate(this.x, this.y); // EN: (0, 0) is now the pizza center / IT: ora (0, 0) è il centro della pizza
    rotate(this.angle); // EN: turn the pizza / IT: ruota la pizza
    noStroke();

    // EN: crust (brown circle) / IT: crosta (cerchio marrone)
    fill(210, 150, 70);
    circle(0, 0, this.r * 2);

    // EN: sauce: red tomato, but white if the pizza is "bianca"
    // IT: sugo: pomodoro rosso, ma bianco se la pizza è "bianca"
    if (this.type === "bianca") fill(250, 245, 225);
    else fill(200, 40, 30);
    circle(0, 0, this.r * 1.7);

    // EN: mozzarella (white spots) / IT: mozzarella (macchie bianche)
    fill(255, 250, 220);
    circle(-10, -8, 16);
    circle(12, -5, 14);
    circle(-4, 12, 15);
    circle(14, 14, 10);

    // EN: toppings: with if / else, each type gets different toppings
    // IT: condimenti: con if / else, ogni tipo ha condimenti diversi
    if (this.type === "margherita") {
      // EN: basil leaves / IT: foglie di basilico
      fill(40, 140, 50);
      ellipse(5, 2, 12, 7);
      ellipse(-14, 6, 12, 7);
    } else if (this.type === "salamino") {
      // EN: salami slices / IT: fette di salame
      fill(150, 20, 30);
      circle(-12, -12, 11);
      circle(10, 8, 11);
      circle(-6, 16, 11);
      circle(16, -12, 11);
    } else if (this.type === "rucola") {
      // EN: green rocket leaves (lines) / IT: foglie di rucola (linee)
      stroke(60, 150, 40);
      strokeWeight(3);
      line(-18, -10, -5, -4);
      line(2, -15, 14, -6);
      line(-10, 10, 4, 18);
      line(8, 4, 20, 10);
    } else if (this.type === "ananas") {
      // EN: yellow pineapple cubes (the enemy) / IT: cubetti di ananas (il nemico)
      fill(255, 210, 0);
      rect(-15, -15, 9, 9);
      rect(6, -12, 9, 9);
      rect(-8, 6, 9, 9);
      rect(12, 10, 9, 9);
    }
    pop(); // EN: back to normal settings / IT: torna alle impostazioni normali

    // EN: the pizza name under it (after pop, so the text does not rotate)
    // IT: il nome sotto la pizza (dopo pop, così il testo non gira)
    fill(255);
    noStroke();
    textAlign(CENTER);
    textSize(13);
    text(this.type, this.x, this.y + this.r + 15);
  }

  // ---------- IS EATEN (method / metodo) ----------
  // EN: Here the pizza meets my body. It gets the mouth position (mx, my)
  //     and if the mouth is open. TRUE if the mouth is open AND
  //     less than 60 pixels from the pizza.
  // IT: Qui la pizza incontra il mio corpo. Riceve la posizione della bocca (mx, my)
  //     e se la bocca è aperta. VERO se la bocca è aperta E
  //     a meno di 60 pixel dalla pizza.
  isEaten(mx, my, open) {
    return open && dist(this.x, this.y, mx, my) < 60;
  }

  // ---------- IS OFF SCREEN (method / metodo) ----------
  // EN: TRUE when the pizza fell below the canvas.
  //     Then sketch.js removes it from the array with splice().
  // IT: VERO quando la pizza è caduta sotto il canvas.
  //     Allora sketch.js la toglie dall'array con splice().

  isOffScreen() {
    return this.y > height + this.r;
  }
}
