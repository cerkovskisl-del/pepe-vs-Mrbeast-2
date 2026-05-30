const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValElement = document.getElementById("score-val");
const scoreTextElement = document.getElementById("score-text");
const controlsTextElement = document.getElementById("controls-text");

let score = 0;
let currentLang = 'lv';

// --- ATTĒLU IELĀDE ---
const pepeIdle = new Image();
pepeIdle.src = 'pepe_idle.png'; // Kad stāv uz vietas

const pepeRun1 = new Image();
pepeRun1.src = 'pepe_run1.png'; // Skriešanas 1. kadrs

const pepeRun2 = new Image();
pepeRun2.src = 'pepe_run2.png'; // Skriešanas 2. kadrs

// --- ANIMĀCIJAS MAINĪGIE ---
let facingDirection = 1;       // 1 = pa labi, -1 = pa kreisi
let animationTimer = 0;        // Skaita kadrus, lai zinātu, kad mainīt bildi
let currentRunFrame = 1;       // Kurš skriešanas kadrs pašlaik ir aktīvs (1 vai 2)

const translations = {
    lv: {
        score: "Punkti",
        controls: "Vadība: Kustība ar bultiņām vai WASD | Lēkt ar Atstarpi (Space)",
        win: "Pepe veiksmīgi atrada MrBeast! Kopējie punkti: "
    },
    en: {
        score: "Points",
        controls: "Controls: Move with Arrows or WASD | Jump with Space",
        win: "Pepe successfully found MrBeast! Total points: "
    },
    ru: {
        score: "Очки",
        controls: "Управление: Движение стрелками или WASD | Прыжок через Пробел",
        win: "Пепе успешно нашёл Мистера Биста! Всего очков: "
    }
};

function changeLanguage(lang) {
    currentLang = lang;
    scoreTextElement.innerText = translations[lang].score;
    controlsTextElement.innerText = translations[lang].controls;

    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    window.event.target.classList.add('active');
}

const player = {
    x: 50, y: 300, width: 40, height: 50,
    speed: 5, velX: 0, velY: 0,
    jumping: false, grounded: false,
    isMoving: false
};

const keys = {};

const platforms = [
    { x: 0, y: 380, width: 800, height: 20 },
    { x: 200, y: 280, width: 120, height: 15 },
    { x: 400, y: 220, width: 150, height: 15 },
    { x: 150, y: 150, width: 100, height: 15 },
    { x: 600, y: 150, width: 150, height: 15 }
];

const items = [
    { x: 250, y: 240, width: 15, height: 15, collected: false },
    { x: 450, y: 180, width: 15, height: 15, collected: false },
    { x: 180, y: 110, width: 15, height: 15, collected: false }
];

const boss = { x: 660, y: 100, width: 40, height: 50 };

window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

function update() {
    player.isMoving = false;

    // Kustība pa labi
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) { 
        if (player.velX < player.speed) player.velX++; 
        player.isMoving = true;
        facingDirection = 1; 
    }
    // Kustība pa kreisi
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) { 
        if (player.velX > -player.speed) player.velX--; 
        player.isMoving = true;
        facingDirection = -1; 
    }
    
    if (Math.abs(player.velX) > 0.2) {
        player.isMoving = true;
    }

    // Animācijas loģika: Ja Pepe skrien, skaitām laiku un mainām kadrus
    if (player.isMoving) {
        animationTimer++;
        if (animationTimer >= 10) { // Ik pēc 10 kadriem (nomaini uz mazāku skaitli, ja gribi ātrāku skriešanu)
            if (currentRunFrame === 1) {
                currentRunFrame = 2;
            } else {
                currentRunFrame = 1;
            }
            animationTimer = 0; // Atiestata taimeri
        }
    } else {
        animationTimer = 0;
        currentRunFrame = 1; // Ja apstājas, sagatavojas pirmajam kadram
    }

    if ((keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "]) && !player.jumping && player.grounded) {
        player.jumping = true;
        player.grounded = false;
        player.velY = -11;
    }

    player.velX *= 0.8;
    player.velY += 0.45;
    player.grounded = false;

    for (let i = 0; i < platforms.length; i++) {
        let plat = platforms[i];
        if (player.x < plat.x + plat.width && player.x + player.width > plat.x &&
            player.y < plat.y + plat.height && player.y + player.height > plat.y) {
            if (player.velY > 0 && player.y + player.height - player.velY <= plat.y) {
                player.grounded = true;
                player.jumping = false;
                player.velY = 0;
                player.y = plat.y - player.height;
            }
        }
    }

    if (player.grounded) player.velY = 0;
    player.x += player.velX;
    player.y += player.velY;

    if (player.y > canvas.height) { resetPlayer(); }

    items.forEach(item => {
        if (!item.collected && player.x < item.x + item.width && player.x + player.width > item.x &&
            player.y < item.y + item.height && player.y + player.height > item.y) {
            item.collected = true;
            score += 10;
            scoreValElement.innerText = score;
        }
    });

    if (player.x < boss.x + boss.width && player.x + player.width > boss.x &&
        player.y < boss.y + boss.height && player.y + player.height > boss.y) {
        alert(translations[currentLang].win + score);
        resetGame();
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Kosmosa fons
    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Zvaigznes
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(100, 80, 2, 2);
    ctx.fillRect(300, 50, 3, 3);
    ctx.fillRect(550, 120, 2, 2);
    ctx.fillRect(700, 70, 3, 3);

    // Platformas
    platforms.forEach(plat => {
        ctx.fillStyle = "#795548";
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
    });

    // Monētas
    ctx.fillStyle = "#FFD700";
    items.forEach(item => {
        if (!item.collected) {
            ctx.beginPath();
            ctx.arc(item.x + item.width/2, item.y + item.height/2, item.width/2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // MrBeast
    ctx.fillStyle = "#002fa7";
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("MrBeast", boss.x - 5, boss.y - 8);

    // --- PEPE ZĪMĒŠANA AR MULTI-KADRU ANIMĀCIJU ---
    ctx.save();

    // Attēla izvēle: ja stāv, tad pepeIdle. Ja skrien, skatās kurš kadrs aktīvs
    let currentImg;
    if (player.isMoving) {
        currentImg = (currentRunFrame === 1) ? pepeRun1 : pepeRun2;
    } else {
        currentImg = pepeIdle;
    }

    // Pagriešana spoguļattēlā, ja iet pa kreisi
    if (facingDirection === -1) {
        ctx.translate(player.x + player.width, player.y);
        ctx.scale(-1, 1);
        ctx.drawImage(currentImg, 0, 0, player.width, player.height);
    } else {
        ctx.drawImage(currentImg, player.x, player.y, player.width, player.height);
    }

    ctx.restore();
}

function resetPlayer() {
    player.x = 50; player.y = 300; player.velX = 0; player.velY = 0;
}

function resetGame() {
    resetPlayer();
    score = 0;
    scoreValElement.innerText = score;
    items.forEach(i => i.collected = false);
}

update();
