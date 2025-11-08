```javascript
// Get elements from the DOM
const body = document.body;
const heading = document.createElement('h1');
const paragraph = document.createElement('p');
const button = document.createElement('button');

// Set initial content
heading.textContent = 'Simple App Creator';
paragraph.textContent = 'This is a simple application.';
button.textContent = 'Click me!';

// Add elements to the DOM
body.appendChild(heading);
body.appendChild(paragraph);
body.appendChild(button);

// Add event listener to the button
button.addEventListener('click', () => {
  // Change the button text when clicked
  button.textContent = 'Clicked!';
  // Change the paragraph text when button is clicked
  paragraph.textContent = 'Button was clicked!';
});
```