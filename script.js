const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValElement = document.getElementById("score-val");
const scoreTextElement = document.getElementById("score-text");
const controlsTextElement = document.getElementById("controls-text");

const speedLvlDisplay = document.getElementById("speed-lvl-display");
const jumpLvlDisplay = document.getElementById("jump-lvl-display");

// --- PROGRESSA IELĀDE NO LOCALSTORAGE ---
let score = parseInt(localStorage.getItem("pepe_score")) || 0;
let currentLevel = parseInt(localStorage.getItem("pepe_level")) || 0; 
let currentLang = localStorage.getItem("pepe_lang") || 'lv';

let speedLevel = parseInt(localStorage.getItem("pepe_speed_lvl")) || 0;
let jumpLevel = parseInt(localStorage.getItem("pepe_jump_lvl")) || 0;

if(scoreValElement) scoreValElement.innerText = score;

// cameraX sekošanai
let cameraX = 0;

// --- MAINĪGAIS SPĒLES IEKŠĒJAM PAZIŅOJUMAM ---
let levelClearTimer = 0; 

// --- DATORA TAUSTIŅU GLABĀTUVE ---
let keys = {};
let currentPlatforms = [];
let currentItems = [];
let currentBoss = { x: 0, y: 0, width: 45, height: 60 };

// --- ATTĒLU IELĀDE (KOPĀ 13 BILDES) ---
let loadedImagesCount = 0;
const totalImagesNeeded = 13; 

function imageLoaded() {
    loadedImagesCount++;
    if (loadedImagesCount === totalImagesNeeded) {
        startGame();
    }
}

function loadImg(src) {
    const img = new Image();
    img.src = src;
    img.onload = imageLoaded;
    img.onerror = function() { console.error("Trūkst attēla: " + src); imageLoaded(); };
    return img;
}

// 3 Skini x 3 bildes katram = 9 bildes tēlam
const skins = {
    default: {
        idle: loadImg('pepe_idle.png'),
        r1: loadImg('pepe_run1.png'),
        r2: loadImg('pepe_run2.png')
    },
    fat: {
        idle: loadImg('fat_idle.png'),
        r1: loadImg('fat_run1.png'),
        r2: loadImg('fat_run2.png')
    },
    ninja: {
        idle: loadImg('ninja_idle.png'),
        r1: loadImg('ninja_run1.png'),
        r2: loadImg('ninja_run2.png')
    }
};

// Pārējās 4 spēles bildes
const mrBeastImg = loadImg('mrbeast.png');
const coinNormalImg = loadImg('coin_normal.png');
const coinCosmicImg = loadImg('coin_cosmic.png');
const coinSadImg = loadImg('coin_sad.png');

// --- SKINU LOGIKAS MAINĪGIE ---
let ownedSkins = JSON.parse(localStorage.getItem("pepe_owned_skins")) || ["default"];
let currentSkin = localStorage.getItem("pepe_current_skin") || "default";

// --- ANIMĀCIJAS MAINĪGIE ---
let facingDirection = 1;       
let animationTimer = 0;        
let currentRunFrame = 1; 

// --- PAPILDINĀTI TULKOJUMI AR VEIKALA TEKSTIEM ---
const translations = {
    lv: {
        score: "Punkti",
        controls: "Vadība: Bultiņas/WASD = Kustība | Atstarpe = Lēkt || Telefonā izmanto pogas apakšā!",
        nextLevel: "LĪMENIS PABEIGTS!",
        getReady: "Gatavojies līmenim: ",
        noPoints: "Tev nepietiek punktu!",
        buySpeed: "Uzlabot Ātrumu (50p)",
        buyJump: "Uzlabot Lēcienu (50p)",
        skipLevel: "Izlaist Līmeni (100p)"
    },
    en: {
        score: "Points",
        controls: "Controls: Arrows/WASD = Move | Space = Jump || On mobile use buttons below!",
        nextLevel: "LEVEL CLEARED!",
        getReady: "Get ready for Level ",
        noPoints: "Not enough points!",
        buySpeed: "Upgrade Speed (50p)",
        buyJump: "Upgrade Jump (50p)",
        skipLevel: "Skip Level (100p)"
    },
    ru: {
        score: "Очки",
        controls: "Управление: Стрелки/WASD = Бег | Пробел = Прыжок || На телефоне жми кнопки снизу!",
        nextLevel: "УРОВЕНЬ ПРОЙДЕН!",
        getReady: "Приготовься к уровню ",
        noPoints: "Недостаточно очков!",
        buySpeed: "Улучшить Скорость (50p)",
        buyJump: "Улучшить Прыжок (50p)",
        skipLevel: "Пропустить Уровень (100p)"
    }
};

function saveProgress() {
    localStorage.setItem("pepe_level", currentLevel);
    localStorage.setItem("pepe_score", score);
    localStorage.setItem("pepe_lang", currentLang);
    localStorage.setItem("pepe_speed_lvl", speedLevel);
    localStorage.setItem("pepe_jump_lvl", jumpLevel);
    localStorage.setItem("pepe_owned_skins", JSON.stringify(ownedSkins));
    localStorage.setItem("pepe_current_skin", currentSkin);
    updateShopUI();
}

// --- ATJAUNINĀTA VEIKALA UI SISTĒMA ---
function updateShopUI() {
    // Atjaunina līmeņu tekstus blakus uzlabojumiem
    if(speedLvlDisplay) speedLvlDisplay.innerText = "Lvl " + speedLevel;
    if(jumpLvlDisplay) jumpLvlDisplay.innerText = "Lvl " + jumpLevel;

    // Dinamiski atjaunina pašu pogu tekstus atbilstoši valodai
    const btnSpeed = document.getElementById("btn-speed");
    const btnJump = document.getElementById("btn-jump");
    const btnLevel = document.getElementById("btn-level");

    if(btnSpeed) btnSpeed.innerText = translations[currentLang].buySpeed;
    if(btnJump) btnJump.innerText = translations[currentLang].buyJump;
    if(btnLevel) btnLevel.innerText = translations[currentLang].skipLevel;
}

// --- SKINU VEIKALA SISTĒMA ---
function buySkin(name, price) {
    if (document.activeElement) document.activeElement.blur();
    
    if (ownedSkins.includes(name)) {
        selectSkin(name);
    } else {
        if (score >= price) {
            score -= price;
            ownedSkins.push(name);
            currentSkin = name;
            if(scoreValElement) scoreValElement.innerText = score;
            saveProgress();
            updateSkinUI();
            clearKeys();
        } else {
            alert(translations[currentLang].noPoints);
            clearKeys();
        }
    }
}

function selectSkin(name) {
    if (document.activeElement) document.activeElement.blur();
    if (!ownedSkins.includes(name)) return;
    
    currentSkin = name;
    saveProgress();
    updateSkinUI();
    clearKeys();
}

function updateSkinUI() {
    const skinNames = ["default", "fat", "ninja"];
    skinNames.forEach(s => {
        const btn = document.getElementById("skin-" + s);
        const status = document.getElementById("status-" + s);
        
        if(btn && status) {
            btn.classList.remove("active", "locked");
            if (currentSkin === s) {
                btn.classList.add("active");
                status.innerText = (currentLang === 'lv') ? "Izvēlēts" : (currentLang === 'en') ? "Selected" : "Выбран";
            } else if (ownedSkins.includes(s)) {
                status.innerText = (currentLang === 'lv') ? "Pieejams" : (currentLang === 'en') ? "Equip" : "Надеть";
            } else {
                btn.classList.add("locked");
                if(s === "fat") status.innerText = "500p";
                if(s === "ninja") status.innerText = "1500p";
            }
        }
    });
}

function changeLanguage(lang) {
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
    updateSkinUI();
    updateShopUI(); // Pievienots, lai valodas maiņa uzreiz pārtulkotu veikalu
}

const player = {
    x: 60, y: 200, width: 45, height: 60,
    baseSpeed: 6, baseJump: -13, 
    velX: 0, velY: 0, jumping: false, grounded: false, isMoving: false
};

function clearKeys() { keys = {}; }

// --- BEZGALĪGS LĪMEŅU ĢENERATORS ---
function generateLevel(lvl) {
    currentPlatforms = [];
    currentItems = [];
    cameraX = 0; 

    currentPlatforms.push({ x: 0, y: 440, width: 200, height: 25 });

    let capLevel = Math.min(lvl, 40);
    let difficultyFactor = capLevel / 40;

    let numPlatforms = 7 + Math.floor(lvl / 2);
    if (numPlatforms > 35) numPlatforms = 35; 

    let platWidth = 180 - (difficultyFactor * 85); 
    if (platWidth < 95) platWidth = 95; 

    let startX = 260;
    let startY = 400;

    for (let i = 0; i < numPlatforms; i++) {
        let gapX = 90 + (difficultyFactor * 75) + (Math.sin(i) * 15); 
        if (gapX > 175) gapX = 175; 

        let wave = Math.sin(i + lvl) * (60 + (difficultyFactor * 25)); 
        let platY = startY + wave - (difficultyFactor * i * 4);

        if (platY < 160) platY = 160;
        if (platY > 450) platY = 430;

        let platX = startX + (i * (platWidth + gapX));

        currentPlatforms.push({ x: platX, y: platY, width: platWidth, height: 18 });
        
        let rand = Math.random();
        let type = "normal";
        let value = 10;

        let cosmicChance = 0.05 + (lvl * 0.015); 
        if (cosmicChance > 0.45) cosmicChance = 0.45; 

        let sadChance = 0.35 - (lvl * 0.015); 
        if (sadChance < 0.05) sadChance = 0.05; 

        if (rand < cosmicChance) {
            type = "cosmic";
            value = 30; 
        } else if (rand > (1 - sadChance)) {
            type = "sad";
            value = 3;  
        } else {
            type = "normal";
            value = 10; 
        }

        currentItems.push({ 
            x: platX + (platWidth / 2) - 12, 
            y: platY - 35, 
            width: 24, 
            height: 24, 
            collected: false,
            coinType: type,
            coinValue: value
        });
    }

    let lastPlat = currentPlatforms[currentPlatforms.length - 1];
    let finalPlatX = lastPlat.x + lastPlat.width + 100;
    
    currentPlatforms.push({ x: finalPlatX, y: 320, width: 140, height: 25 });
    currentBoss.x = finalPlatX + 45;
    currentBoss.y = 320 - currentBoss.height;
}

function buyUpgrade(type) {
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
            score -= 100; currentLevel++; if(scoreValElement) scoreValElement.innerText = score; saveProgress();
            levelClearTimer = 180; 
            clearKeys();
            generateLevel(currentLevel); resetPlayer();
        } else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
}

window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

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
    
    let currentSpeed = player.baseSpeed + (speedLevel * 1.0); 
    let accelPower = 1.2 + (speedLevel * 0.25);              

    if (keys["ArrowRight"] || keys["d"] || keys["D"]) { 
        if (player.velX < currentSpeed) player.velX += accelPower; 
        player.isMoving = true; facingDirection = 1; 
    }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) { 
        if (player.velX > -currentSpeed) player.velX -= accelPower; 
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

    player.velX *= 0.82;
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
            item.collected = true;
            score += item.coinValue; 
            if(scoreValElement) scoreValElement.innerText = score; 
            saveProgress(); 
        }
    });

    if (player.x < currentBoss.x + currentBoss.width && player.x + player.width > currentBoss.x &&
        player.y < currentBoss.y + currentBoss.height && player.y + player.height > currentBoss.y) {
        
        currentLevel++; 
        saveProgress(); 
        levelClearTimer = 180; 
        clearKeys(); 
        generateLevel(currentLevel); 
        resetPlayer();
    }

    if (levelClearTimer > 0) {
        levelClearTimer--;
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
    currentItems.forEach(item => {
        if (!item.collected) {
            let activeCoinImg = coinNormalImg; 
            if (item.coinType === "cosmic") {
                activeCoinImg = coinCosmicImg;
            } else if (item.coinType === "sad") {
                activeCoinImg = coinSadImg;
            }
            ctx.drawImage(activeCoinImg, item.x - cameraX, item.y, item.width, item.height);
        }
    });

    // MrBeast
    ctx.drawImage(mrBeastImg, currentBoss.x - cameraX, currentBoss.y, currentBoss.width, currentBoss.height);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px Arial";
    ctx.fillText("MrBeast", currentBoss.x - cameraX - 5, currentBoss.y - 8);

    // TĒLA DRĀVĒŠANA AR AKTĪVO SKINU
    ctx.save();
    let skinSet = skins[currentSkin]; 
    let currentImg = skinSet.idle;
    if (player.isMoving) {
        currentImg = (currentRunFrame === 1) ? skinSet.r1 : skinSet.r2;
    }

    if (facingDirection === -1) {
        ctx.translate(player.x - cameraX + player.width, player.y); ctx.scale(-1, 1);
        ctx.drawImage(currentImg, 0, 0, player.width, player.height);
    } else {
        ctx.drawImage(currentImg, player.x - cameraX, player.y, player.width, player.height);
    }
    ctx.restore();

    // UI Līmeņa teksts augšā pa kreisi
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px Arial";
    let lvlText = (currentLang === 'lv') ? "Līmenis: " : (currentLang === 'en') ? "Level: " : "Уровень: ";
    ctx.fillText(lvlText + (currentLevel + 1), 20, 45);

    // SPĒLES IEKŠĒJAIS PAZIŅOJUMS UZ EKRĀNA
    if (levelClearTimer > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 90);

        ctx.fillStyle = "#00ffcc";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText(translations[currentLang].nextLevel, canvas.width / 2, canvas.height / 2 - 10);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Arial";
        ctx.fillText(translations[currentLang].getReady + (currentLevel + 1), canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.textAlign = "left";
    }
}

function resetPlayer() {
    player.x = 60; player.y = 200; player.velX = 0; player.velY = 0;
}

function clearSavedProgress() {
    if (document.activeElement) {
        document.activeElement.blur();
    }

    localStorage.clear();
    currentLevel = 0; score = 0; speedLevel = 0; jumpLevel = 0;
    ownedSkins = ["default"]; currentSkin = "default";
    if(scoreValElement) scoreValElement.innerText = score;
    generateLevel(currentLevel); resetPlayer(); saveProgress(); updateSkinUI();
}

function startGame() {
    generateLevel(currentLevel);
    resetPlayer();
    changeLanguage(currentLang);
    updateShopUI();
    updateSkinUI(); 
    update();
}

// --- ČIT-KOMANDA PUNKTU PIEVIENOŠANAI CAUR KONSOLI ---
window.addPoints = function(amount) {
    score += amount;
    if(scoreValElement) scoreValElement.innerText = score;
    saveProgress();
    console.log("%c " + amount + " punkti veiksmīgi pievienoti!", "color: #00ff00; font-weight: bold;");
};
