const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValElement = document.getElementById("score-val");
const scoreTextElement = document.getElementById("score-text");
const controlsTextElement = document.getElementById("controls-text");

const speedLvlDisplay = document.getElementById("speed-lvl-display");
const jumpLvlDisplay = document.getElementById("jump-lvl-display");

// --- PROGRESSA IELĀDE NO LOCALSTORAGE ---
let score = parseInt(localStorage.getItem("pepe_score")) || 0;
let currentLevel = parseInt(localStorage.getItem("pepe_level")) || 0; // Sākas no 0 (vizuāli 1. līmenis)
let currentLang = localStorage.getItem("pepe_lang") || 'lv';

let speedLevel = parseInt(localStorage.getItem("pepe_speed_lvl")) || 0;
let jumpLevel = parseInt(localStorage.getItem("pepe_jump_lvl")) || 0;

if(scoreValElement) scoreValElement.innerText = score;

// cameraX sekošanai
let cameraX = 0;

// --- DATORA TAUSTIŅU GLABĀTUVE ---
let keys = {};
let currentPlatforms = [];
let currentItems = [];
let currentBoss = { x: 0, y: 0, width: 45, height: 60 };

// --- ATTĒLU IELĀDE ---
let loadedImagesCount = 0;
const totalImagesNeeded = 4;

function imageLoaded() {
    loadedImagesCount++;
    if (loadedImagesCount === totalImagesNeeded) {
        startGame();
    }
}

const imgPepeIdle = new Image();
imgPepeIdle.src = 'pepe_idle.png';
imgPepeIdle.onload = imageLoaded;
imgPepeIdle.onerror = function() { console.error("Trūkst pepe_idle.png"); imageLoaded(); };

const imgPepeRun1 = new Image();
imgPepeRun1.src = 'pepe_run1.png';
imgPepeRun1.onload = imageLoaded;
imgPepeRun1.onerror = function() { console.error("Trūkst pepe_run1.png"); imageLoaded(); };

const imgPepeRun2 = new Image();
imgPepeRun2.src = 'pepe_run2.png';
imgPepeRun2.onload = imageLoaded;
imgPepeRun2.onerror = function() { console.error("Trūkst pepe_run2.png"); imageLoaded(); };

const mrBeastImg = new Image();
mrBeastImg.src = 'mrbeast.png';
mrBeastImg.onload = imageLoaded;
mrBeastImg.onerror = function() { console.error("Trūkst mrbeast.png"); imageLoaded(); };

// --- ANIMĀCIJAS MAINĪGIE ---
let facingDirection = 1;       
let animationTimer = 0;        
let currentRunFrame = 1; 

const translations = {
    lv: {
        score: "Punkti",
        controls: "Vadība: Bultiņas/WASD = Kustība | Atstarpe = Lēkt || Telefonā izmanto pogas apakšā!",
        nextLevel: "Līmenis pabeigts! Progress saglabāts. Gatavojies līmenim: ",
        noPoints: "Tev nepietiek punktu!"
    },
    en: {
        score: "Points",
        controls: "Controls: Arrows/WASD = Move | Space = Jump || On mobile use buttons below!",
        nextLevel: "Level cleared! Progress saved. Get ready for Level ",
        noPoints: "Not enough points!"
    },
    ru: {
        score: "Очки",
        controls: "Управление: Стрелки/WASD = Бег | Пробел = Прыжок || На телефоне жми кнопки снизу!",
        nextLevel: "Уровень пройден! Progress сохранен! Приготовься к уровню ",
        noPoints: "Недостаточно очков!"
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
    // NOŅEMAM FOKUSU NO VALODAS POGĀM
    if (document.activeElement) {
        document.activeElement.blur();
    }

    currentLang = lang;
    if(scoreTextElement) scoreTextElement.innerText = translations[lang].score;
    if(controlsTextElement) controlsTextElement.innerText = translations[lang].controls;

    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    buttons.forEach(btn => {
        if (btn.innerText.toLowerCase() === lang.toLowerCase()) btn.classList.add('active');
    });
    saveProgress();
}

const player = {
    x: 60, y: 200, width: 45, height: 60,
    baseSpeed: 6, baseJump: -13, 
    velX: 0, velY: 0, jumping: false, grounded: false, isMoving: false
};

function clearKeys() { keys = {}; }

// --- JAUNS BEZGALĪGS LĪMEŅU ĢENERATORS ---
function generateLevel(lvl) {
    currentPlatforms = [];
    currentItems = [];
    cameraX = 0; 

    // Pirmā starta platforma
    currentPlatforms.push({ x: 0, y: 440, width: 200, height: 25 });

    // Sarežģītības koeficients, kas aug līdz 40. līmenim un tad nostabilizējas, lai spēli joprojām varētu iziet
    let capLevel = Math.min(lvl, 40);
    let difficultyFactor = capLevel / 40;

    // Platformu skaits pieaug līdz ar katru līmeni (līmeņi kļūst garāki)
    let numPlatforms = 7 + Math.floor(lvl / 2);
    if (numPlatforms > 35) numPlatforms = 35; // Ierobežojam maksimālo garumu, lai neapniktu viens līmenis

    // Platformas kļūst šaurākas
    let platWidth = 180 - (difficultyFactor * 85); // No 180px nokrītas līdz 95px
    if (platWidth < 95) platWidth = 95; 

    let startX = 260;
    let startY = 400;

    for (let i = 0; i < numPlatforms; i++) {
        // Atstarpes starp platformām palielinās
        let gapX = 90 + (difficultyFactor * 75) + (Math.sin(i) * 15); 
        if (gapX > 175) gapX = 175; 

        // Platformu augstumu viļņošanās
        let wave = Math.sin(i + lvl) * (60 + (difficultyFactor * 25)); 
        let platY = startY + wave - (difficultyFactor * i * 4);

        // Drošības robežas, lai platformas neizietu no ekrāna augšas/apakšas
        if (platY < 160) platY = 160;
        if (platY > 450) platY = 430;

        let platX = startX + (i * (platWidth + gapX));

        currentPlatforms.push({ x: platX, y: platY, width: platWidth, height: 18 });
        
        // Pievienojam monētu virs platformas
        currentItems.push({ x: platX + (platWidth / 2) - 10, y: platY - 35, width: 20, height: 20, collected: false });
    }

    // Pēdējā platforma ar MrBeast
    let lastPlat = currentPlatforms[currentPlatforms.length - 1];
    let finalPlatX = lastPlat.x + lastPlat.width + 100;
    
    currentPlatforms.push({ x: finalPlatX, y: 320, width: 140, height: 25 });
    currentBoss.x = finalPlatX + 45;
    currentBoss.y = 320 - currentBoss.height;
}

function buyUpgrade(type) {
    // PILNĪBĀ NOŅEMAM FOKUSU NO VEIKALA POGĀM
    if (document.activeElement) {
        document.activeElement.blur();
    }

    if (type === 1) {
        if (score >= 50) {
            score -= 50; speedLevel++; if(scoreValElement) scoreValElement.innerText = score; saveProgress(); clearKeys();
        } else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
    if (type === 2) {
        if (score >= 50) {
            score -= 50; jumpLevel++; if(scoreValElement) scoreValElement.innerText = score; saveProgress(); clearKeys();
        } else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
    if (type === 3) {
        if (score >= 100) {
            // Bezgalīgajā režīmā līmeņa izlaišanai nav limita
            score -= 100; currentLevel++; if(scoreValElement) scoreValElement.innerText = score; saveProgress();
            alert(translations[currentLang].nextLevel + (currentLevel + 1)); clearKeys();
            generateLevel(currentLevel); resetPlayer();
        } else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
}

window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// Mobilā vadība
setTimeout(() => {
    const btnLeft = document.getElementById("btn-left");
    const btnRight = document.getElementById("btn-right");
    const btnJump = document.getElementById("btn-jump");

    if(btnLeft && btnRight && btnJump) {
        btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); keys["ArrowLeft"] = true; });
        btnLeft.addEventListener("touchend", (e) => { e.preventDefault(); keys["ArrowLeft"] = false; });
        btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); keys["ArrowRight"] = true; });
        btnRight.addEventListener("touchend", (e) => { e.preventDefault(); keys["ArrowRight"] = false; });
        btnJump.addEventListener("touchstart", (e) => { e.preventDefault(); keys["ArrowUp"] = true; });
        btnJump.addEventListener("touchend", (e) => { e.preventDefault(); keys["ArrowUp"] = false; });
    }
}, 500);

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

    if (player.isMoving) {
        animationTimer++;
        if (animationTimer >= 10) {
            currentRunFrame = (currentRunFrame === 1) ? 2 : 1;
            animationTimer = 0;
        }
    } else {
        currentRunFrame = 1;
    }

    let currentJumpForce = player.baseJump - (jumpLevel * 0.4);

    if ((keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "]) && !player.jumping && player.grounded) {
        player.jumping = true; player.grounded = false; player.velY = currentJumpForce;
    }

    player.velX *= 0.75;
    player.velY += 0.55; 
    player.grounded = false;

    for (let i = 0; i < currentPlatforms.length; i++) {
        let plat = currentPlatforms[i];
        if (player.x < plat.x + plat.width && player.x + player.width > plat.x &&
            player.y < plat.y + plat.height && player.y + player.height > plat.y) {
            if (player.velY > 0 && player.y + player.height - player.velY <= plat.y) {
                player.grounded = true; player.jumping = false; player.velY = 0; player.y = plat.y - player.height;
            }
        }
    }

    if (player.grounded) player.velY = 0;
    player.x += player.velX; player.y += player.velY;

    if (player.x < 0) player.x = 0;
    if (player.x > 350) { cameraX = player.x - 350; } else { cameraX = 0; }
    if (player.y > canvas.height) { resetPlayer(); }

    currentItems.forEach(item => {
        if (!item.collected && player.x < item.x + item.width && player.x + player.width > item.x &&
            player.y < item.y + item.height && player.y + player.height > item.y) {
            item.collected = true; score += 10; if(scoreValElement) scoreValElement.innerText = score; saveProgress(); 
        }
    });

    if (player.x < currentBoss.x + currentBoss.width && player.x + player.width > currentBoss.x &&
        player.y < currentBoss.y + currentBoss.height && player.y + player.height > currentBoss.y) {
        
        // PĀREJA UZ NĀKAMO LĪMENI BEZ IEROBEŽOJUMIEM
        currentLevel++; 
        saveProgress(); 
        alert(translations[currentLang].nextLevel + (currentLevel + 1));
        clearKeys(); 
        generateLevel(currentLevel); 
        resetPlayer();
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fons
    ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Zvaigznes
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(100 - cameraX*0.1, 80, 2, 2); ctx.fillRect(300 - cameraX*0.1, 50, 3, 3);
    ctx.fillRect(550 - cameraX*0.1, 120, 2, 2); ctx.fillRect(700 - cameraX*0.1, 200, 3, 3);
    ctx.fillRect(850 - cameraX*0.1, 70, 2, 2);

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

    // MrBeast
    ctx.drawImage(mrBeastImg, currentBoss.x - cameraX, currentBoss.y, currentBoss.width, currentBoss.height);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px Arial";
    ctx.fillText("MrBeast", currentBoss.x - cameraX - 5, currentBoss.y - 8);

    // Pēpe
    ctx.save();
    let currentImg = imgPepeIdle;
    if (player.isMoving) {
        currentImg = (currentRunFrame === 1) ? imgPepeRun1 : imgPepeRun2;
    }

    if (facingDirection === -1) {
        ctx.translate(player.x - cameraX + player.width, player.y); ctx.scale(-1, 1);
        ctx.drawImage(currentImg, 0, 0, player.width, player.height);
    } else {
        ctx.drawImage(currentImg, player.x - cameraX, player.y, player.width, player.height);
    }
    ctx.restore();

    // UI Līmeņa teksts (tagad rāda tīru skaitli bez "/ 30")
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px Arial";
    let lvlText = (currentLang === 'lv') ? "Līmenis: " : (currentLang === 'en') ? "Level: " : "Уровень: ";
    ctx.fillText(lvlText + (currentLevel + 1), 20, 45);
}

function resetPlayer() {
    player.x = 60; player.y = 200; player.velX = 0; player.velY = 0;
}

function clearSavedProgress() {
    // NOŅEMAM FOKUSU NO RESET POGAS
    if (document.activeElement) {
        document.activeElement.blur();
    }

    localStorage.clear();
    currentLevel = 0; score = 0; speedLevel = 0; jumpLevel = 0;
    if(scoreValElement) scoreValElement.innerText = score;
    generateLevel(currentLevel); resetPlayer(); saveProgress();
}

function startGame() {
    generateLevel(currentLevel);
    resetPlayer();
    changeLanguage(currentLang);
    updateShopUI();
    update();
}
