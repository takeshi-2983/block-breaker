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
let selectedCharacter = 'manta';
let multiballActive = false;
let ballCount = 1;
let gigantizeActive = false;
let gigantizeTime = 0;
let speedUpActive = false;
let speedUpTime = 0;

// Character properties
const characters = {
    manta: {
        name: 'ネオン・エイ',
        color: '#00ff88',
        speedMultiplier: 1,
        widthMultiplier: 1,
        type: 'manta'
    },
    cat: {
        name: 'クロネコ',
        color: '#ff00ff',
        speedMultiplier: 1.3,
        widthMultiplier: 0.85,
        type: 'cat'
    },
    gorilla: {
        name: 'ゴリラ',
        color: '#ff6600',
        speedMultiplier: 0.7,
        widthMultiplier: 1.3,
        type: 'gorilla'
    },
    monkey: {
        name: 'サル',
        color: '#ffaa00',
        speedMultiplier: 1.1,
        widthMultiplier: 0.95,
        type: 'monkey'
    }
};

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

// Additional balls for multiball
let extraBalls = [];

// Items (Power-ups)
let items = [];
const itemTypes = {
    multiball: { color: '#0088ff', symbol: 'M', duration: 0 },
    gigantize: { color: '#ff0088', symbol: 'G', duration: 300 },
    speedup: { color: '#00ff00', symbol: 'S', duration: 300 }
};

// Bricks
let bricks = [];

// Particles for effects
let particles = [];

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

// Touch tracking for paddle
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    paddle.x = Math.max(0, Math.min(touchX - paddle.width / 2, canvas.width - paddle.width));
}, { passive: false });

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
}, { passive: false });

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
const characterSelectModal = document.getElementById('characterSelectModal');
const startCharacterBtn = document.getElementById('startCharacterBtn');
const stageDisplay = document.getElementById('stage');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const finalScoreDisplay = document.getElementById('finalScore');
const gameOverTitle = document.getElementById('gameOverTitle');

// Character selection
document.querySelectorAll('.character-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.character-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        selectedCharacter = option.dataset.character;
    });
    option.addEventListener('touchend', (e) => {
        e.preventDefault();
        document.querySelectorAll('.character-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        selectedCharacter = option.dataset.character;
    });
});

// Start game from character selection
if (startCharacterBtn) {
    startCharacterBtn.addEventListener('click', () => {
        startGame();
    });
    startCharacterBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        startGame();
    });
}

// Event listeners
startBtn.addEventListener('click', () => {
    showCharacterSelect();
});
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    resetGame();
    showCharacterSelect();
});
restartBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    gameOverModal.classList.add('hidden');
    resetGame();
    showCharacterSelect();
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

// Show character select
function showCharacterSelect() {
    characterSelectModal.classList.remove('hidden');
    document.querySelectorAll('.character-option').forEach(o => o.classList.remove('selected'));
    document.querySelector(`[data-character="${selectedCharacter}"]`).classList.add('selected');
}

// Initialize bricks
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
    const charProps = characters[selectedCharacter];
    
    paddle.width = config.paddleWidth * charProps.widthMultiplier;
    paddle.speed = 7 * charProps.speedMultiplier;
    paddle.x = Math.max(0, Math.min(paddle.x, canvas.width - paddle.width));
    
    ball.speed = config.ballSpeed;
    
    initBricks();
}

// Start game
function startGame() {
    if (!gameRunning) {
        characterSelectModal.classList.add('hidden');
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
    multiballActive = false;
    ballCount = 1;
    gigantizeActive = false;
    speedUpActive = false;
    extraBalls = [];
    items = [];
    particles = [];
    
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

// Draw character
function drawCharacter() {
    const centerX = paddle.x + paddle.width / 2;
    const centerY = paddle.y;
    const time = gameTime * 0.05;
    const breathe = Math.sin(time) * 2;
    const hitReaction = Math.max(0, 1 - (gameTime - paddle.lastBallHit) * 0.1);
    const charProps = characters[selectedCharacter];
    const charColor = charProps.color;
    
    let scaleFactor = 1;
    if (gigantizeActive) {
        scaleFactor = 1.5;
    }
    
    ctx.shadowColor = charColor;
    ctx.shadowBlur = 15 + hitReaction * 10;
    
    if (selectedCharacter === 'manta') {
        // Manta ray
        ctx.fillStyle = charColor;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 2, (paddle.width / 2 - 2) * scaleFactor, (8 + breathe) * scaleFactor, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(centerX - (paddle.width / 3) * scaleFactor, centerY - 2 + Math.sin(time + 1) * 3, 8 * scaleFactor, 12 * scaleFactor, -0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(centerX + (paddle.width / 3) * scaleFactor, centerY - 2 + Math.sin(time) * 3, 8 * scaleFactor, 12 * scaleFactor, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 10 + Math.sin(time * 1.5) * 2, 5 * scaleFactor, 6 * scaleFactor, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (selectedCharacter === 'cat') {
        // Black cat
        ctx.fillStyle = charColor;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 3, (paddle.width / 2 - 3) * scaleFactor, (7 + breathe) * scaleFactor, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ears
        ctx.beginPath();
        ctx.ellipse(centerX - (paddle.width / 4) * scaleFactor, centerY - 8 * scaleFactor, 5 * scaleFactor, 10 * scaleFactor, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + (paddle.width / 4) * scaleFactor, centerY - 8 * scaleFactor, 5 * scaleFactor, 10 * scaleFactor, 0.4, 0, Math.PI * 2);
        ctx.fill();
    } else if (selectedCharacter === 'gorilla') {
        // Gorilla
        ctx.fillStyle = charColor;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 2, (paddle.width / 2 - 1) * scaleFactor, (10 + breathe) * scaleFactor, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Arms
        ctx.beginPath();
        ctx.ellipse(centerX - (paddle.width / 2.5) * scaleFactor, centerY + 2, 6 * scaleFactor, 14 * scaleFactor, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + (paddle.width / 2.5) * scaleFactor, centerY + 2, 6 * scaleFactor, 14 * scaleFactor, 0.2, 0, Math.PI * 2);
        ctx.fill();
    } else if (selectedCharacter === 'monkey') {
        // Monkey
        ctx.fillStyle = charColor;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 2, (paddle.width / 2 - 2) * scaleFactor, (8 + breathe) * scaleFactor, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail
        ctx.beginPath();
        ctx.ellipse(centerX + (paddle.width / 2) * scaleFactor, centerY + 5 + Math.sin(time * 2) * 3, 4 * scaleFactor, 8 * scaleFactor, 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Eyes
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(centerX - 12 * scaleFactor, centerY - 2, 3 * scaleFactor, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 12 * scaleFactor, centerY - 2, 3 * scaleFactor, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX - 12 * scaleFactor, centerY - 2, 1 * scaleFactor, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 12 * scaleFactor, centerY - 2, 1 * scaleFactor, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

function drawBall() {
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 20;
    
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Extra balls
    extraBalls.forEach(b => {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(b.x, b.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

function drawBricks() {
    bricks.forEach(brick => {
        if (brick.active) {
            ctx.shadowColor = brick.color;
            ctx.shadowBlur = 10;
            
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

function drawItems() {
    items.forEach(item => {
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.type.charAt(0).toUpperCase(), item.x, item.y);
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    });
}

function drawParticles() {
    particles.forEach((p, index) => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBricks();
    drawItems();
    drawParticles();
    drawCharacter();
    drawBall();
}

// Create particles on collision
function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            life: 30,
            maxLife: 30,
            size: Math.random() * 3 + 2,
            color: color
        });
    }
}

// Collision detection
function checkCollisions() {
    const charProps = characters[selectedCharacter];
    
    // Ball-paddle collision
    if (ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width) {
        
        ball.dy = -Math.abs(ball.dy);
        const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPos * ball.speed;
        paddle.lastBallHit = gameTime;
        
        createParticles(ball.x, ball.y, charProps.color, 12);
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
            
            createParticles(ball.x, ball.y, brick.color, 6);
            
            // Randomly drop items
            if (Math.random() < 0.15) {
                const itemType = ['multiball', 'gigantize', 'speedup'][Math.floor(Math.random() * 3)];
                items.push({
                    x: brick.x + brick.width / 2,
                    y: brick.y + brick.height / 2,
                    vx: 0,
                    vy: 2,
                    type: itemType,
                    color: itemTypes[itemType].color
                });
            }
            
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
    
    // Extra balls collision
    extraBalls.forEach((b, index) => {
        if (b.y + b.radius > paddle.y &&
            b.y - b.radius < paddle.y + paddle.height &&
            b.x > paddle.x &&
            b.x < paddle.x + paddle.width) {
            
            b.dy = -Math.abs(b.dy);
            const hitPos = (b.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            b.dx = hitPos * ball.speed;
            paddle.lastBallHit = gameTime;
            createParticles(b.x, b.y, charProps.color, 12);
        }
        
        if (b.x - b.radius < 0 || b.x + b.radius > canvas.width) {
            b.dx = -b.dx;
        }
        
        if (b.y - b.radius < 0) {
            b.dy = -b.dy;
        }
        
        if (b.y - b.radius > canvas.height) {
            extraBalls.splice(index, 1);
        }
        
        bricks.forEach(brick => {
            if (brick.active &&
                b.x > brick.x &&
                b.x < brick.x + brick.width &&
                b.y > brick.y &&
                b.y < brick.y + brick.height) {
                
                brick.active = false;
                score += 10;
                updateUI();
                createParticles(b.x, b.y, brick.color, 6);
                
                if (Math.random() < 0.15) {
                    const itemType = ['multiball', 'gigantize', 'speedup'][Math.floor(Math.random() * 3)];
                    items.push({
                        x: brick.x + brick.width / 2,
                        y: brick.y + brick.height / 2,
                        vx: 0,
                        vy: 2,
                        type: itemType,
                        color: itemTypes[itemType].color
                    });
                }
                
                const overlapLeft = (b.x + b.radius) - brick.x;
                const overlapRight = (brick.x + brick.width) - (b.x - b.radius);
                const overlapTop = (b.y + b.radius) - brick.y;
                const overlapBottom = (brick.y + brick.height) - (b.y - b.radius);
                
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                
                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                    b.dx = -b.dx;
                } else {
                    b.dy = -b.dy;
                }
            }
        });
    });
    
    // Item collection
    items.forEach((item, index) => {
        if (item.y + 8 > paddle.y &&
            item.y - 8 < paddle.y + paddle.height &&
            item.x > paddle.x &&
            item.x < paddle.x + paddle.width) {
            
            items.splice(index, 1);
            
            if (item.type === 'multiball') {
                multiballActive = true;
                for (let i = 0; i < 2; i++) {
                    extraBalls.push({
                        x: ball.x,
                        y: ball.y,
                        radius: ball.radius,
                        dx: (Math.random() - 0.5) * 6,
                        dy: -4,
                        speed: ball.speed
                    });
                }
            } else if (item.type === 'gigantize') {
                gigantizeActive = true;
                gigantizeTime = 300;
            } else if (item.type === 'speedup') {
                speedUpActive = true;
                speedUpTime = 300;
                paddle.speed *= 1.3;
            }
        }
    });
    
    // Ball out of bounds
    if (ball.y - ball.radius > canvas.height) {
        if (extraBalls.length === 0) {
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
        } else {
            extraBalls = [];
            multiballActive = false;
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
            extraBalls = [];
            items = [];
            multiballActive = false;
            gigantizeActive = false;
            speedUpActive = false;
            
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
    
    // Update gigantize timer
    if (gigantizeActive) {
        gigantizeTime--;
        if (gigantizeTime <= 0) {
            gigantizeActive = false;
        }
    }
    
    // Update speedup timer
    if (speedUpActive) {
        speedUpTime--;
        if (speedUpTime <= 0) {
            speedUpActive = false;
            const charProps = characters[selectedCharacter];
            paddle.speed = 7 * charProps.speedMultiplier;
        }
    }
    
    if (buttonLeftPressed) {
        paddle.x = Math.max(0, paddle.x - paddle.speed);
    }
    if (buttonRightPressed) {
        paddle.x = Math.min(canvas.width - paddle.width, paddle.x + paddle.speed);
    }
    
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    extraBalls.forEach(b => {
        b.x += b.dx;
        b.y += b.dy;
    });
    
    items.forEach(item => {
        item.y += item.vy;
        if (item.y > canvas.height) {
            items.splice(items.indexOf(item), 1);
        }
    });
    
    particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
            particles.splice(index, 1);
        }
    });
    
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
showCharacterSelect();
draw();
