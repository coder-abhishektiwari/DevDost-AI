```javascript
'use strict';

(() => {
  // Module‑scope element references
  const greetingEl = document.getElementById('greeting');
  const inputEl = document.getElementById('greeting-input');
  const changeBtn = document.getElementById('change-greeting-btn');
  const themeBtn = document.getElementById('theme-toggle-btn');
  const htmlEl = document.documentElement; // <html> element for theme class toggle

  /**
   * Updates the greeting text with the value from the input field.
   * Clears the input after a successful update.
   */
  function updateGreeting() {
    if (!greetingEl || !inputEl) return;
    const newGreeting = inputEl.value.trim();
    if (newGreeting) {
      greetingEl.textContent = newGreeting;
      inputEl.value = '';
    }
  }

  /**
   * Toggles between dark and light themes.
   * Updates the button label to indicate the next action.
   */
  function toggleTheme() {
    if (!themeBtn || !htmlEl) return;
    const isDark = htmlEl.classList.toggle('theme-dark');
    themeBtn.textContent = isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme';
  }

  // Set initial button text based on default (light) theme
  if (themeBtn) themeBtn.textContent = 'Switch to Dark Theme';

  // Attach event listeners if elements exist
  if (changeBtn) changeBtn.addEventListener('click', updateGreeting);
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  if (inputEl) {
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') updateGreeting();
    });
  }
})();
```