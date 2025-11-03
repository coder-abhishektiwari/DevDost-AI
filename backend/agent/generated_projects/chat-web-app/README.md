# Chat Web App

## Brief Description
A simple real‑time chat web application built with **Node.js**, **Express**, and **Socket.io**. Users can set a nickname, join the chat, and exchange messages instantly.

---

## Tech Stack
- **Node.js** (runtime)
- **Express** (web server)
- **Socket.io** (real‑time communication)
- **HTML / CSS** (frontend UI)
- **JavaScript** (client‑side scripting)

---

## Prerequisites
- **Node.js** version **14** or higher (recommended latest LTS)
- **npm** (comes with Node.js)

---

## Setup Steps
```bash
# Clone the repository
git clone <repository-url>
cd chat-web-app

# Install dependencies
npm install

# Run the development server
npm run dev   # or: node server.js
```
The server will start on **port 3000** (or the port defined in `process.env.PORT`).

---

## How to Use
1. Open your browser and navigate to `http://localhost:3000`.
2. When prompted, enter a nickname and click **Join**.
3. Start sending messages! All connected users will see messages in real time.

---

## Project Structure
```
chat-web-app/
├─ public/                # Front‑end assets
│   ├─ index.html         # Main UI markup
│   └─ style.css          # Basic styling
├─ server.js              # Express server & Socket.io logic
├─ package.json           # Project metadata & scripts
└─ README.md              # Documentation (this file)
```
- **`server.js`** – Sets up the Express app, serves static files, and handles all Socket.io events (user join, message broadcast, disconnect).
- **`public/`** – Contains the static HTML page and CSS used by the client. The client‑side JavaScript (embedded in `index.html`) connects to the Socket.io server and manages UI interactions.

---

## Contribution Guidelines (optional)
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Ensure code follows existing style and passes any linting/tests.
4. Submit a pull request with a clear description of your changes.

---

## License
[Insert License Here] – e.g., MIT, Apache 2.0, etc.
