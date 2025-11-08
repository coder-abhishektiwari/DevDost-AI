// script.js
// Simple calculator logic
(() => {
  'use strict';

  const display = document.getElementById('display');
  const buttons = document.querySelectorAll('.btn');

  let currentInput = '';
  let previousValue = null;
  let operator = null;
  let resetNext = false;

  /**
   * Update the calculator display with the provided value.
   * @param {string|number} value - The value to show on the display.
   */
  function updateDisplay(value) {
    display.textContent = value;
  }

  /**
   * Handle errors by showing a message and resetting the calculator state.
   * @param {string} message - Error message to display.
   */
  function handleError(message) {
    updateDisplay(message);
    // Reset state after error
    currentInput = '';
    previousValue = null;
    operator = null;
    resetNext = false;
  }

  /**
   * Perform a calculation based on two operands and an operator.
   * @param {string|number} a - First operand.
   * @param {string|number} b - Second operand.
   * @param {string} op - Operator ('+', '-', '*', '/').
   */
  function calculate(a, b, op) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (isNaN(numA) || isNaN(numB)) {
      handleError('Invalid input');
      return;
    }
    let result;
    switch (op) {
      case '+':
        result = numA + numB;
        break;
      case '-':
        result = numA - numB;
        break;
      case '*':
        result = numA * numB;
        break;
      case '/':
        if (numB === 0) {
          handleError('Division by zero');
          return;
        }
        result = numA / numB;
        break;
      default:
        handleError('Unknown operator');
        return;
    }
    updateDisplay(result);
    // Prepare for next calculation
    previousValue = result;
    operator = null;
    resetNext = true;
  }

  /**
   * Handle button click events for numbers, operators, equals, clear, and decimal.
   * @param {Event} e - Click event.
   */
  function onButtonClick(e) {
    const target = e.target;
    if (!target.matches('.btn')) return;

    const value = target.dataset.value;
    const op = target.dataset.op;
    const isEqual = target.dataset.equals !== undefined;
    const isClear = target.dataset.clear !== undefined;
    const isDecimal = target.dataset.decimal !== undefined;

    if (isClear) {
      currentInput = '';
      previousValue = null;
      operator = null;
      updateDisplay('0');
      return;
    }

    if (isDecimal) {
      if (!currentInput.includes('.')) {
        currentInput += currentInput ? '.' : '0.';
      }
      updateDisplay(currentInput);
      return;
    }

    if (op) {
      if (currentInput === '' && previousValue !== null) {
        operator = op;
        return;
      }
      if (previousValue !== null && operator && currentInput !== '') {
        calculate(previousValue, currentInput, operator);
      } else {
        previousValue = currentInput;
        updateDisplay(previousValue);
      }
      operator = op;
      resetNext = true;
      return;
    }

    if (isEqual) {
      if (operator && currentInput !== '') {
        calculate(previousValue, currentInput, operator);
      }
      return;
    }

    // Number button
    if (resetNext) {
      currentInput = value;
      resetNext = false;
    } else {
      currentInput += value;
    }
    updateDisplay(currentInput);
  }

  document.addEventListener('click', onButtonClick);
})();