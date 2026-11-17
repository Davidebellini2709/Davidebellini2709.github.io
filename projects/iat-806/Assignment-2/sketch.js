// PIZZA CHOMP — open your mouth to eat pizza. Never eat pineapple!

let faceMesh;
let video;
let faces = [];

let pizzas = []; // the array of Pizza objects
let state = "start"; // "start", "playing", "win", "lose"
let score = 0; // good pizzas eaten
let ananas = 0; // pineapple pizzas eaten

// the mouth: where it is and if it is open
let mouthX = 0;
let mouthY = 0;
let mouthOpen = false;

// PRELOAD: load the faceMesh model (flipped = like a mirror)
function preload() {
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true });
}

// SETUP: canvas inside #sketch-holder, webcam, start face detection
function setup() {
  let canvas = createCanvas(640, 480);
  canvas.parent("sketch-holder");
  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();
  faceMesh.detectStart(video, gotFaces);
}

// GOT FACES: ml5 sends the faces it finds here
function gotFaces(results) {
  faces = results;
}

// DRAW: read the mouth, then show the screen for the current state
function draw() {
  image(video, 0, 0, width, height);
  updateMouth();

  if (state === "start") {
    startScreen();
  } else if (state === "playing") {
    playGame();
  } else if (state === "win") {
    winScreen();
  } else if (state === "lose") {
    loseScreen();
  }
}

// UPDATE MOUTH: faceMesh gives 468 points on the face.
// 13 = upper lip, 14 = lower lip. If they are far apart, the mouth is open.
function updateMouth() {
  if (faces.length > 0) {
    let upperLip = faces[0].keypoints[13];
    let lowerLip = faces[0].keypoints[14];
    mouthX = upperLip.x;
    mouthY = (upperLip.y + lowerLip.y) / 2;
    mouthOpen = lowerLip.y - upperLip.y > 15;
  } else {
    mouthOpen = false;
  }

  // draw a circle on the mouth: pink when open
  if (mouthOpen) fill(255, 80, 120, 150);
  else noFill();
  stroke(255);
  strokeWeight(3);
  circle(mouthX, mouthY, 80);
}

// START SCREEN: the rules
function startScreen() {
  fill(255);
  noStroke();
  textAlign(CENTER);
  textSize(50);
  text("PIZZA CHOMP", width / 2, 150);
  textSize(20);
  text("Open your mouth to eat pizza. Eat 15 to win.", width / 2, 210);
  text("Eat 3 pizzas with ananas and you lose!", width / 2, 240);
  text("Click to start", width / 2, 300);
}

// PLAY GAME: add, move, eat and remove pizzas
function playGame() {
  // ADD a new pizza every second (60 frames)
  if (frameCount % 60 === 0) {
    pizzas.push(new Pizza());
  }

  // go backwards because we remove pizzas with splice
  for (let i = pizzas.length - 1; i >= 0; i--) {
    pizzas[i].update();
    pizzas[i].show();

    // EAT: mouth open and the pizza touches the mouth
    if (mouthOpen && pizzas[i].touches(mouthX, mouthY)) {
      if (pizzas[i].good) score++;
      else ananas++;
      pizzas.splice(i, 1); // REMOVE: eaten
    } else if (pizzas[i].isOffScreen()) {
      pizzas.splice(i, 1); // REMOVE: fell down
    }
  }

  // score on the screen
  fill(255);
  noStroke();
  textSize(24);
  textAlign(LEFT);
  text("Pizza: " + score + "/15", 15, 30);
  text("Ananas: " + ananas + "/3", 15, 60);

  // WIN or LOSE
  if (score >= 15) state = "win";
  if (ananas >= 3) state = "lose";
}

// WIN SCREEN: big Italian flag
function winScreen() {
  noStroke();
  fill(0, 146, 70);
  rect(0, 0, width / 3, height);
  fill(255);
  rect(width / 3, 0, width / 3, height);
  fill(206, 43, 55);
  rect((width / 3) * 2, 0, width / 3, height);

  fill(0);
  textAlign(CENTER);
  textSize(50);
  text("REAL ITALIAN", width / 2, 220);
  text("CERTIFIED ✅", width / 2, 280);
  textSize(20);
  text("Click to play again", width / 2, 400);
}

// LOSE SCREEN: crying American flag
function loseScreen() {
  // red and white stripes, made with a loop
  noStroke();
  for (let i = 0; i < 13; i++) {
    if (i % 2 === 0) fill(178, 34, 52);
    else fill(255);
    rect(0, i * (height / 13), width, height / 13);
  }
  fill(60, 59, 110);
  rect(0, 0, 260, 260); // blue square

  // sad face with tears
  fill(255, 220, 80);
  circle(420, 220, 150);
  fill(0);
  circle(395, 200, 12); // eyes
  circle(445, 200, 12);
  fill(80, 160, 255);
  ellipse(395, 225 + (frameCount % 40), 10, 16); // tears falling
  ellipse(445, 225 + (frameCount % 40), 10, 16);

  fill(0);
  textAlign(CENTER);
  textSize(36);
  text("GO BACK TO YOUR COUNTRY 🍍", width / 2, 400);
  textSize(20);
  text("Click to play again", width / 2, 440);
}

// MOUSE PRESSED: click to start or restart
function mousePressed() {
  if (state !== "playing") {
    score = 0;
    ananas = 0;
    pizzas = [];
    // start with 3 pizzas, made with a loop
    for (let i = 0; i < 3; i++) {
      pizzas.push(new Pizza());
    }
    state = "playing";
  }
}
