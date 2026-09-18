/**
 * ChainCapsule - UI Interactivity & Web3 Placeholder Script (Tahap 2)
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("ChainCapsule UI loaded successfully.");

    const messageInput = document.getElementById('messageInput');
    const charCounter = document.getElementById('charCounter');
    const submitBtn = document.getElementById('submitCapsuleBtn');

    // Listener karakter counter untuk textarea
    if (messageInput && charCounter) {
        messageInput.addEventListener('input', (e) => {
            const length = e.target.value.length;
            charCounter.textContent = length;

            // Efek visual jika mendekati batas 500 karakter
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
