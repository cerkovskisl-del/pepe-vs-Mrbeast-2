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

// --- REŽĪMA MAINĪGIE ---
let gameMode = "normal"; // Var būt "normal" vai "parkour"
let lastParkourX = 260;  
let lastParkourY = 400; // Sekojam līdzi pēdējam augstumam plūstošai ģenerēšanai
let visitedPlatforms = []; 

// --- MAINĪGAIS SPĒLES IEKŠĒJAM PAZIŅOJUMAM ---
let levelClearTimer = 0; 

// --- DATORA TAUSTIŅU GLABĀTUVE ---
let keys = {};
let currentPlatforms = [];
let currentItems = [];
let currentBoss = { x: 0, y: 0, width: 45, height: 60 };

// --- ATTĒLU IELĀDE ---
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

const skins = {
    default: { idle: loadImg('pepe_idle.png'), r1: loadImg('pepe_run1.png'), r2: loadImg('pepe_run2.png') },
    fat: { idle: loadImg('fat_idle.png'), r1: loadImg('fat_run1.png'), r2: loadImg('fat_run2.png') },
    ninja: { idle: loadImg('ninja_idle.png'), r1: loadImg('ninja_run1.png'), r2: loadImg('ninja_run2.png') }
};

const mrBeastImg = loadImg('mrbeast.png');
const coinNormalImg = loadImg('coin_normal.png');
const coinCosmicImg = loadImg('coin_cosmic.png');
const coinSadImg = loadImg('coin_sad.png');

let ownedSkins = JSON.parse(localStorage.getItem("pepe_owned_skins")) || ["default"];
let currentSkin = localStorage.getItem("pepe_current_skin") || "default";

let facingDirection = 1;       
let animationTimer = 0;        
let currentRunFrame = 1; 

const translations = {
    lv: {
        score: "Punkti",
        controls: "Vadība: Bultiņas/WASD = Kustība | Atstarpe = Lēkt || Telefonā izmanto pogas apakšā!",
        nextLevel: "LĪMENIS PABEIGTS!",
        getReady: "Gatavojies līmenim: ",
        noPoints: "Tev nepietiek punktu!",
        skinsTitle: "SKINI",
        skinDefaultName: "Parastais",
        shopTitle: "VEIKALS",
        shopSpeed: "+Ātrums",
        shopJump: "+Lēciens",
        shopSkip: "Izlaist Līmeni",
        resetBtn: "Atiestatīt Spēli",
        btnMobileJump: "LĒKT",
        modeNormalBtn: "Līmeņi",
        modeParkourBtn: "Parkour (+10p)"
    },
    en: {
        score: "Points",
        controls: "Controls: Arrows/WASD = Move | Space = Jump || On mobile use buttons below!",
        nextLevel: "LEVEL CLEARED!",
        getReady: "Get ready for Level ",
        noPoints: "Not enough points!",
        skinsTitle: "SKINS",
        skinDefaultName: "Default",
        shopTitle: "SHOP",
        shopSpeed: "+Speed",
        shopJump: "+Jump",
        shopSkip: "Skip Level",
        resetBtn: "Reset Game",
        btnMobileJump: "JUMP",
        modeNormalBtn: "Levels",
        modeParkourBtn: "Parkour (+10p)"
    },
    ru: {
        score: "Очки",
        controls: "Управление: Стрелки/WASD = Бег | Пробел = Прыжок || На телефоне жми кнопки снизу!",
        nextLevel: "УРОВЕНЬ ПРОЙДЕН!",
        getReady: "Приготовься к уровню ",
        noPoints: "Недостаточно очков!",
        skinsTitle: "СКИНЫ",
        skinDefaultName: "Обычный",
        shopTitle: "МАГАЗИН",
        shopSpeed: "+Скорость",
        shopJump: "+Прыжок",
        shopSkip: "Пропустить Лвл",
        resetBtn: "Сбросить Игру",
        btnMobileJump: "ПРЫЖОК",
        modeNormalBtn: "Уровни",
        modeParkourBtn: "Паркур (+10о)"
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

function updateShopUI() {
    if(speedLvlDisplay) speedLvlDisplay.innerText = "Lvl " + speedLevel;
    if(jumpLvlDisplay) jumpLvlDisplay.innerText = "Lvl " + jumpLevel;

    const shopTitle = document.getElementById("shop-title");
    const shopSpeedText = document.getElementById("shop-speed-text");
    const shopJumpText = document.getElementById("shop-jump-text");
    const shopSkipText = document.getElementById("shop-skip-text");
    
    const skinsTitle = document.querySelector(".sidebar-title");
    const skinDefaultName = document.getElementById("skin-default-name");
    const resetProgressBtn = document.querySelector(".reset-progress-btn");
    const mobileJumpBtn = document.getElementById("btn-jump");

    const modeNormalBtn = document.getElementById("btn-mode-normal");
    const modeParkourBtn = document.getElementById("btn-mode-parkour");

    if(shopTitle) shopTitle.innerText = translations[currentLang].shopTitle;
    if(shopSpeedText) shopSpeedText.innerText = translations[currentLang].shopSpeed;
    if(shopJumpText) shopJumpText.innerText = translations[currentLang].shopJump;
    if(shopSkipText) shopSkipText.innerText = translations[currentLang].shopSkip;
    
    if(skinsTitle) skinsTitle.innerText = translations[currentLang].skinsTitle;
    if(skinDefaultName) skinDefaultName.innerText = translations[currentLang].skinDefaultName;
    if(resetProgressBtn) resetProgressBtn.innerText = translations[currentLang].resetBtn;
    if(mobileJumpBtn) mobileJumpBtn.innerText = translations[currentLang].btnMobileJump;

    if(modeNormalBtn) modeNormalBtn.innerText = translations[currentLang].modeNormalBtn;
    if(modeParkourBtn) modeParkourBtn.innerText = translations[currentLang].modeParkourBtn;

    const skipContainer = document.getElementById("btn-skip-container");
    if(skipContainer) {
        if(gameMode === "parkour") {
            skipContainer.style.opacity = "0.4";
            skipContainer.style.cursor = "not-allowed";
        } else {
            skipContainer.style.opacity = "1";
            skipContainer.style.cursor = "pointer";
        }
    }
}

function switchMode(mode) {
    if (document.activeElement) document.activeElement.blur();
    gameMode = mode;
    
    const btnNorm = document.getElementById("btn-mode-normal");
    const btnPark = document.getElementById("btn-mode-parkour");
    
    if(btnNorm && btnPark) {
        btnNorm.classList.remove("active");
        btnPark.classList.remove("active");
        if(mode === "normal") btnNorm.classList.add("active");
        if(mode === "parkour") btnPark.classList.add("active");
    }
    
    levelClearTimer = 0;
    generateLevel(currentLevel);
    resetPlayer();
    clearKeys();
    updateShopUI();
}

// --- PLŪSTOŠAIS UN KONTROLĒTAIS ĢENERATORS ---
function generateLevel(lvl) {
    currentPlatforms = [];
    currentItems = [];
    visitedPlatforms = [];
    cameraX = 0; 

    // Sākuma drošā platforma
    currentPlatforms.push({ id: 0, x: 0, y: 440, width: 200, height: 25 });
    visitedPlatforms.push(0); 

    if (gameMode === "normal") {
        let capLevel = Math.min(lvl, 40);
        let difficultyFactor = capLevel / 40; 
        
        let numPlatforms = 8 + Math.floor(lvl * 0.6);
        if (numPlatforms > 35) numPlatforms = 35; 

        // Platformu platums samazinās prātīgi, nevis par traku
        let platWidth = 160 - (difficultyFactor * 50); 
        if (platWidth < 100) platWidth = 100; 

        let startX = 250;
        let lastNormalY = 400; // Izmantojam ķēdes loģiku arī parastajos līmeņos

        for (let i = 0; i < numPlatforms; i++) {
            // Kontrolēta atstarpe (maksimālā robeža sabalansēta ar lēciena spēku)
            let gapX = 100 + (difficultyFactor * 45) + (Math.sin(i) * 15);
            if (gapX > 155) gapX = 155; 

            // Plūstoša augstuma maiņa (iepriekšējais Y +/- neliels solis)
            let changeY = (Math.sin(i * 1.5) * 45) - (difficultyFactor * 5); 
            let platY = lastNormalY + changeY;

            // Ekstrēmo malu ierobežojumi
            if (platY < 180) platY = 180;
            if (platY > 430) platY = 430;

            let platX = startX;
            currentPlatforms.push({ id: i + 1, x: platX, y: platY, width: platWidth, height: 18 });
            
            // Atjaunojam vērtības nākamajam ciklam
            startX += platWidth + gapX;
            lastNormalY = platY;

            // Monētas virs platformas
            let rand = Math.random();
            let type = "normal"; let value = 10;
            let cosmicChance = Math.min(0.05 + (lvl * 0.01), 0.35); 
            let sadChance = Math.max(0.25 - (lvl * 0.01), 0.05); 

            if (rand < cosmicChance) { type = "cosmic"; value = 30; } 
            else if (rand > (1 - sadChance)) { type = "sad"; value = 3; }

            currentItems.push({ 
                x: platX + (platWidth / 2) - 12, y: platY - 35, width: 24, height: 24, 
                collected: false, coinType: type, coinValue: value
            });
        }

        // Finiša platforma
        let finalPlatX = startX + 20;
        currentPlatforms.push({ id: currentPlatforms.length, x: finalPlatX, y: 340, width: 150, height: 25 });
        currentBoss.x = finalPlatX + 50;
        currentBoss.y = 340 - currentBoss.height;

    } else {
        // PARKOUR REŽĪMS: Atiestatām plūstošos sākuma punktus
        lastParkourX = 260;
        lastParkourY = 400;
        for (let i = 0; i < 12; i++) {
            addSingleParkourPlatform();
        }
    }
}

// PLŪSTOŠĀ PARKOUR ĢENERĀCIJAS FUNKCIJA
function addSingleParkourPlatform() {
    let nextId = currentPlatforms.length;
    
    // Stabilas, izlēcamas vērtības
    let platWidth = 115 + Math.random() * 45; 
    let gapX = 100 + Math.random() * 45;      

    // ĶĒDES AUGSTUMS: Jaunā platforma ir tikai max +/- 55px no iepriekšējās
    let offsetY = (Math.random() * 110) - 55; 
    let platY = lastParkourY + offsetY;

    // Neļaujam platformām aiziet pārāk augstu debesīs vai par zemu ekrānā
    if (platY < 180) platY = 180 + Math.random() * 30;
    if (platY > 430) platY = 430 - Math.random() * 30;

    currentPlatforms.push({
        id: nextId,
        x: lastParkourX,
        y: platY,
        width: platWidth,
        height: 18
    });

    // Saglabājam datus, lai nākamā platforma būtu plūstoša no šīs
    lastParkourX += platWidth + gapX;
    lastParkourY = platY;
}

function buySkin(name, price) {
    if (document.activeElement) document.activeElement.blur();
    if (ownedSkins.includes(name)) { selectSkin(name); } else {
        if (score >= price) {
            score -= price; ownedSkins.push(name); currentSkin = name;
            if(scoreValElement) scoreValElement.innerText = score;
            saveProgress(); updateSkinUI(); clearKeys();
        } else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
}

function selectSkin(name) {
    if (document.activeElement) document.activeElement.blur();
    if (!ownedSkins.includes(name)) return;
    currentSkin = name; saveProgress(); updateSkinUI(); clearKeys();
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
    if (document.activeElement) document.activeElement.blur();
    currentLang = lang;
    if(scoreTextElement) scoreTextElement.innerText = translations[lang].score;
    if(controlsTextElement) controlsTextElement.innerText = translations[lang].controls;
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    buttons.forEach(btn => { if (btn.innerText.toLowerCase() === lang.toLowerCase()) btn.classList.add('active'); });
    saveProgress(); updateSkinUI(); updateShopUI();
}

const player = { x: 60, y: 200, width: 45, height: 60, baseSpeed: 6, baseJump: -13, velX: 0, velY: 0, jumping: false, grounded: false, isMoving: false };
function clearKeys() { keys = {}; }

function buyUpgrade(type) {
    if (document.activeElement) document.activeElement.blur();
    if (type === 1) {
        if (score >= 50) { score -= 50; speedLevel++; if(scoreValElement) scoreValElement.innerText = score; saveProgress(); clearKeys(); } 
        else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
    if (type === 2) {
        if (score >= 50) { score -= 50; jumpLevel++; if(scoreValElement) scoreValElement.innerText = score; saveProgress(); clearKeys(); } 
        else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
    if (type === 3) {
        if (gameMode === "parkour") return; 
        if (score >= 100) {
            score -= 100; currentLevel++; if(scoreValElement) scoreValElement.innerText = score; saveProgress();
            levelClearTimer = 180; clearKeys(); generateLevel(currentLevel); resetPlayer();
        } else { alert(translations[currentLang].noPoints); clearKeys(); }
    }
}

window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

setTimeout(() => {
    const btnLeft = document.getElementById("btn-left"); const btnRight = document.getElementById("btn-right"); const btnJump = document.getElementById("btn-jump");
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

    if (keys["ArrowRight"] || keys["d"] || keys["D"]) { if (player.velX < currentSpeed) player.velX += accelPower; player.isMoving = true; facingDirection = 1; }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) { if (player.velX > -currentSpeed) player.velX -= accelPower; player.isMoving = true; facingDirection = -1; }
    if (Math.abs(player.velX) > 0.2) { player.isMoving = true; }

    if (player.isMoving) {
        animationTimer++;
        if (animationTimer >= 10) { currentRunFrame = (currentRunFrame === 1) ? 2 : 1; animationTimer = 0; }
    } else { currentRunFrame = 1; }

    let currentJumpForce = player.baseJump - (jumpLevel * 0.4);
    if ((keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "]) && !player.jumping && player.grounded) {
        player.jumping = true; player.grounded = false; player.velY = currentJumpForce;
    }

    player.velX *= 0.82; player.velY += 0.55; player.grounded = false;

    for (let i = 0; i < currentPlatforms.length; i++) {
        let plat = currentPlatforms[i];
        if (player.x < plat.x + plat.width && player.x + player.width > plat.x &&
            player.y < plat.y + plat.height && player.y + player.height > plat.y) {
            
            if (player.velY > 0 && player.y + player.height - player.velY <= plat.y) {
                player.grounded = true; player.jumping = false; player.velY = 0; player.y = plat.y - player.height;
                
                if (gameMode === "parkour" && !visitedPlatforms.includes(plat.id)) {
                    visitedPlatforms.push(plat.id);
                    score += 10; 
                    if(scoreValElement) scoreValElement.innerText = score;
                    saveProgress();
                    addSingleParkourPlatform(); 
                }
            }
        }
    }

    if (player.grounded) player.velY = 0;
    player.x += player.velX; player.y += player.velY;

    if (player.x < 0) player.x = 0;
    if (player.x > 350) { cameraX = player.x - 350; } else { cameraX = 0; }
    
    if (player.y > canvas.height) { 
        if(gameMode === "parkour") {
            generateLevel(0); 
        }
        resetPlayer(); 
    }

    if (gameMode === "normal") {
        currentItems.forEach(item => {
            if (!item.collected && player.x < item.x + item.width && player.x + player.width > item.x &&
                player.y < item.y + item.height && player.y + player.height > item.y) {
                item.collected = true; score += item.coinValue; 
                if(scoreValElement) scoreValElement.innerText = score; saveProgress(); 
            }
        });

        if (player.x < currentBoss.x + currentBoss.width && player.x + player.width > currentBoss.x &&
            player.y < currentBoss.y + currentBoss.height && player.y + player.height > currentBoss.y) {
            currentLevel++; saveProgress(); levelClearTimer = 180; clearKeys(); generateLevel(currentLevel); resetPlayer();
        }
    }

    if (levelClearTimer > 0) { levelClearTimer--; }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(100 - cameraX*0.1, 80, 2, 2); ctx.fillRect(300 - cameraX*0.1, 50, 3, 3);
    ctx.fillRect(550 - cameraX*0.1, 120, 2, 2); ctx.fillRect(700 - cameraX*0.1, 200, 3, 3);
    ctx.fillRect(850 - cameraX*0.1, 70, 2, 2);

    currentPlatforms.forEach(plat => {
        ctx.fillStyle = "#2c3e50"; ctx.fillRect(plat.x - cameraX, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#00d2ff"; ctx.fillRect(plat.x - cameraX, plat.y, plat.width, 4);
    });

    if (gameMode === "normal") {
        currentItems.forEach(item => {
            if (!item.collected) {
                let activeCoinImg = coinNormalImg; 
                if (item.coinType === "cosmic") activeCoinImg = coinCosmicImg;
                else if (item.coinType === "sad") activeCoinImg = coinSadImg;
                ctx.drawImage(activeCoinImg, item.x - cameraX, item.y, item.width, item.height);
            }
        });

        ctx.drawImage(mrBeastImg, currentBoss.x - cameraX, currentBoss.y, currentBoss.width, currentBoss.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px Arial";
        ctx.fillText("MrBeast", currentBoss.x - cameraX - 5, currentBoss.y - 8);
    }

    ctx.save();
    let skinSet = skins[currentSkin]; let currentImg = skinSet.idle;
    if (player.isMoving) { currentImg = (currentRunFrame === 1) ? skinSet.r1 : skinSet.r2; }
    if (facingDirection === -1) {
        ctx.translate(player.x - cameraX + player.width, player.y); ctx.scale(-1, 1);
        ctx.drawImage(currentImg, 0, 0, player.width, player.height);
    } else {
        ctx.drawImage(currentImg, player.x - cameraX, player.y, player.width, player.height);
    }
    ctx.restore();

    ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px Arial";
    if (gameMode === "normal") {
        let lvlText = (currentLang === 'lv') ? "Līmenis: " : (currentLang === 'en') ? "Level: " : "Уровень: ";
        ctx.fillText(lvlText + (currentLevel + 1), 20, 45);
    } else {
        let modeTxt = (currentLang === 'lv') ? "Bezgalīgais Parkour" : (currentLang === 'en') ? "Infinite Parkour" : "Бесконечный Паркур";
        ctx.fillText(modeTxt, 20, 45);
    }

    if (levelClearTimer > 0 && gameMode === "normal") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 90);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 28px Arial"; ctx.textAlign = "center";
        ctx.fillText(translations[currentLang].nextLevel, canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = "#ffffff"; ctx.font = "16px Arial";
        ctx.fillText(translations[currentLang].getReady + (currentLevel + 1), canvas.width / 2, canvas.height / 2 + 20);
        ctx.textAlign = "left";
    }
}

function resetPlayer() { player.x = 60; player.y = 200; player.velX = 0; player.velY = 0; }

function clearSavedProgress() {
    if (document.activeElement) document.activeElement.blur();
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

window.addPoints = function(amount) {
    score += amount; if(scoreValElement) scoreValElement.innerText = score; saveProgress();
};
