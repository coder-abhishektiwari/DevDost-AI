// script.js
// This script updates the #hello-message div with 'Hello, World!' when the page loads.

window.addEventListener('load', () => {
  const messageDiv = document.getElementById('hello-message');
  if (messageDiv) {
    messageDiv.textContent = 'Hello, World!';
  }
});
