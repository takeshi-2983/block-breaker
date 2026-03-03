// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let gameRunning = false;
let gamePaused = false;
let score = 0;
let lives = 3;
let currentStage = 1;
const maxStages = 5;
let gameTime = 0;

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
    speed: 5
};

// Bricks
let bricks = [];
const brickConfig = {
    rows: 4,
    cols: 8,
    width: 90,
    height: 20,
    padding: 5,
    offsetX: 10,
    offsetY: 30
};

// Button control state
let buttonLeftPressed = false;
let buttonRightPressed = false;

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
    const mouseX = e.clientX - rect.left;
    paddle.x = Math.max(0, Math.min(mouseX - paddle.width / 2, canvas.width - paddle.width));
});

// Touch tracking for paddle (mobile support)
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    paddle.x = Math.max(0, Math.min(touchX - paddle.width / 2, canvas.width - paddle.width));
}, { passive: false });

// Prevent default touch behaviors on the canvas
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
}, { passive: false });

// Prevent scrolling on the entire page during gameplay
window.addEventListener('touchmove', (e) => {
    if (gameRunning) {
        e.preventDefault();
    }
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
const finalScoreDisplay = document.getElementById('finalScore');
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
leftBtn.addEventListener('mousedown', () => {
    buttonLeftPressed = true;
});
leftBtn.addEventListener('mouseup', () => {
    buttonLeftPressed = false;
});
leftBtn.addEventListener('mouseleave', () => {
    buttonLeftPressed = false;
});
leftBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    buttonLeftPressed = true;
});
leftBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    buttonLeftPressed = false;
});

// Right button controls
rightBtn.addEventListener('mousedown', () => {
    buttonRightPressed = true;
});
rightBtn.addEventListener('mouseup', () => {
    buttonRightPressed = false;
});
rightBtn.addEventListener('mouseleave', () => {
    buttonRightPressed = false;
});
rightBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    buttonRightPressed = true;
});
rightBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    buttonRightPressed = false;
});

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
            bricks.push({
                x: x,
                y: y,
                width: brickWidth,
                height: brickHeight,
                active: true,
                color: colors[row % colors.length]
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
        if (!gamePaused) {
            gameLoop();
        }
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
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 40;
    ball.dx = 4;
    ball.dy = -4;
    paddle.x = canvas.width / 2 - 50;
    paddle.width = 100;
    paddle.lastBallHit = 0;
    ball.speed = 5;
    buttonLeftPressed = false;
    buttonRightPressed = false;
    
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
}

// Draw functions
function drawPaddle() {
    const centerX = paddle.x + paddle.width / 2;
    const centerY = paddle.y;
    const time = gameTime * 0.05;
    const breathe = Math.sin(time) * 2;
    const hitReaction = Math.max(0, 1 - (gameTime - paddle.lastBallHit) * 0.1);
    
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15 + hitReaction * 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Main body
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 2, paddle.width / 2 - 2, 8 + breathe, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Left fin
    ctx.beginPath();
    ctx.ellipse(centerX - paddle.width / 3, centerY - 2 + Math.sin(time + 1) * 3, 8, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Right fin
    ctx.beginPath();
    ctx.ellipse(centerX + paddle.width / 3, centerY - 2 + Math.sin(time) * 3, 8, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 10 + Math.sin(time * 1.5) * 2, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 15, centerY - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye glow
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY - 2, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 15, centerY - 2, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Outline
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 2, paddle.width / 2 - 2, 8 + breathe, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

function drawBall() {
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

function drawBricks() {
    bricks.forEach(brick => {
        if (brick.active) {
            ctx.shadowColor = brick.color;
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            ctx.fillStyle = brick.color;
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    });
}

function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawPaddle();
    drawBall();
    drawBricks();
}

// Collision detection
function checkCollisions() {
    // Ball-paddle collision
    if (ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width) {
        
        ball.dy = -Math.abs(ball.dy);
        const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPos * ball.speed;
        paddle.lastBallHit = gameTime;
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
        if (brick.active &&
            ball.x > brick.x &&
            ball.x < brick.x + brick.width &&
            ball.y > brick.y &&
            ball.y < brick.y + brick.height) {
            
            brick.active = false;
            score += 10;
            updateUI();
            
            const overlapLeft = (ball.x + ball.radius) - brick.x;
            const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
            const overlapTop = (ball.y + ball.radius) - brick.y;
            const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);
            
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            
            if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                ball.dx = -ball.dx;
            } else {
                ball.dy = -ball.dy;
            }
        }
    });
    
    // Ball out of bounds
    if (ball.y - ball.radius > canvas.height) {
        lives--;
        updateUI();
        
        if (lives <= 0) {
            endGame(false);
        } else {
            ball.x = canvas.width / 2;
            ball.y = canvas.height - 40;
            ball.dx = 4;
            ball.dy = -4;
        }
    }
    
    // Check win condition
    if (bricks.every(brick => !brick.active)) {
        if (currentStage < maxStages) {
            currentStage++;
            applyStageSettings();
            
            ball.x = canvas.width / 2;
            ball.y = canvas.height - 40;
            ball.dx = 4;
            ball.dy = -4;
            paddle.x = canvas.width / 2 - paddle.width / 2;
            
            updateUI();
            draw();
            
            gameRunning = false;
            setTimeout(() => {
                gameRunning = true;
                gameLoop();
            }, 1500);
        } else {
            endGame(true);
        }
    }
}

// Update game state
function update() {
    if (!gameRunning || gamePaused) return;
    
    gameTime++;
    
    if (buttonLeftPressed) {
        paddle.x = Math.max(0, paddle.x - paddle.speed);
    }
    if (buttonRightPressed) {
        paddle.x = Math.min(canvas.width - paddle.width, paddle.x + paddle.speed);
    }
    
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    checkCollisions();
}

// End game
function endGame(won) {
    gameRunning = false;
    pauseBtn.disabled = true;
    startBtn.disabled = false;
    
    if (won) {
        gameOverTitle.textContent = 'すべてのステージをクリア！';
    } else {
        gameOverTitle.textContent = 'ゲームオーバー';
    }
    finalScoreDisplay.textContent = score;
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
    const container = canvas.parentElement;
    const maxWidth = Math.min(window.innerWidth - 40, 800);
    const maxHeight = Math.min(window.innerHeight - 300, 600);
    const scale = Math.min(maxWidth / 800, maxHeight / 600, 1);
    
    canvas.style.width = (800 * scale) + 'px';
    canvas.style.height = (600 * scale) + 'px';
}

// Handle window resize
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
});

// Initialize game
resizeCanvas();
applyStageSettings();
updateUI();
draw();
