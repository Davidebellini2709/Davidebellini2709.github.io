// EN: The main file of the game. Pizzas fall, I open my mouth to eat them.
//     10 good pizzas = I win. 3 pizzas with pineapple = I lose.
//     ml5 faceMesh finds my face with the webcam.
// IT: Il file principale del gioco. Le pizze cadono, apro la bocca per mangiarle.
//     10 pizze buone = vinco. 3 pizze con l'ananas = perdo.
//     ml5 faceMesh trova la mia faccia con la webcam.

// ---------- GLOBAL VARIABLES / VARIABILI GLOBALI ----------
// EN: Variables outside the functions: every function can use them.
// IT: Variabili fuori dalle funzioni: tutte le funzioni le possono usare.

// EN: the ml5 model, the webcam, and the faces it finds
// IT: il modello ml5, la webcam e le facce che trova
let faceMesh;
let video;
let faces = [];

let pizzas = []; // EN: the ARRAY of Pizza objects / IT: l'ARRAY degli oggetti Pizza
let state = "start"; // EN: game state: "start", "playing", "win", "lose" / IT: stato del gioco
let score = 0; // EN: good pizzas eaten / IT: pizze buone mangiate
let ananas = 0; // EN: pineapple pizzas eaten / IT: pizze con l'ananas mangiate

// EN: where the mouth is, and if it is open
// IT: dove si trova la bocca, e se è aperta
let mouthX = 0;
let mouthY = 0;
let mouthOpen = false;

// EN: the two images: lose1 = win screen, lose2 = lose screen
// IT: le due immagini: lose1 = schermata vittoria, lose2 = schermata sconfitta
let img1;
let img2;

// ---------- PRELOAD ----------
// EN: Runs before setup(). Loads the faceMesh model.
//     flipped: true = the camera works like a mirror.
// IT: Parte prima di setup(). Carica il modello faceMesh.
//     flipped: true = la camera funziona come uno specchio.
function preload() {
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true });
}

// ---------- SETUP ----------
// EN: Runs one time at the start: loads the images, makes the canvas,
//     turns on the webcam and starts looking for my face.
// IT: Parte una volta all'inizio: carica le immagini, crea il canvas,
//     accende la webcam e inizia a cercare la mia faccia.
function setup() {
  // EN: images loaded here (not in preload), so the game does not get stuck if one is missing
  // IT: immagini caricate qui (non in preload), così il gioco non si blocca se ne manca una
  img1 = loadImage("lose1.png");
  img2 = loadImage("lose2.png");

  // EN: canvas 640x480, placed inside <div id="sketch-holder"> of the page
  // IT: canvas 640x480, messo dentro il <div id="sketch-holder"> della pagina
  let canvas = createCanvas(640, 480);
  canvas.parent("sketch-holder");

  // EN: webcam mirrored, hidden because I draw it myself with image()
  // IT: webcam a specchio, nascosta perché la disegno io con image()
  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();

  // EN: faceMesh keeps looking at the webcam and calls gotFaces()
  // IT: faceMesh guarda sempre la webcam e chiama gotFaces()
  faceMesh.detectStart(video, gotFaces);
}

// ---------- GOT FACES ----------
// EN: ml5 calls this every time it finds faces. I save them in "faces".
// IT: ml5 chiama questa funzione ogni volta che trova delle facce. Le salvo in "faces".
function gotFaces(results) {
  faces = results;
}

// ---------- DRAW ----------
// EN: Runs 60 times per second. GAME STATES: with if / else it shows
//     a different screen for each state.
// IT: Parte 60 volte al secondo. STATI DEL GIOCO: con if / else mostra
//     una schermata diversa per ogni stato.
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

// ---------- MOUTH / BOCCA ----------
// EN: Here my body controls the game. faceMesh gives 468 points on the face.
//     Point 13 = upper lip, point 14 = lower lip.
//     If they are more than 15 pixels apart, the mouth is open.
// IT: Qui il mio corpo controlla il gioco. faceMesh dà 468 punti sulla faccia.
//     Punto 13 = labbro superiore, punto 14 = labbro inferiore.
//     Se sono distanti più di 15 pixel, la bocca è aperta.
function updateMouth() {
  // EN: only if a face was found / IT: solo se ha trovato una faccia
  if (faces.length > 0) {
    let upperLip = faces[0].keypoints[13];
    let lowerLip = faces[0].keypoints[14];
    mouthX = upperLip.x;
    mouthY = upperLip.y;
    mouthOpen = lowerLip.y - upperLip.y > 15;
  }

  // EN: a circle on the mouth, pink when it is open
  // IT: un cerchio sulla bocca, rosa quando è aperta
  if (mouthOpen) fill(255, 80, 120, 150);
  else noFill();
  stroke(255);
  strokeWeight(3);
  circle(mouthX, mouthY, 80);
}

// ---------- START SCREEN / SCHERMATA INIZIALE ----------
// EN: Shows the webcam and the rules, and waits for a click.
// IT: Mostra la webcam e le regole, e aspetta un clic.
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

// ---------- START GAME / INIZIO PARTITA ----------
// EN: Resets the score and the array, then makes the first pizzas.
// IT: Azzera il punteggio e l'array, poi crea le prime pizze.
function startGame() {
  score = 0;
  ananas = 0;
  pizzas = [];

  // EN: FOR LOOP: runs 3 times. Each time it makes a new Pizza
  //     and adds it to the array with push().
  // IT: CICLO FOR: gira 3 volte. Ogni volta crea una nuova Pizza
  //     e la aggiunge all'array con push().
  for (let i = 0; i < 3; i++) {
    pizzas.push(new Pizza());
  }

  // EN: change the state, so draw() shows the game
  // IT: cambia lo stato, così draw() mostra il gioco
  state = "playing";
}

// ---------- PLAY GAME / IL GIOCO ----------
// EN: The real game: add, move, eat and remove pizzas.
// IT: Il gioco vero: aggiunge, muove, mangia e toglie le pizze.
function playGame() {
  // EN: draw the webcam, then read and draw the mouth
  // IT: disegna la webcam, poi legge e disegna la bocca
  image(video, 0, 0, width, height);
  updateMouth();

  // EN: ADD: every 60 frames (one second) a new pizza with push()
  // IT: AGGIUNGI: ogni 60 frame (un secondo) una nuova pizza con push()
  if (frameCount % 60 === 0) {
    pizzas.push(new Pizza());
  }

  // EN: FOR LOOP on all the pizzas. It goes BACKWARDS because
  //     splice() removes pizzas, and forwards it would skip one.
  // IT: CICLO FOR su tutte le pizze. Va ALL'INDIETRO perché
  //     splice() toglie le pizze, e in avanti ne salterebbe una.
  for (let i = pizzas.length - 1; i >= 0; i--) {
    let p = pizzas[i];
    p.update(); // EN: move it down / IT: la sposta in giù
    p.show(); // EN: draw it / IT: la disegna

    // EN: my mouth touches the pizza: ananas = bad, the others = good
    // IT: la mia bocca tocca la pizza: ananas = cattiva, le altre = buone
    if (p.isEaten(mouthX, mouthY, mouthOpen)) {
      if (p.type === "ananas") ananas++;
      else score++;
      pizzas.splice(i, 1); // EN: REMOVE: eaten / IT: TOGLI: mangiata
    } else if (p.isOffScreen()) {
      pizzas.splice(i, 1); // EN: REMOVE: fell down / IT: TOGLI: caduta fuori
    }
  }

  // EN: SCORE on the screen with text()
  // IT: PUNTEGGIO sullo schermo con text()
  fill(255);
  noStroke();
  textSize(24);
  textAlign(LEFT);
  text("Pizza: " + score + "/10", 15, 30);
  text("Ananas: " + ananas + "/3", 15, 60);

  // EN: WIN or LOSE: change the state, and the screen changes
  // IT: VITTORIA o SCONFITTA: cambia lo stato, e cambia la schermata
  if (score >= 10) state = "win";
  if (ananas >= 3) state = "lose";
}

// ---------- WIN SCREEN / SCHERMATA VITTORIA ----------
// EN: lose1.png fills the whole canvas, with the text on top.
// IT: lose1.png riempie tutto il canvas, con il testo sopra.
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

// ---------- LOSE SCREEN / SCHERMATA SCONFITTA ----------
// EN: lose2.png fills the whole canvas, with the text on top.
// IT: lose2.png riempie tutto il canvas, con il testo sopra.
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

// ---------- CLICK / CLIC ----------
// EN: p5 calls this when I click. If I am not playing, the game starts.
// IT: p5 la chiama quando clicco. Se non sto giocando, il gioco parte.
function mousePressed() {
  if (state !== "playing") startGame();
}
