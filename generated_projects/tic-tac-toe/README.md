# Tic Tac Toe

A classic two‑player Tic Tac Toe game built with plain HTML, CSS, and JavaScript. Play locally in any modern web browser.

## Tech Stack
- **HTML** – Structure of the game board and UI.
- **CSS** – Styling and responsive layout.
- **JavaScript** – Game logic, turn handling, win/draw detection, and UI updates.

## Features
- Two‑player local gameplay (no AI).
- Turn indicator showing the current player.
- Automatic win detection with highlight of the winning line.
- Draw detection when all squares are filled without a winner.
- Reset button to start a new game at any time.
- Responsive design that works on desktop and mobile browsers.

## Setup & Run
The project is static. To play:

1. Clone or download the repository.
2. Open `index.html` directly in a web browser **or** serve the folder with any static HTTP server (e.g., `python -m http.server`).

No additional build steps or dependencies are required.

## File Structure

| File          | Purpose                                            |
|---------------|----------------------------------------------------|
| `index.html`  | Markup for the game board and UI controls.        |
| `style.css`   | Styling for layout, colors, and responsive design.|
| `script.js`   | Game logic, event handling, and UI updates.       |
| `README.md`   | Project documentation (this file).                |

## How to Play
1. Players take turns clicking an empty square.
2. The first player to align three of their marks horizontally, vertically, or diagonally wins.
3. If all squares are filled without a winning line, the game ends in a draw.
4. Click **Reset** to start a new match.

## License
This project is licensed under the **[INSERT LICENSE HERE]**.