'use strict';

function performCoreAction() {
  const outputDiv = document.getElementById('output');
  if (!outputDiv) {
    return;
  }
  const timestamp = new Date().toLocaleTimeString();
  outputDiv.innerHTML = `Action performed at ${timestamp}`;
  return timestamp;
}

document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('actionBtn');
  if (actionBtn) {
    actionBtn.addEventListener('click', performCoreAction);
  }
});

window.performCoreAction = performCoreAction;