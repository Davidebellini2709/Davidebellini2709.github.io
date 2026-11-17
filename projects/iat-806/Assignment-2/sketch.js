let faceMesh;
let video;
let faces = [];

let pizzas = []; // the array of Pizza objects
let state = "start"; // "start", "playing", "win", "lose"
let score = 0; // good pizzas eaten
let ananas = 0; // pineapple pizzas eaten

let mouthX = 0;
let mouthY = 0;
let mouthOpen = false;

// the two images: lose1 = win screen, lose2 = lose screen
let img1;
let img2;

// PRELOAD: load the faceMesh model
function preload() {
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true });
}

// SETUP: load the two images, canvas inside #sketch-holder,
// webcam, start face detection.
// (images are loaded here and not in preload, so the game
// does not get stuck on "Loading..." if an image is missing)
function setup() {
  img1 = loadImage("lose1.png");
  img2 = loadImage("lose2.png");
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

// DRAW: one screen for each game state
function draw() {
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

// MOUTH: faceMesh gives 468 points on the face.
// 13 = upper lip, 14 = lower lip. Far apart = mouth open.
function updateMouth() {
  if (faces.length > 0) {
    let upperLip = faces[0].keypoints[13];
    let lowerLip = faces[0].keypoints[14];
    mouthX = upperLip.x;
    mouthY = upperLip.y;
    mouthOpen = lowerLip.y - upperLip.y > 15;
  }

  // a circle on the mouth, pink when it is open
  if (mouthOpen) fill(255, 80, 120, 150);
  else noFill();
  stroke(255);
  strokeWeight(3);
  circle(mouthX, mouthY, 80);
}

// START SCREEN: webcam and the rules
function startScreen() {
  image(video, 0, 0, width, height);
  fill(255);
  noStroke();
  textAlign(CENTER);
  textSize(50);
  text("PIZZA RAIN", width / 2, 150);
  textSize(20);
  text("Open your mouth to eat pizza. Eat 10 to win.", width / 2, 210);
  text("Eat 3 pizzas with pineapple and you lose!", width / 2, 240);
  text("Click to start", width / 2, 300);
}

// START GAME: reset everything and make 3 pizzas with a loop
function startGame() {
  score = 0;
  ananas = 0;
  pizzas = [];
  for (let i = 0; i < 3; i++) {
    pizzas.push(new Pizza());
  }
  state = "playing";
}

// PLAY GAME: add, move, eat and remove pizzas
function playGame() {
  image(video, 0, 0, width, height);
  updateMouth();

  // ADD: a new pizza every second (60 frames)
  if (frameCount % 60 === 0) {
    pizzas.push(new Pizza());
  }

  // go backwards because we remove pizzas with splice
  for (let i = pizzas.length - 1; i >= 0; i--) {
    let p = pizzas[i];
    p.update();
    p.show();

    if (p.isEaten(mouthX, mouthY, mouthOpen)) {
      if (p.type === "ananas") ananas++;
      else score++;
      pizzas.splice(i, 1); // REMOVE: eaten
    } else if (p.isOffScreen()) {
      pizzas.splice(i, 1); // REMOVE: fell down
    }
  }

  // SCORE on the screen
  fill(255);
  noStroke();
  textSize(24);
  textAlign(LEFT);
  text("Pizza: " + score + "/10", 15, 30);
  text("Ananas: " + ananas + "/3", 15, 60);

  // WIN or LOSE
  if (score >= 10) state = "win";
  if (ananas >= 3) state = "lose";
}

// WIN SCREEN: image lose1.png fills the whole canvas
function winScreen() {
  image(img1, 0, 0, width, height);

  fill(0);
  noStroke();
  textAlign(CENTER);
  textSize(50);
  text("REAL ITALIAN", width / 2, 220);
  text("CERTIFIED ✅", width / 2, 280);
  textSize(20);
  text("Click to play again", width / 2, 420);
}

// image lose2.png fills the whole canvas
function loseScreen() {
  image(img2, 0, 0, width, height);

  fill(0);
  noStroke();
  textAlign(CENTER);
  textSize(36);
  text("GO BACK TO YOUR COUNTRY 🍍", width / 2, 200);
  textSize(20);
  text("Click to play again", width / 2, 440);
}

// CLICK: start or restart the game
function mousePressed() {
  if (state !== "playing") startGame();
}
