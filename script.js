const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValElement = document.getElementById("score-val");
const scoreTextElement = document.getElementById("score-text");
const controlsTextElement = document.getElementById("controls-text");

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

// --- ATTĒLU IELĀDE ---
const pepeIdle = new Image();
pepeIdle.src = 'pepe_idle.png';
const pepeRun1 = new Image();
pepeRun1.src = 'pepe_run1.png';
const pepeRun2 = new Image();
pepeRun2.src = 'pepe_run2.png';
const mrBeastImg = new Image();
mrBeastImg.src = 'mrbeast.png'; 

// --- ANIMĀCIJAS MAINĪGIE ---
let facingDirection = 1;       
let animationTimer = 0;        
let currentRunFrame = 1;       

const translations = {
    lv: {
        score: "Punkti",
        controls: "Vadība: Bultiņas/WASD = Kustība | Atstarpe = Lēkt || VEIKALS: Spied [1] Ātrums, [2] Lēciens, [3] Izlaist Lvl",
        nextLevel: "Līmenis pabeigts! Progres saglabāts. Gatavojies līmenim: ",
        win: "Apsveicu! Tu izgāji visus 30 līmeņus! Kopējie punkti: ",
        noPoints: "Tev nepietiek punktu!",
        bought: "Nopirkts!"
    },
    en: {
        score: "Points",
        controls: "Controls: Arrows/WASD = Move | Space = Jump || SHOP: Press [1] Speed, [2] Jump, [3] Skip Lvl",
        nextLevel: "Level cleared! Progress saved. Get ready for Level ",
        win: "Congratulations! You beat all 30 levels! Total points: ",
        noPoints: "Not enough points!",
        bought: "Purchased!"
    },
    ru: {
        score: "Очки",
        controls: "Управление: Стрелки/WASD = Бег | Пробел = Прыжок || МАГАЗИН: Жми [1] Скорость, [2] Прыжок, [3] Пропустить Lvl",
        nextLevel: "Уровень пройден! Прогресс сохранен! Приготовься к уровню ",
        win: "Поздравляем! Ты прошёл все 30 уровней! Всего очков: ",
        noPoints: "Недостаточно очков!",
        bought: "Куплено!"
    }
};

function saveProgress() {
    localStorage.setItem("pepe_level", currentLevel);
    localStorage.setItem("pepe_score", score);
    localStorage.setItem("pepe_lang", currentLang);
    localStorage.setItem("pepe_speed_lvl", speedLevel);
    localStorage.setItem("pepe_jump_lvl", jumpLevel);
}

function changeLanguage(lang) {
    currentLang = lang;
    scoreTextElement.innerText = translations[lang].score;
    controlsTextElement.innerText = translations[lang].controls;

    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    } else {
        buttons.forEach(btn => {
            if (btn.innerText.toLowerCase() === lang) btn.classList.add('active');
        });
    }
    saveProgress();
}

const player = {
    x: 40, y: 200, width: 40, height: 50,
    baseSpeed: 5,
    baseJump: -11,
    velX: 0, velY: 0,
    jumping: false, grounded: false,
    isMoving: false
};

// Šeit glabājas nospiestie taustiņi
let keys = {};

// --- JAUNA FUNKCIJA TAUSTIŅU NOTĪRĪŠANAI ---
function clearKeys() {
    keys = {}; // Pilnībā iztukšojam sarakstu, lai nekas neiestrēgtu kustībā
}

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

window.addEventListener("keydown", (e) => { 
    keys[e.key] = true; 

    if (e.key === "1") {
        if (score >= 50) {
            score -= 50;
            speedLevel++;
            scoreValElement.innerText = score;
            saveProgress();
            alert(translations[currentLang].bought + " (+1 Ātrums)");
            clearKeys(); // Notīra taustiņus pēc alert
        } else {
            alert(translations[currentLang].noPoints);
            clearKeys();
        }
    }

    if (e.key === "2") {
        if (score >= 50) {
            score -= 50;
            jumpLevel++;
            scoreValElement.innerText = score;
            saveProgress();
            alert(translations[currentLang].bought + " (+1 Lēciens)");
            clearKeys(); // Notīra taustiņus pēc alert
        } else {
            alert(translations[currentLang].noPoints);
            clearKeys();
        }
    }

    if (e.key === "3") {
        if (score >= 100) {
            if (currentLevel < TOTAL_LEVELS - 1) {
                score -= 100;
                currentLevel++;
                scoreValElement.innerText = score;
                saveProgress();
                alert(translations[currentLang].nextLevel + (currentLevel + 1));
                clearKeys(); // Notīra taustiņus pēc alert
                generateLevel(currentLevel);
                resetPlayer();
            } else {
                alert("Tu jau esi pēdējā līmenī!");
                clearKeys();
            }
        } else {
            alert(translations[currentLang].noPoints);
            clearKeys();
        }
    }
});

window.addEventListener("keyup", (e) => { keys[e.key] = false; });

function update() {
    player.isMoving = false;

    let currentSpeed = player.baseSpeed + (speedLevel * 0.4);

    if (keys["ArrowRight"] || keys["d"] || keys["D"]) { 
        if (player.velX < currentSpeed) player.velX += 1; 
        player.isMoving = true;
        facingDirection = 1; 
    }
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) { 
        if (player.velX > -currentSpeed) player.velX -= 1; 
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

    let currentJumpForce = player.baseJump - (jumpLevel * 0.3);

    if ((keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "]) && !player.jumping && player.grounded) {
        player.jumping = true;
        player.grounded = false;
        player.velY = currentJumpForce;
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

    currentItems.forEach(item => {
        if (!item.collected && player.x < item.x + item.width && player.x + player.width > item.x &&
            player.y < item.y + item.height && player.y + player.height > item.y) {
            item.collected = true;
            score += 10;
            scoreValElement.innerText = score;
            saveProgress(); 
        }
    });

    if (player.x < currentBoss.x + currentBoss.width && player.x + player.width > currentBoss.x &&
        player.y < currentBoss.y + currentBoss.height && player.y + player.height > currentBoss.y) {
        
        if (currentLevel < TOTAL_LEVELS - 1) {
            currentLevel++; 
            saveProgress(); 
            alert(translations[currentLang].nextLevel + (currentLevel + 1));
            
            clearKeys(); // <--- ŠIS ATLAIŽ VISAS POGAS AUTOMĀTISKI PĒC LOGA AIZVĒRŠANAS!
            
            generateLevel(currentLevel); 
            resetPlayer();
        } else {
            alert(translations[currentLang].win + score);
            clearSavedProgress(); 
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

    ctx.drawImage(mrBeastImg, currentBoss.x - cameraX, currentBoss.y, currentBoss.width, currentBoss.height);
    
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

    // INTERFEISS
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; 
    ctx.fillRect(450, 5, 340, 55);
    ctx.strokeStyle = "#00d2ff";
    ctx.strokeRect(450, 5, 340, 55);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    let lvlText = (currentLang === 'lv') ? "Līmenis: " : (currentLang === 'en') ? "Level: " : "Уровень: ";
    ctx.fillText(lvlText + (currentLevel + 1) + " / 30", 20, 30);

    ctx.font = "11px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("SHOP (Spied pogu):", 460, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("[1] +Ātrums (Lvl " + speedLevel + ") - 50p", 460, 35);
    ctx.fillText("[2] +Lēciens (Lvl " + jumpLevel + ") - 50p", 460, 50);
    ctx.fillText("[3] Izlaist Līmeni - 100p", 640, 35);
}

function resetPlayer() {
    player.x = 40; 
    player.y = 200; 
    player.velX = 0; 
    player.velY = 0;
}

function clearSavedProgress() {
    localStorage.clear();
    currentLevel = 0;
    score = 0;
    speedLevel = 0;
    jumpLevel = 0;
    scoreValElement.innerText = score;
    generateLevel(currentLevel);
    resetPlayer();
}

generateLevel(currentLevel);
resetPlayer();
changeLanguage(currentLang);
update();
