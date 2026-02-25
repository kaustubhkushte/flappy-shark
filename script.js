const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const restartBtn = document.getElementById("restartBtn");
const canvasWrap = document.querySelector(".canvas-wrap");

const scoreValue = document.getElementById("scoreValue");
const sizeValue = document.getElementById("sizeValue");
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

const MAX_GROWTH_MULTIPLIER = 3;

let highScore = Number(localStorage.getItem("flappySharkHighScore") || 0);
highValue.textContent = String(highScore);

const state = {
  mode: "start",
  shark: null,
  fishSchools: [],
  obstacles: [],
  bubbles: [],
  score: 0,
  speed: 2.2,
  fishSpawnEveryMs: 1650,
  obstacleSpawnEveryMs: 2100,
  elapsedMs: 0,
  lastFishSpawnMs: 0,
  lastObstacleSpawnMs: 0,
  lastTime: 0,
};

function resetGame() {
  state.mode = "playing";
  state.shark = {
    x: 104,
    y: WORLD.height * 0.48,
    baseW: 84,
    baseH: 42,
    scale: 1,
    vy: 0,
    flapTick: 0,
    biteTimer: 0,
  };
  state.fishSchools = [];
  state.obstacles = [];
  state.bubbles = makeBubbles(24);
  state.score = 0;
  state.speed = 2.2;
  state.fishSpawnEveryMs = 1650;
  state.obstacleSpawnEveryMs = 2100;
  state.elapsedMs = 0;
  state.lastFishSpawnMs = 0;
  state.lastObstacleSpawnMs = 0;

  scoreValue.textContent = "0";
  sizeValue.textContent = "x1.0";

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

function sharkSize() {
  const s = state.shark;
  return {
    w: s.baseW * s.scale,
    h: s.baseH * s.scale,
  };
}

function sharkHitbox() {
  const s = state.shark;
  const size = sharkSize();
  return {
    x: s.x - size.w * 0.34,
    y: s.y - size.h * 0.28,
    w: size.w * 0.66,
    h: size.h * 0.56,
  };
}

function spawnFishSchool() {
  const centerY = WORLD.surfaceY + 80 + Math.random() * (WORLD.floorY - WORLD.surfaceY - 160);
  const fishCount = 1 + Math.floor(Math.random() * 20);
  const schoolSpan = 40 + Math.min(240, fishCount * 14);
  const schoolHeight = 68;
  const school = {
    x: WORLD.width + 60,
    y: centerY,
    span: schoolSpan,
    fishes: [],
  };

  for (let i = 0; i < fishCount; i += 1) {
    school.fishes.push({
      ox: Math.random() * schoolSpan,
      oy: (Math.random() * schoolHeight) - schoolHeight / 2,
      w: 28,
      h: 14,
      eaten: false,
      wiggleSeed: Math.random() * Math.PI * 2,
    });
  }

  state.fishSchools.push(school);
}

function spawnObstacle() {
  const size = 34 + Math.random() * 22;
  const y = WORLD.surfaceY + size + 45 + Math.random() * (WORLD.floorY - WORLD.surfaceY - size * 2 - 90);
  state.obstacles.push({
    x: WORLD.width + 90,
    y,
    r: size * 0.5,
    w: size,
    h: size,
    spin: Math.random() * Math.PI * 2,
  });
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

function growShark() {
  const s = state.shark;
  s.scale = Math.min(MAX_GROWTH_MULTIPLIER, s.scale + 0.04);
  sizeValue.textContent = `x${s.scale.toFixed(1)}`;
}

function update(dtMs) {
  if (state.mode !== "playing") {
    return;
  }

  const s = state.shark;
  state.elapsedMs += dtMs;
  const dt = Math.min(2, dtMs / 16.67);
  const size = sharkSize();

  s.vy += WORLD.gravity * dt;
  s.y += s.vy * dt;
  s.flapTick += 0.16 * dt;
  s.biteTimer = Math.max(0, s.biteTimer - dtMs);

  if (s.y - size.h * 0.4 <= WORLD.surfaceY || s.y + size.h * 0.5 >= WORLD.floorY) {
    endGame();
    return;
  }

  if (state.elapsedMs - state.lastFishSpawnMs > state.fishSpawnEveryMs) {
    state.lastFishSpawnMs = state.elapsedMs;
    spawnFishSchool();
  }
  if (state.elapsedMs - state.lastObstacleSpawnMs > state.obstacleSpawnEveryMs) {
    state.lastObstacleSpawnMs = state.elapsedMs;
    spawnObstacle();
  }

  state.speed = Math.min(6.2, 2.2 + state.elapsedMs * 0.00009);
  state.fishSpawnEveryMs = Math.max(720, 1650 - state.elapsedMs * 0.08);
  state.obstacleSpawnEveryMs = Math.max(980, 2100 - state.elapsedMs * 0.06);

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

  const sharkBox = sharkHitbox();

  for (const school of state.fishSchools) {
    school.x -= state.speed * dt;

    for (const fish of school.fishes) {
      if (fish.eaten) continue;

      const wobble = Math.sin(state.elapsedMs * 0.01 + fish.wiggleSeed) * 4;
      const fishX = school.x + fish.ox;
      const fishY = school.y + fish.oy + wobble;

      if (aabbOverlap(
        sharkBox.x,
        sharkBox.y,
        sharkBox.w,
        sharkBox.h,
        fishX - fish.w * 0.5,
        fishY - fish.h * 0.5,
        fish.w,
        fish.h
      )) {
        fish.eaten = true;
        s.biteTimer = 220;
        state.score += 1;
        scoreValue.textContent = String(state.score);
        growShark();
      }
    }
  }

  for (const obstacle of state.obstacles) {
    obstacle.x -= (state.speed + 0.8) * dt;
    obstacle.spin += 0.05 * dt;

    if (aabbOverlap(
      sharkBox.x,
      sharkBox.y,
      sharkBox.w,
      sharkBox.h,
      obstacle.x - obstacle.w * 0.5,
      obstacle.y - obstacle.h * 0.5,
      obstacle.w,
      obstacle.h
    )) {
      endGame();
      return;
    }
  }

  state.fishSchools = state.fishSchools.filter(
    (school) => school.x + school.span > -80 && school.fishes.some((f) => !f.eaten)
  );
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.w > -60);
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
    drawObstacles();
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
  const size = sharkSize();
  const bob = Math.sin(s.flapTick) * 2;
  const tailSwing = Math.sin(s.flapTick * 2.3) * 8;
  const biteOpen = s.biteTimer > 0 ? 1 : 0;
  const mouthOpenAmount = 8 + biteOpen * 8;

  ctx.save();
  ctx.translate(s.x, s.y + bob);

  const tilt = Math.max(-0.42, Math.min(0.38, s.vy * 0.045));
  ctx.rotate(tilt);

  ctx.fillStyle = "#95a9b8";
  ctx.beginPath();
  ctx.ellipse(0, 0, size.w * 0.45, size.h * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7f93a2";
  ctx.beginPath();
  ctx.ellipse(-size.w * 0.1, -size.h * 0.1, size.w * 0.34, size.h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e7eef2";
  ctx.beginPath();
  ctx.ellipse(size.w * 0.1, size.h * 0.18, size.w * 0.28, size.h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8195a4";
  ctx.beginPath();
  ctx.moveTo(-size.w * 0.4, -2);
  ctx.lineTo(-size.w * 0.62, -size.h * 0.34 + tailSwing * 0.2);
  ctx.lineTo(-size.w * 0.57, 0);
  ctx.lineTo(-size.w * 0.62, size.h * 0.34 - tailSwing * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6f8492";
  ctx.beginPath();
  ctx.moveTo(-size.w * 0.05, -size.h * 0.25);
  ctx.lineTo(size.w * 0.14, -size.h * 0.82);
  ctx.lineTo(size.w * 0.22, -size.h * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, size.h * 0.18);
  ctx.lineTo(size.w * 0.24, size.h * 0.4);
  ctx.lineTo(size.w * 0.05, size.h * 0.52);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(size.w * 0.24, -size.h * 0.14, Math.max(3.2, size.w * 0.05), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#121212";
  ctx.beginPath();
  ctx.arc(size.w * 0.25, -size.h * 0.13, Math.max(1.6, size.w * 0.024), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f5fbff";
  ctx.beginPath();
  ctx.moveTo(size.w * 0.06, size.h * 0.1);
  ctx.lineTo(size.w * 0.44, size.h * (0.1 + mouthOpenAmount * 0.02));
  ctx.lineTo(size.w * 0.2, size.h * (0.28 + mouthOpenAmount * 0.02));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#334955";
  ctx.lineWidth = Math.max(2, size.w * 0.025);
  ctx.beginPath();
  ctx.moveTo(size.w * 0.08, size.h * 0.06);
  ctx.lineTo(size.w * 0.42, size.h * (0.08 + mouthOpenAmount * 0.02));
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

function drawObstacles() {
  for (const obstacle of state.obstacles) {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(obstacle.spin);

    ctx.fillStyle = "#8b4d58";
    ctx.beginPath();
    ctx.arc(0, 0, obstacle.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#efb2be";
    for (let i = 0; i < 8; i += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(obstacle.r * 0.65, 0);
      ctx.lineTo(obstacle.r * 1.2, -4);
      ctx.lineTo(obstacle.r * 1.2, 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
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
  let lastTapMs = 0;

  const onTapOrClick = (e) => {
    if (e.target.closest("button")) {
      return;
    }
    const now = performance.now();
    if (now - lastTapMs < 220) {
      return;
    }
    lastTapMs = now;
    if (e.cancelable) {
      e.preventDefault();
    }
    flap();
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      flap();
    }
  });

  canvasWrap.addEventListener("pointerdown", onTapOrClick);
  canvasWrap.addEventListener("touchstart", onTapOrClick, { passive: false });
  canvasWrap.addEventListener("click", onTapOrClick);
  restartBtn.addEventListener("click", resetGame);
}

attachEvents();
state.bubbles = makeBubbles(24);
requestAnimationFrame(loop);
