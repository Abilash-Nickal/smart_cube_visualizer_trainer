// ui.js - UI interactions and state management

import { FACES } from './cube.js';

export let currentMode = 'comp'; // default to competition logic
export let timerState = 'idle'; // 'idle' | 'scrambling' | 'inspection' | 'running' | 'finished'
export let startTime = 0;
export let timerInterval = null;
export let inspectionInterval = null;
export let inspectionCountdown = 15;

// Scramble Tracking Arrays
export let targetScramble = [];
export let scrambleIndex = 0;
export let wrongMoves = [];

export function generateValidScramble() {
    const mods = ['', "'", '2'];
    let sc = [];
    let lastFace = -1;
    for(let i=0; i<20; i++) {
        let f;
        do { f = Math.floor(Math.random() * 6); } while (f === lastFace);
        lastFace = f;
        sc.push(FACES[f] + mods[Math.floor(Math.random() * 3)]);
    }
    return sc;
}

export function reverseMove(m) {
    if (m.endsWith("2")) return m; // Double moves reverse themselves
    if (m.endsWith("'")) return m[0]; // U' reverses to U
    return m + "'"; // U reverses to U'
}

export function getMoveArrow(move) {
    const face = move[0];
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");
    let arrow = '';
    if (isDouble) arrow = '↔';
    else if (isPrime) arrow = '←';
    else arrow = '→';
    return face + ' ' + arrow;
}

export function renderScrambleState() {
    const display = document.getElementById('scramble-display');
    if (timerState !== 'scrambling') {
        if (timerState === 'running') display.innerHTML = "";
        return;
    }

    let html = '';
    // Show next expected move with arrow
    if (scrambleIndex < targetScramble.length) {
        const nextMove = targetScramble[scrambleIndex];
        const arrow = getMoveArrow(nextMove);
        html += `<span style="color: var(--warning); font-size: 28px; font-weight: 900;">${arrow}</span>`;
    }

    // Mistake tracking UI
    if (wrongMoves.length > 0) {
        let fixMove = reverseMove(wrongMoves[wrongMoves.length - 1]);
        const fixArrow = getMoveArrow(fixMove);
        html += `<div style="margin-top: 10px; color: var(--danger); font-size: 16px; font-weight: 900;">
                    WRONG! FIX: ${fixArrow}
                 </div>`;
    }
    display.innerHTML = html;
}

export function startInspection() {
    timerState = 'inspection';
    inspectionCountdown = 15;
    document.getElementById('instruction').innerText = "INSPECTION (MAKE A TURN TO START TIMER)";
    document.getElementById('scramble-display').innerHTML = "Scramble Complete. 15 Seconds Inspection.";
    document.getElementById('main-timer').innerText = "15";
    document.getElementById('main-timer').style.color = "var(--danger)";

    inspectionInterval = setInterval(() => {
        inspectionCountdown--;
        if (inspectionCountdown > 0) {
            document.getElementById('main-timer').innerText = inspectionCountdown.toString();
        } else {
            clearInterval(inspectionInterval);
            startSolvingTimer(); // Force start if inspection expires
        }
    }, 1000);
}

export function formatTime(ms) {
    const m = Math.floor(ms/60000);
    const s = Math.floor((ms%60000)/1000);
    const c = Math.floor((ms%1000)/10);
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${c.toString().padStart(2,'0')}`;
}

export function startSolvingTimer() {
    if (inspectionInterval) clearInterval(inspectionInterval);
    timerState = 'running';
    startTime = performance.now();
    document.getElementById('main-timer').style.color = "white";
    document.getElementById('instruction').innerText = "SOLVING... (PRESS SPACEBAR TO STOP)";
    document.getElementById('scramble-display').innerHTML = "";

    timerInterval = setInterval(() => {
        document.getElementById('main-timer').innerText = formatTime(performance.now() - startTime);
    }, 10);
}

export function stopTimer() {
    if (timerState !== 'running') return;
    clearInterval(timerInterval);
    timerState = 'finished';
    document.getElementById('instruction').innerText = "SOLVE COMPLETE! HIT RESET.";
    document.getElementById('main-timer').style.color = "var(--success)";
}

export function clearHistory() {
    const history = document.getElementById('history');
    history.innerHTML = '';
}

export function addMoveToHistory(move) {
    const pill = document.createElement('div');
    pill.className = 'move-pill';
    pill.innerText = move;
    const h = document.getElementById('history');
    h.appendChild(pill);
    h.scrollLeft = h.scrollWidth;
}

export function initUIHandlers() {
    document.getElementById('genScramble').onclick = () => {
        import('./cube.js').then(cube => {
            cube.initCube();
        });
        targetScramble = generateValidScramble();
        scrambleIndex = 0;
        wrongMoves = [];
        timerState = 'scrambling';
        document.getElementById('main-timer').innerText = "00:00.00";
        document.getElementById('main-timer').style.color = "white";
        document.getElementById('instruction').innerText = "PERFORM SCRAMBLE MOVES ON CUBE";
        renderScrambleState();
    };

    document.getElementById('resetCube').onclick = () => {
        import('./cube.js').then(cube => {
            cube.initCube();
        });
        clearInterval(timerInterval);
        clearInterval(inspectionInterval);
        timerState = 'idle';
        document.getElementById('main-timer').innerText = "00:00.00";
        document.getElementById('main-timer').style.color = "white";
        document.getElementById('instruction').innerText = "CUBE RESET";
        document.getElementById('scramble-display').innerHTML = "CLICK 'GENERATE' TO START";
    };

    document.getElementById('clearHistory').onclick = clearHistory;

    // Standard WCA Stop trigger (Spacebar)
    window.onkeydown = (e) => {
        if(e.code === 'Space') {
            e.preventDefault();
            if(timerState === 'running') {
                stopTimer();
            }
        }
    };
}