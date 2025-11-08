// script.js
// Production-ready client-side scripting for the HTML application.
// This script handles form submissions, button clicks, and DOM manipulation.
// It assumes the following elements exist in index.html:
//   - A form with id "myForm"
//   - An input field with name "name" inside the form
//   - An input field with name "email" inside the form
//   - A div with id "output" to display submitted data
//   - A button with id "toggleBtn" to toggle visibility of the output div
//   - A button with id "clearBtn" to clear the form and output
//   - An unordered list with id "itemList" to dynamically add items

'use strict';

/**
 * Initializes event listeners after the DOM is fully loaded.
 */
function init() {
    const form = document.getElementById('myForm');
    const toggleBtn = document.getElementById('toggleBtn');
    const clearBtn = document.getElementById('clearBtn');
    const addItemBtn = document.getElementById('addItemBtn');

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleOutputVisibility);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFormAndOutput);
    }
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addItemToList);
    }
}

/**
 * Handles form submission, prevents default behavior, and displays data.
 * @param {Event} event
 */
function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const name = formData.get('name') || '';
    const email = formData.get('email') || '';

    const outputDiv = document.getElementById('output');
    if (!outputDiv) return;

    // Create a paragraph element to display the submitted data
    const p = document.createElement('p');
    p.textContent = `Name: ${name}, Email: ${email}`;
    outputDiv.appendChild(p);
}

/**
 * Toggles the visibility of the output div.
 */
function toggleOutputVisibility() {
    const outputDiv = document.getElementById('output');
    if (!outputDiv) return;
    const isHidden = outputDiv.style.display === 'none';
    outputDiv.style.display = isHidden ? 'block' : 'none';
}

/**
 * Clears the form inputs and removes all child nodes from the output div.
 */
function clearFormAndOutput() {
    const form = document.getElementById('myForm');
    const outputDiv = document.getElementById('output');
    if (form) form.reset();
    if (outputDiv) {
        while (outputDiv.firstChild) {
            outputDiv.removeChild(outputDiv.firstChild);
        }
    }
}

/**
 * Adds a new item to the list based on user input.
 * Assumes there is an input with id "newItemInput".
 */
function addItemToList() {
    const input = document.getElementById('newItemInput');
    const list = document.getElementById('itemList');
    if (!input || !list) return;
    const value = input.value.trim();
    if (!value) return;

    const li = document.createElement('li');
    li.textContent = value;
    list.appendChild(li);
    input.value = '';
}

// Attach init to DOMContentLoaded to ensure elements are available.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
