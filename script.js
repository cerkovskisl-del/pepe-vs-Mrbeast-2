const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValElement = document.getElementById("score-val");
const scoreTextElement = document.getElementById("score-text");
const controlsTextElement = document.getElementById("controls-text");

let score = 0;
let currentLang = 'lv';
let currentLevel = 0; 
const TOTAL_LEVELS = 30; // Kopā būs 30 līmeņi

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
        nextLevel: "Lieliski! Līmenis pabeigts! Gatavojies līmenim: ",
        win: "NETICAMI! Tu izgāji visus 30 līmeņus un uzvarēji spēli! Kopējie punkti: "
    },
    en: {
        score: "Points",
        controls: "Controls: Move with Arrows or WASD | Jump with Space",
        nextLevel: "Great job! Level cleared! Get ready for Level ",
        win: "INCREDIBLE! You beat all 30 levels and won the game! Total points: "
    },
    ru: {
        score: "Очки",
        controls: "Управление: Движение стрелками или WASD | Прыжок через Пробел",
        nextLevel: "Отлично! Уровень пройден! Приготовься к уровню ",
        win: "НЕВЕРОЯТНО! Ты прошёл все 30 уровней и выиграл игру! Всего очков: "
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

// Pašreizējā līmeņa objekti, kas tiks pārrakstīti katrā līmenī
let currentPlatforms = [];
let currentItems = [];
let currentBoss = { x: 0, y: 0, width: 40, height: 50 };

// --- AUTOMĀTISKAIS LĪMEŅU ĢENERATORS ---
// Šī funkcija izveido unikālu karti atkarībā no līmeņa numura (0 līdz 29)
function generateLevel(levelNumber) {
    currentPlatforms = [];
    currentItems = [];

    // 1. Izveidojam starta zemi zem spēlētāja kājas
    currentPlatforms.push({ x: 0, y: 380, width: 150, height: 20 });

    // Sarežģītības koeficients: jo lielāks līmenis, jo mazākas platformas un lielākas atstarpes
    let levelDifficulty = levelNumber / TOTAL_LEVELS; // skaitlis no 0.0 līdz 1.0
    
    let currentX = 180;
    let currentY = 320;
    
    // Uzģenerējam 5 līdz 8 platformas atkarībā no līmeņa progressa
    let platformCount = 5 + Math.floor(levelDifficulty * 3);

    for (let i = 0; i < platformCount; i++) {
        // Platformas platums samazinās, ejot uz priekšu līmeņos (sākot no 140 līdz pat 60 pikseļiem)
        let platWidth = 140 - Math.floor(levelDifficulty * 80);
        if (platWidth < 60) platWidth = 60; // Lai nav par mazu

        currentPlatforms.push({
            x: currentX,
            y: currentY,
            width: platWidth,
            height: 15
        });

        // Uz katras otrās platformas uzliekam monētu
        if (i % 2 === 0) {
            currentItems.push({
                x: currentX + (platWidth / 2) - 7,
                y: currentY - 30,
                width: 15,
                height: 15,
                collected: false
            });
        }

        // Aprēķinām nākamās platformas pozīciju (izmantojam kontrolētu nejaušību)
        // Atstarpe pa labi palielinās grūtākos līmeņos
        let minGapX = 80 + Math.floor(levelDifficulty * 40);
        let maxGapX = 130 + Math.floor(levelDifficulty * 60);
        currentX += minGapX + Math.floor(Math.random() * (maxGapX - minGapX));

        // Platformas augstums mainās uz augšu vai uz leju
        let changeY = Math.floor(Math.random() * 100) - 50; // no -50 līdz +50
        currentY += changeY;

        // Neļaujam platformām iziet ārpus ekrāna rāmjiem augstumā
        if (currentY < 100) currentY = 140;
        if (currentY > 350) currentY = 300;
        
        // Ja platformas aiziet līdz ekrāna galam, apstājamies
        if (currentX > 740) {
            // Pēdējā platforma būs nedaudz lielāka drošībai
            currentPlatforms[currentPlatforms.length - 1].width = 80;
            break;
        }
    }

    // Drošības pārbaude: Ja pēdējā platforma nav sasniegusi ekrāna labo pusi, pieliekam gala platformu MrBeastam
    let lastPlat = currentPlatforms[currentPlatforms.length - 1];
    if (lastPlat.x < 600) {
        lastPlat = { x: 680, y: 180, width: 100, height: 15 };
        currentPlatforms.push(lastPlat);
    }

    // Novietojam MrBeast uz pēdējās uzģenerētās platformas
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

    // Ja nokrīt bedrē
    if (player.y > canvas.height) { resetPlayer(); }

    // Monētu pacelšana
    currentItems.forEach(item => {
        if (!item.collected && player.x < item.x + item.width && player.x + player.width > item.x &&
            player.y < item.y + item.height && player.y + player.height > item.y) {
            item.collected = true;
            score += 10;
            scoreValElement.innerText = score;
        }
    });

    // Sadursme ar MrBeast
    if (player.x < currentBoss.x + currentBoss.width && player.x + player.width > currentBoss.x &&
        player.y < currentBoss.y + currentBoss.height && player.y + player.height > currentBoss.y) {
        
        if (currentLevel < TOTAL_LEVELS - 1) {
            currentLevel++; 
            alert(translations[currentLang].nextLevel + (currentLevel + 1));
            generateLevel(currentLevel); // Uzģenerē jauno līmeni
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
    
    // Zvaigznes
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(100, 80, 2, 2); ctx.fillRect(300, 50, 3, 3);
    ctx.fillRect(550, 120, 2, 2); ctx.fillRect(700, 70, 3, 3);
    ctx.fillRect(450, 300, 2, 2); ctx.fillRect(150, 220, 1, 1);

    // Platformas
    currentPlatforms.forEach(plat => {
        ctx.fillStyle = "#795548";
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
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

    // Līmeņa teksts stūrī (atbalsta 3 valodas)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    let lvlText = (currentLang === 'lv') ? "Līmenis: " : (currentLang === 'en') ? "Level: " : "Уровень: ";
    ctx.fillText(lvlText + (currentLevel + 1) + " / 30", 20, 30);
}

function resetPlayer() {
    player.x = 50; player.y = 300; player.velX = 0; player.velY = 0;
}

function resetGame() {
    currentLevel = 0;
    score = 0;
    scoreValElement.innerText = score;
    generateLevel(currentLevel);
    resetPlayer();
}

// Palaižam pirmo līmeni spēles sākumā
generateLevel(currentLevel);
update();
