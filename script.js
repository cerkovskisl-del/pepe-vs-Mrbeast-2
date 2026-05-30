const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValElement = document.getElementById("score-val");
const scoreTextElement = document.getElementById("score-text");
const controlsTextElement = document.getElementById("controls-text");

// --- PROGRESSA IELĀDE NO ATMIŅAS (localStorage) ---
// Ja atmiņā nekas nav, tad sākam no 0 (1. līmenis) un 0 punktiem
let score = parseInt(localStorage.getItem("pepe_score")) || 0;
let currentLevel = parseInt(localStorage.getItem("pepe_level")) || 0;
let currentLang = localStorage.getItem("pepe_lang") || 'lv';

// Atjaunojam punktu skaitu ekrānā uzreiz pēc ielādes
scoreValElement.innerText = score;

const TOTAL_LEVELS = 30; 
let cameraX = 0;

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
        nextLevel: "Līmenis pabeigts! Progres saglabāts. Gatavojies līmenim: ",
        win: "Apsveicu! Tu izgāji visus 30 līmeņus! Kopējie punkti: "
    },
    en: {
        score: "Points",
        controls: "Controls: Move with Arrows or WASD | Jump with Space",
        nextLevel: "Level cleared! Progress saved. Get ready for Level ",
        win: "Congratulations! You beat all 30 levels! Total points: "
    },
    ru: {
        score: "Очки",
        controls: "Управление: Движение стрелками или WASD | Прыжок через Пробел",
        nextLevel: "Уровень пройден! Прогресс сохранен! Приготовься к уровню ",
        win: "Поздравляем! Ты прошёл все 30 уровней! Всего очков: "
    }
};

// Funkcija, kas saglabā datus pārlūkprogrammā
function saveProgress() {
    localStorage.setItem("pepe_level", currentLevel);
    localStorage.setItem("pepe_score", score);
    localStorage.setItem("pepe_lang", currentLang);
}

function changeLanguage(lang) {
    currentLang = lang;
    scoreTextElement.innerText = translations[lang].score;
    controlsTextElement.innerText = translations[lang].controls;

    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Pārbaudām window.event drošībai, ja funkciju izsauc automātiski ielādējot
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    } else {
        // Atrodam pogu manuāli pēc teksta, ja ielādējas automātiski
        buttons.forEach(btn => {
            if (btn.innerText.toLowerCase() === lang) btn.classList.add('active');
        });
    }
    saveProgress();
}

const player = {
    x: 50, y: 200, width: 40, height: 50,
    speed: 5, velX: 0, velY: 0,
    jumping: false, grounded: false,
    isMoving: false
};

const keys = {};

let currentPlatforms = [];
let currentItems = [];
let currentBoss = { x: 0, y: 0, width: 40, height: 50 };

// --- MATEMĀTISKI SAKĀRTOTS LĪMEŅU ĢENERATORS AR GARUMU ---
function generateLevel(lvl) {
    currentPlatforms = [];
    currentItems = [];
    cameraX = 0; 

    currentPlatforms.push({ x: 0, y: 340, width: 150, height: 20 });

    let difficultyFactor = lvl / TOTAL_LEVELS;
    let numPlatforms = 6 + Math.floor(lvl / 4); 
    let platWidth = 150 - (lvl * 2);
    if (platWidth < 75) platWidth = 75; 

    let startX = 200;
    let startY = 320;

    for (let i = 0; i < numPlatforms; i++) {
        let gapX = 70 + (difficultyFactor * 45) + (Math.sin(i) * 10); 
        if (gapX > 135) gapX = 135; 

        let wave = Math.sin(i + lvl) * 50; 
        let platY = startY + wave - (difficultyFactor * i * 5);

        if (platY < 130) platY = 130;
        if (platY > 360) platY = 340;

        let platX = startX + (i * (platWidth + gapX));

        currentPlatforms.push({
            x: platX,
            y: platY,
            width: platWidth,
            height: 15
        });

        currentItems.push({
            x: platX + (platWidth / 2) - 7,
            y: platY - 25,
            width: 15,
            height: 15,
            collected: false
        });
    }

    let lastPlat = currentPlatforms[currentPlatforms.length - 1];
    let finalPlatX = lastPlat.x + lastPlat.width + 90;
    
    currentPlatforms.push({
        x: finalPlatX,
        y: 250,
        width: 120,
        height: 20
    });

    currentBoss.x = finalPlatX + 40;
    currentBoss.y = 250 - currentBoss.height;
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

    if (player.x < 0) player.x = 0;

    if (player.x > 300) {
        cameraX = player.x - 300;
    } else {
        cameraX = 0;
    }

    if (player.y > canvas.height) { resetPlayer(); }

    // Monētu vākšana + PROGRESSA SAGLABĀŠANA
    currentItems.forEach(item => {
        if (!item.collected && player.x < item.x + item.width && player.x + player.width > item.x &&
            player.y < item.y + item.height && player.y + player.height > item.y) {
            item.collected = true;
            score += 10;
            scoreValElement.innerText = score;
            saveProgress(); // Saglabājam jauno punktu skaitu pārlūkā
        }
    });

    // Līmeņa beigas + PROGRESSA SAGLABĀŠANA
    if (player.x < currentBoss.x + currentBoss.width && player.x + player.width > currentBoss.x &&
        player.y < currentBoss.y + currentBoss.height && player.y + player.height > currentBoss.y) {
        
        if (currentLevel < TOTAL_LEVELS - 1) {
            currentLevel++; 
            saveProgress(); // Saglabājam jauno līmeni atmiņā pirms alert loga
            alert(translations[currentLang].nextLevel + (currentLevel + 1));
            generateLevel(currentLevel); 
            resetPlayer();
        } else {
            alert(translations[currentLang].win + score);
            clearSavedProgress(); // Ja spēle pilnībā izieta, nodzēšam atmiņu restartam
        }
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(100 - cameraX*0.1, 80, 2, 2); 
    ctx.fillRect(300 - cameraX*0.1, 50, 3, 3);
    ctx.fillRect(550 - cameraX*0.1, 120, 2, 2); 
    ctx.fillRect(700 - cameraX*0.1, 70, 3, 3);

    currentPlatforms.forEach(plat => {
        ctx.fillStyle = "#2c3e50"; 
        ctx.fillRect(plat.x - cameraX, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#00d2ff"; 
        ctx.fillRect(plat.x - cameraX, plat.y, plat.width, 3);
    });

    ctx.fillStyle = "#FFD700";
    currentItems.forEach(item => {
        if (!item.collected) {
            ctx.beginPath();
            ctx.arc(item.x + item.width/2 - cameraX, item.y + item.height/2, item.width/2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.fillStyle = "#002fa7";
    ctx.fillRect(currentBoss.x - cameraX, currentBoss.y, currentBoss.width, currentBoss.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("MrBeast", currentBoss.x - cameraX - 5, currentBoss.y - 8);

    ctx.save();
    let currentImg = player.isMoving ? ((currentRunFrame === 1) ? pepeRun1 : pepeRun2) : pepeIdle;

    if (facingDirection === -1) {
        ctx.translate(player.x - cameraX + player.width, player.y);
        ctx.scale(-1, 1);
        ctx.drawImage(currentImg, 0, 0, player.width, player.height);
    } else {
        ctx.drawImage(currentImg, player.x - cameraX, player.y, player.width, player.height);
    }
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    let lvlText = (currentLang === 'lv') ? "Līmenis: " : (currentLang === 'en') ? "Level: " : "Уровень: ";
    ctx.fillText(lvlText + (currentLevel + 1) + " / 30", 20, 30);
}

function resetPlayer() {
    player.x = 40; 
    player.y = 200; 
    player.velX = 0; 
    player.velY = 0;
}

// Funkcija, lai pilnībā nodzēstu atmiņu un sāktu no nulles (ja spēlētājs grib restartēt visu spēli)
function clearSavedProgress() {
    localStorage.removeItem("pepe_level");
    localStorage.removeItem("pepe_score");
    currentLevel = 0;
    score = 0;
    scoreValElement.innerText = score;
    generateLevel(currentLevel);
    resetPlayer();
}

// Sagatavojam pareizo līmeni ielādes brīdī
generateLevel(currentLevel);
resetPlayer();

// Uzstādām saglabāto valodu
changeLanguage(currentLang);

update();
