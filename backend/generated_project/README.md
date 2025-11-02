# SimpleCalc

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-%23E34F26.svg?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5)
[![CSS3](https://img.shields.io/badge/CSS3-%231572B6.svg?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-%23F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## Description

**SimpleCalc** is a lightweight, responsive web calculator. It provides a clean user interface that works on both desktop and mobile browsers, allowing users to perform basic arithmetic operations quickly without any backend dependencies.

---

## Features

- Basic arithmetic operations: addition, subtraction, multiplication, division.
- Support for decimal numbers and negative values.
- Clear (C) and All Clear (AC) functionalities.
- Responsive layout that adapts to different screen sizes.
- Keyboard support for numbers, operators, Enter (equals), and Escape (clear).
- Graceful error handling (e.g., division by zero displays an error message).

---

## Tech Stack

- **HTML** – Structure of the calculator (`index.html`).
- **CSS** – Styling and responsive design (`style.css`).
- **JavaScript** – Core calculator logic and UI interactions (`script.js`).

---

## Installation / Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/simplecalc.git
   cd simplecalc
   ```
2. **Open the application**
   - No build step is required. Simply open `index.html` in any modern web browser.
   - You can also serve the folder with a simple HTTP server if preferred:
     ```bash
     npx serve .
     ```

---

## Usage

- **Mouse Interaction**: Click the calculator buttons to input numbers and operations. Press the `=` button to compute the result.
- **Keyboard Shortcuts**:
  - Numbers `0–9` and `.` for decimal points.
  - Operators: `+`, `-`, `*`, `/`.
  - `Enter` → Evaluate (same as `=` button).
  - `Escape` → Clear the current entry (same as `C`).
  - `Backspace` → Delete the last character.
- **Error Handling**:
  - Division by zero or malformed expressions result in a displayed `Error` message.
  - The calculator automatically resets after an error when a new input is entered.

---

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes, ensuring the existing functionality remains intact.
4. Submit a pull request with a clear description of the changes.

Please follow the existing coding style and include comments where appropriate.

---

## License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.
