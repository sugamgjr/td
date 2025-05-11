// DOM Elements
const pages = {
    home: document.getElementById('home-page'),
    room: document.getElementById('room-page'),
    join: document.getElementById('join-page'),
    custom: document.getElementById('custom-questions-page'),
    setup: document.getElementById('player-setup-page'),
    game: document.getElementById('game-page')
};

const navLinks = {
    home: document.getElementById('home-link'),
    room: document.getElementById('room-link'),
    join: document.getElementById('join-link'),
    refresh: document.getElementById('refresh-link')
};

const modeSelection = {
    default: document.getElementById('default-mode'),
    custom: document.getElementById('custom-mode')
};

const roomElements = {
    createBtn: document.getElementById('create-room-btn'),
    nameInput: document.getElementById('room-name'),
    passwordInput: document.getElementById('room-password'),
    roomInfo: document.getElementById('room-info'),
    displayPassword: document.getElementById('display-password'),
    qrCode: document.getElementById('qr-code'),
    playersList: document.getElementById('players-list')
};

const joinElements = {
    joinBtn: document.getElementById('join-room-btn'),
    passwordInput: document.getElementById('join-password'),
    playerName: document.getElementById('player-name'),
    joinStatus: document.getElementById('join-status')
};

const customElements = {
    saveBtn: document.getElementById('save-questions-btn'),
    truthInput: document.querySelector('.truth-input'),
    dareInput: document.querySelector('.dare-input'),
    truthList: document.getElementById('truth-questions-list'),
    dareList: document.getElementById('dare-questions-list')
};

const setupElements = {
    container: document.getElementById('players-input-container'),
    addPlayerBtn: document.getElementById('add-player-btn'),
    startGameBtn: document.getElementById('start-game-btn')
};

const gameElements = {
    wheel1: document.getElementById('wheel1'),
    wheel2: document.getElementById('wheel2'),
    spinBtn: document.getElementById('spin-btn')
};

const modalElements = {
    result: document.getElementById('result-modal'),
    question: document.getElementById('question-modal'),
    resultTitle: document.getElementById('result-title'),
    questionType: document.getElementById('question-type'),
    questionText: document.getElementById('question-text'),
    truthBtn: document.getElementById('truth-btn'),
    dareBtn: document.getElementById('dare-btn'),
    nextRoundBtn: document.getElementById('next-round-btn'),
    closeButtons: document.querySelectorAll('.close-modal')
};

const connectionStatus = document.getElementById('connection-status');
const fullscreenBtn = document.getElementById('fullscreen-btn');

// Game State
const gameState = {
    currentPage: 'home',
    gameMode: null,
    players: [],
    customQuestions: {
        truth: [],
        dare: []
    },
    defaultQuestions: {
        truth: [
            "What's the most embarrassing thing you've ever done?",
            "Have you ever cheated on a test?",
            "What's your biggest fear?",
            "What's the weirdest dream you've ever had?",
            "Have you ever lied to get out of trouble?",
            "What's something you're glad your parents don't know about you?",
            "What's the most childish thing you still do?",
            "Have you ever pretended to like a gift you hated?",
            "What's the silliest thing you've ever cried about?",
            "What's your guilty pleasure?"
        ],
        dare: [
            "Do your best impression of a celebrity",
            "Let the group give you a new hairstyle",
            "Sing a song with your mouth full of water",
            "Do 10 pushups right now",
            "Let someone tickle you for 30 seconds without resisting",
            "Eat a spoonful of a condiment you dislike",
            "Dance with no music for 1 minute",
            "Wear your clothes inside out for the next round",
            "Speak in an accent for the next 3 rounds",
            "Let the group choose a new name for you for the rest of the game"
        ]
    },
    currentPlayers: {
        asker: null,
        answerer: null
    },
    isHost: false,
    peer: null,
    connections: {},
    spinValues: null,
    wheelState: {
        spinning: false,
        spinCount: 0
    },
    previousSelections: [],
    usedPairs: [],
    playerPairs: {}
};

// Initialize the app with PeerJS
function init() {
    setupEventListeners();
    showPage('home');
    
    // Check if we're joining an existing room from URL
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get('join');
    if (joinId) {
        document.getElementById('join-password').value = joinId;
        showPage('join');
    }
}

function setupEventListeners() {
    // Navigation
    navLinks.home.addEventListener('click', () => showPage('home'));
    navLinks.room.addEventListener('click', () => showPage('room'));
    navLinks.join.addEventListener('click', () => showPage('join'));
    navLinks.refresh.addEventListener('click', () => location.reload());
    
    // Mode selection
    modeSelection.default.addEventListener('click', () => {
        gameState.gameMode = 'default';
        showPage('setup');
    });
    modeSelection.custom.addEventListener('click', () => {
        gameState.gameMode = 'custom';
        showPage('custom');
    });
    
    // Room creation
    roomElements.createBtn.addEventListener('click', createRoom);
    
    // Join room
    joinElements.joinBtn.addEventListener('click', joinRoom);
    
    // Custom questions
    document.querySelectorAll('.add-question-btn').forEach(btn => {
        btn.addEventListener('click', addCustomQuestion);
    });
    customElements.saveBtn.addEventListener('click', saveCustomQuestions);
    
    // Player setup
    setupElements.addPlayerBtn.addEventListener('click', addPlayerInput);
    setupElements.startGameBtn.addEventListener('click', startGame);
    
    // Remove player buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-player-btn') || 
            e.target.parentElement.classList.contains('remove-player-btn')) {
            const playerGroup = e.target.closest('.player-input-group');
            if (setupElements.container.children.length > 2) {
                playerGroup.remove();
            }
        }
    });
    
    // Game
    gameElements.spinBtn.addEventListener('click', spinWheels);
    
    // Modals
    modalElements.truthBtn.addEventListener('click', () => showQuestion('truth'));
    modalElements.dareBtn.addEventListener('click', () => showQuestion('dare'));
    modalElements.nextRoundBtn.addEventListener('click', nextRound);
    modalElements.closeButtons.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Fullscreen
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

function showPage(page) {
    // Hide all pages
    Object.values(pages).forEach(p => p.classList.remove('active'));
    
    // Show the selected page
    pages[page].classList.add('active');
    
    // Update navigation
    Object.values(navLinks).forEach(link => link.classList.remove('active'));
    if (navLinks[page]) {
        navLinks[page].classList.add('active');
    }
    
    // Update current page
    gameState.currentPage = page;
    
    // Special setup for certain pages
    if (page === 'game') {
        setupWheels();
    }
}

function initializePeerJS(isHost) {
    gameState.isHost = isHost;
    gameState.peer = new Peer();
    
    gameState.peer.on('open', (id) => {
        console.log('PeerJS connected with ID:', id);
        updateConnectionStatus(true);
        
        if (gameState.isHost) {
            // Host-specific setup
            roomElements.displayPassword.textContent = id;
            
            // Generate QR code with PeerJS ID as password
            roomElements.qrCode.innerHTML = '';
            new QRCode(roomElements.qrCode, {
                text: id,
                width: 150,
                height: 150
            });
        }
    });
    
    gameState.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        updateConnectionStatus(false);
    });
    
    gameState.peer.on('connection', (conn) => {
        handleIncomingConnection(conn);
    });
}

function connectToHost(hostId, playerName) {
    const conn = gameState.peer.connect(hostId, {
        metadata: { playerName }
    });
    
    conn.on('open', () => {
        console.log('Connected to host');
        gameState.connections.host = conn;
        updateConnectionStatus(true);
        setupConnectionListeners(conn);
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        updateConnectionStatus(false);
    });
}

function handleIncomingConnection(conn) {
    const playerName = conn.metadata.playerName;
    console.log('Incoming connection from:', playerName);
    
    gameState.connections[conn.peer] = conn;
    addPlayerToList(playerName);
    setupConnectionListeners(conn);
    
    // Send current game state to new player
    if (gameState.currentPage === 'game') {
        sendGameState(conn);
    }
}

function setupConnectionListeners(conn) {
    conn.on('data', (data) => {
        handleDataMessage(data);
    });
    
    conn.on('close', () => {
        console.log('Connection closed:', conn.peer);
        removePlayerFromList(conn.metadata.playerName);
        delete gameState.connections[conn.peer];
    });
}

function handleDataMessage(data) {
    switch (data.type) {
        case 'gameState':
            handleGameStateUpdate(data);
            break;
        case 'spin':
            handleSpinCommand(data);
            break;
        case 'result':
            handleResultCommand(data);
            break;
        case 'question':
            handleQuestionCommand(data);
            break;
        case 'nextRound':
            nextRound();
            break;
    }
}

function sendGameState(conn) {
    conn.send({
        type: 'gameState',
        players: gameState.players,
        currentPlayers: gameState.currentPlayers,
        gameMode: gameState.gameMode
    });
}

function broadcast(data) {
    Object.values(gameState.connections).forEach(conn => {
        conn.send(data);
    });
}

function addPlayerToList(playerName) {
    if (gameState.isHost) {
        const playerItem = document.createElement('li');
        playerItem.textContent = playerName;
        roomElements.playersList.appendChild(playerItem);
        
        // Add to game state if not already there
        if (!gameState.players.includes(playerName)) {
            gameState.players.push(playerName);
        }
    }
}

function removePlayerFromList(playerName) {
    if (gameState.isHost) {
        const items = roomElements.playersList.querySelectorAll('li');
        items.forEach(item => {
            if (item.textContent === playerName) {
                item.remove();
            }
        });
        
        // Remove from game state
        gameState.players = gameState.players.filter(p => p !== playerName);
    }
}

function updateConnectionStatus(connected) {
    connectionStatus.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    
    setTimeout(() => {
        connectionStatus.textContent = '';
    }, 3000);
}

function createRoom() {
    const roomName = roomElements.nameInput.value.trim();
    
    if (!roomName) {
        alert('Please enter a room name');
        return;
    }
    
    initializePeerJS(true);
    roomElements.roomInfo.style.display = 'block';
}

function joinRoom() {
    const password = joinElements.passwordInput.value.trim();
    const playerName = joinElements.playerName.value.trim();
    
    if (!password || !playerName) {
        alert('Please enter both password and your name');
        return;
    }
    
    initializePeerJS(false);
    connectToHost(password, playerName);
    
    joinElements.joinStatus.innerHTML = `
        <p style="color: var(--success-color)">Connecting to room...</p>
    `;
}

function addCustomQuestion(e) {
    const type = e.target.getAttribute('data-type');
    const input = type === 'truth' ? customElements.truthInput : customElements.dareInput;
    const list = type === 'truth' ? customElements.truthList : customElements.dareList;
    const question = input.value.trim();
    
    if (!question) return;
    
    // Add to list
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';
    questionItem.innerHTML = `
        <span>${question}</span>
        <button class="delete-question" data-type="${type}"><i class="fas fa-trash"></i></button>
    `;
    list.appendChild(questionItem);
    
    // Clear input
    input.value = '';
    
    // Add delete event
    questionItem.querySelector('.delete-question').addEventListener('click', (e) => {
        e.stopPropagation();
        questionItem.remove();
    });
}

function saveCustomQuestions() {
    // Get all truth questions
    gameState.customQuestions.truth = [];
    document.querySelectorAll('#truth-questions-list .question-item span').forEach(item => {
        gameState.customQuestions.truth.push(item.textContent);
    });
    
    // Get all dare questions
    gameState.customQuestions.dare = [];
    document.querySelectorAll('#dare-questions-list .question-item span').forEach(item => {
        gameState.customQuestions.dare.push(item.textContent);
    });
    
    // Validate
    if (gameState.customQuestions.truth.length < 5 || gameState.customQuestions.dare.length < 5) {
        alert('Please add at least 5 truth and 5 dare questions');
        return;
    }
    
    showPage('setup');
}

function addPlayerInput() {
    const count = setupElements.container.children.length + 1;
    const playerGroup = document.createElement('div');
    playerGroup.className = 'player-input-group';
    playerGroup.innerHTML = `
        <input type="text" class="player-input" placeholder="Player ${count} Name">
        <button class="remove-player-btn"><i class="fas fa-times"></i></button>
    `;
    setupElements.container.appendChild(playerGroup);
}

function startGame() {
    // Get all player names
    gameState.players = [];
    document.querySelectorAll('.player-input').forEach(input => {
        const name = input.value.trim();
        if (name) {
            gameState.players.push(name);
        }
    });
    
    // Add connected players if host
    if (gameState.isHost) {
        const connectedPlayers = roomElements.playersList.querySelectorAll('li');
        connectedPlayers.forEach(player => {
            if (!gameState.players.includes(player.textContent)) {
                gameState.players.push(player.textContent);
            }
        });
    }
    
    // Validate
    if (gameState.players.length < 2) {
        alert('You need at least 2 players to play');
        return;
    }
    
    // Initialize player pairs tracking
    initializePlayerPairs();
    
    showPage('game');
    
    // Broadcast game state to all connected players if host
    if (gameState.isHost) {
        broadcast({
            type: 'gameState',
            players: gameState.players,
            currentPlayers: gameState.currentPlayers,
            gameMode: gameState.gameMode
        });
    }
}

function initializePlayerPairs() {
    // Reset player pairs tracking
    gameState.playerPairs = {};
    gameState.players.forEach(player => {
        gameState.playerPairs[player] = {
            asked: [],
            answered: []
        };
    });
}

function setupWheels() {
    const wheel1Sections = gameElements.wheel1.querySelector('.wheel-sections');
    const wheel2Sections = gameElements.wheel2.querySelector('.wheel-sections');
    
    // Clear existing sections
    wheel1Sections.innerHTML = '';
    wheel2Sections.innerHTML = '';
    
    // Create sections for each player with unique colors
    gameState.players.forEach((player, i) => {
        const angle = (360 / gameState.players.length) * i;
        const color = getColorForIndex(i);
        
        const section1 = document.createElement('div');
        section1.className = 'wheel-section';
        section1.style.transform = `rotate(${angle}deg)`;
        section1.style.backgroundColor = color;
        wheel1Sections.appendChild(section1);
        
        const section2 = document.createElement('div');
        section2.className = 'wheel-section';
        section2.style.transform = `rotate(${angle}deg)`;
        section2.style.backgroundColor = color;
        wheel2Sections.appendChild(section2);
    });
}

function getColorForIndex(index) {
    const colors = [
        '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894', 
        '#fdcb6e', '#e17055', '#0984e3', '#00cec9',
        '#fab1a0', '#e84393', '#6c5ce7', '#a29bfe'
    ];
    return colors[index % colors.length];
}

function spinWheels() {
    if (gameState.wheelState.spinning) return;
    gameState.wheelState.spinning = true;
    gameElements.spinBtn.disabled = true;
    
    // Random spins (3-6 full rotations plus a random angle)
    gameState.spinValues = {
        spin1: Math.floor(Math.random() * 3 + 3) * 360 + Math.floor(Math.random() * 360),
        spin2: Math.floor(Math.random() * 3 + 3) * 360 + Math.floor(Math.random() * 360)
    };
    
    // Apply spinning animation
    const wheel1 = gameElements.wheel1.querySelector('.wheel-sections');
    const wheel2 = gameElements.wheel2.querySelector('.wheel-sections');
    
    wheel1.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.21, 0.99)';
    wheel2.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.21, 0.99)';
    
    wheel1.style.transform = `rotate(${gameState.spinValues.spin1}deg)`;
    wheel2.style.transform = `rotate(${gameState.spinValues.spin2}deg)`;
    
    // Broadcast to other players if host
    if (gameState.isHost) {
        broadcast({
            type: 'spin',
            spin1: gameState.spinValues.spin1,
            spin2: gameState.spinValues.spin2
        });
    }
    
    // After spinning, determine selected players
    setTimeout(() => {
        const results = calculateWheelResults();
        
        // Check for duplicate selection
        if (results.selectedIndex1 === results.selectedIndex2) {
            handleDuplicateSelection();
            return;
        }
        
        // Get the selected players
        const asker = gameState.players[results.selectedIndex1];
        const answerer = gameState.players[results.selectedIndex2];
        
        // Check if this pair has been used recently
        const pairKey = `${results.selectedIndex1}-${results.selectedIndex2}`;
        const reversePairKey = `${results.selectedIndex2}-${results.selectedIndex1}`;
        
        // Check if these players have interacted too much
        const askerData = gameState.playerPairs[asker];
        const answererData = gameState.playerPairs[answerer];
        
        const askerHasAskedTooMuch = askerData.asked.filter(p => p === answerer).length >= 2;
        const answererHasAnsweredTooMuch = answererData.answered.filter(p => p === asker).length >= 2;
        
        if (gameState.usedPairs.includes(pairKey) || 
            gameState.usedPairs.includes(reversePairKey) ||
            askerHasAskedTooMuch ||
            answererHasAnsweredTooMuch) {
            
            // Try to find a unique pair
            let attempts = 0;
            let newResults = results;
            let foundValidPair = false;
            
            while (attempts < 10 && !foundValidPair) {
                // Adjust the spin slightly to get a different result
                newResults = calculateWheelResults();
                
                // Only proceed if we have different players
                if (newResults.selectedIndex1 !== newResults.selectedIndex2) {
                    const newAsker = gameState.players[newResults.selectedIndex1];
                    const newAnswerer = gameState.players[newResults.selectedIndex2];
                    
                    const newPairKey = `${newResults.selectedIndex1}-${newResults.selectedIndex2}`;
                    const newReversePairKey = `${newResults.selectedIndex2}-${newResults.selectedIndex1}`;
                    
                    const newAskerData = gameState.playerPairs[newAsker];
                    const newAnswererData = gameState.playerPairs[newAnswerer];
                    
                    const newAskerHasAskedTooMuch = newAskerData.asked.filter(p => p === newAnswerer).length >= 2;
                    const newAnswererHasAnsweredTooMuch = newAnswererData.answered.filter(p => p === newAsker).length >= 2;
                    
                    if (!gameState.usedPairs.includes(newPairKey) && 
                        !gameState.usedPairs.includes(newReversePairKey) &&
                        !newAskerHasAskedTooMuch &&
                        !newAnswererHasAnsweredTooMuch) {
                        foundValidPair = true;
                        results.selectedIndex1 = newResults.selectedIndex1;
                        results.selectedIndex2 = newResults.selectedIndex2;
                    }
                }
                
                attempts++;
            }
            
            if (!foundValidPair) {
                // If we can't find a unique pair after attempts, just use it
                gameState.usedPairs = [];
            }
        }
        
        updatePlayerSelection(results);
        showResult();
    }, 3000);
}

function handleSpinCommand(data) {
    if (gameState.isHost) return;
    
    const wheel1 = gameElements.wheel1.querySelector('.wheel-sections');
    const wheel2 = gameElements.wheel2.querySelector('.wheel-sections');
    
    wheel1.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.21, 0.99)';
    wheel2.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.21, 0.99)';
    
    wheel1.style.transform = `rotate(${data.spin1}deg)`;
    wheel2.style.transform = `rotate(${data.spin2}deg)`;
    
    // Store spin values for result calculation
    gameState.spinValues = {
        spin1: data.spin1,
        spin2: data.spin2
    };
    
    gameState.wheelState.spinning = true;
    gameElements.spinBtn.disabled = true;
}

function calculateWheelResults() {
    const sectionAngle = 360 / gameState.players.length;
    const normalizedSpin1 = gameState.spinValues.spin1 % 360;
    const normalizedSpin2 = gameState.spinValues.spin2 % 360;
    
    // The selected section is the one that's at the top (0 degrees) after spinning
    // Since the wheel spins clockwise, we subtract from 360 to get the correct index
    let selectedIndex1 = Math.floor((360 - normalizedSpin1) / sectionAngle) % gameState.players.length;
    let selectedIndex2 = Math.floor((360 - normalizedSpin2) / sectionAngle) % gameState.players.length;
    
    // Make sure indices are positive
    selectedIndex1 = (selectedIndex1 + gameState.players.length) % gameState.players.length;
    selectedIndex2 = (selectedIndex2 + gameState.players.length) % gameState.players.length;
    
    return {
        selectedIndex1,
        selectedIndex2
    };
}

function handleDuplicateSelection() {
    // Respin just the second wheel with different parameters
    const wheel2 = gameElements.wheel2.querySelector('.wheel-sections');
    const newSpin2 = gameState.spinValues.spin2 + 540 + Math.floor(Math.random() * 360);
    
    wheel2.style.transition = 'transform 2s cubic-bezier(0.25, 0.1, 0.16, 0.99)';
    wheel2.style.transform = `rotate(${newSpin2}deg)`;
    
    // Broadcast to other players if host
    if (gameState.isHost) {
        broadcast({
            type: 'spin',
            spin1: gameState.spinValues.spin1,
            spin2: newSpin2
        });
    }
    
    setTimeout(() => {
        const results = calculateWheelResults();
        updatePlayerSelection(results);
        showResult();
    }, 2000);
}

function updatePlayerSelection(results) {
    const asker = gameState.players[results.selectedIndex1];
    const answerer = gameState.players[results.selectedIndex2];
    
    gameState.currentPlayers.asker = asker;
    gameState.currentPlayers.answerer = answerer;
    
    // Track this pair to avoid repetition
    const pairKey = `${results.selectedIndex1}-${results.selectedIndex2}`;
    gameState.usedPairs.push(pairKey);
    
    // Track player interactions
    gameState.playerPairs[asker].asked.push(answerer);
    gameState.playerPairs[answerer].answered.push(asker);
    
    // Keep only the last 5 pairs to avoid infinite growth
    if (gameState.usedPairs.length > 5) {
        gameState.usedPairs.shift();
    }
    
    // Reset wheel state
    gameState.wheelState.spinning = false;
    gameElements.spinBtn.disabled = false;
    gameState.wheelState.spinCount++;
}

function showResult() {
    // Re-enable spin button
    gameElements.spinBtn.disabled = false;
    
    // Update modal with selected players
    modalElements.resultTitle.innerHTML = `
        <span class="player-name">${gameState.currentPlayers.asker}</span>
        <span class="vs-text">vs</span>
        <span class="player-name">${gameState.currentPlayers.answerer}</span>
    `;
    
    // Show modal
    modalElements.result.classList.add('active');
    
    // Broadcast to other players if host
    if (gameState.isHost) {
        broadcast({
            type: 'result',
            asker: gameState.currentPlayers.asker,
            answerer: gameState.currentPlayers.answerer
        });
    }
}

function handleResultCommand(data) {
    if (gameState.isHost) return;
    
    gameState.currentPlayers.asker = data.asker;
    gameState.currentPlayers.answerer = data.answerer;
    
    modalElements.resultTitle.innerHTML = `
        <span class="player-name">${data.asker}</span>
        <span class="vs-text">vs</span>
        <span class="player-name">${data.answerer}</span>
    `;
    
    modalElements.result.classList.add('active');
}

function showQuestion(type) {
    modalElements.result.classList.remove('active');
    modalElements.questionType.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    
    // Get question based on mode
    let question;
    if (gameState.gameMode === 'custom') {
        const questions = gameState.customQuestions[type];
        question = questions[Math.floor(Math.random() * questions.length)];
    } else {
        const questions = gameState.defaultQuestions[type];
        question = questions[Math.floor(Math.random() * questions.length)];
    }
    
    modalElements.questionText.textContent = question;
    modalElements.question.classList.add('active');
    
    // Track this question
    gameState.previousSelections.push({ type, question });
    if (gameState.previousSelections.length > 10) {
        gameState.previousSelections.shift();
    }
    
    // Broadcast to other players if host
    if (gameState.isHost) {
        broadcast({
            type: 'question',
            questionType: type,
            questionText: question
        });
    }
}

function handleQuestionCommand(data) {
    if (gameState.isHost) return;
    
    modalElements.questionType.textContent = data.questionType.charAt(0).toUpperCase() + data.questionType.slice(1);
    modalElements.questionText.textContent = data.questionText;
    modalElements.question.classList.add('active');
}

function nextRound() {
    closeAllModals();
    
    // Reset wheel positions
    const wheel1 = gameElements.wheel1.querySelector('.wheel-sections');
    const wheel2 = gameElements.wheel2.querySelector('.wheel-sections');
    
    wheel1.style.transition = 'none';
    wheel2.style.transition = 'none';
    
    // Force reflow
    void wheel1.offsetWidth;
    void wheel2.offsetWidth;
    
    wheel1.style.transform = 'rotate(0deg)';
    wheel2.style.transform = 'rotate(0deg)';
    
    // Broadcast to other players if host
    if (gameState.isHost) {
        broadcast({
            type: 'nextRound'
        });
    }
}

function closeAllModals() {
    modalElements.result.classList.remove('active');
    modalElements.question.classList.remove('active');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        document.querySelector('.navbar').style.display = 'none';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            document.querySelector('.navbar').style.display = 'flex';
        }
    }
}

function handleGameStateUpdate(data) {
    gameState.players = data.players;
    gameState.currentPlayers = data.currentPlayers;
    gameState.gameMode = data.gameMode;
    
    if (gameState.currentPage === 'game') {
        setupWheels();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);