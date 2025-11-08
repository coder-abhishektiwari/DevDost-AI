js
// DOM element references
const boardElement = document.querySelector('.board');
const turnIndicator = document.querySelector('.turn-indicator');
const resetButton = document.querySelector('.reset-button');

// Game state
let board = Array(9).fill(null); // 0‑8 cells
let currentPlayer = 'X'; // X starts
let gameActive = true;

/**
 * Initialize or reset the game.
 */
function initGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameActive = true;

    // Remove winner styling from all cells
    Array.from(boardElement.children).forEach(cell => {
        cell.classList.remove('winner');
    });

    updateTurnIndicator(`Turn: ${currentPlayer}`);
    renderBoard();
}

/**
 * Render the board based on the current `board` array.
 */
function renderBoard() {
    Array.from(boardElement.children).forEach((cell, index) => {
        cell.textContent = board[index] ? board[index] : '';
    });
}

/**
 * Handle a click on the board.
 * @param {MouseEvent} event
 */
function handleCellClick(event) {
    const cells = Array.from(boardElement.children);
    const index = cells.indexOf(event.target);

    // Click not on a cell or game not active
    if (index === -1 || !gameActive) {
        return;
    }

    // Cell already occupied
    if (board[index]) {
        return;
    }

    // Place the mark
    board[index] = currentPlayer;
    renderBoard();

    // Check for a win
    const winningPattern = checkWin();
    if (winningPattern) {
        gameActive = false;
        updateTurnIndicator(`Player ${currentPlayer} wins!`);
        winningPattern.forEach(i => {
            cells[i].classList.add('winner');
        });
        return;
    }

    // Check for a draw
    if (!board.includes(null)) {
        gameActive = false;
        updateTurnIndicator('Draw!');
        return;
    }

    // Switch player
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurnIndicator(`Turn: ${currentPlayer}`);
}

/**
 * Determine if the current board contains a winning combination.
 * @returns {number[]|null} The winning pattern indices or null if none.
 */
function checkWin() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    for (let i = 0; i < winPatterns.length; i++) {
        const [a, b, c] = winPatterns[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return winPatterns[i];
        }
    }
    return null;
}

/**
 * Update the turn indicator text.
 * @param {string} message
 */
function updateTurnIndicator(message) {
    turnIndicator.textContent = message;
}

// Event listeners
boardElement.addEventListener('click', handleCellClick);
resetButton.addEventListener('click', initGame);

// Start the first game
initGame();