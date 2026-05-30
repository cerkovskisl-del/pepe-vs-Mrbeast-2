const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValElement = document.getElementById("score-val");
const scoreTextElement = document.getElementById("score-text");
const controlsTextElement = document.getElementById("controls-text");

let score = 0;
let currentLang = 'lv';
let currentLevel = 0; 
const TOTAL_LEVELS = 30; 

// --- ATTĒLU IELĀDE ---
const pepeIdle = new Image();
pepeIdle.src = 'pepe_idle.png';

const pepeRun1 = new Image();
pepeRun1.src = 'pepe_run1.png';

const pepeRun2 = new Image();
pepeRun2.src = 'pepe_run2.png';

// --- ANIMĀCIJAS MAINĪGIE ---
let facingDirection = 1;       
let animationTimer = 0;        
let currentRunFrame = 1;       

const translations = {
    lv: {
        score: "Punkti",
        controls: "Vadība: Kustība ar bultiņām vai WASD | Lēkt ar Atstarpi (Space)",
        nextLevel: "Līmenis pabeigts! Gatavojies līmenim: ",
        win: "Apsveicu! Tu izgāji visus 30 līmeņus! Kopējie punkti: "
    },
    en: {
        score: "Points",
        controls: "Controls: Move with Arrows or WASD | Jump with Space",
        nextLevel: "Level cleared! Get ready for Level ",
        win: "Congratulations! You beat all 30 levels! Total points: "
    },
    ru: {
        score: "Очки",
        controls: "Управление: Движение стрелками или WASD | Прыжок через Пробел",
        nextLevel: "Уровень пройден! Приготовься к уровню ",
        win: "Поздравляем! Ты прошёл все 30 уровней! Всего очков: "
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

let currentPlatforms = [];
let currentItems = [];
let currentBoss = { x: 0, y: 0, width: 40, height: 50 };

// --- MATEMĀTISKI SAKĀRTOTS LĪMEŅU ĢENERATORS ---
function generateLevel(lvl) {
    currentPlatforms = [];
    currentItems = [];

    // Starta drošības platforma Pēpem
    currentPlatforms.push({ x: 0, y: 340, width: 120, height: 20 });

    // Nosakām spēles grūtību (no 1 līdz 30)
    let difficultyFactor = lvl / TOTAL_LEVELS;

    // Aprēķinām platformu skaitu, platumu un attālumus pēc stabilas formulas
    let numPlatforms = 5 + Math.floor(lvl / 6); // Līmeņos būs no 5 līdz 10 platformām
    let platWidth = 150 - (lvl * 2.5);          // Platformas kļūst šaurākas (no 150 līdz 75)
    if (platWidth < 70) platWidth = 70;         // Neļaujam būt pārāk šaurām

    let startX = 170;
    let startY = 320;

    for (let i = 0; i < numPlatforms; i++) {
        // Aprēķinām loģisku un uzlēcamu attālumu starp platformām
        let gapX = 70 + (difficultyFactor * 50) + (i * 5); 
        if (gapX > 140) gapX = 140; // Maksimālais drošais lēciena attālums

        // Veidojam skaistu viļņveida vai kāpņu augstuma maiņu (izmantojam Sinusīdu stabilitātei)
        let wave = Math.sin(i + lvl) * 60; 
        let platY = startY + wave - (difficultyFactor * i * 10);

        // Drošības rāmji, lai platformas neiziet no ekrāna
        if (platY < 120) platY = 120;
        if (platY > 360) platY = 340;

        let platX = startX + (i * (platWidth + gapX));

        // Pievienojam platformu
        currentPlatforms.push({
            x: platX,
            y: platY,
            width: platWidth,
            height: 15
        });

        // Uz katras platformas smuki nocentrējam monētu
        currentItems.push({
            x: platX + (platWidth / 2) - 7,
            y: platY - 25,
            width: 15,
            height: 15,
            collected: false
        });
    }

    // Gala platforma priekš MrBeast
    let lastPlat = currentPlatforms[currentPlatforms.length - 1];
    
    // Novietojam MrBeast tieši pēdējās platformas vidū
    currentBoss.x = lastPlat.x + (lastPlat.width / 2) - 20;
    currentBoss.y = lastPlat.y - currentBoss.height;
}

window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

function update() {
    player.isMoving = false;

    if (keys["ArrowRight"] || keys["d"] || keys["D"]) { 
        if (player.velX < player.speed) player.velX++; 
        player.isMoving = true;
        facingDirection = 1; 
    }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) { 
        if (player.velX > -player.speed) player.velX--; 
        player.isMoving = true;
        facingDirection = -1; 
    }
    
    if (Math.abs(player.velX) > 0.2) { player.isMoving = true; }

    if (player.isMoving) {
        animationTimer++;
        if (animationTimer >= 10) {
            currentRunFrame = (currentRunFrame === 1) ? 2 : 1;
            animationTimer = 0;
        }
    } else {
        animationTimer = 0;
        currentRunFrame = 1;
    }

    if ((keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "]) && !player.jumping && player.grounded) {
        player.jumping = true;
        player.grounded = false;
        player.velY = -11;
    }

    player.velX *= 0.8;
    player.velY += 0.45;
    player.grounded = false;

    // Sadursmes ar platformām
    for (let i = 0; i < currentPlatforms.length; i++) {
        let plat = currentPlatforms[i];
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

    // Ja nokrīt bedrē, Pēpe atgriežas startā
    if (player.y > canvas.height) { resetPlayer(); }

    // Monētas
    currentItems.forEach(item => {
        if (!item.collected && player.x < item.x + item.width && player.x + player.width > item.x &&
            player.y < item.y + item.height && player.y + player.height > item.y) {
            item.collected = true;
            score += 10;
            scoreValElement.innerText = score;
        }
    });

    // Sadursme ar MrBeast (Uzvara / Nākamais līmenis)
    if (player.x < currentBoss.x + currentBoss.width && player.x + player.width > currentBoss.x &&
        player.y < currentBoss.y + currentBoss.height && player.y + player.height > currentBoss.y) {
        
        if (currentLevel < TOTAL_LEVELS - 1) {
            currentLevel++; 
            alert(translations[currentLang].nextLevel + (currentLevel + 1));
            generateLevel(currentLevel); 
            resetPlayer();
        } else {
            alert(translations[currentLang].win + score);
            resetGame();
        }
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Kosmosa fons
    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Zvaigznes fonā
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(100, 80, 2, 2); ctx.fillRect(300, 50, 3, 3);
    ctx.fillRect(550, 120, 2, 2); ctx.fillRect(700, 70, 3, 3);
    ctx.fillRect(450, 300, 2, 2); ctx.fillRect(150, 220, 1, 1);

    // Platformas ar glītu sci-fi/kosmosa dizainu (pelēkas ar zilu neonu)
    currentPlatforms.forEach(plat => {
        ctx.fillStyle = "#2c3e50"; // Tumši pelēks asteroīda/bāzes bloks
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#00d2ff"; // Zils neona līnija virspusē kosmosa noskaņai
        ctx.fillRect(plat.x, plat.y, plat.width, 3);
    });

    // Monētas
    ctx.fillStyle = "#FFD700";
    currentItems.forEach(item => {
        if (!item.collected) {
            ctx.beginPath();
            ctx.arc(item.x + item.width/2, item.y + item.height/2, item.width/2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // MrBeast
    ctx.fillStyle = "#002fa7";
    ctx.fillRect(currentBoss.x, currentBoss.y, currentBoss.width, currentBoss.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("MrBeast", currentBoss.x - 5, currentBoss.y - 8);

    // Pēpe kosmonauts
    ctx.save();
    let currentImg = player.isMoving ? ((currentRunFrame === 1) ? pepeRun1 : pepeRun2) : pepeIdle;

    if (facingDirection === -1) {
        ctx.translate(player.x + player.width, player.y);
        ctx.scale(-1, 1);
        ctx.drawImage(currentImg, 0, 0, player.width, player.height);
    } else {
        ctx.drawImage(currentImg, player.x, player.y, player.width, player.height);
    }
    ctx.restore();

    // Līmeņa teksts stūrī
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    let lvlText = (currentLang === 'lv') ? "Līmenis: " : (currentLang === 'en') ? "Level: " : "Уровень: ";
    ctx.fillText(lvlText + (currentLevel + 1) + " / 30", 20, 30);
}

function resetPlayer() {
    // Spēlētājs vienmēr sāk uz pirmās platformas
    player.x = 30; 
    player.y = 250; 
    player.velX = 0; 
    player.velY = 0;
}

function resetGame() {
    currentLevel = 0;
    score = 0;
    scoreValElement.innerText = score;
    generateLevel(currentLevel);
    resetPlayer();
}

generateLevel(currentLevel);
resetPlayer();
update();
