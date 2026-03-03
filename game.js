// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let gameRunning = false;
let gamePaused = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('blockBreakerHighScore') || '0');
let lives = 3;
let currentStage = 1;
const maxStages = 5;
let gameTime = 0;
let combo = 0;
let comboTimer = 0;
let feverActive = false;
let feverTimer = 0;

// Stage configuration
const stageConfig = {
    1: { rows: 4, cols: 8, ballSpeed: 4, paddleWidth: 100 },
    2: { rows: 5, cols: 8, ballSpeed: 4.5, paddleWidth: 90 },
    3: { rows: 5, cols: 9, ballSpeed: 5, paddleWidth: 85 },
    4: { rows: 6, cols: 9, ballSpeed: 5.5, paddleWidth: 80 },
    5: { rows: 6, cols: 10, ballSpeed: 6, paddleWidth: 75 }
};

// Paddle (Neon Creature)
const paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 20,
    width: 100,
    height: 15,
    speed: 7,
    dx: 0,
    lastBallHit: 0
};

// Ball
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 40,
    radius: 8,
    dx: 4,
    dy: -4,
    speed: 5,
    trail: []
};

// Bricks
let bricks = [];

// Particles
let particles = [];

// Power-ups
let powerUps = [];

// Button control state
let buttonLeftPressed = false;
let buttonRightPressed = false;

// Web Audio context for sound effects
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playSound(freq, duration, type = 'square', volume = 0.3) {
    try {
        const ac = getAudioCtx();
        const oscillator = ac.createOscillator();
        const gainNode = ac.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ac.destination);
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, ac.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(freq * 0.5, ac.currentTime + duration);
        gainNode.gain.setValueAtTime(volume, ac.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
        oscillator.start(ac.currentTime);
        oscillator.stop(ac.currentTime + duration);
    } catch (e) {}
}

function playBrickSound(comboCount) {
    const freqs = [330, 440, 523, 659, 784, 880, 1046];
    const freq = freqs[Math.min(comboCount, freqs.length - 1)];
    playSound(freq, 0.08, 'square', 0.2);
}

function playPaddleSound() {
    playSound(180, 0.04, 'sine', 0.15);
}

function playPowerUpSound() {
    const ac = getAudioCtx();
    [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => playSound(f, 0.15, 'sine', 0.25), i * 80);
    });
}

function playLifeLostSound() {
    playSound(200, 0.15, 'sawtooth', 0.3);
    setTimeout(() => playSound(150, 0.25, 'sawtooth', 0.3), 150);
}

function playClearSound() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
        setTimeout(() => playSound(f, 0.2, 'sine', 0.25), i * 100);
    });
}

// Keyboard input
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Mouse tracking for paddle
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(0, Math.min(mouseX - paddle.width / 2, canvas.width - paddle.width));
});

// Touch tracking for paddle (mobile support)
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const touch = e.touches[0];
    const touchX = (touch.clientX - rect.left) * scaleX;
    paddle.x = Math.max(0, Math.min(touchX - paddle.width / 2, canvas.width - paddle.width));
}, { passive: false });

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); }, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (gameRunning) e.preventDefault();
}, { passive: false });

// UI Elements
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const restartBtn = document.getElementById('restartBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const gameOverModal = document.getElementById('gameOver');
const stageDisplay = document.getElementById('stage');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const highScoreDisplay = document.getElementById('highScore');
const finalScoreDisplay = document.getElementById('finalScore');
const finalHighScoreDisplay = document.getElementById('finalHighScore');
const gameOverTitle = document.getElementById('gameOverTitle');

// Event listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    resetGame();
    startGame();
});

// Left button controls
leftBtn.addEventListener('mousedown', () => { buttonLeftPressed = true; });
leftBtn.addEventListener('mouseup', () => { buttonLeftPressed = false; });
leftBtn.addEventListener('mouseleave', () => { buttonLeftPressed = false; });
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); buttonLeftPressed = true; });
leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); buttonLeftPressed = false; });

// Right button controls
rightBtn.addEventListener('mousedown', () => { buttonRightPressed = true; });
rightBtn.addEventListener('mouseup', () => { buttonRightPressed = false; });
rightBtn.addEventListener('mouseleave', () => { buttonRightPressed = false; });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); buttonRightPressed = true; });
rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); buttonRightPressed = false; });

// Create particles when brick is destroyed
function createParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x,
            y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 3,
            color,
            life: 1
        });
    }
}

// Power-up type definitions
const powerUpDefs = [
    { type: 'wide',  color: '#00aaff', descJP: 'パドルが広がる！' },
    { type: 'life',  color: '#ff4466', descJP: '残機＋１！' },
    { type: 'slow',  color: '#aaffaa', descJP: 'ボール速度ダウン！' },
    { type: 'fever', color: '#ffaa00', descJP: 'フィーバー！' }
];

function spawnPowerUp(x, y) {
    if (Math.random() < 0.18) {
        const def = powerUpDefs[Math.floor(Math.random() * powerUpDefs.length)];
        powerUps.push({ x, y, width: 36, height: 18, dy: 2.2, descTimer: 180, ...def });
    }
}

// Initialize bricks based on current stage
function initBricks() {
    bricks = [];
    const config = stageConfig[currentStage];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#FFD93D', '#6BCB77'];

    const brickWidth = Math.max(60, 90 - (currentStage - 1) * 3);
    const brickHeight = 20;
    const padding = 5;
    const totalWidth = config.cols * (brickWidth + padding);
    const offsetX = (canvas.width - totalWidth) / 2;
    const offsetY = 30;

    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            const x = col * (brickWidth + padding) + offsetX;
            const y = row * (brickHeight + padding) + offsetY;
            // Top rows get tough bricks in later stages
            const tough = row === 0 && currentStage >= 2 && Math.random() < 0.5;
            const maxHits = tough ? 2 : 1;
            bricks.push({
                x, y,
                width: brickWidth,
                height: brickHeight,
                active: true,
                color: colors[row % colors.length],
                hits: maxHits,
                maxHits
            });
        }
    }
}

// Apply stage settings
function applyStageSettings() {
    const config = stageConfig[currentStage];
    paddle.width = config.paddleWidth;
    paddle.x = Math.max(0, Math.min(paddle.x, canvas.width - paddle.width));
    ball.speed = config.ballSpeed;
    powerUps = [];
    particles = [];
    ball.trail = [];
    feverActive = false;
    feverTimer = 0;
    initBricks();
}

// Start game
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        gameTime = 0;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        gameLoop();
    }
}

// Toggle pause
function togglePause() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        pauseBtn.textContent = gamePaused ? '再開' : '一時停止';
        if (!gamePaused) gameLoop();
    }
}

// Reset game
function resetGame() {
    gameRunning = false;
    gamePaused = false;
    score = 0;
    lives = 3;
    currentStage = 1;
    gameTime = 0;
    combo = 0;
    comboTimer = 0;
    feverActive = false;
    feverTimer = 0;
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 40;
    ball.dx = 4;
    ball.dy = -4;
    ball.trail = [];
    paddle.x = canvas.width / 2 - 50;
    paddle.width = 100;
    paddle.lastBallHit = 0;
    ball.speed = 5;
    buttonLeftPressed = false;
    buttonRightPressed = false;
    powerUps = [];
    particles = [];

    applyStageSettings();
    updateUI();

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = '一時停止';
    gameOverModal.classList.add('hidden');

    draw();
}

// Update UI
function updateUI() {
    stageDisplay.textContent = currentStage;
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    if (highScoreDisplay) highScoreDisplay.textContent = highScore;
}

// ---- Draw functions ----

function drawBackground() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle cyber grid
    ctx.strokeStyle = feverActive
        ? 'rgba(255, 170, 0, 0.06)'
        : 'rgba(0, 255, 136, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Fever overlay pulse
    if (feverActive) {
        const pulse = Math.sin(gameTime * 0.15) * 0.04 + 0.04;
        ctx.fillStyle = `rgba(255, 170, 0, ${pulse})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawPaddle() {
    const centerX = paddle.x + paddle.width / 2;
    const centerY = paddle.y;
    const time = gameTime * 0.05;
    const breathe = Math.sin(time) * 2;
    const hitReaction = Math.max(0, 1 - (gameTime - paddle.lastBallHit) * 0.1);

    const paddleColor = feverActive ? '#ffaa00' : '#00ff88';
    ctx.shadowColor = paddleColor;
    ctx.shadowBlur = 15 + hitReaction * 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = paddleColor;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 2, paddle.width / 2 - 2, 8 + breathe, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(centerX - paddle.width / 3, centerY - 2 + Math.sin(time + 1) * 3, 8, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(centerX + paddle.width / 3, centerY - 2 + Math.sin(time) * 3, 8, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 10 + Math.sin(time * 1.5) * 2, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 15, centerY - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY - 2, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 15, centerY - 2, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = paddleColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 2, paddle.width / 2 - 2, 8 + breathe, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

function drawBall() {
    // Trail
    ball.trail.forEach((pos, i) => {
        const t = i / ball.trail.length;
        ctx.globalAlpha = t * 0.5;
        ctx.fillStyle = feverActive ? '#ffaa00' : '#ffff00';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ball.radius * t * 0.8, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    const ballColor = feverActive ? '#ffaa00' : '#ffff00';
    ctx.shadowColor = ballColor;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = ballColor;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

function drawBricks() {
    bricks.forEach(brick => {
        if (!brick.active) return;

        const isWeak = brick.maxHits > 1 && brick.hits < brick.maxHits;
        ctx.globalAlpha = isWeak ? 0.65 : 1;
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 10;

        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

        // Armor bar on tough bricks at full health
        if (brick.maxHits > 1 && brick.hits === brick.maxHits) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(brick.x, brick.y, brick.width, 4);
        }

        // Crack on damaged tough bricks
        if (isWeak) {
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(brick.x + brick.width * 0.3, brick.y);
            ctx.lineTo(brick.x + brick.width * 0.5, brick.y + brick.height * 0.5);
            ctx.lineTo(brick.x + brick.width * 0.8, brick.y + brick.height);
            ctx.stroke();
        }

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);

        ctx.globalAlpha = 1;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

function drawHeartShape(cx, cy, size) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.35);
    ctx.bezierCurveTo(cx - size * 0.7, cy - size * 0.1, cx - size * 0.7, cy - size * 0.6, cx, cy - size * 0.2);
    ctx.bezierCurveTo(cx + size * 0.7, cy - size * 0.6, cx + size * 0.7, cy - size * 0.1, cx, cy + size * 0.35);
    ctx.closePath();
    ctx.fill();
}

function drawStarShape(cx, cy, outerR, innerR) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        if (i === 0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
}

function drawPowerUps() {
    powerUps.forEach(p => {
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = p.color;

        switch (p.type) {
            case 'wide': {
                // Wide horizontal bar suggesting paddle expansion
                ctx.beginPath();
                ctx.roundRect(p.x - 22, p.y - 7, 44, 14, 7);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('◀  ▶', p.x, p.y);
                break;
            }
            case 'life': {
                // Heart shape
                drawHeartShape(p.x, p.y, 15);
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y + 15 * 0.35);
                ctx.bezierCurveTo(p.x - 15 * 0.7, p.y - 15 * 0.1, p.x - 15 * 0.7, p.y - 15 * 0.6, p.x, p.y - 15 * 0.2);
                ctx.bezierCurveTo(p.x + 15 * 0.7, p.y - 15 * 0.6, p.x + 15 * 0.7, p.y - 15 * 0.1, p.x, p.y + 15 * 0.35);
                ctx.closePath();
                ctx.stroke();
                break;
            }
            case 'slow': {
                // Clock face indicating time/speed slowdown
                ctx.beginPath();
                ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, p.y - 7);
                ctx.stroke();
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + 5, p.y + 3);
                ctx.stroke();
                break;
            }
            case 'fever': {
                // 5-pointed star for fever mode
                drawStarShape(p.x, p.y, 15, 6);
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('!', p.x, p.y);
                break;
            }
        }

        // Japanese description label shown when power-up first appears
        if (p.descTimer > 0) {
            const alpha = p.descTimer < 40 ? p.descTimer / 40 : 1;
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 12px sans-serif';
            const textWidth = ctx.measureText(p.descJP).width;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.roundRect(p.x - textWidth / 2 - 6, p.y - 38, textWidth + 12, 18, 9);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.descJP, p.x, p.y - 29);
        }

        ctx.restore();
    });
}

function drawComboAndFever() {
    // Combo display
    if (combo >= 2 && comboTimer > 0) {
        const alpha = Math.min(1, comboTimer / 40);
        ctx.globalAlpha = alpha;
        const size = Math.min(28 + combo * 3, 52);
        ctx.font = `bold ${size}px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 25;
        ctx.fillText(`${combo}x COMBO!`, canvas.width / 2, 80);
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
    }

    // Fever timer bar
    if (feverActive && feverTimer > 0) {
        const maxFever = 360;
        const ratio = feverTimer / maxFever;
        const barW = canvas.width * 0.6;
        const barX = (canvas.width - barW) / 2;
        const barY = canvas.height - 8;

        ctx.fillStyle = 'rgba(255,170,0,0.2)';
        ctx.fillRect(barX, barY, barW, 5);

        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 10;
        ctx.fillRect(barX, barY, barW * ratio, 5);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffaa00';
        ctx.fillText('★ FEVER ★', canvas.width / 2, barY - 4);
        ctx.textAlign = 'left';
    }
}

function draw() {
    drawBackground();
    drawBricks();
    drawParticles();
    drawPowerUps();
    drawBall();
    drawPaddle();
    drawComboAndFever();
}

// Collision detection
function checkCollisions() {
    // Ball-paddle collision
    if (
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x + ball.radius > paddle.x &&
        ball.x - ball.radius < paddle.x + paddle.width
    ) {
        ball.dy = -Math.abs(ball.dy);
        const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPos * ball.speed;
        paddle.lastBallHit = gameTime;
        combo = 0;
        comboTimer = 0;
        playPaddleSound();
    }

    // Ball-wall collision
    if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
        ball.dx = -ball.dx;
        ball.x = ball.x - ball.radius < 0 ? ball.radius : canvas.width - ball.radius;
    }

    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
        ball.y = ball.radius;
    }

    // Ball-brick collision
    bricks.forEach(brick => {
        if (
            brick.active &&
            ball.x + ball.radius > brick.x &&
            ball.x - ball.radius < brick.x + brick.width &&
            ball.y + ball.radius > brick.y &&
            ball.y - ball.radius < brick.y + brick.height
        ) {
            brick.hits--;

            if (brick.hits <= 0) {
                brick.active = false;
                combo++;
                comboTimer = 150;

                const multiplier = feverActive ? 3 : (combo >= 2 ? combo : 1);
                const points = 10 * multiplier;
                score += points;

                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('blockBreakerHighScore', highScore);
                }

                createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 14);
                spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
                playBrickSound(combo - 1);
            } else {
                createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 5);
            }

            updateUI();

            const overlapLeft   = (ball.x + ball.radius) - brick.x;
            const overlapRight  = (brick.x + brick.width) - (ball.x - ball.radius);
            const overlapTop    = (ball.y + ball.radius) - brick.y;
            const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                ball.dx = -ball.dx;
            } else {
                ball.dy = -ball.dy;
            }
        }
    });

    // Power-up collection
    powerUps = powerUps.filter(p => {
        if (p.y - p.height / 2 > canvas.height) return false;

        if (
            p.x + p.width / 2 > paddle.x &&
            p.x - p.width / 2 < paddle.x + paddle.width &&
            p.y + p.height / 2 > paddle.y &&
            p.y - p.height / 2 < paddle.y + paddle.height
        ) {
            applyPowerUp(p.type);
            playPowerUpSound();
            return false;
        }
        return true;
    });

    // Ball out of bounds
    if (ball.y - ball.radius > canvas.height) {
        lives--;
        combo = 0;
        comboTimer = 0;
        feverActive = false;
        feverTimer = 0;
        updateUI();
        playLifeLostSound();

        if (lives <= 0) {
            endGame(false);
        } else {
            ball.x = canvas.width / 2;
            ball.y = canvas.height - 40;
            ball.dx = 4;
            ball.dy = -4;
            ball.trail = [];
            powerUps = [];
        }
    }

    // Check win condition
    if (bricks.every(brick => !brick.active)) {
        if (currentStage < maxStages) {
            playClearSound();
            currentStage++;
            applyStageSettings();

            ball.x = canvas.width / 2;
            ball.y = canvas.height - 40;
            ball.dx = 4;
            ball.dy = -4;
            ball.trail = [];
            paddle.x = canvas.width / 2 - paddle.width / 2;

            updateUI();
            draw();

            gameRunning = false;
            setTimeout(() => {
                gameRunning = true;
                gameLoop();
            }, 1500);
        } else {
            playClearSound();
            endGame(true);
        }
    }
}

function applyPowerUp(type) {
    switch (type) {
        case 'wide': {
            const prevWidth = paddle.width;
            paddle.width = Math.min(paddle.width + 40, 200);
            paddle.x = Math.max(0, Math.min(paddle.x, canvas.width - paddle.width));
            setTimeout(() => {
                paddle.width = prevWidth;
                paddle.x = Math.max(0, Math.min(paddle.x, canvas.width - paddle.width));
            }, 8000);
            break;
        }
        case 'life':
            lives = Math.min(lives + 1, 5);
            updateUI();
            break;
        case 'slow': {
            const currentV = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            const slowFactor = 0.55;
            ball.dx *= slowFactor;
            ball.dy *= slowFactor;
            ball.speed = stageConfig[currentStage].ballSpeed * slowFactor;
            setTimeout(() => {
                if (!gameRunning) return;
                const v = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                const origSpeed = stageConfig[currentStage].ballSpeed;
                ball.speed = origSpeed;
                if (v > 0) {
                    ball.dx = (ball.dx / v) * origSpeed;
                    ball.dy = (ball.dy / v) * origSpeed;
                }
            }, 6000);
            break;
        }
        case 'fever':
            feverActive = true;
            feverTimer = 360; // 6 seconds at 60fps
            break;
    }
}

// Update game state
function update() {
    if (!gameRunning || gamePaused) return;

    gameTime++;

    if (buttonLeftPressed || keys['ArrowLeft']) {
        paddle.x = Math.max(0, paddle.x - paddle.speed);
    }
    if (buttonRightPressed || keys['ArrowRight']) {
        paddle.x = Math.min(canvas.width - paddle.width, paddle.x + paddle.speed);
    }

    // Ball trail
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 10) ball.trail.shift();

    ball.x += ball.dx;
    ball.y += ball.dy;

    // Update particles
    particles = particles.filter(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.dy += 0.12;
        p.life -= 0.022;
        return p.life > 0;
    });

    // Update power-ups
    powerUps.forEach(p => {
        p.y += p.dy;
        if (p.descTimer > 0) p.descTimer--;
    });

    // Update combo timer
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) combo = 0;
    }

    // Update fever timer
    if (feverActive && feverTimer > 0) {
        feverTimer--;
        if (feverTimer === 0) feverActive = false;
    }

    checkCollisions();
}

// End game
function endGame(won) {
    gameRunning = false;
    pauseBtn.disabled = true;
    startBtn.disabled = false;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('blockBreakerHighScore', highScore);
    }

    gameOverTitle.textContent = won ? 'すべてのステージをクリア！' : 'ゲームオーバー';
    finalScoreDisplay.textContent = score;
    if (finalHighScoreDisplay) finalHighScoreDisplay.textContent = highScore;
    gameOverModal.classList.remove('hidden');
}

// Game loop
function gameLoop() {
    update();
    draw();

    if (gameRunning && !gamePaused) {
        requestAnimationFrame(gameLoop);
    }
}

// Responsive canvas sizing
function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 40, 800);
    const maxHeight = Math.min(window.innerHeight - 300, 600);
    const scale = Math.min(maxWidth / 800, maxHeight / 600, 1);

    canvas.style.width = (800 * scale) + 'px';
    canvas.style.height = (600 * scale) + 'px';
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => { setTimeout(resizeCanvas, 100); });

// Initialize game
resizeCanvas();
applyStageSettings();
updateUI();
draw();
