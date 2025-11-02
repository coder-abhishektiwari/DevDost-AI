// Calculator logic implementation
// State management
const calculatorState = {
  currentInput: "",
  previousValue: null,
  operator: null,
  overwrite: false,
};

// DOM references
const display = document.getElementById("display");
const buttons = document.querySelectorAll(".calc-button");

// Initialize event listeners
function init() {
  buttons.forEach((button) => {
    button.addEventListener("click", handleButtonClick);
  });
  document.addEventListener("keydown", handleKeyPress);
  updateDisplay();
}

// Button click handler
function handleButtonClick(e) {
  const button = e.target;
  const type = button.dataset.type;
  const value = button.dataset.value;

  if (!type) return; // safety

  switch (type) {
    case "digit":
      appendNumber(value);
      break;
    case "operator":
      chooseOperator(value);
      break;
    case "action":
      if (value === "C") {
        clear();
      } else if (value === "←") {
        backspace();
      } else if (value === "=") {
        compute();
      }
      break;
    default:
      break;
  }
}

// Keyboard handler
function handleKeyPress(e) {
  const key = e.key;

  // Numbers and decimal point
  if (/^[0-9]$/.test(key)) {
    appendNumber(key);
    return;
  }
  if (key === ".") {
    appendNumber(key);
    return;
  }

  // Operators
  if (["+", "-", "*", "/"].includes(key)) {
    chooseOperator(key);
    return;
  }

  // Compute (Enter or =)
  if (key === "Enter" || key === "=") {
    compute();
    return;
  }

  // Clear (Escape)
  if (key === "Escape") {
    clear();
    return;
  }

  // Backspace
  if (key === "Backspace") {
    backspace();
    return;
  }
}

// Append a digit or decimal point
function appendNumber(num) {
  if (calculatorState.overwrite) {
    calculatorState.currentInput = "";
    calculatorState.overwrite = false;
  }

  // Prevent multiple leading zeros (except when decimal follows)
  if (num === "0" && calculatorState.currentInput === "0") return;

  // Prevent multiple decimals
  if (num === "." && calculatorState.currentInput.includes(".")) return;

  // If starting a new number with a decimal, prepend a leading zero
  if (num === "." && calculatorState.currentInput === "") {
    calculatorState.currentInput = "0";
  }

  calculatorState.currentInput += num;
  updateDisplay();
}

// Choose an operator (+, -, *, /)
function chooseOperator(op) {
  // If a previous operator exists and we are not overwriting, compute first
  if (calculatorState.operator && !calculatorState.overwrite) {
    compute();
  }

  const inputNumber = parseFloat(calculatorState.currentInput);
  calculatorState.previousValue = isNaN(inputNumber) ? 0 : inputNumber;
  calculatorState.operator = op;
  calculatorState.overwrite = true; // next digit starts a new number
  updateDisplay();
}

// Perform the calculation
function compute() {
  if (calculatorState.operator === null || calculatorState.previousValue === null) {
    // Nothing to compute
    return;
  }

  const current = parseFloat(calculatorState.currentInput);
  const prev = calculatorState.previousValue;
  const op = calculatorState.operator;

  if (isNaN(current)) {
    // If user pressed = without a second operand, treat current as previous
    calculatorState.currentInput = calculatorState.previousValue.toString();
    updateDisplay();
    return;
  }

  let result;
  switch (op) {
    case "+":
      result = prev + current;
      break;
    case "-":
      result = prev - current;
      break;
    case "*":
      result = prev * current;
      break;
    case "/":
      if (current === 0) {
        handleError("Cannot divide by zero");
        return;
      }
      result = prev / current;
      break;
    default:
      return;
  }

  // Round to avoid floating‑point artefacts
  result = Number.isFinite(result) ? parseFloat(result.toFixed(12)) : result;

  calculatorState.currentInput = result.toString();
  calculatorState.previousValue = null;
  calculatorState.operator = null;
  calculatorState.overwrite = true;
  updateDisplay();
}

// Clear the calculator state
function clear() {
  calculatorState.currentInput = "";
  calculatorState.previousValue = null;
  calculatorState.operator = null;
  calculatorState.overwrite = false;
  updateDisplay();
}

// Remove the last character from the current input
function backspace() {
  if (calculatorState.overwrite) {
    // In overwrite mode, clear the current entry
    calculatorState.currentInput = "";
    calculatorState.overwrite = false;
    updateDisplay();
    return;
  }

  if (calculatorState.currentInput.length > 0) {
    calculatorState.currentInput = calculatorState.currentInput.slice(0, -1);
    updateDisplay();
  }
}

// Update the calculator display
function updateDisplay() {
  const valueToShow =
    calculatorState.currentInput ||
    (calculatorState.previousValue !== null ? calculatorState.previousValue : "0");
  display.textContent = valueToShow;
}

// Show an error message temporarily
function handleError(msg) {
  display.textContent = msg;
  setTimeout(() => {
    clear();
  }, 2000);
}

// Kick off the app
init();
