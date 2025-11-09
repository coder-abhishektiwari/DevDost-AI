document.getElementById('myButton').addEventListener('click', function() {
    const output = document.getElementById('output');
    output.textContent = '🎉 Button clicked! You can edit this behavior in script.js';
    
    // Add some animation
    output.style.animation = 'fadeIn 0.5s';
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

console.log('🚀 Project loaded successfully!');