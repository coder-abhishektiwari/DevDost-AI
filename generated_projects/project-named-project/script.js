document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('content');
  if (!container) return;

  const paragraph = document.createElement('p');
  paragraph.textContent = 'Welcome to Project Named Project! This is the core functionality placeholder.';
  paragraph.style.color = '#333';
  paragraph.style.cursor = 'pointer';
  paragraph.dataset.state = 'dark';

  paragraph.addEventListener('click', () => {
    if (paragraph.dataset.state === 'dark') {
      paragraph.style.color = '#007BFF';
      paragraph.dataset.state = 'light';
    } else {
      paragraph.style.color = '#333';
      paragraph.dataset.state = 'dark';
    }
  });

  container.appendChild(paragraph);
});