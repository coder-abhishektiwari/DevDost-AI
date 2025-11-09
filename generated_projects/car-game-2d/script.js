```javascript
// Constants & Asset Loading
const CANVAS_ID = 'game-canvas';
const SCORE_ID = 'score';
const GAME_OVER_ID = 'game-over';
const RESTART_BTN_ID = 'restart-btn';

const assets = {
  car: new Image(),
  obstacle: new Image(),
};

assets.car.src = 'car.png';
assets.obstacle.src = 'obstacle.png';

function loadImage(img) {
  return new Promise((resolve, reject) => {
    if (img.complete) {
      resolve();
    } else {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
    }
  });
}

// Game State Object
const state = {
  running: false,
  score: 0,
  car: {
    x: 0,
    y: 0,
    width: 50,
    height: 100,
    speed: 0,
    maxSpeed: 6,
    accel: 0.2,
    friction: 0.05,
  },
  obstacles: [],
  trackOffset: 0,
  lastObstacleTime: 0,
  nextObstacleDelay: 0,
};

// Canvas Setup
const canvas = document.getElementById(CANVAS_ID);
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Input Handling
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

window.addEventListener('keydown', (e) => {
  if (e.key in keys) {
    keys[e.key] = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key in keys) {
    keys[e.key] = false;
    e.preventDefault();
  }
});

// Physics / Car Movement
function handleInput() {
  const car = state.car;

  // Acceleration / Braking
  if (keys.ArrowUp) {
    car.speed = Math.min(car.maxSpeed, car.speed + car.accel);
  } else if (keys.ArrowDown) {
    car.speed = Math.max(0, car.speed - car.accel);
  } else {
    // Friction when no acceleration
    car.speed = Math.max(0, car.speed - car.friction);
  }

  // Horizontal movement
  const horizStep = 5;
  if (keys.ArrowLeft) {
    car.x = Math.max(0, car.x - horizStep);
  }
  if (keys.ArrowRight) {
    car.x = Math.min(canvas.width - car.width, car.x + horizStep);
  }

  // Vertical movement (track scroll)
  car.y -= car.speed;
}

// Obstacle Generation
function maybeSpawnObstacle(timestamp) {
  if (timestamp - state.lastObstacleTime >= state.nextObstacleDelay) {
    const width = 50;
    const height = 50;
    const x = Math.random() * (canvas.width - width);
    const y = -height;
    state.obstacles.push({ x, y, width, height });
    state.lastObstacleTime = timestamp;
    state.nextObstacleDelay = 1500 + Math.random() * 500; // 1500‑2000 ms
  }
}

// Collision Detection
function checkCollisions() {
  const car = state.car;
  for (const obs of state.obstacles) {
    if (
      car.x < obs.x + obs.width &&
      car.x + car.width > obs.x &&
      car.y < obs.y + obs.height &&
      car.y + car.height > obs.y
    ) {
      endGame();
      break;
    }
  }
}

// Scoring
function updateScore() {
  state.score += state.car.speed * 0.1;
  const scoreEl = document.getElementById(SCORE_ID);
  if (scoreEl) {
    scoreEl.textContent = Math.floor(state.score);
  }
}

// Update Function
function update(timestamp) {
  handleInput();

  // Keep car within vertical bounds (prevent it from disappearing off top)
  if (state.car.y < 0) state.car.y = 0;
  if (state.car.y > canvas.height - state.car.height) {
    state.car.y = canvas.height - state.car.height;
  }

  // Move obstacles down at track speed
  for (const obs of state.obstacles) {
    obs.y += state.car.speed;
  }

  // Remove off‑screen obstacles
  state.obstacles = state.obstacles.filter(
    (obs) => obs.y < canvas.height + obs.height
  );

  maybeSpawnObstacle(timestamp);
  checkCollisions();
  updateScore();
}

// Render Function
function render() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Simple road background
  ctx.fillStyle = '#555';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw car
  ctx.drawImage(
    assets.car,
    state.car.x,
    state.car.y,
    state.car.width,
    state.car.height
  );

  // Draw obstacles
  for (const obs of state.obstacles) {
    ctx.drawImage(
      assets.obstacle,
      obs.x,
      obs.y,
      obs.width,
      obs.height
    );
  }
}

// Game Loop
function gameLoop(timestamp) {
  if (!state.running) return;
  update(timestamp);
  render();
  requestAnimationFrame(gameLoop);
}

// Start / Restart Logic
function startGame() {
  // Reset state
  state.running = true;
  state.score = 0;
  state.car.speed = 0;
  state.car.x = (canvas.width - state.car.width) / 2;
  state.car.y = canvas.height - state.car.height - 10;
  state.obstacles = [];
  state.lastObstacleTime = performance.now();
  state.nextObstacleDelay = 1500 + Math.random() * 500;

  // Hide game‑over overlay
  const overlay = document.getElementById(GAME_OVER_ID);
  if (overlay) overlay.classList.add('hidden');

  // Reset score display
  const scoreEl = document.getElementById(SCORE_ID);
  if (scoreEl) scoreEl.textContent = '0';

  requestAnimationFrame(gameLoop);
}

function endGame() {
  state.running = false;
  const overlay = document.getElementById(GAME_OVER_ID);
  if (overlay) overlay.classList.remove('hidden');
}

// Restart button
const restartBtn = document.getElementById(RESTART_BTN_ID);
if (restartBtn) {
  restartBtn.addEventListener('click', startGame);
}

// Initialization after assets load
Promise.all([loadImage(assets.car), loadImage(assets.obstacle)])
  .then(() => {
    startGame();
  })
  .catch((err) => {
    console.error('Failed to load assets', err);
  });
```