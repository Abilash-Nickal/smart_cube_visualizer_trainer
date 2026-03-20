// effects.js - Visual effects like ghost overlay and animations

export function updateGhostOverlay(move) {
    const ghost = document.getElementById('large-move');
    ghost.innerText = move;
    ghost.style.opacity = '0.1'; // Increased opacity for better visibility
    ghost.style.transition = 'opacity 0.5s ease-out'; // Smooth fade

    // Fade out after 2 seconds
    setTimeout(() => {
        ghost.style.opacity = '0.03';
    }, 2000);
}

export function addGlowEffect() {
    // Additional glow effects can be added here
    const viewport = document.getElementById('viewport');
    viewport.style.boxShadow = 'inset 0 0 50px rgba(255,255,255,0.1)';
    setTimeout(() => {
        viewport.style.boxShadow = 'none';
    }, 200);
}