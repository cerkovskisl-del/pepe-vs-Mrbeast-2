const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValElement = document.getElementById("score-val");
const scoreTextElement = document.getElementById("score-text");
const controlsTextElement = document.getElementById("controls-text");

// --- VEIKALA VIZUĀLIE ELEMENTI MĀJASLAPĀ ---
const speedLvlDisplay = document.getElementById("speed-lvl-display");
const jumpLvlDisplay = document.getElementById("jump-lvl-display");

// --- PROGRESSA IELĀDE NO LOCALSTORAGE ---
let score = parseInt(localStorage.getItem("pepe_score")) || 0;
let currentLevel = parseInt(localStorage.getItem("pepe_level")) || 0;
let currentLang = localStorage.getItem("pepe_lang") || 'lv';

// --- UPGRADE STATISTIKA ---
let speedLevel = parseInt(localStorage.getItem("pepe_speed_lvl")) || 0;
let jumpLevel = parseInt(localStorage.getItem("pepe_jump_lvl")) || 0;

scoreValElement.innerText = score;

const TOTAL_LEVELS = 30; 
let cameraX = 0;

// --- ATTĒLU IELĀDE AR DROŠĪBAS KONTROLI ---
let loadedImagesCount = 0;
const totalImagesNeeded = 2; // Pepe spritesheet un MrBeast attēls

function imageLoaded() {
    loadedImagesCount++;
    if (loadedImagesCount === totalImagesNeeded) {
        // Tikai tad, kad abi attēli ir 100% ielādēti, palaidīsies spēle
        startGame();
    }
}

// 1. Pepe animāciju lapa (spritesheet)
const pepeSpritesheet = new Image();
pepeSpritesheet.src = 'pepe_spritesheet.png'; // Pārliecinies, ka tavs spritesheet fails saucas šādi
pepeSpritesheet.onload = imageLoaded;
pepeSpritesheet.onerror = function() {
    console.error("Kļūda: Nevarēja ielādēt 'pepe_spritesheet.png'. Pārbaudi faila nosaukumu un mapi!");
};

// 2. MrBeast attēls
const mrBeastImg = new Image();
mrBeastImg.src = 'mrbeast.png';
mrBeastImg.onload = imageLoaded;
mrBeastImg.onerror = function() {
    console.error("Kļūda: Nevarēja ielādēt 'mrbeast.png'. Pārbaudi faila nosaukumu un mapi!");
};


// --- ANIMĀCIJAS MAINĪGIE ---
let facingDirection = 1;       
let animationTimer = 0;        
let currentRunFrame = 0; // Kadra indekss rindā (0, 1, 2, 3...)

const translations = {
    lv: {
        score: "Punkti",
        controls: "Vadība: Bultiņas/WASD = Kustība | Atstarpe = Lēkt || Telefonā izmanto pogas apakšā!",
        nextLevel: "Līmenis pabeigts! Progres saglabāts. Gatavojies līmenim: ",
        win: "Apsveicu! Tu izgāji visus 30 līmeņus! Kopējie punkti: "
    },
    en: {
        score: "Points",
        controls: "Controls: Arrows/WASD = Move | Space = Jump || On mobile use buttons below!",
        nextLevel: "Level cleared! Progress saved. Get ready for Level ",
        win: "Congratulations! You beat all 30 levels! Total points: "
    },
    ru: {
        score: "Очки",
        controls: "Управление: Стрелки/WASD = Бег | Пробел = Прыжок || На телефоне жми кнопки снизу!",
        nextLevel: "Уровень пройден! Прогресс сохранен! Приготовься к уровню ",
        win: "Поздравляем! Ты прошёл все 30 уровней! Всего очков: "
    }
};

function saveProgress() {
    localStorage.setItem("pepe_level", currentLevel);
    localStorage.setItem("pepe_score", score);
    localStorage.setItem("pepe_lang", currentLang);
    localStorage.setItem("pepe_speed_lvl", speedLevel);
    localStorage.setItem("pepe_jump_lvl", jumpLevel);
    updateShopUI();
}

function updateShopUI() {
    if(speedLvlDisplay) speedLvlDisplay.innerText = "Lvl " + speedLevel;
    if(jumpLvlDisplay) jumpLvlDisplay.innerText = "Lvl " + jumpLevel;
}

function changeLanguage(lang) {
    currentLang = lang;
    scoreTextElement.innerText = translations[lang].score;
    controlsTextElement.innerText = translations[lang].controls;

    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    buttons.forEach(btn => {
        if (btn.innerText.toLowerCase() === lang.toLowerCase()) btn.classList.add('active');
    });
    saveProgress();
}

const player = {
    x: 60, y: 200, width: 45, height: 60,
    baseSpeed: 6,
    baseJump: -13, 
    velX: 0, velY: 0,
    jumping: false, grounded: false,
    isMoving: false
};

let keys = {};
let currentPlatforms = [];
let currentItems = [];
let currentBoss = { x: 0, y: 0, width: 45, height: 60 };

function clearKeys() {
    keys = {};
}

function generateLevel(lvl) {
    currentPlatforms = [];
    currentItems = [];
    cameraX = 0; 

    currentPlatforms.push({ x: 0, y: 440, width: 200, height: 25 });

    let difficultyFactor = lvl / TOTAL_LEVELS;
    let numPlatforms = 7 + Math.floor(lvl / 3); 
    let platWidth = 180 - (lvl * 3);
    if (platWidth < 90) platWidth = 90; 

    let startX = 260;
    let startY = 400;

    for (let i = 0; i < numPlatforms; i++) {
        let gapX = 90 + (difficultyFactor * 65) + (Math.sin(i) * 15); 
        if (gapX > 180) gapX = 180; 

        let wave = Math.sin(i + lvl) * 70; 
        let platY = startY + wave - (difficultyFactor * i * 6);

        if (platY < 180) platY = 180;
        if (platY > 450) platY = 430;

        let platX = startX + (i * (platWidth + gapX));

        currentPlatforms.push({
            x: platX,
            y: platY,
            width: platWidth,
            height: 18
        });

        currentItems.push({
            x: platX + (platWidth / 2) - 10,
            y: platY - 35,
            width: 20,
            height: 20,
            collected: false
        });
    }

    let lastPlat = currentPlatforms[currentPlatforms.length - 1];
    let finalPlatX = lastPlat.x + lastPlat.width + 110;
    
    currentPlatforms.push({
        x: finalPlatX,
        y: 320,
        width: 140,
        height: 25
    });

    currentBoss.x = finalPlatX + 45;
    currentBoss.y = 320 - currentBoss.height;
}

function buyUpgrade(type) {
    if (type === 1) {
        if (score >= 50) {
            score -= 50; speedLevel++; scoreValElement.innerText = score; saveProgress();
            clearKeys();
        } else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
    if (type === 2) {
        if (score >= 50) {
            score -= 50; jumpLevel++; scoreValElement.innerText = score; saveProgress();
            clearKeys();
        } else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
    if (type === 3) {
        if (score >= 100) {
            if (currentLevel < TOTAL_LEVELS - 1) {
                score -= 100; currentLevel++; scoreValElement.innerText = score; saveProgress();
                alert(translations[currentLang].nextLevel + (currentLevel + 1)); clearKeys();
                generateLevel(currentLevel); resetPlayer();
            } else { alert("Max Lvl!"); clearKeys(); }
        } else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
}

window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// Mobilā vadība ar pārbaudi, lai neradītu kļūdas, ja elementi vēl nav gatavi
if(document.getElementById("btn-left")) {
    document.getElementById("btn-left").addEventListener("touchstart", (e) => { e.preventDefault(); keys["ArrowLeft"] = true; });
    document.getElementById("btn-left").addEventListener("touchend", (e) => { e.preventDefault(); keys["ArrowLeft"] = false; });
    document.getElementById("btn-right").addEventListener("touchstart", (e) => { e.preventDefault(); keys["ArrowRight"] = true; });
    document.getElementById("btn-right").addEventListener("touchend", (e) => { e.preventDefault(); keys["ArrowRight"] = false; });
    document.getElementById("btn-jump").addEventListener("touchstart", (e) => { e.preventDefault(); keys["ArrowUp"] = true; });
    document.getElementById("btn-jump").addEventListener("touchend", (e) => { e.preventDefault(); keys["ArrowUp"] = false; });
}

function update() {
    player.isMoving = false;
    let currentSpeed = player.baseSpeed + (speedLevel * 0.5);

    if (keys["ArrowRight"] || keys["d"] || keys["D"]) { 
        if (player.velX < currentSpeed) player.velX += 1.2; 
        player.isMoving = true; facingDirection = 1; 
    }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) { 
        if (player.velX > -currentSpeed) player.velX -= 1.2; 
        player.isMoving = true; facingDirection = -1; 
    }
    
    if (Math.abs(player.velX) > 0.2) { player.isMoving = true; }

    // Animācijas kadru pārslēgšana skriešanai (Run sadaļā ir 7 kadri)
    if (player.isMoving && player.grounded) {
        animationTimer++;
        if (animationTimer >= 6) {
            currentRunFrame = (currentRunFrame + 1) % 7; 
            animationTimer = 0;
        }
    } else if (!player.grounded) {
        // Ja lēc, izmanto lēciena kadru
        currentRunFrame = 0;
    } else {
        // Ja stāv, izmanto pirmo stāvēšanas kadru
        currentRunFrame = 0;
    }

    let currentJumpForce = player.baseJump - (jumpLevel * 0.4);

    if ((keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "]) && !player.jumping && player.grounded) {
        player.jumping = true;
        player.grounded = false;
        player.velY = currentJumpForce;
    }

    player.velX *= 0.75;
    player.velY += 0.55; 
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

    if (player.x > 350) { cameraX = player.x - 350; } else { cameraX = 0; }

    if (player.y > canvas.height) { resetPlayer(); }

    currentItems.forEach(item => {
        if (!item.collected && player.x < item.x + item.width && player.x + player.width > item.x &&
            player.y < item.y + item.height && player.y + player.height > item.y) {
            item.collected = true; score += 10; scoreValElement.innerText = score; saveProgress(); 
        }
    });

    if (player.x < currentBoss.x + currentBoss.width && player.x + player.width > currentBoss.x &&
        player.y < currentBoss.y + currentBoss.height && player.y + player.height > currentBoss.y) {
        
        if (currentLevel < TOTAL_LEVELS - 1) {
            currentLevel++; saveProgress(); 
            alert(translations[currentLang].nextLevel + (currentLevel + 1));
            clearKeys(); generateLevel(currentLevel); resetPlayer();
        } else {
            alert(translations[currentLang].win + score); clearSavedProgress(); 
        }
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fons un zvaigznes
    ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(100 - cameraX*0.1, 80, 2, 2); ctx.fillRect(300 - cameraX*0.1, 50, 3, 3);
    ctx.fillRect(550 - cameraX*0.1, 120, 2, 2); ctx.fillRect(700 - cameraX*0.1, 200, 3, 3);

    // Platformas
    currentPlatforms.forEach(plat => {
        ctx.fillStyle = "#2c3e50"; ctx.fillRect(plat.x - cameraX, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#00d2ff"; ctx.fillRect(plat.x - cameraX, plat.y, plat.width, 4);
    });

    // Monētas
    ctx.fillStyle = "#FFD700";
    currentItems.forEach(item => {
        if (!item.collected) {
            ctx.beginPath(); ctx.arc(item.x + item.width/2 - cameraX, item.y + item.height/2, item.width/2, 0, Math.PI * 2); ctx.fill();
        }
    });

    // MrBeast modelis
    ctx.drawImage(mrBeastImg, currentBoss.x - cameraX, currentBoss.y, currentBoss.width, currentBoss.height);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px Arial";
    ctx.fillText("MrBeast", currentBoss.x - cameraX - 5, currentBoss.y - 8);

    // --- PĒPES ZĪMĒŠANA NO TAVA SPRITESHEET ---
    ctx.save();
    
    // Šie parametri nosaka, no kuras vietas lielajā attēlā izgriezt vajadzīgo kadrilāžu
    // Ja tev šobrīd nav izgriezti atsevišķi kadri, šis paraudziņš pagaidām zīmē bāzes pozīciju
    let spriteWidth = 100;  // Viena Pēpes kadra platums spritesheet lapā
    let spriteHeight = 110; // Viena Pēpes kadra augstums spritesheet lapā
    let sourceX = 0;
    let sourceY = 0;

    // Ja Pepe skrien, izvēlamies skriešanas rindu
    if (player.isMoving && player.grounded) {
        sourceX = currentRunFrame * spriteWidth;
        sourceY = spriteHeight; // Pieņemot, ka RUN ir otrā rinda
    } else if (!player.grounded) {
        sourceX = 0;
        sourceY = spriteHeight * 2; // JUMP rinda
    } else {
        sourceX = 0;
        sourceY = 0; // IDLE pirmā rinda
    }

    if (facingDirection === -1) {
        ctx.translate(player.x - cameraX + player.width, player.y); 
        ctx.scale(-1, 1);
        ctx.drawImage(pepeSpritesheet, sourceX, sourceY, spriteWidth, spriteHeight, 0, 0, player.width, player.height);
    } else {
        ctx.drawImage(pepeSpritesheet, sourceX, sourceY, spriteWidth, spriteHeight, player.x - cameraX, player.y, player.width, player.height);
    }
    ctx.restore();

    // UI teksts
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px Arial";
    let lvlText = (currentLang === 'lv') ? "Līmenis: " : (currentLang === 'en') ? "Level: " : "Уровень: ";
    ctx.fillText(lvlText + (currentLevel + 1) + " / 30", 20, 45);
}

function resetPlayer() {
    player.x = 60; player.y = 200; player.velX = 0; player.velY = 0;
}

function clearSavedProgress() {
    localStorage.clear();
    currentLevel = 0; score = 0; speedLevel = 0; jumpLevel = 0;
    scoreValElement.innerText = score;
    generateLevel(currentLevel); resetPlayer(); saveProgress();
}

// Šī funkcija sāk spēli tikai tad, kad visi attēli ir pilnībā ielādēti!
function startGame() {
    generateLevel(currentLevel);
    resetPlayer();
    changeLanguage(currentLang);
    updateShopUI();
    update();
}
