let salmon = [];
let birds = [];
let clouds = [];
let logs = [];
let rocks = [];
let rapids = [];

let riverY = 335;
let bearX = 400;

let score = 0;
let lives = 3;
let gameState = "playing";
let isPaused = false;

let eatingTimer = 0;
let catchTimer = 0;
let hurtTimer = 0;
let deathTimer = 0;
let winTimer = 0;

let difficulty = 1;
let jumpChance = 0.012;

// --------------------------------------------------
// SETUP
// --------------------------------------------------

function setup() {
  pixelDensity(1);

  let canvas = createCanvas(800, 500);
  canvas.parent("sketch-holder");

  noStroke();
  textFont("monospace");

  for (let i = 0; i < 14; i++) {
    salmon.push(createSalmon(random(width)));
  }

  for (let i = 0; i < 4; i++) {
    birds.push({
      x: random(width),
      y: random(65, 150),
      speed: random(0.5, 1.3),
      size: random(6, 10),
    });
  }

  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: random(width),
      y: random(30, 100),
      w: random(60, 120),
    });
  }

  for (let i = 0; i < 4; i++) {
    logs.push({
      x: random(width),
      y: random(360, 455),
      speed: random(0.5, 1.4),
      w: random(45, 85),
    });
  }

  for (let i = 0; i < 9; i++) {
    rocks.push({
      x: random(width),
      y: random(345, 480),
      w: random(20, 48),
      h: random(10, 23),
    });
  }

  for (let i = 0; i < 7; i++) {
    rapids.push({
      x: random(width),
      y: random(350, 465),
      w: random(35, 75),
      speed: random(0.5, 1.2),
    });
  }
}

function createSalmon(x) {
  return {
    x: x,
    y: riverY + random(25, 100),
    speed: random(1, 2.2),
    jumping: false,
    jumpProgress: 0,
    jumpDuration: random(32, 48),
    jumpHeight: random(65, 115),
    jumpStartY: riverY + 8,
    rotten: random() < 0.18,
    visible: true,
    hideTimer: 0,
    splashTimer: 0,
  };
}

// --------------------------------------------------
// MAIN DRAW LOOP
// --------------------------------------------------

function draw() {
  drawSky();
  drawMountains();
  drawForest();
  drawRiver();

  if (gameState === "dead") {
    drawRiverObjects();
    drawBirds();
    drawBear();
    drawDeathAnimation();
    drawScore();
    return;
  }

  if (gameState === "won") {
    drawRiverObjects();
    drawBirds();
    drawBear();
    drawVictory();
    drawScore();
    return;
  }

  if (isPaused) {
    drawRiverObjects();
    drawBirds();
    drawSubmergedSalmon();
    drawJumpingSalmon();
    drawBear();
    drawPauseSign();
    drawScore();
    return;
  }

  bearX = constrain(mouseX, 40, width - 40);

  difficulty = 1 + score / 20;
  jumpChance = min(0.045, 0.012 + score * 0.0003);

  updateSalmon();

  drawRiverObjects();
  drawBirds();

  drawSubmergedSalmon();
  drawJumpingSalmon();

  drawBear();

  if (eatingTimer > 0) {
    eatingTimer--;

    fill(255, 235, 190);
    textAlign(CENTER);
    textSize(18);
    text("NOM!", bearX, 205);
  }

  if (catchTimer > 0) {
    catchTimer--;
  }

  if (hurtTimer > 0) {
    hurtTimer--;

    fill(150, 220, 100);
    textAlign(CENTER);
    textSize(17);
    text("UGH!!", bearX, 205);
  }

  drawScore();
}

// --------------------------------------------------
// SKY AND CLOUDS
// --------------------------------------------------

function drawSky() {
  background(155, 184, 195);

  fill(195, 211, 213);

  for (let cloud of clouds) {
    rect(cloud.x, cloud.y, cloud.w, 12);
    rect(cloud.x + 15, cloud.y - 8, cloud.w * 0.5, 12);
    rect(cloud.x + 25, cloud.y + 8, cloud.w * 0.4, 5);

    if (!isPaused) {
      cloud.x -= 0.25;
    }

    if (cloud.x < -cloud.w) {
      cloud.x = width + random(20, 100);
      cloud.y = random(30, 100);
    }
  }
}

// --------------------------------------------------
// MOUNTAINS
// --------------------------------------------------

function drawMountains() {
  fill(111, 139, 148);

  triangle(0, 270, 170, 75, 350, 270);
  triangle(210, 270, 450, 55, 700, 270);
  triangle(550, 270, 720, 105, 850, 270);

  fill(225, 230, 219);

  triangle(170, 75, 130, 125, 180, 112);
  triangle(170, 75, 205, 125, 180, 112);

  triangle(450, 55, 405, 110, 460, 95);
  triangle(450, 55, 500, 115, 460, 95);

  triangle(720, 105, 690, 145, 730, 137);
  triangle(720, 105, 750, 145, 730, 137);

  fill(87, 119, 102);
  rect(0, 255, width, 70);

  triangle(0, 325, 150, 235, 300, 325);
  triangle(450, 325, 640, 245, 800, 325);
}

// --------------------------------------------------
// FOREST AND RIVERBANK
// --------------------------------------------------

function drawForest() {
  for (let x = 15; x < width; x += 55) {
    let treeHeight = 25 + ((x * 7) % 35);

    fill(55, 83, 67);

    triangle(x, 295 - treeHeight, x - 18, 300, x + 18, 300);

    fill(78, 91, 67);
    rect(x - 3, 290, 6, 15);
  }

  fill(92, 100, 72);
  rect(0, 305, width, 30);

  fill(119, 126, 83);
  rect(0, 305, width, 5);
}

// --------------------------------------------------
// RIVER, CURRENT AND RAPIDS
// --------------------------------------------------

function drawRiver() {
  noStroke();

  // Deep water
  fill(35, 76, 91);
  rect(0, riverY, width, height - riverY);

  // Shallow water near the bank
  fill(64, 119, 128);
  rect(0, riverY, width, 12);

  // Underwater currents
  fill(29, 64, 78);

  for (let i = 0; i < 12; i++) {
    let x = ((frameCount * 0.45 + i * 79) % (width + 60)) - 30;
    let y = riverY + 30 + ((i * 31) % 125);

    rect(x, y, 42, 7);
    rect(x + 12, y + 8, 22, 3);
  }

  // Water reflections
  for (let i = 0; i < 17; i++) {
    let x = (frameCount * (0.55 + (i % 3) * 0.25) + i * 61) % width;
    let y = riverY + 20 + ((i * 29) % 135);

    fill(72, 126, 137);
    rect(x, y, 25 + (i % 4) * 7, 3);

    fill(104, 155, 158);
    rect(x + 8, y + 5, 12, 2);
  }

  // Rapids and foam
  for (let rapid of rapids) {
    if (!isPaused) {
      rapid.x -= rapid.speed * difficulty;
    }

    if (rapid.x < -rapid.w) {
      rapid.x = width + random(30, 150);
      rapid.y = random(350, 465);
    }

    fill(91, 144, 151);
    rect(rapid.x, rapid.y, rapid.w, 7);

    fill(164, 194, 190);
    rect(rapid.x + 4, rapid.y - 3, rapid.w * 0.45, 3);
    rect(rapid.x + rapid.w * 0.5, rapid.y + 5, rapid.w * 0.3, 3);

    fill(208, 219, 205);
    rect(rapid.x + 12, rapid.y - 1, 10, 3);
    rect(rapid.x + rapid.w * 0.65, rapid.y + 2, 14, 3);
  }

  // Surface ripples
  fill(119, 164, 164);

  for (let i = 0; i < 14; i++) {
    let x = (frameCount * 1.1 + i * 67) % width;
    let y = riverY + 8 + ((i * 23) % 145);

    rect(x, y, 17 + (i % 3) * 8, 2);
  }

  // Riverbank
  fill(103, 96, 69);
  rect(0, riverY - 5, width, 8);

  fill(150, 139, 99);
  rect(0, riverY - 5, width, 3);

  fill(31, 65, 76);
  rect(0, riverY + 1, width, 3);
}

// --------------------------------------------------
// FLOATING LOGS AND STATIONARY ROCKS
// --------------------------------------------------

function drawRiverObjects() {
  // Rocks remain stationary
  for (let rock of rocks) {
    fill(62, 83, 88);
    rect(rock.x, rock.y, rock.w, rock.h);

    fill(91, 111, 113);
    rect(rock.x + 4, rock.y, rock.w * 0.55, 5);

    fill(43, 65, 75);
    rect(rock.x + rock.w * 0.65, rock.y + 5, rock.w * 0.25, 4);
  }

  // Logs drift downstream
  for (let log of logs) {
    if (!isPaused) {
      log.x -= log.speed * difficulty;
    }

    if (log.x < -log.w) {
      log.x = width + random(30, 160);
      log.y = random(360, 455);
      log.w = random(45, 85);
    }

    fill(70, 54, 39);
    rect(log.x, log.y, log.w, 10);

    fill(113, 83, 52);
    rect(log.x + 4, log.y + 2, log.w - 10, 4);

    fill(157, 119, 74);
    rect(log.x + log.w - 8, log.y, 8, 10);

    fill(82, 103, 105);
    rect(log.x - 3, log.y + 10, log.w + 8, 3);
  }
}

// --------------------------------------------------
// SALMON MOVEMENT
// --------------------------------------------------

function updateSalmon() {
  for (let fish of salmon) {
    if (!fish.visible) {
      fish.hideTimer--;

      if (fish.hideTimer <= 0) {
        fish.visible = true;
        fish.x = random(width * 0.5, width + 100);
        fish.y = riverY + random(25, 100);
        fish.speed = random(1, 2.2);
        fish.rotten = random() < 0.18;
      }

      continue;
    }

    if (!fish.jumping) {
      // Swim underwater
      fish.x -= fish.speed * difficulty;

      fish.y = riverY + 25 + sin(frameCount * 0.055 + fish.x * 0.04) * 10;

      // Chance to jump
      if (random() < jumpChance) {
        fish.jumping = true;
        fish.jumpProgress = 0;
        fish.jumpDuration = random(32, 48);
        fish.jumpHeight = random(65, 115);
        fish.jumpStartY = riverY + random(4, 13);
        fish.splashTimer = 12;
      }
    } else {
      // Jump in an arc
      fish.jumpProgress++;

      let t = fish.jumpProgress / fish.jumpDuration;

      fish.x -= fish.speed * difficulty * 1.15;

      fish.y = fish.jumpStartY - sin(t * PI) * fish.jumpHeight;

      // Re-enter the water and disappear
      if (fish.jumpProgress >= fish.jumpDuration) {
        fish.jumping = false;
        fish.visible = false;
        fish.hideTimer = random(20, 65);
        fish.splashTimer = 0;
      }
    }

    // Respawn on the right
    if (fish.x < -35) {
      fish.x = width + random(30, 180);
      fish.y = riverY + random(25, 100);
      fish.speed = random(1, 2.2);
      fish.jumping = false;
      fish.visible = true;
      fish.rotten = random() < 0.18;
    }
  }
}

// --------------------------------------------------
// DRAW SUBMERGED SALMON
// --------------------------------------------------

function drawSubmergedSalmon() {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0, riverY + 2, width, height - riverY - 2);
  drawingContext.clip();

  for (let fish of salmon) {
    if (!fish.visible || fish.jumping) continue;

    push();
    translate(fish.x, fish.y);

    // Muted colors underwater
    if (fish.rotten) {
      fill(91, 120, 66, 190);
    } else {
      fill(130, 170, 174, 210);
    }

    drawSalmonShape(fish, true);
    pop();
  }

  drawingContext.restore();

  // Ripples above swimming fish
  for (let fish of salmon) {
    if (!fish.visible || fish.jumping) continue;

    let rippleWidth = 14 + sin(frameCount * 0.12 + fish.x) * 5;

    fill(154, 190, 183, 100);
    rect(fish.x - rippleWidth / 2, riverY + 14, rippleWidth, 2);
  }
}

// --------------------------------------------------
// DRAW JUMPING SALMON AND SPLASHES
// --------------------------------------------------

function drawJumpingSalmon() {
  for (let fish of salmon) {
    if (!fish.visible || !fish.jumping) continue;

    let t = fish.jumpProgress / fish.jumpDuration;

    // Shadow on the water
    let shadowSize = 22 - sin(t * PI) * 12;

    fill(22, 53, 63, 100);
    ellipse(fish.x, riverY + 8, shadowSize, 5);

    // Takeoff splash
    if (fish.splashTimer > 0) {
      fish.splashTimer--;

      for (let i = 0; i < 5; i++) {
        let dx = (i - 2) * 5;
        let dy = (fish.splashTimer % 6) * 2;

        fill(171, 211, 204);
        rect(fish.x + dx, riverY - dy, 3, 5);
      }
    }

    // Fish tilts slightly during the jump
    push();
    translate(fish.x, fish.y);

    rotate(-0.2 + t * 0.4);

    drawSalmonShape(fish, false);

    pop();

    // Splash on re-entry
    if (t > 0.82) {
      fill(175, 210, 201, 190);

      rect(fish.x - 12, riverY + 1, 4, 7);
      rect(fish.x + 7, riverY - 2, 3, 6);
      rect(fish.x + 15, riverY + 3, 4, 4);
    }
  }
}

// --------------------------------------------------
// PIXEL SALMON
// --------------------------------------------------

function drawSalmon(fish) {
  push();
  translate(fish.x, fish.y);
  drawSalmonShape(fish, false);
  pop();
}

function drawSalmonShape(fish, underwater = false) {
  noStroke();

  // Body colors
  if (fish.rotten) {
    fill(underwater ? color(91, 120, 66) : color(91, 120, 66));
  } else {
    fill(underwater ? color(130, 170, 174) : color(170, 91, 69));
  }

  // Tail
  triangle(-12, 0, -23, -8, -21, 7);

  // Body
  rect(-15, -5, 27, 10);
  rect(-10, -7, 18, 14);

  // Back
  if (fish.rotten) {
    fill(120, 145, 79);
  } else {
    fill(underwater ? color(157, 185, 184) : color(205, 125, 91));
  }

  rect(-10, -7, 17, 3);

  // Belly
  if (fish.rotten) {
    fill(155, 167, 103);
  } else {
    fill(underwater ? color(157, 185, 184) : color(221, 176, 132));
  }

  rect(-8, 3, 15, 3);

  // Dorsal fin
  if (fish.rotten) {
    fill(68, 91, 52);
  } else {
    fill(139, 72, 59);
  }

  triangle(-5, -5, 1, -12, 7, -5);

  // Lower fin
  triangle(-1, 5, 4, 10, 8, 5);

  // Gill
  fill(91, 59, 49);
  rect(5, -3, 2, 7);

  // Eye
  fill(29, 31, 27);
  rect(9, -3, 3, 3);

  // Mold on rotten fish
  if (fish.rotten) {
    fill(184, 198, 116);
    rect(-8, -3, 4, 3);
    rect(0, 1, 3, 2);
    rect(-15, -6, 4, 2);
  }
}

// --------------------------------------------------
// PIXEL BEAR
// --------------------------------------------------

function drawBear() {
  push();
  translate(bearX, 0);

  // Shadow
  fill(42, 64, 55);
  rect(-32, 326, 64, 5);

  // Legs
  fill(70, 53, 40);
  rect(-23, 293, 15, 22);
  rect(8, 293, 15, 22);

  // Feet
  rect(-27, 309, 20, 7);
  rect(6, 309, 20, 7);

  // Body
  fill(112, 78, 49);
  rect(-29, 252, 58, 47);
  rect(-34, 265, 68, 26);

  fill(143, 103, 64);
  rect(-20, 258, 14, 24);

  // Head
  fill(124, 88, 53);
  rect(-24, 225, 48, 39);
  rect(-30, 235, 60, 22);

  // Ears
  fill(83, 58, 40);
  rect(-24, 218, 13, 13);
  rect(11, 218, 13, 13);

  fill(173, 123, 82);
  rect(-20, 222, 6, 6);
  rect(15, 222, 6, 6);

  // Muzzle
  fill(188, 148, 104);
  rect(-8, 241, 25, 14);
  rect(-3, 237, 16, 17);

  // Nose
  fill(35, 34, 31);
  rect(9, 239, 9, 7);

  // Eyes
  fill(25, 27, 24);
  rect(-15, 235, 5, 5);
  rect(8, 233, 4, 4);

  // Arms
  fill(112, 78, 49);
  rect(-38, 257, 14, 31);
  rect(24, 257, 14, 31);

  // Paws
  fill(83, 59, 41);
  rect(-39, 281, 16, 12);
  rect(23, 281, 16, 12);

  // Catching pose
  if (catchTimer > 0) {
    fill(143, 103, 64);
    rect(20, 250, 18, 12);
    rect(31, 239, 12, 18);
  }

  // Eating pose
  if (eatingTimer > 0) {
    fill(53, 35, 31);
    rect(2, 251, 13, 7);

    fill(229, 119, 102);
    rect(5, 256, 8, 3);
  }

  pop();
}

// --------------------------------------------------
// BIRDS
// --------------------------------------------------

function drawBirds() {
  for (let bird of birds) {
    if (!isPaused) {
      bird.x += bird.speed;
    }

    if (bird.x > width + 20) {
      bird.x = -20;
      bird.y = random(65, 150);
      bird.speed = random(0.5, 1.3);
    }

    fill(53, 66, 65);

    rect(bird.x, bird.y, bird.size, 3);
    rect(bird.x + 3, bird.y - 4, 3, 4);
    rect(bird.x + 7, bird.y - 4, 3, 4);
  }
}

// --------------------------------------------------
// KEYBOARD CONTROLS
// --------------------------------------------------

function keyPressed() {
  // R pauses and resumes during gameplay
  if ((key === "r" || key === "R") && gameState === "playing") {
    isPaused = !isPaused;
    return false;
  }

  // R restarts after death or victory
  if (
    (key === "r" || key === "R") &&
    (gameState === "dead" || gameState === "won")
  ) {
    restartGame();
    return false;
  }

  // Space catches only airborne salmon
  if (key === " " && gameState === "playing" && !isPaused) {
    catchTimer = 12;

    for (let fish of salmon) {
      if (!fish.visible || !fish.jumping) continue;

      let distance = abs(fish.x - bearX);
      let isAboveWater = fish.y < riverY - 5;

      if (distance < 48 && isAboveWater) {
        if (fish.rotten) {
          lives--;
          hurtTimer = 50;

          if (lives <= 0) {
            lives = 0;
            gameState = "dead";
            deathTimer = 0;
          }
        } else {
          score++;
          eatingTimer = 45;

          if (score >= 100) {
            score = 100;
            gameState = "won";
            winTimer = 0;
          }
        }

        fish.visible = false;
        fish.jumping = false;
        fish.hideTimer = random(45, 90);

        break;
      }
    }
  }

  return false;
}

// --------------------------------------------------
// WOODEN CABIN PAUSE SIGN
// --------------------------------------------------

function drawPauseSign() {
  push();

  // Darken scene
  fill(20, 29, 28, 145);
  rect(0, 0, width, height);

  // Ropes
  stroke(62, 45, 30);
  strokeWeight(5);
  line(300, 150, 300, 190);
  line(500, 150, 500, 190);
  noStroke();

  // Sign shadow
  fill(36, 31, 24);
  rect(247, 187, 310, 125);

  // Wooden planks
  fill(100, 65, 39);
  rect(240, 175, 320, 38);
  rect(240, 217, 320, 38);
  rect(240, 259, 320, 38);

  // Wood highlights
  fill(139, 96, 56);
  rect(246, 180, 308, 5);
  rect(246, 222, 308, 5);
  rect(246, 264, 308, 5);

  // Wood grain
  fill(75, 48, 31);
  rect(265, 194, 65, 3);
  rect(420, 190, 95, 3);
  rect(350, 236, 110, 3);
  rect(270, 278, 80, 3);
  rect(440, 281, 65, 3);

  // Nails
  fill(45, 43, 36);
  rect(250, 184, 5, 5);
  rect(545, 184, 5, 5);
  rect(250, 268, 5, 5);
  rect(545, 268, 5, 5);

  // Text shadow
  fill(49, 35, 25);
  textAlign(CENTER, CENTER);
  textSize(35);
  textStyle(BOLD);
  text("PAUSED", 402, 240);

  // Main text
  fill(241, 218, 167);
  text("PAUSED", 400, 236);

  // Instructions
  fill(255, 235, 195);
  textSize(12);
  textStyle(NORMAL);
  text("PRESS R TO CONTINUE", 400, 285);

  pop();
}

// --------------------------------------------------
// GAME OVER: CABIN WOODEN SIGN
// --------------------------------------------------

function drawDeathAnimation() {
  // Darken the entire scene
  noStroke();
  fill(14, 25, 25, 205);
  rect(0, 0, width, height);

  // Sign shadow
  fill(12, 17, 16, 180);
  rect(116, 104, 578, 276);

  // Hanging ropes
  stroke(61, 43, 29);
  strokeWeight(7);
  line(205, 65, 205, 123);
  line(595, 65, 595, 123);
  noStroke();

  // Wooden frame
  fill(48, 34, 25);
  rect(104, 112, 592, 260);

  // Planks
  fill(91, 57, 34);
  rect(115, 122, 570, 74);
  rect(115, 201, 570, 74);
  rect(115, 280, 570, 79);

  // Wood highlights
  fill(124, 81, 46);
  rect(123, 128, 554, 5);
  rect(123, 207, 554, 5);
  rect(123, 286, 554, 5);

  // Grain
  fill(64, 42, 29);
  rect(140, 160, 95, 3);
  rect(480, 151, 150, 3);
  rect(265, 235, 125, 3);
  rect(460, 245, 170, 3);
  rect(150, 319, 110, 3);
  rect(450, 332, 140, 3);

  // Nails
  fill(35, 34, 29);
  rect(125, 133, 8, 8);
  rect(667, 133, 8, 8);
  rect(125, 340, 8, 8);
  rect(667, 340, 8, 8);

  fill(151, 140, 113);
  rect(127, 134, 3, 3);
  rect(669, 134, 3, 3);
  rect(127, 341, 3, 3);
  rect(669, 341, 3, 3);

  // Headline shadow
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(53);

  fill(37, 26, 20);
  text("GAME OVER", 403, 178);

  // Main headline
  fill(239, 218, 172);
  text("GAME OVER", 400, 174);

  // Divider
  fill(185, 143, 88);
  rect(190, 213, 420, 3);

  // Rotten salmon joke
  fill(249, 229, 182);
  textSize(17);
  text("YOU ATE TOO MANY", 400, 243);
  text("ROTTEN SALMONS!", 400, 267);

  // Restart prompt
  fill(221, 186, 128);
  textSize(13);
  textStyle(NORMAL);
  text("PRESS R TO TRY AGAIN", 400, 320);

  // Small ornament
  fill(185, 143, 88);
  triangle(390, 342, 400, 332, 410, 342);
}

// --------------------------------------------------
// VICTORY SCREEN
// --------------------------------------------------

function drawVictory() {
  winTimer++;

  fill(25, 35, 32, 170);
  rect(0, 0, width, height);

  // Pixel confetti
  for (let i = 0; i < 30; i++) {
    let x = (i * 47 + frameCount * (1 + (i % 3))) % width;
    let y = (i * 29 + frameCount * 2) % height;

    if (i % 3 === 0) {
      fill(242, 173, 83);
    } else if (i % 3 === 1) {
      fill(125, 205, 132);
    } else {
      fill(230, 225, 194);
    }

    rect(x, y, 6, 6);
  }

  fill(255, 235, 175);
  textAlign(CENTER);

  textSize(32);
  text("SALMON MASTER!", width / 2, 115);

  textSize(19);
  text("100 SALMONS CAUGHT!", width / 2, 155);

  textSize(15);
  text("The bear is the king of the river.", width / 2, 190);

  textSize(14);
  text("Press R to play again", width / 2, 225);
}

// --------------------------------------------------
// SCORE AND LIVES
// --------------------------------------------------

function drawScore() {
  fill(35, 49, 45);
  rect(15, 15, 180, 62);

  fill(230, 225, 194);
  textAlign(LEFT);

  textSize(13);
  text("SALMON SEASON", 25, 33);

  textSize(15);
  text("FISH: " + score + " / 100", 25, 51);

  textSize(13);
  text("LIVES: " + "♥ ".repeat(lives), 25, 69);

  fill(35, 49, 45);
  rect(width - 235, 15, 220, 30);

  fill(230, 225, 194);
  textSize(12);
  textAlign(CENTER);
  text("MOUSE: MOVE | SPACE: CATCH", width - 125, 34);

  fill(35, 49, 45);
  rect(width - 145, 52, 130, 23);

  fill(230, 225, 194);
  textSize(11);
  text("LEVEL " + floor(difficulty), width - 80, 67);
}

// --------------------------------------------------
// RESTART
// --------------------------------------------------

function restartGame() {
  score = 0;
  lives = 3;

  eatingTimer = 0;
  catchTimer = 0;
  hurtTimer = 0;
  deathTimer = 0;
  winTimer = 0;

  difficulty = 1;
  jumpChance = 0.012;

  gameState = "playing";
  isPaused = false;

  for (let fish of salmon) {
    fish.x = random(width);
    fish.y = riverY + random(25, 100);
    fish.speed = random(1, 2.2);

    fish.jumping = false;
    fish.jumpProgress = 0;
    fish.jumpDuration = random(32, 48);
    fish.jumpHeight = random(65, 115);
    fish.jumpStartY = riverY + 8;

    fish.rotten = random() < 0.18;
    fish.visible = true;
    fish.hideTimer = 0;
    fish.splashTimer = 0;
  }
}
