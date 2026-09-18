/**
 * ChainCapsule - UI Interactivity & Web3 Script Placeholder
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("ChainCapsule UI loaded successfully.");

    const messageInput = document.getElementById('messageInput');
    const charCounter = document.getElementById('charCounter');

    // Real-time character counter listener
    if (messageInput && charCounter) {
        messageInput.addEventListener('input', (e) => {
            const length = e.target.value.length;
            charCounter.textContent = length;

            // Visual feedback as user approaches 500 characters limit
            if (length >= 480) {
                charCounter.style.color = 'var(--rose-accent)';
            } else if (length >= 400) {
                charCounter.style.color = 'var(--cyan-glow)';
            } else {
                charCounter.style.color = 'var(--text-secondary)';
            }
        });
    }
});
