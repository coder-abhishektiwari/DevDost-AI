document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('actionBtn');
  if (!btn) {
    console.warn('Element with id "actionBtn" not found.');
    return;
  }

  btn.addEventListener('click', () => {
    console.log('Button clicked!');
    document.body.classList.toggle('active');
  });
});