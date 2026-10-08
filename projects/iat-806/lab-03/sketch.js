console.log("nothing important here");

let frames = [];
let numFrames = 7;
let currentFrame = 0;
let frameSpeed = 8;

function preload() {
  // Carica tutti i frame nella cartella dance_frames
  for (let i = 1; i <= numFrames; i++) {
    frames.push(loadImage(`dance_frames/punch_${i}.png`));
  }
}

function setup() {
  let canvas = createCanvas(500, 400);
  canvas.parent("sketch-holder");

  console.log("Totale frame caricati:", frames.length);

  // Stampa le dimensioni della prima immagine per verificare che non sia vuota
  if (frames.length > 0) {
    console.log("Dimensioni frame 1:", frames[0].width, "x", frames[0].height);
  }
}

function draw() {
  // Disegna lo sfondo del canvas
  background(255);

  // Se non ci sono frame caricati, si ferma qui
  if (frames.length === 0) {
    return;
  }

  // Calcola quale frame mostrare
  currentFrame = floor(frameCount / frameSpeed) % frames.length;
  let img = frames[currentFrame];

  // Se l'immagine non è ancora caricata o non ha dimensioni, evita di disegnarla
  if (!img || img.width === 0 || img.height === 0) {
    return;
  }

  // Mantiene le proporzioni originali e adatta l'immagine al canvas
  let scale = min(width / img.width, height / img.height);
  let imgWidth = img.width * scale;
  let imgHeight = img.height * scale;

  let x = (width - imgWidth) / 2;
  let y = (height - imgHeight) / 2;

  // Disegna l'immagine centrata
  image(img, x, y, imgWidth, imgHeight);
}

function keyPressed() {
  if (key === "s" || key === "S") {
    saveGif("character-animation", 2.67);
  }
}
