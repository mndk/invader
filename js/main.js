// ===== Game Elements =====
const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const scoreElement = document.getElementById('score');
const hitPointsElement = document.getElementById('hitPoints');
const startButton = document.getElementById('startButton');

let bullets = [];
let enemyBullets = [];
let enemies = [];
let score = 0;
let hitPoints = 100;
let gameOver = false;
let gameClear = false;

// Spawn & score
let spawnCount = 0;            // 20体ごとにボス枠
const POINT_ENEMY = 1;         // 雑魚
const POINT_BOSS = 3;          // 既存ボス
const POINT_BOSS_CROC = 15;    // 新ボス（クロコディロ）

// Intervals / rAF
let gameInterval = null;
let enemyInterval = null;
let rafId = null;

// ===== キーボード移動（滑らか制御） =====
const key = { left: false, right: false, shoot: false };
const SPEED = 360;      // px/s
const ACCEL = 2200;     // px/s^2
const FRICTION = 2600;  // px/s^2
let vx = 0;
let lastTime = 0;

// 連射クールダウン
const SHOOT_COOLDOWN = 320; // ms
let lastShot = 0;

// ===== Game Control =====
function startGame() {
  startButton.style.display = 'none';
  score = 0;
  hitPoints = 100;
  gameOver = false;
  gameClear = false;
  spawnCount = 0;
  updateStats();

  // 既存オブジェクトのリセット
  for (const b of bullets) b.remove();
  bullets = [];
  for (const eb of enemyBullets) eb.remove();
  enemyBullets = [];
  for (const e of enemies) e.remove();
  enemies = [];

  // プレイヤー初期位置（中央）
  player.style.left = (gameArea.clientWidth - player.clientWidth) / 2 + 'px';
  vx = 0;

  // ループ開始
  stopGameIntervals();
  gameInterval = setInterval(() => {
    moveBullet();
    moveEnemyBullets();
    moveEnemy();
  }, 50);
  enemyInterval = setInterval(createEnemy, 1500);

  lastTime = performance.now();
  rafId = requestAnimationFrame(updateLoop);
}

function stopGame() {
  stopGameIntervals();
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  startButton.style.display = 'block';
}

function stopGameIntervals() {
  if (gameInterval) { clearInterval(gameInterval); gameInterval = null; }
  if (enemyInterval) { clearInterval(enemyInterval); enemyInterval = null; }
}

// ===== Update Loop (smooth keyboard move) =====
function updateLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  // 目標速度
  let targetV = 0;
  if (key.left)  targetV -= SPEED;
  if (key.right) targetV += SPEED;

  // 加速/減速
  if (targetV !== 0) {
    const dv = ACCEL * dt * Math.sign(targetV - vx);
    if (Math.abs(targetV - vx) <= Math.abs(dv)) vx = targetV;
    else vx += dv;
  } else {
    const decel = FRICTION * dt;
    if (Math.abs(vx) <= decel) vx = 0;
    else vx += -Math.sign(vx) * decel;
  }

  // 位置更新
  let x = player.offsetLeft + vx * dt;
  const maxX = gameArea.clientWidth - player.clientWidth;
  if (x < 0) x = 0;
  if (x > maxX) x = maxX;
  player.style.left = x + 'px';

  // 連射（押しっぱ対応）
  if (key.shoot) tryShoot(now);

  rafId = requestAnimationFrame(updateLoop);
}

// ===== Mouse Move =====
function movePlayerByMouse(event) {
  const rect = gameArea.getBoundingClientRect();
  const maxX = gameArea.clientWidth - player.clientWidth;
  let newX = event.clientX - rect.left - player.clientWidth / 2;
  if (newX < 0) newX = 0;
  if (newX > maxX) newX = maxX;
  player.style.left = newX + 'px';
}

// ===== Shooting =====
function shoot() {
  const bullet = document.createElement('div');
  bullet.classList.add('bullet');
  bullet.style.left = player.offsetLeft + player.clientWidth / 2 - 2.5 + 'px';
  bullet.style.bottom = player.offsetHeight + 10 + 'px';
  gameArea.appendChild(bullet);
  bullets.push(bullet);
}

function tryShoot(now = performance.now()) {
  if (now - lastShot >= SHOOT_COOLDOWN) {
    shoot();
    lastShot = now;
  }
}

// ===== Keyboard =====
document.addEventListener('keydown', (e) => {
  // Spaceで未開始なら即スタート
  if (e.code === 'Space' && startButton.style.display !== 'none') {
    e.preventDefault();
    startGame();
    return;
  }

  if (e.code === 'ArrowLeft')  { key.left = true;  e.preventDefault(); }
  if (e.code === 'ArrowRight') { key.right = true; e.preventDefault(); }
  if (e.code === 'Space')      { key.shoot = true; e.preventDefault(); }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft')  { key.left = false;  e.preventDefault(); }
  if (e.code === 'ArrowRight') { key.right = false; e.preventDefault(); }
  if (e.code === 'Space')      { key.shoot = false; e.preventDefault(); }
});

// ===== Effects =====
function createExplosion(x, y) {
  const explosion = document.createElement('div');
  explosion.classList.add('explosion');
  explosion.style.left = x - 10 + 'px';
  explosion.style.top  = y - 10 + 'px';
  gameArea.appendChild(explosion);
  setTimeout(() => explosion.remove(), 500);
}

// ===== Enemy Spawning =====
function createEnemy() {
  // 20体ごとにボス出現
  spawnCount++;
  if (spawnCount % 5 === 0) {
    // 既存ボスと新ボスをランダムに出現させる
    if (Math.random() < 0.5) createBoss();
    else createCrocBoss();
    return;
  }
  const enemy = document.createElement('div');
  enemy.classList.add('enemy');
  enemy.style.left = Math.random() * (gameArea.clientWidth - 40) + 'px';
  enemy.style.top  = '-20px';
  gameArea.appendChild(enemy);
  enemies.push(enemy);
}

function createBoss() {
  const boss = document.createElement('div');
  boss.classList.add('boss');
  boss.style.left = Math.random() * (gameArea.clientWidth - 60) + 'px';
  boss.style.top  = '-30px';

  // --- 既存ボス専用プロパティ ---
  boss.dataset.type = 'standard';
  boss.dataset.hp = '3'; // 3発で撃破
  boss.dataset.maxHp = '3';
  boss.dataset.cooldownMs = '2000';
  boss.dataset.lastShot = String(performance.now());
  // 横フラフラ用：目標X・速度（px/s）
  boss.dataset.targetX = String(Math.random() * (gameArea.clientWidth - 60));
  boss.dataset.hSpeed  = String(80 + Math.random() * 80); // 80～160px/sくらい
  gameArea.appendChild(boss);
  enemies.push(boss);
}

function createCrocBoss() {
  const boss = document.createElement('div');
  boss.classList.add('boss', 'boss-croc');

  const bossW = 96;
  const bossH = 96;
  const centerX = gameArea.clientWidth / 2;
  const centerY = -40;
  const radiusX = Math.max(60, (gameArea.clientWidth - bossW) / 2 - 10); // ほぼ左右端まで届く
  const radiusY = 80; // 横長楕円
  const angle = Math.random() * Math.PI * 2;
  const angularSpeed = 2.6; // rad/s（時計回り）
  const driftY = 1.5; // 徐々に下降

  const startX = centerX + Math.cos(angle) * radiusX - bossW / 2;
  const startY = centerY + Math.sin(angle) * radiusY - bossH / 2;

  boss.style.left = startX + 'px';
  boss.style.top  = startY + 'px';

  boss.dataset.type = 'croc';
  boss.dataset.hp = '7';
  boss.dataset.maxHp = '7';
  boss.dataset.cooldownMs = '1000';
  boss.dataset.lastShot = String(performance.now());
  boss.dataset.cx = String(centerX);
  boss.dataset.cy = String(centerY);
  boss.dataset.rx = String(radiusX);
  boss.dataset.ry = String(radiusY);
  boss.dataset.angle = String(angle);
  boss.dataset.angularSpeed = String(angularSpeed);
  boss.dataset.driftY = String(driftY);

  gameArea.appendChild(boss);
  enemies.push(boss);
}

// ===== Movements & Collisions =====
function moveBullet() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const position = parseInt(bullet.style.bottom, 10);
    bullet.style.bottom = position + 5 + 'px';
    if (position > gameArea.clientHeight) {
      bullet.remove();
      bullets.splice(i, 1);
    }
  }
}

function moveEnemyBullets() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    const top = parseInt(bullet.style.top || '0', 10);
    bullet.style.top = top + 5 + 'px';

    if (isColliding(bullet, player)) {
      hitPoints -= 20;
      bullet.remove();
      enemyBullets.splice(i, 1);
      updateStats();
      checkGameOver();
      continue;
    }

    if (top > gameArea.clientHeight) {
      bullet.remove();
      enemyBullets.splice(i, 1);
    }
  }
}

function moveEnemy() {
  const now = performance.now();
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const isBoss = enemy.classList.contains('boss');
    const bossType = enemy.dataset.type || 'standard';

    if (isBoss && bossType === 'croc') {
      moveCrocBoss(enemy);
    } else {
      const topPos = parseInt(enemy.style.top || '-20', 10);
      enemy.style.top = topPos + 3 + 'px';

      if (isBoss) {
        const maxX = gameArea.clientWidth - enemy.clientWidth;
        let x = enemy.offsetLeft;

        let targetX = parseFloat(enemy.dataset.targetX || '0');
        let hSpeed  = parseFloat(enemy.dataset.hSpeed  || '120'); // px/s
        const step = (hSpeed / 20); // 50msあたりの移動量

        if (isNaN(targetX) || Math.abs(targetX - x) < 4) {
          targetX = Math.random() * maxX;
          hSpeed  = 80 + Math.random() * 80;
          enemy.dataset.targetX = String(targetX);
          enemy.dataset.hSpeed  = String(hSpeed);
        }

        const dir = Math.sign(targetX - x);
        x += dir * step;
        if (x < 0) x = 0;
        if (x > maxX) x = maxX;
        enemy.style.left = x + 'px';
      }
    }

    if (isBoss) {
      tryBossShoot(enemy, bossType, now);
    }

    for (let j = bullets.length - 1; j >= 0; j--) {
      const bullet = bullets[j];
      if (!bullet || !enemy) continue;
      if (isColliding(bullet, enemy)) {

        if (isBoss) {
          const destroyed = handleBossHit(enemy, bossType, j, i);
          if (destroyed) {
            break; // この敵は消えた
          } else {
            continue; // 次の弾へ
          }
        } else {
          // 雑魚：即撃破
          createExplosion(enemy.offsetLeft, enemy.offsetTop);
          bullet.remove();
          enemy.remove();
          bullets.splice(j, 1);
          enemies.splice(i, 1);
          score += POINT_ENEMY;
          updateStats();
          checkGameClear();
          break; // この敵は消えた
        }
      }
    }

    const nowTop = parseInt(enemy.style.top || '0', 10);
    if (nowTop > gameArea.clientHeight) {
      hitPoints = 0;
      updateStats();
      checkGameOver();
      return;
    }

    if (enemies[i] && isColliding(player, enemies[i])) {
      hitPoints -= 10;
      enemies[i].remove();
      enemies.splice(i, 1);
      updateStats();
      checkGameOver();
    }
  }
}

// ===== Utils =====
function isColliding(a, b) {
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();
  return !(
    r1.top > r2.bottom ||
    r1.right < r2.left ||
    r1.bottom < r2.top ||
    r1.left > r2.right
  );
}

function moveCrocBoss(enemy) {
  const rx = parseFloat(enemy.dataset.rx || '160');
  const ry = parseFloat(enemy.dataset.ry || '80');
  let cx = parseFloat(enemy.dataset.cx || gameArea.clientWidth / 2);
  let cy = parseFloat(enemy.dataset.cy || -40);
  let angle = parseFloat(enemy.dataset.angle || '0');
  const angularSpeed = parseFloat(enemy.dataset.angularSpeed || '2.6'); // rad/s
  const driftY = parseFloat(enemy.dataset.driftY || '1.5');
  const dt = 0.05; // 50ms interval

  // 時計回りの楕円運動（横長）、中心をゆっくり下降
  cy += driftY;
  angle -= angularSpeed * dt; // 時計回り
  enemy.dataset.angle = String(angle);
  enemy.dataset.cx = String(cx);
  enemy.dataset.cy = String(cy);

  const x = cx + Math.cos(angle) * rx - enemy.clientWidth / 2;
  const y = cy + Math.sin(angle) * ry - enemy.clientHeight / 2;

  const clampedX = Math.min(Math.max(x, 0), gameArea.clientWidth - enemy.clientWidth);
  enemy.style.left = clampedX + 'px';
  enemy.style.top  = y + 'px';
}

function tryBossShoot(enemy, bossType, now) {
  const cooldown = parseInt(enemy.dataset.cooldownMs || (bossType === 'croc' ? '1000' : '2000'), 10);
  const last = parseFloat(enemy.dataset.lastShot || '0');
  if (now - last < cooldown) return;
  createEnemyBullet(enemy);
  enemy.dataset.lastShot = String(now);
}

function createEnemyBullet(enemy) {
  const bullet = document.createElement('div');
  bullet.classList.add('enemy-bullet');
  const x = enemy.offsetLeft + enemy.clientWidth / 2 - 2.5;
  const y = enemy.offsetTop + enemy.clientHeight + 2;
  bullet.style.left = x + 'px';
  bullet.style.top = y + 'px';
  gameArea.appendChild(bullet);
  enemyBullets.push(bullet);
}

function handleBossHit(enemy, bossType, bulletIndex, enemyIndex) {
  const maxHp = parseInt(enemy.dataset.maxHp || (bossType === 'croc' ? '7' : '3'), 10);
  let hp = parseInt(enemy.dataset.hp || String(maxHp), 10);
  hp -= 1;
  enemy.dataset.hp = String(hp);
  applyBossKnockback(enemy);

  const hits = maxHp - hp;
  const filter = getBossHitFilter(bossType, hits);

  if (hp > 0) {
    enemy.style.filter = filter || '';
    createExplosion(enemy.offsetLeft, enemy.offsetTop);
    if (bullets[bulletIndex]) bullets[bulletIndex].remove();
    bullets.splice(bulletIndex, 1);
    return false; // 生存
  } else {
    enemy.style.filter = '';
    createExplosion(enemy.offsetLeft, enemy.offsetTop);
    if (bullets[bulletIndex]) bullets[bulletIndex].remove();
    bullets.splice(bulletIndex, 1);
    enemy.remove();
    enemies.splice(enemyIndex, 1);
    score += bossType === 'croc' ? POINT_BOSS_CROC : POINT_BOSS;
    updateStats();
    checkGameClear();
    return true; // 撃破
  }
}

function getBossHitFilter(bossType, hits) {
  if (bossType === 'croc') {
    const palette = [
      'hue-rotate(20deg) saturate(1.1)',
      'hue-rotate(70deg) saturate(1.2)',
      'hue-rotate(140deg) saturate(1.25)',
      'hue-rotate(210deg) saturate(1.3)',
      'hue-rotate(260deg) saturate(1.35)',
      'hue-rotate(310deg) saturate(1.4)'
    ];
    return palette[hits - 1] || '';
  }
  const palette = [
    'hue-rotate(25deg) saturate(1.2)',
    'hue-rotate(50deg) saturate(1.4)'
  ];
  return palette[hits - 1] || '';
}

function applyBossKnockback(enemy) {
  if (!enemy || !enemy.classList.contains('boss')) return;
  const currentTop = parseInt(enemy.style.top || '-30', 10);
  const newTop = Math.max(-120, currentTop - 12); // 少し上へ押し戻す（最低-120pxまで）
  enemy.style.top = newTop + 'px';
}

function checkGameOver() {
  if (hitPoints <= 0 && !gameOver && !gameClear) {
    gameOver = true;
    alert('ゲームオーバー!');
    stopGame();
  }
}

function checkGameClear() {
  if (score >= 100 && !gameOver && !gameClear) {
    gameClear = true;
    alert('ゲームクリア!');
    stopGame();
  }
}

function updateStats() {
  scoreElement.textContent = String(score);
  hitPointsElement.textContent = String(hitPoints);
}

// ===== Bindings =====
startButton.addEventListener('click', startGame);
gameArea.addEventListener('mousemove', movePlayerByMouse);
gameArea.addEventListener('click', () => tryShoot());
