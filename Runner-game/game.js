// ==========================
// ELEMENTS
// ==========================
var canvas = document.getElementById("gameCanvas");
var ctx = canvas.getContext("2d");

var btnMenuNew = document.getElementById("btnMenuNew");
var btnMenuCharacter = document.getElementById("btnMenuCharacter");
var btnMenuTutorial = document.getElementById("btnMenuTutorial");
var btnMenuHistory = document.getElementById("btnMenuHistory");
var btnReturn = document.getElementById("btnReturn");
var btnPause = document.getElementById("btnPause");
var overlay = document.getElementById("overlay-panel");

// âm thanh
var sfxJump = document.getElementById("sfxJump");
var sfxGameOver = document.getElementById("sfxGameOver");

var lastTime = performance.now();

// ==========================
// STATE
// ==========================
// screen: "main" | "game" | "character" | "tutorial" | "history"
var currentScreen = "main";
// gameState chỉ dùng khi currentScreen === "game"
var gameState = "idle"; // "idle" | "playing" | "paused" | "gameover"

var score = 0;
var bestScore = 0;
var scoreHistory = [];

// nhân vật
var characters = ["cat", "dog", "dragon", "human", "sheep"];
var characterDisplayName = {
  cat: "Mèo",
  dog: "Chó",
  dragon: "Rồng",
  human: "Người",
  sheep: "Cừu"
};
var characterEmoji = {
  cat: "🐱",
  dog: "🐶",
  dragon: "🐲",
  human: "🧍‍♀️",
  sheep: "🐑"
};
var currentCharacterIndex = 0;
var currentCharacter = characters[currentCharacterIndex];

// đọc localStorage
try {
  bestScore = parseInt(localStorage.getItem("runnerBestScore") || "0", 10);
  if (isNaN(bestScore)) bestScore = 0;
} catch (e) {
  bestScore = 0;
}

try {
  var raw = localStorage.getItem("runnerScoreHistory");
  if (raw) {
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) scoreHistory = parsed;
  }
} catch (e) {
  scoreHistory = [];
}

// ==========================
// PHYSICS / WORLD
// ==========================
var groundHeight = 60;
var groundY = canvas.height - groundHeight;

var player = {
  x: 90,
  y: groundY - 70,
  width: 55,
  height: 70,
  vy: 0,
  onGround: true
};

var obstacles = [];
var spawnTimer = 0;

var clouds = [];
for (var i = 0; i < 8; i++) {
  clouds.push({
    x: Math.random() * canvas.width,
    y: 20 + Math.random() * 150,
    w: 60 + Math.random() * 80,
    h: 20 + Math.random() * 20,
    speed: 20 + Math.random() * 25
  });
}

var gravity = 2200;
var jumpVelocity = -900;
var baseSpeed = 330;

// ==========================
// UTILS
// ==========================
function playSound(audioEl) {
  if (!audioEl) return;
  try {
    audioEl.currentTime = 0;
    audioEl.play();
  } catch (e) {
    // có thể bị chặn autoplay, kệ
  }
}

// ==========================
// UI HELPERS
// ==========================
function updateButtonsUI() {
  // Return chỉ hiện khi đang ở Character / Tutorial / History
  if (
    currentScreen === "character" ||
    currentScreen === "tutorial" ||
    currentScreen === "history"
  ) {
    btnReturn.style.display = "inline-block";
  } else {
    btnReturn.style.display = "none";
  }

  // Pause chỉ hiện khi đang chơi hoặc tạm dừng
  if (currentScreen === "game" && (gameState === "playing" || gameState === "paused")) {
    btnPause.style.display = "inline-block";
    btnPause.textContent = gameState === "paused" ? "Resume" : "Pause";
  } else {
    btnPause.style.display = "none";
  }
}

function showOverlay(html) {
  overlay.innerHTML = "<div class='overlay-box'>" + html + "</div>";
  overlay.style.display = "flex";
}

function hideOverlay() {
  overlay.style.display = "none";
  overlay.innerHTML = "";
}

// ==========================
// SCREENS
// ==========================
function setScreen(screen) {
  currentScreen = screen;

  if (screen === "main") {
    gameState = "idle";
    resetGame();
    showMainMenuOverlay();
  } else if (screen === "character") {
    gameState = "idle";
    resetGame();
    showCharacterOverlay();
  } else if (screen === "tutorial") {
    gameState = "idle";
    resetGame();
    showTutorialOverlay();
  } else if (screen === "history") {
    gameState = "idle";
    resetGame();
    showHistoryOverlay();
  } else if (screen === "game") {
    hideOverlay();
    startGame();
  }

  updateButtonsUI();
}

// ---- overlay content ----
function showMainMenuOverlay() {
  var html =
    "<h2>Welcome to Cute Runner</h2>" +
    "<p>Chọn <b>New Game</b> để bắt đầu chơi. Dùng phím <b>Space</b> hoặc <b>↑</b> (hoặc chạm vào khung game) để nhảy qua các khối màu tím. " +
    "Mỗi khối bạn vượt qua thành công được tính là <b>1 điểm</b>.</p>" +
    "<p>Bạn có thể chọn nhân vật ở mục <b>Character</b>, xem hướng dẫn ở <b>Tutorial</b> và xem lịch sử điểm ở <b>History</b>.</p>" +
    "<p class='hint'>Kỷ lục hiện tại: <b>" +
    bestScore +
    "</b> điểm.</p>";
  showOverlay(html);
}

function showCharacterOverlay() {
  var html =
    "<h2>Chọn nhân vật</h2>" +
    "<p>Hãy chọn một nhân vật dễ thương để chạy trong game.</p>" +
    "<div class='char-grid'>";

  for (var i = 0; i < characters.length; i++) {
    var ch = characters[i];
    var selected = ch === currentCharacter;
    html +=
      "<button class='char-card' data-char='" +
      ch +
      "'>" +
      "<div class='char-emoji'>" +
      characterEmoji[ch] +
      "</div>" +
      "<div class='char-label'>" +
      characterDisplayName[ch] +
      "</div>" +
      (selected ? "<div class='char-selected'>Đang chọn</div>" : "") +
      "</button>";
  }

  html +=
    "</div><p class='hint'>Nhấp vào một thẻ để đổi nhân vật. Nhân vật sẽ áp dụng cho lần chơi tiếp theo.</p>";

  showOverlay(html);
}

function showTutorialOverlay() {
  var html =
    "<h2>Tutorial</h2>" +
    "<ul>" +
    "<li>Bấm <b>New Game</b> ở thanh trên để bắt đầu.</li>" +
    "<li>Nhấn <b>Space</b> hoặc <b>phím ↑</b> (hoặc chạm vào khung) để nhảy.</li>" +
    "<li>Tránh <b>khối màu tím</b>, nếu chạm vào là thua.</li>" +
    "<li>Mỗi lần vượt qua một khối mà không chạm thì được +1 điểm.</li>" +
    "<li>Điểm cao nhất sẽ được lưu lại trên máy.</li>" +
    "</ul>" +
    "<p class='hint'>Tip: Càng lâu thì khối tím càng xuất hiện dày và chạy nhanh hơn.</p>";
  showOverlay(html);
}

function showHistoryOverlay() {
  var html =
    "<h2>History</h2>" +
    "<p>Kỷ lục hiện tại: <b>" +
    bestScore +
    "</b> điểm.</p>";

  if (scoreHistory.length === 0) {
    html += "<p>Chưa có lượt chơi nào.</p>";
  } else {
    html += "<ul class='history-list'>";
    for (var i = scoreHistory.length - 1; i >= 0; i--) {
      var idx = scoreHistory.length - i;
      html +=
        "<li>Lần " + idx + ": <b>" + scoreHistory[i] + "</b> điểm</li>";
    }
    html += "</ul>";
  }

  showOverlay(html);
}

function showGameOverOverlay() {
  var html =
    "<h2>Game Over</h2>" +
    "<p>Bạn đạt được <b>" +
    Math.floor(score) +
    "</b> điểm.</p>" +
    "<p>Kỷ lục hiện tại: <b>" +
    bestScore +
    "</b> điểm.</p>" +
    "<div class='overlay-actions'>" +
    "<button class='overlay-btn' id='btnOverlayNewGame'>New Game</button>" +
    "<button class='overlay-btn secondary' id='btnOverlayMainMenu'>Back to Main Menu</button>" +
    "</div>";

  showOverlay(html);
}

// ==========================
// GAMEPLAY
// ==========================
function resetGame() {
  score = 0;
  player.y = groundY - player.height;
  player.vy = 0;
  player.onGround = true;
  obstacles = [];
  spawnTimer = -0.1;
}

function startGame() {
  resetGame();
  gameState = "playing";
  updateButtonsUI();
}

function finishGame() {
  gameState = "gameover";
  playSound(sfxGameOver);

  var finalScore = Math.floor(score);
  if (finalScore > bestScore) {
    bestScore = finalScore;
    try {
      localStorage.setItem("runnerBestScore", String(bestScore));
    } catch (e) {}
  }

  scoreHistory.push(finalScore);
  scoreHistory = scoreHistory.slice(-5);
  try {
    localStorage.setItem("runnerScoreHistory", JSON.stringify(scoreHistory));
  } catch (e) {}

  showGameOverOverlay();
  updateButtonsUI();
}

function togglePause() {
  if (currentScreen !== "game") return;
  if (gameState === "playing") gameState = "paused";
  else if (gameState === "paused") gameState = "playing";
  updateButtonsUI();
}

function tryJump() {
  if (currentScreen !== "game") return;
  if (gameState === "playing" && player.onGround) {
    player.vy = jumpVelocity;
    player.onGround = false;
    playSound(sfxJump);
  }
}

function spawnObstacle() {
  var h = 40 + Math.random() * 45;
  var w = 30 + Math.random() * 40;
  obstacles.push({
    x: canvas.width + 40,
    y: groundY - h,
    width: w,
    height: h,
    scored: false
  });
}

function update(dt) {
  updateClouds(dt);

  if (currentScreen !== "game") return;
  if (gameState !== "playing") return;

  updatePlayer(dt);

  var difficultyFactor = Math.min(score / 15, 2);
  var speed = baseSpeed + difficultyFactor * 140;

  updateObstacles(dt, speed);

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    var minGap = 0.5;
    var maxGap = 1.2;
    var diff = Math.min(score / 20, 1);
    spawnTimer = maxGap - (maxGap - minGap) * diff;
  }

  // tính điểm khi vượt qua obstacle
  for (var i = 0; i < obstacles.length; i++) {
    var ob = obstacles[i];
    if (!ob.scored && ob.x + ob.width < player.x) {
      ob.scored = true;
      score += 1;
    }
  }

  // va chạm
  for (var j = 0; j < obstacles.length; j++) {
    if (rectIntersect(player, obstacles[j])) {
      finishGame();
      break;
    }
  }
}

function updatePlayer(dt) {
  player.vy += gravity * dt;
  player.y += player.vy * dt;

  var floorY = groundY - player.height;
  if (player.y >= floorY) {
    player.y = floorY;
    player.vy = 0;
    player.onGround = true;
  }
}

function updateObstacles(dt, speed) {
  for (var i = 0; i < obstacles.length; i++) {
    obstacles[i].x -= speed * dt;
  }
  var newObs = [];
  for (var j = 0; j < obstacles.length; j++) {
    if (obstacles[j].x + obstacles[j].width > -20) newObs.push(obstacles[j]);
  }
  obstacles = newObs;
}

function updateClouds(dt) {
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    c.x -= c.speed * dt;
    if (c.x + c.w < -50) {
      c.x = canvas.width + Math.random() * 200;
      c.y = 30 + Math.random() * 120;
    }
  }
}

function rectIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ==========================
// DRAW
// ==========================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (currentScreen === "game") {
    drawClouds();
    drawGround();
    drawPlayer();
    drawObstacles();
    drawHUD();
  } else {
    drawMainBackground();
  }
}

function drawMainBackground() {
  var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#bbdefb");
  grad.addColorStop(0.5, "#e3f2fd");
  grad.addColorStop(1, "#c8e6c9");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.font = "40px system-ui";
  ctx.fillStyle = "#0d47a1";
  ctx.fillText("CUTE RUNNER", canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = "18px system-ui";
  ctx.fillStyle = "#1a237e";
  ctx.fillText(
    "Chọn New Game / Character / Tutorial / History ở trên",
    canvas.width / 2,
    canvas.height / 2 + 30
  );

  // logo nhỏ
  ctx.font = "12px system-ui";
  ctx.fillStyle = "rgba(13, 71, 161, 0.9)";
  ctx.textAlign = "right";
  ctx.fillText("Runner_game", canvas.width - 10, canvas.height - 10);
}

function drawClouds() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    roundRectPath(ctx, c.x, c.y, c.w, c.h, 20);
    ctx.fill();
  }
  ctx.restore();
}

function drawGround() {
  ctx.fillStyle = "#66bb6a";
  ctx.fillRect(0, groundY, canvas.width, groundHeight);

  ctx.strokeStyle = "#2e7d32";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvas.width, groundY);
  ctx.stroke();
}

function drawPlayer() {
  if (currentCharacter === "dog") drawDog(player);
  else if (currentCharacter === "dragon") drawDragon(player);
  else if (currentCharacter === "human") drawHuman(player);
  else if (currentCharacter === "sheep") drawSheep(player);
  else drawCat(player);
}

function drawObstacles() {
  ctx.save();
  for (var i = 0; i < obstacles.length; i++) {
    var ob = obstacles[i];
    var g = ctx.createLinearGradient(ob.x, ob.y, ob.x, ob.y + ob.height);
    g.addColorStop(0, "#9C27B0");
    g.addColorStop(1, "#6A1B9A");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#4A148C";
    ctx.lineWidth = 3;
    roundRectPath(ctx, ob.x, ob.y, ob.width, ob.height, 8);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = "#0d47a1";
  ctx.font = "20px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Điểm: " + Math.floor(score), 20, 28);
  ctx.fillText("Best: " + bestScore, 20, 55);

  // logo nhỏ góc dưới phải
  ctx.font = "12px system-ui";
  ctx.fillStyle = "rgba(13, 71, 161, 0.9)";
  ctx.textAlign = "right";
  ctx.fillText("Runner_game", canvas.width - 10, canvas.height - 10);
  ctx.textAlign = "left";

  if (gameState === "paused") {
    drawCenter("PAUSED", "Nhấn Pause để tiếp tục");
  }
}

function drawCenter(t1, t2) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "32px system-ui";
  ctx.fillText(t1, canvas.width / 2, canvas.height / 2 - 16);

  ctx.font = "18px system-ui";
  ctx.fillText(t2, canvas.width / 2, canvas.height / 2 + 16);

  ctx.restore();
}

function drawShadow(p) {
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(
    p.x + p.width / 2,
    p.y + p.height + 10,
    p.width * 0.55,
    10,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function roundRectPath(ctx, x, y, w, h, r) {
  var radius = r || 0;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// ==========================
// CHARACTER DRAWING
// ==========================
function drawEar(x, y, flip, color, scale) {
  if (scale == null) scale = 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip * scale, scale);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-12, -16);
  ctx.lineTo(-24, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCat(p) {
  ctx.save();
  drawShadow(p);
  ctx.fillStyle = "#FFD95A";
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = 3;
  roundRectPath(ctx, p.x, p.y, p.width, p.height, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FFF9E6";
  roundRectPath(ctx, p.x + 10, p.y + 28, p.width - 20, p.height - 38, 12);
  ctx.fill();

  drawEar(p.x + 8, p.y + 2, -1, "#FFD95A");
  drawEar(p.x + p.width - 8, p.y + 2, 1, "#FFD95A");

  ctx.fillStyle = "#212121";
  ctx.beginPath();
  ctx.arc(p.x + 18, p.y + 25, 5, 0, 2 * Math.PI);
  ctx.arc(p.x + p.width - 18, p.y + 25, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "rgba(244, 67, 54, 0.7)";
  ctx.beginPath();
  ctx.arc(p.x + 12, p.y + 33, 3.5, 0, 2 * Math.PI);
  ctx.arc(p.x + p.width - 12, p.y + 33, 3.5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.strokeStyle = "#5D4037";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + p.width / 2, p.y + 35);
  ctx.lineTo(p.x + p.width / 2 - 6, p.y + 40);
  ctx.moveTo(p.x + p.width / 2, p.y + 35);
  ctx.lineTo(p.x + p.width / 2 + 6, p.y + 40);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x + 12, p.y + 34);
  ctx.lineTo(p.x, p.y + 32);
  ctx.moveTo(p.x + 12, p.y + 38);
  ctx.lineTo(p.x, p.y + 40);
  ctx.moveTo(p.x + p.width - 12, p.y + 34);
  ctx.lineTo(p.x + p.width, p.y + 32);
  ctx.moveTo(p.x + p.width - 12, p.y + 38);
  ctx.lineTo(p.x + p.width, p.y + 40);
  ctx.stroke();

  ctx.strokeStyle = "#DAA520";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(p.x + p.width - 5, p.y + p.height - 20);
  ctx.quadraticCurveTo(
    p.x + p.width + 35,
    p.y + p.height - 40,
    p.x + p.width + 25,
    p.y + p.height - 5
  );
  ctx.stroke();
  ctx.restore();
}

function drawDog(p) {
  ctx.save();
  drawShadow(p);
  ctx.fillStyle = "#FFCC80";
  ctx.strokeStyle = "#8D6E63";
  ctx.lineWidth = 3;
  roundRectPath(ctx, p.x, p.y, p.width, p.height, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FFE0B2";
  roundRectPath(ctx, p.x + 12, p.y + 30, p.width - 24, p.height - 40, 14);
  ctx.fill();

  drawEar(p.x + 6, p.y + 6, -1, "#FFB74D", 1.3);
  drawEar(p.x + p.width - 6, p.y + 6, 1, "#FFB74D", 1.3);

  ctx.fillStyle = "#3E2723";
  ctx.beginPath();
  ctx.arc(p.x + 18, p.y + 26, 5, 0, 2 * Math.PI);
  ctx.arc(p.x + p.width - 18, p.y + 26, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x + p.width / 2, p.y + 32, 4, 0, 2 * Math.PI);
  ctx.fill();

  ctx.strokeStyle = "#5D4037";
  ctx.beginPath();
  ctx.moveTo(p.x + p.width / 2, p.y + 36);
  ctx.quadraticCurveTo(
    p.x + p.width / 2 - 4,
    p.y + 42,
    p.x + p.width / 2 - 10,
    p.y + 42
  );
  ctx.moveTo(p.x + p.width / 2, p.y + 36);
  ctx.quadraticCurveTo(
    p.x + p.width / 2 + 4,
    p.y + 42,
    p.x + p.width / 2 + 10,
    p.y + 42
  );
  ctx.stroke();

  ctx.strokeStyle = "#FFB74D";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(p.x + p.width - 3, p.y + p.height - 18);
  ctx.quadraticCurveTo(
    p.x + p.width + 25,
    p.y + p.height - 40,
    p.x + p.width + 18,
    p.y + p.height - 8
  );
  ctx.stroke();
  ctx.restore();
}

function drawDragon(p) {
  ctx.save();
  drawShadow(p);
  ctx.fillStyle = "#81C784";
  ctx.strokeStyle = "#388E3C";
  ctx.lineWidth = 3;
  roundRectPath(ctx, p.x, p.y, p.width, p.height, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FFF59D";
  roundRectPath(ctx, p.x + 12, p.y + 32, p.width - 24, p.height - 42, 14);
  ctx.fill();

  ctx.fillStyle = "#66BB6A";
  for (var i = 0; i < 4; i++) {
    var sx = p.x + p.width / 2 + 10;
    var sy = p.y + 10 + i * 12;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 18, sy + 6);
    ctx.lineTo(sx, sy + 12);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "#A5D6A7";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x + 16, p.y + 6);
  ctx.lineTo(p.x + 8, p.y - 12);
  ctx.moveTo(p.x + p.width - 16, p.y + 6);
  ctx.lineTo(p.x + p.width - 8, p.y - 12);
  ctx.stroke();

  ctx.fillStyle = "#1B5E20";
  ctx.beginPath();
  ctx.arc(p.x + 18, p.y + 24, 5, 0, 2 * Math.PI);
  ctx.arc(p.x + p.width - 18, p.y + 24, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "rgba(244, 67, 54, 0.7)";
  ctx.beginPath();
  ctx.arc(p.x + 12, p.y + 32, 3.5, 0, 2 * Math.PI);
  ctx.arc(p.x + p.width - 12, p.y + 32, 3.5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.strokeStyle = "#33691E";
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2, p.y + 36, 10, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.strokeStyle = "#43A047";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(p.x + p.width - 4, p.y + p.height - 18);
  ctx.quadraticCurveTo(
    p.x + p.width + 40,
    p.y + p.height - 36,
    p.x + p.width + 30,
    p.y + p.height
  );
  ctx.stroke();
  ctx.restore();
}

function drawHuman(p) {
  ctx.save();
  drawShadow(p);
  ctx.fillStyle = "#64B5F6";
  ctx.strokeStyle = "#1565C0";
  ctx.lineWidth = 3;
  roundRectPath(ctx, p.x + 8, p.y + 26, p.width - 16, p.height - 30, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FFE0B2";
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2, p.y + 20, 18, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = "#FFCC80";
  ctx.stroke();

  ctx.fillStyle = "#5D4037";
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2, p.y + 14, 20, Math.PI, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#3E2723";
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2 - 7, p.y + 20, 3, 0, 2 * Math.PI);
  ctx.arc(p.x + p.width / 2 + 7, p.y + 20, 3, 0, 2 * Math.PI);
  ctx.fill();

  ctx.strokeStyle = "#F4511E";
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2, p.y + 24, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "#FFE0B2";
  roundRectPath(ctx, p.x + 4, p.y + 32, 10, 24, 6);
  roundRectPath(ctx, p.x + p.width - 14, p.y + 32, 10, 24, 6);
  ctx.fill();
  ctx.restore();
}

function drawSheep(p) {
  ctx.save();
  drawShadow(p);
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#B0BEC5";
  ctx.lineWidth = 3;
  roundRectPath(ctx, p.x, p.y + 16, p.width, p.height - 20, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#CFD8DC";
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2, p.y + 24, 16, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2 - 8, p.y + 16, 8, 0, 2 * Math.PI);
  ctx.arc(p.x + p.width / 2 + 4, p.y + 16, 8, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#CFD8DC";
  ctx.beginPath();
  ctx.ellipse(p.x + p.width / 2 - 16, p.y + 24, 7, 3, 0, 0, 2 * Math.PI);
  ctx.ellipse(p.x + p.width / 2 + 16, p.y + 24, 7, 3, 0, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#263238";
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2 - 5, p.y + 24, 3, 0, 2 * Math.PI);
  ctx.arc(p.x + p.width / 2 + 5, p.y + 24, 3, 0, 2 * Math.PI);
  ctx.fill();

  ctx.strokeStyle = "#546E7A";
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2, p.y + 28, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

// ==========================
// INPUT
// ==========================
function handleJumpAction() {
  if (currentScreen === "game") {
    if (gameState === "playing") {
      tryJump();
    } else if (gameState === "idle") {
      startGame();
      tryJump();
    }
  } else if (currentScreen === "main") {
    // click vào canvas ở màn main => start game nhanh
    setScreen("game");
    tryJump();
  }
}

document.addEventListener("keydown", function (e) {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    handleJumpAction();
  }
});

canvas.addEventListener("mousedown", function () {
  handleJumpAction();
});

canvas.addEventListener("touchstart", function (e) {
  e.preventDefault();
  handleJumpAction();
});

// menu buttons
btnMenuNew.addEventListener("click", function () {
  setScreen("game");
});

btnMenuCharacter.addEventListener("click", function () {
  setScreen("character");
});

btnMenuTutorial.addEventListener("click", function () {
  setScreen("tutorial");
});

btnMenuHistory.addEventListener("click", function () {
  setScreen("history");
});

// Return
btnReturn.addEventListener("click", function () {
  setScreen("main");
});

// Pause
btnPause.addEventListener("click", function () {
  togglePause();
});

// overlay click: chọn nhân vật + nút game over
overlay.addEventListener("click", function (e) {
  var card = e.target.closest(".char-card");
  if (card) {
    var ch = card.getAttribute("data-char");
    if (ch && characters.indexOf(ch) !== -1) {
      currentCharacter = ch;
      currentCharacterIndex = characters.indexOf(ch);
      showCharacterOverlay(); // vẽ lại overlay với 'Đang chọn'
    }
    return;
  }

  if (e.target.id === "btnOverlayNewGame") {
    setScreen("game");
    return;
  }
  if (e.target.id === "btnOverlayMainMenu") {
    setScreen("main");
    return;
  }
});

// ==========================
// GAME LOOP
// ==========================
function gameLoop(timestamp) {
  var dt = (timestamp - lastTime) / 1000;
  if (dt > 0.05) dt = 0.05;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

// Start
setScreen("main");
requestAnimationFrame(gameLoop);
