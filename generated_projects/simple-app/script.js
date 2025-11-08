// script.js
// Client-side logic for simple-app
// This script imports configuration from config.json and provides
// authentication, data display, and navigation utilities.

// Fetch configuration once and cache it
const configPromise = fetch('config.json')
  .then((response) => {
    if (!response.ok) {
      throw new Error('Failed to load config.json');
    }
    return response.json();
  })
  .catch((err) => {
    console.error(err);
    return {}; // fallback to empty config
  });

/**
 * Authenticate a user against the backend API.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<boolean>} Resolves to true if authentication succeeds.
 */
async function authenticateUser(username, password) {
  const config = await configPromise;
  const endpoint = config.authEndpoint || '/api/auth';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('Authentication failed:', error);
      return false;
    }

    const data = await response.json();
    // Store token in localStorage for subsequent requests
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    return true;
  } catch (err) {
    console.error('Error during authentication:', err);
    return false;
  }
}

/**
 * Display data fetched from the backend API into the DOM.
 * @param {string} containerId - ID of the element where data will be rendered.
 * @returns {Promise<void>}
 */
async function displayData(containerId) {
  const config = await configPromise;
  const endpoint = config.dataEndpoint || '/api/data';
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('Failed to fetch data:', error);
      return;
    }

    const data = await response.json();
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container with id ${containerId} not found`);
      return;
    }

    // Simple rendering: create a list of items
    container.innerHTML = '';
    const ul = document.createElement('ul');
    data.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = JSON.stringify(item);
      ul.appendChild(li);
    });
    container.appendChild(ul);
  } catch (err) {
    console.error('Error fetching data:', err);
  }
}

/**
 * Navigate to a different page or update the view.
 * @param {string} url - The target URL or hash.
 */
function navigateTo(url) {
  // Simple navigation: change window location
  window.location.href = url;
}

// Example usage: wiring up UI elements
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = loginForm.elements['username'].value;
      const password = loginForm.elements['password'].value;
      const success = await authenticateUser(username, password);
      if (success) {
        alert('Login successful!');
        navigateTo('#dashboard');
      } else {
        alert('Login failed.');
      }
    });
  }

  const loadDataBtn = document.getElementById('load-data');
  if (loadDataBtn) {
    loadDataBtn.addEventListener('click', () => {
      displayData('data-container');
    });
  }

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('href');
      navigateTo(target);
    });
  });
});

// Export functions for potential external use (e.g., tests)
export { authenticateUser, displayData, navigateTo };
