// game.js

// Globals
let playerCount = 2;
let players = [];
let currentPlayerIndex = 0;
const boardSize = 8; // 8x8 grid
const totalSquares = boardSize * boardSize;
let usedQuestions = { brawlstars: [], science: [], math: [], world: [] };
let questionsData = null;
let draggedAvatar = null;
let currentQuestion = null;
let currentCategory = null;
let rolling = false;
let moving = false;

// Assign question squares every 2 spaces starting at position 2, skipping finish
const categoriesCycle = ["brawlstars","science","math","world"];
let categoryIndex = 0;

// Screens
const introScreen = document.getElementById("intro-screen");
const avatarScreen = document.getElementById("avatar-screen");
const gameScreen = document.getElementById("game-screen");

// Intro Controls
const decrementPlayersBtn = document.getElementById("decrement-players");
const incrementPlayersBtn = document.getElementById("increment-players");
const playerCountDisplay = document.getElementById("player-count");
const nextToAvatarsBtn = document.getElementById("next-to-avatars");

// Avatar Selection
const playerSlotsContainer = document.getElementById("player-slots");
const avatarPool = document.getElementById("avatar-pool");
const startGameBtn = document.getElementById("start-game");

// Game Controls
const currentPlayerDisplay = document.getElementById("current-player-display");
const rollDiceBtn = document.getElementById("roll-dice");
const diceDisplay = document.getElementById("dice-display");
const playersSummary = document.getElementById("players-summary");
const boardGrid = document.getElementById("board-grid");

// Popups
const questionPopup = document.getElementById("question-popup");
const feedbackPopup = document.getElementById("feedback-popup");
const questionText = document.getElementById("question-text");
const optionA = document.getElementById("option-A");
const optionB = document.getElementById("option-B");
const optionC = document.getElementById("option-C");
const optionD = document.getElementById("option-D");
const feedbackMessage = document.getElementById("feedback-message");
const confettiContainer = document.getElementById("confetti");

// Post-win buttons
const postWinButtons = document.getElementById("post-win-buttons");
const playAgainBtn = document.getElementById("play-again-btn");
const backHomeBtn = document.getElementById("back-home-btn");

// Player count adjustments
decrementPlayersBtn.addEventListener("click", () => {
    if (playerCount > 2) {
        playerCount--;
        playerCountDisplay.textContent = playerCount;
    }
});
incrementPlayersBtn.addEventListener("click", () => {
    if (playerCount < 5) {
        playerCount++;
        playerCountDisplay.textContent = playerCount;
    }
});

// Move to avatar screen
nextToAvatarsBtn.addEventListener("click", () => {
    introScreen.classList.remove("active");
    avatarScreen.classList.add("active");
    setupAvatarSlots();
});

function setupAvatarSlots() {
    playerSlotsContainer.innerHTML = "";
    for (let i = 0; i < playerCount; i++) {
        const slot = document.createElement("div");
        slot.classList.add("player-slot");
        slot.setAttribute("data-player-index", i);
        slot.innerHTML = `<p>Player ${i+1}</p>`;
        addDragEvents(slot);
        playerSlotsContainer.appendChild(slot);
    }
}

function addDragEvents(element) {
    element.addEventListener("dragover", (e) => {
        e.preventDefault();
        element.classList.add("drag-over");
    });
    element.addEventListener("dragleave", () => {
        element.classList.remove("drag-over");
    });
    element.addEventListener("drop", (e) => {
        e.preventDefault();
        element.classList.remove("drag-over");
        if (draggedAvatar) {
            if (element.querySelector("img")) return;
            const img = document.createElement("img");
            img.src = draggedAvatar.src;
            img.alt = draggedAvatar.alt;
            img.classList.add("selected-avatar");
            const playerIndex = element.getAttribute("data-player-index");
            element.innerHTML = `<p>Player ${parseInt(playerIndex)+1}</p>`;
            element.appendChild(img);
            element.classList.add("selected");
            // Remove avatar from the pool
            draggedAvatar.parentElement.remove(); 
        }
    });
}

// Drag start for avatars
avatarPool.addEventListener("dragstart", (e) => {
    if (e.target.classList.contains("avatar-option")) {
        draggedAvatar = e.target;
    }
});
avatarPool.addEventListener("dragend", () => {
    draggedAvatar = null;
});

// Start game
startGameBtn.addEventListener("click", () => {
    const slots = playerSlotsContainer.querySelectorAll(".player-slot");
    for (let i = 0; i < slots.length; i++) {
        if (!slots[i].querySelector("img")) {
            alert(`Player ${i+1} must select an avatar!`);
            return;
        }
    }

    players = [];
    for (let i = 0; i < slots.length; i++) {
        const img = slots[i].querySelector("img");
        players.push({ 
            name: img.alt || `Player ${i+1}`, 
            avatar: img.src, 
            position: 0, // start on first square
            finished: false
        });
    }

    avatarScreen.classList.remove("active");
    gameScreen.classList.add("active");

    initializeGame();
});

function initializeGame() {
    fetch("gbbgquestions.json")
    .then(res => res.json())
    .then(data => {
        questionsData = data;
        buildBoard();
        renderPlayers();
        updateCurrentPlayerDisplay();
        updatePlayersSummary();
    });
}

function buildBoard() {
    boardGrid.innerHTML = "";
    for (let i = 0; i < totalSquares; i++) {
        const sq = document.createElement("div");
        sq.classList.add("square");
        sq.setAttribute("data-grid-index", i);
        boardGrid.appendChild(sq);
    }

    // FINISH line at position 63
    const finishCellIndex = getCellIndexFromPos(63);
    const finishSquare = boardGrid.querySelector(`.square[data-grid-index='${finishCellIndex}']`);
    finishSquare.classList.add("finish");
    finishSquare.textContent = "FINISH";

    // Assign question squares at every 2 spaces starting at pos=2, excluding finish
    for (let pos = 2; pos < totalSquares; pos += 2) {
        if (pos === 63) continue; // skip finish
        const cat = categoriesCycle[categoryIndex % categoriesCycle.length];
        categoryIndex++;
        const cellIndex = getCellIndexFromPos(pos);
        const sq = boardGrid.querySelector(`.square[data-grid-index='${cellIndex}']`);
        if (!sq) continue;
        switch(cat) {
            case "brawlstars":
                sq.classList.add("lightblue");
                sq.textContent = "BRAWL*s";
                break;
            case "science":
                sq.classList.add("red");
                sq.textContent = "SCIENCE";
                break;
            case "math":
                sq.classList.add("yellow");
                sq.textContent = "MATH";
                break;
            case "world":
                sq.classList.add("green");
                sq.textContent = "WORLD";
                break;
        }
    }

    // Other squares blank
    const allSquares = boardGrid.querySelectorAll(".square");
    allSquares.forEach(s => {
        if (!s.classList.contains("lightblue") &&
            !s.classList.contains("red") &&
            !s.classList.contains("yellow") &&
            !s.classList.contains("green") &&
            !s.classList.contains("finish")) {
            s.classList.add("blank");
        }
    });
}

function getCellIndexFromPos(pos) {
    let row = Math.floor(pos / 8);
    let col = pos % 8;
    if (row % 2 === 1) {
        col = 7 - col;
    }
    return row * 8 + col;
}

function renderPlayers() {
    // Remove old avatars
    const oldAvatars = boardGrid.querySelectorAll(".player-avatar");
    oldAvatars.forEach(av => av.remove());

    players.forEach((p, idx) => {
        const cellIndex = getCellIndexFromPos(p.position);
        const sq = boardGrid.querySelector(`.square[data-grid-index='${cellIndex}']`);
        if (sq) {
            const avatar = document.createElement("img");
            avatar.src = p.avatar;
            avatar.alt = p.name;
            avatar.classList.add("player-avatar");
            // If multiple players land on the same square, offset them
            const offsetIndex = players.filter((x, n) => x.position === p.position && n < idx).length;
            avatar.style.transform = `translate(${offsetIndex*10}px, ${offsetIndex*10}px)`;
            sq.style.position = "relative";
            sq.appendChild(avatar);
        }
    });
}

function updateCurrentPlayerDisplay() {
    currentPlayerDisplay.textContent = `Current Player: ${players[currentPlayerIndex].name}`;
}

function updatePlayersSummary() {
    playersSummary.innerHTML = "";
    players.forEach((p, i) => {
        const div = document.createElement("div");
        div.classList.add("player-summary-item");
        const label = document.createElement("span");
        label.classList.add("player-label");
        label.textContent = `P${i+1}`;

        const img = document.createElement("img");
        img.src = p.avatar;
        img.alt = p.name;

        const nameSpan = document.createElement("span");
        nameSpan.classList.add("player-name");
        nameSpan.textContent = p.name;

        div.appendChild(label);
        div.appendChild(img);
        div.appendChild(nameSpan);

        playersSummary.appendChild(div);
    });
}

// 6-sided dice
rollDiceBtn.addEventListener("click", rollDice);

function rollDice() {
    if (rolling || moving) return;
    const current = players[currentPlayerIndex];
    if (current.finished) {
        nextPlayer();
        return;
    }

    rolling = true;
    diceDisplay.textContent = "-";
    let rollCount = 0;
    const rollInterval = setInterval(() => {
        diceDisplay.textContent = Math.floor(Math.random()*6)+1;
        rollCount++;
        if (rollCount > 10) {
            clearInterval(rollInterval);
            const finalRoll = Math.floor(Math.random()*6)+1;
            diceDisplay.textContent = finalRoll;
            rolling = false;
            movePlayer(finalRoll);
        }
    }, 80);
}

function movePlayer(spaces) {
    moving = true;
    const current = players[currentPlayerIndex];
    const oldPos = current.position;
    let newPos = oldPos + spaces;
    if (newPos >= totalSquares - 1) {
        newPos = totalSquares - 1;
    }
    animateMovement(oldPos, newPos, () => {
        current.position = newPos;
        renderPlayers();
        moving = false;
        checkLanding();
    });
}

function animateMovement(start, end, callback) {
    let currentPos = start;
    const step = start < end ? 1 : -1;
    const interval = setInterval(() => {
        currentPos += step;
        players[currentPlayerIndex].position = currentPos;
        renderPlayers();
        if (currentPos === end) {
            clearInterval(interval);
            callback();
        }
    }, 300);
}

function checkLanding() {
    const player = players[currentPlayerIndex];
    if (player.position === totalSquares - 1) {
        // Player finished
        player.finished = true;
        feedbackPopup.classList.add("active");
        feedbackMessage.textContent = `${player.name} wins!`;
        // Show the post-win buttons
        postWinButtons.style.display = "block";
        return;
    }

    // Check if question square
    if (player.position >= 2 && player.position !== 63 && player.position % 2 === 0) {
        let offset = Math.floor((player.position - 2)/2);
        const cat = categoriesCycle[offset % categoriesCycle.length];
        askQuestion(cat);
    } else {
        nextPlayer();
    }
}

function askQuestion(category) {
    currentCategory = category;
    const qArray = getQuestionsArray(category);
    const unused = qArray.filter(q => !usedQuestions[category].includes(q.id));
    if (unused.length === 0) {
        nextPlayer();
        return;
    }

    currentQuestion = unused[Math.floor(Math.random()*unused.length)];
    showQuestionPopup(currentQuestion);
}

function getQuestionsArray(cat) {
    switch(cat) {
        case "brawlstars": return questionsData.brawlstarsQuestions;
        case "science": return questionsData.scienceQuestions;
        case "math": return questionsData.mathQuestions;
        case "world": return questionsData.worldQuestions;
    }
    return [];
}

function showQuestionPopup(q) {
    questionText.textContent = q.question;
    optionA.textContent = q.options[0];
    optionB.textContent = q.options[1];
    optionC.textContent = q.options[2];
    optionD.textContent = q.options[3];

    [optionA, optionB, optionC, optionD].forEach(opt => {
        opt.onclick = () => {
            handleAnswer(opt, q);
        }
    });

    questionPopup.classList.add("active");
}

function handleAnswer(opt, q) {
    const chosen = opt.textContent.charAt(0);
    const correct = q.correct;
    questionPopup.classList.remove("active");
    usedQuestions[currentCategory].push(q.id);

    if (chosen === correct) {
        showFeedback("Correct!", true);
    } else {
        showFeedback("Wrong! Move back 2 spaces!", false);
    }
}

function showFeedback(msg, correct) {
    feedbackMessage.textContent = msg;
    feedbackPopup.classList.add("active");

    if (correct) {
        launchConfetti();
        setTimeout(() => {
            feedbackPopup.classList.remove("active");
            nextPlayer();
        }, 1500);
    } else {
        setTimeout(() => {
            feedbackPopup.classList.remove("active");
            moveBack(2);
        }, 1500);
    }
}

function moveBack(spaces) {
    const player = players[currentPlayerIndex];
    let newPos = player.position - spaces;
    if (newPos < 0) newPos = 0;
    const oldPos = player.position;
    animateMovement(oldPos, newPos, () => {
        player.position = newPos;
        renderPlayers();
        nextPlayer();
    });
}

function nextPlayer() {
    currentPlayerIndex = (currentPlayerIndex+1) % players.length;
    let count = 0;
    while (players[currentPlayerIndex].finished && count < players.length) {
        currentPlayerIndex = (currentPlayerIndex+1) % players.length;
        count++;
    }
    updateCurrentPlayerDisplay();
}

function launchConfetti() {
    confettiContainer.innerHTML = "";
    for (let i = 0; i < 20; i++) {
        const conf = document.createElement("div");
        conf.style.width = "10px";
        conf.style.height = "10px";
        conf.style.background = `hsl(${Math.random()*360}, 100%, 50%)`;
        conf.style.position = "absolute";
        conf.style.top = "0px";
        conf.style.left = (Math.random() * 700) + "px";
        conf.style.animation = "confetti-fall 1s linear";
        confettiContainer.appendChild(conf);
    }

    setTimeout(() => {
        confettiContainer.innerHTML = "";
    }, 1100);
}

// Event listeners for post-win buttons
playAgainBtn.addEventListener("click", () => {
    feedbackPopup.classList.remove("active");
    postWinButtons.style.display = "none";
    resetGameWithSamePlayers();
});

backHomeBtn.addEventListener("click", () => {
    feedbackPopup.classList.remove("active");
    postWinButtons.style.display = "none";
    goBackToHome();
});

function resetGameWithSamePlayers() {
    players.forEach(p => {
        p.position = 0;
        p.finished = false;
    });
    usedQuestions = { brawlstars: [], science: [], math: [], world: [] };
    currentPlayerIndex = 0;
    renderPlayers();
    updateCurrentPlayerDisplay();
    updatePlayersSummary();
    questionPopup.classList.remove("active");
    feedbackPopup.classList.remove("active");
}

function goBackToHome() {
    gameScreen.classList.remove("active");
    introScreen.classList.add("active");

    // Reset all variables
    players = [];
    usedQuestions = { brawlstars: [], science: [], math: [], world: [] };
    currentPlayerIndex = 0;
    diceDisplay.textContent = "-";
    avatarScreen.classList.remove("active");
    playerSlotsContainer.innerHTML = "";
    questionPopup.classList.remove("active");
    feedbackPopup.classList.remove("active");
    postWinButtons.style.display = "none";
}
