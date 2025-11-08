/**
 * script.js
 * ----------
 * Module: Button Greeting Handler
 * Description:
 *   This script attaches a click handler to the button with ID "actionBtn".
 *   When clicked, it selects a random greeting from a predefined list and
 *   displays it in the paragraph element with ID "output".
 *   No external dependencies are required; the script runs in the browser's
 *   global scope.
 */

'use strict';

(function () {
  // Obtain references to DOM elements
  const actionBtn = document.getElementById('actionBtn');
  const output = document.getElementById('output');

  // Verify that required elements exist
  if (!actionBtn) {
    console.error('Element with ID "actionBtn" not found.');
    return;
  }
  if (!output) {
    console.error('Element with ID "output" not found.');
    return;
  }

  // List of possible greetings
  const greetings = [
    'Hello!',
    'Namaste!',
    'Hi there!',
    'Yo!',
    'Hey!'
  ];

  /**
   * Handles button click events.
   * Selects a random greeting and updates the output paragraph.
   */
  function handleButtonClick() {
    const randomIndex = Math.floor(Math.random() * greetings.length);
    const selectedGreeting = greetings[randomIndex];
    output.textContent = selectedGreeting;
  }

  // Attach the click event listener
  actionBtn.addEventListener('click', handleButtonClick);
})();