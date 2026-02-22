const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const restartBtn = document.getElementById("restartBtn");

const scoreValue = document.getElementById("scoreValue");
const missValue = document.getElementById("missValue");
const highValue = document.getElementById("highValue");
const finalScore = document.getElementById("finalScore");
const bestScore = document.getElementById("bestScore");

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  gravity: 0.34,
  flapImpulse: -7.2,
  surfaceY: 36,
  floorY: canvas.height - 44,
};

const MAX_MISSES = 3;
const FISH_GROUP_SIZE = 4;

let highScore = Number(localStorage.getItem("flappySharkHighScore") || 0);
highValue.textContent = String(highScore);

const state = {
  mode: "start",
  shark: null,
  fishSchools: [],
  bubbles: [],
  score: 0,
  misses: 0,
  speed: 2.2,
  spawnEveryMs: 1650,
  elapsedMs: 0,
  lastSpawnMs: 0,
  lastTime: 0,
};

function resetGame() {
  state.mode = "playing";
  state.shark = {
    x: 104,
    y: WORLD.height * 0.48,
    w: 84,
    h: 42,
    vy: 0,
    flapTick: 0,
  };
  state.fishSchools = [];
  state.bubbles = makeBubbles(24);
  state.score = 0;
  state.misses = 0;
  state.speed = 2.2;
  state.spawnEveryMs = 1650;
  state.elapsedMs = 0;
  state.lastSpawnMs = 0;

  scoreValue.textContent = "0";
  missValue.textContent = `0 / ${MAX_MISSES}`;

  startOverlay.classList.remove("overlay-visible");
  gameOverOverlay.classList.remove("overlay-visible");
}

function makeBubbles(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * WORLD.width,
    y: Math.random() * WORLD.height,
    r: 1.4 + Math.random() * 3.6,
    speed: 0.2 + Math.random() * 0.6,
    drift: -0.3 + Math.random() * 0.6,
  }));
}

function spawnFishSchool() {
  const centerY = WORLD.surfaceY + 70 + Math.random() * (WORLD.floorY - WORLD.surfaceY - 140);
  const school = {
    x: WORLD.width + 60,
    y: centerY,
    fishes: [],
    passed: false,
  };

  for (let i = 0; i < FISH_GROUP_SIZE; i += 1) {
    school.fishes.push({
      ox: i * 26 + (Math.random() * 8 - 4),
      oy: (Math.random() * 34) - 17,
      w: 28,
      h: 14,
      eaten: false,
      wiggleSeed: Math.random() * Math.PI * 2,
    });
  }

  state.fishSchools.push(school);
}

function flap() {
  if (state.mode === "start") {
    resetGame();
  }
  if (state.mode !== "playing") {
    return;
  }
  state.shark.vy = WORLD.flapImpulse;
}

function update(dtMs) {
  if (state.mode !== "playing") {
    return;
  }

  const s = state.shark;
  state.elapsedMs += dtMs;
  const dt = Math.min(2, dtMs / 16.67);

  s.vy += WORLD.gravity * dt;
  s.y += s.vy * dt;
  s.flapTick += 0.16 * dt;

  if (s.y - s.h * 0.4 <= WORLD.surfaceY || s.y + s.h * 0.5 >= WORLD.floorY) {
    endGame();
    return;
  }

  if (state.elapsedMs - state.lastSpawnMs > state.spawnEveryMs) {
    state.lastSpawnMs = state.elapsedMs;
    spawnFishSchool();
  }

  state.speed = Math.min(5.8, 2.2 + state.elapsedMs * 0.00008);
  state.spawnEveryMs = Math.max(820, 1650 - state.elapsedMs * 0.08);

  for (const b of state.bubbles) {
    b.y -= b.speed * dt;
    b.x += b.drift * dt;

    if (b.y < WORLD.surfaceY - 12) {
      b.y = WORLD.floorY + Math.random() * 40;
      b.x = Math.random() * WORLD.width;
    }
    if (b.x < -10) b.x = WORLD.width + 10;
    if (b.x > WORLD.width + 10) b.x = -10;
  }

  for (const school of state.fishSchools) {
    school.x -= state.speed * dt;

    for (const fish of school.fishes) {
      if (fish.eaten) continue;

      const wobble = Math.sin(state.elapsedMs * 0.01 + fish.wiggleSeed) * 4;
      const fishX = school.x + fish.ox;
      const fishY = school.y + fish.oy + wobble;

      if (aabbOverlap(
        s.x - s.w * 0.34,
        s.y - s.h * 0.28,
        s.w * 0.66,
        s.h * 0.56,
        fishX - fish.w * 0.5,
        fishY - fish.h * 0.5,
        fish.w,
        fish.h
      )) {
        fish.eaten = true;
        state.score += 1;
        scoreValue.textContent = String(state.score);
      }
    }

    if (!school.passed && school.x + FISH_GROUP_SIZE * 26 < s.x - s.w * 0.5) {
      school.passed = true;
      const leftBehind = school.fishes.some((f) => !f.eaten);
      if (leftBehind) {
        state.misses += 1;
        missValue.textContent = `${state.misses} / ${MAX_MISSES}`;
        if (state.misses >= MAX_MISSES) {
          endGame();
          return;
        }
      }
    }
  }

  state.fishSchools = state.fishSchools.filter(
    (school) => school.x > -180 && school.fishes.some((f) => !f.eaten)
  );
}

function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function endGame() {
  state.mode = "over";

  if (state.score > highScore) {
    highScore = state.score;
    localStorage.setItem("flappySharkHighScore", String(highScore));
    highValue.textContent = String(highScore);
  }

  finalScore.textContent = `Score: ${state.score}`;
  bestScore.textContent = `Best: ${highScore}`;
  gameOverOverlay.classList.add("overlay-visible");
}

function draw() {
  drawBackground();

  if (state.mode === "playing" || state.mode === "over") {
    drawFishSchools();
    drawShark(state.shark);
  }

  drawWaterline();
  drawSeafloor();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  g.addColorStop(0, "#7ddcf7");
  g.addColorStop(0.5, "#1f91bc");
  g.addColorStop(1, "#085c7f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "#ffffff14";
  const wave = (state.elapsedMs || 0) * 0.002;
  for (let i = 0; i < 5; i += 1) {
    const y = 120 + i * 120 + Math.sin(wave + i) * 16;
    ctx.beginPath();
    ctx.ellipse(WORLD.width * 0.5, y, 190 + i * 22, 38 + i * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#c8f4ff99";
  for (const b of state.bubbles) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWaterline() {
  ctx.fillStyle = "#d5f8ff";
  ctx.fillRect(0, 0, WORLD.width, WORLD.surfaceY);

  ctx.fillStyle = "#ffffff99";
  const t = (state.elapsedMs || 0) * 0.01;
  for (let x = -20; x < WORLD.width + 30; x += 36) {
    const y = WORLD.surfaceY - 5 + Math.sin(t + x * 0.1) * 2;
    ctx.beginPath();
    ctx.arc(x, y, 8, Math.PI, 0, false);
    ctx.fill();
  }
}

function drawSeafloor() {
  ctx.fillStyle = "#c9a45f";
  ctx.fillRect(0, WORLD.floorY, WORLD.width, WORLD.height - WORLD.floorY);

  ctx.fillStyle = "#b99350";
  for (let x = -20; x < WORLD.width + 25; x += 30) {
    ctx.beginPath();
    ctx.arc(x, WORLD.floorY + 4, 11, Math.PI, 0, true);
    ctx.fill();
  }
}

function drawShark(s) {
  const bob = Math.sin(s.flapTick) * 2;
  const tailSwing = Math.sin(s.flapTick * 2.3) * 8;

  ctx.save();
  ctx.translate(s.x, s.y + bob);

  const tilt = Math.max(-0.42, Math.min(0.38, s.vy * 0.045));
  ctx.rotate(tilt);

  // Body
  ctx.fillStyle = "#95a9b8";
  ctx.beginPath();
  ctx.ellipse(0, 0, s.w * 0.45, s.h * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Back
  ctx.fillStyle = "#7f93a2";
  ctx.beginPath();
  ctx.ellipse(-8, -4, s.w * 0.34, s.h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = "#e7eef2";
  ctx.beginPath();
  ctx.ellipse(8, 8, s.w * 0.28, s.h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.fillStyle = "#8195a4";
  ctx.beginPath();
  ctx.moveTo(-s.w * 0.4, -2);
  ctx.lineTo(-s.w * 0.62, -14 + tailSwing * 0.2);
  ctx.lineTo(-s.w * 0.57, 0);
  ctx.lineTo(-s.w * 0.62, 14 - tailSwing * 0.2);
  ctx.closePath();
  ctx.fill();

  // Top fin
  ctx.fillStyle = "#6f8492";
  ctx.beginPath();
  ctx.moveTo(-5, -10);
  ctx.lineTo(12, -34);
  ctx.lineTo(20, -8);
  ctx.closePath();
  ctx.fill();

  // Side fin
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(20, 17);
  ctx.lineTo(4, 22);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(20, -6, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#121212";
  ctx.beginPath();
  ctx.arc(21, -5.2, 2, 0, Math.PI * 2);
  ctx.fill();

  // Smile / mouth
  ctx.strokeStyle = "#334955";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(19, 4, 9, 0.2, 1.35, false);
  ctx.stroke();

  ctx.restore();
}

function drawFishSchools() {
  for (const school of state.fishSchools) {
    for (const fish of school.fishes) {
      if (fish.eaten) continue;

      const wobble = Math.sin(state.elapsedMs * 0.01 + fish.wiggleSeed) * 4;
      const x = school.x + fish.ox;
      const y = school.y + fish.oy + wobble;

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = "#ffd15f";
      ctx.beginPath();
      ctx.ellipse(0, 0, fish.w * 0.5, fish.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffb037";
      ctx.beginPath();
      ctx.moveTo(-fish.w * 0.5, 0);
      ctx.lineTo(-fish.w * 0.75, -fish.h * 0.4);
      ctx.lineTo(-fish.w * 0.75, fish.h * 0.4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#2f2b19";
      ctx.beginPath();
      ctx.arc(fish.w * 0.18, -1, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }
  const dt = timestamp - state.lastTime;
  state.lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function attachEvents() {
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      flap();
    }
  });

  canvas.addEventListener("pointerdown", flap);
  restartBtn.addEventListener("click", resetGame);
}

attachEvents();
state.bubbles = makeBubbles(24);
requestAnimationFrame(loop);
