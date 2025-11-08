// script.js
// This script demonstrates dynamic DOM manipulation and event handling.
// It selects elements, updates content, and responds to user interactions.

// Wait for the DOM to be fully loaded before running any code.
window.addEventListener('DOMContentLoaded', () => {
  // Select elements by ID or class.
  const heading = document.getElementById('main-heading');
  const button = document.getElementById('action-button');
  const output = document.getElementById('output');

  // If any of the elements are missing, log an error and exit.
  if (!heading || !button || !output) {
    console.error('Required elements are missing from the DOM.');
    return;
  }

  // Update the heading text when the page loads.
  heading.textContent = 'Welcome to Ka-Code!';

  // Add a click event listener to the button.
  button.addEventListener('click', () => {
    // Generate a random number and display it.
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    output.textContent = `You clicked the button! Random number: ${randomNumber}`;

    // Change the background color of the output element.
    const colors = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    output.style.backgroundColor = randomColor;

    // Log the action to the console.
    console.log(`Button clicked. Random number: ${randomNumber}`);
  });

  // Add a keyup event listener to the document to update the heading in real-time.
  document.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      heading.textContent = 'You pressed Enter!';
      console.log('Enter key pressed');
    }
  });
});
