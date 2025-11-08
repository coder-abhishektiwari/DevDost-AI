// script.js
// This script adds an event listener to the window object that logs a message when the page loads.

// Function to initialize event listeners
function initPageLoadListener() {
  // Add load event listener to the window
  window.addEventListener('load', function () {
    // Log a message indicating the page has loaded
    console.log('Page has loaded successfully.');
  });
}

// Immediately invoke the initialization function
initPageLoadListener();
