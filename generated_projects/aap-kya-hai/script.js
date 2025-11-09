```javascript
'use strict';

function revealAnswer() {
    const description = document.getElementById('description');
    if (!description) return;
    description.textContent = 'Aap ek insaan hain, jo web development seekh raha hai!';

    const btn = document.getElementById('revealBtn');
    if (btn) {
        btn.textContent = 'Answered';
        btn.disabled = true;
    }
}

document.getElementById('revealBtn').addEventListener('click', revealAnswer);
```