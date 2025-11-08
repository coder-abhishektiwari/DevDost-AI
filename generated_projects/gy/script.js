```javascript
// Import required modules
import { listProjectFilesTool } from './utils.js';

// Function to handle page load
function onPageLoad() {
  // Get the current page
  const currentPage = window.location.pathname.split('/').pop();

  // Add event listeners for navigation
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('href').split('/').pop();
      handlePageChange(page);
    });
  });

  // Handle initial page load
  handlePageChange(currentPage);
}

// Function to handle page change
function handlePageChange(page) {
  // Update the page content
  const pageContent = document.getElementById('page-content');
  pageContent.innerHTML = '';

  // Load the page content based on the current page
  switch (page) {
    case 'home.html':
      pageContent.innerHTML = `
        <h1>Welcome to our website!</h1>
        <p>This is the home page.</p>
      `;
      break;
    case 'about.html':
      pageContent.innerHTML = `
        <h1>About Us</h1>
        <p>This is the about page.</p>
      `;
      break;
    case 'contact.html':
      pageContent.innerHTML = `
        <h1>Contact Us</h1>
        <p>This is the contact page.</p>
        <form id="contact-form">
          <input type="text" id="name" placeholder="Name">
          <input type="email" id="email" placeholder="Email">
          <textarea id="message" placeholder="Message"></textarea>
          <button type="submit">Send</button>
        </form>
      `;
      const contactForm = document.getElementById('contact-form');
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        // Handle form submission
        console.log(`Form submitted: ${name}, ${email}, ${message}`);
      });
      break;
    default:
      pageContent.innerHTML = `
        <h1>Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
      `;
  }
}

// Add event listener for page load
window.addEventListener('load', onPageLoad);
```