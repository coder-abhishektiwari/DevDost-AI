# Todo App

A simple Todo application built with HTML, CSS, and JavaScript. This project demonstrates basic CRUD (Create, Read, Update, Delete) operations on a list of tasks stored in the browser's local storage.

---

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Add new tasks
- Mark tasks as completed
- Edit existing tasks
- Delete tasks
- Persist tasks using `localStorage`
- Responsive design for desktop and mobile

---

## Demo

Open `index.html` in your browser to see the app in action.

---

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/todo-app.git
   cd todo-app
   ```

2. **No dependencies required** – the app runs purely on client‑side technologies (HTML, CSS, JavaScript).

3. **Open the app**
   - Double‑click `index.html` or serve the directory with a simple HTTP server (optional but recommended for Chrome security restrictions):
   ```bash
   # Using Python 3
   python -m http.server 8000
   # Then open http://localhost:8000 in your browser
   ```

---

## Usage

1. **Add a task**: Type a task description into the input field at the top and press **Enter** or click the **Add** button.
2. **Mark as completed**: Click the checkbox next to a task. Completed tasks are styled with a strikethrough.
3. **Edit a task**: Click the pencil icon, modify the text, and press **Enter** or click the check‑mark to save.
4. **Delete a task**: Click the trash can icon to remove the task permanently.
5. **Persisted data**: All changes are saved automatically to `localStorage`, so your list remains after refreshing or reopening the browser.

---

## Project Structure

```
.todo-app/
├── index.html          # Main HTML file
├── style.css           # Styling for the app
├── script.js           # JavaScript logic (CRUD, localStorage)
├── README.md           # This documentation
└── assets/             # (optional) images, icons, etc.
```

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository.
2. Create a new branch for your feature or bug‑fix.
3. Commit your changes with clear messages.
4. Open a pull request describing the changes.

---

## License

This project is licensed under the MIT License – see the `LICENSE` file for details.
