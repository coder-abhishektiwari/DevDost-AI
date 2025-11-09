document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('actionBtn');
  const output = document.getElementById('output');

  if (!btn || !output) {
    console.warn('Required elements not found: actionBtn or output');
    return;
  }

  btn.addEventListener('click', () => {
    const now = new Date();
    output.textContent = `Button clicked at ${now.toLocaleTimeString()}`;
  });
});