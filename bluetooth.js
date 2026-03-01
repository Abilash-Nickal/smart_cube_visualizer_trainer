// bluetooth.js - Bluetooth cube connection and move handling

import { BTCube } from 'https://esm.sh/gan-i3-356-bluetooth@latest';
import { animateMove } from './cube.js';
import { timerState, scrambleIndex, targetScramble, wrongMoves, renderScrambleState, startInspection, startSolvingTimer, addMoveToHistory } from './ui.js';
import { updateGhostOverlay } from './effects.js';

export let myCube = null;

export async function connectCube() {
    if(myCube) return location.reload();
    try {
        document.getElementById('status').innerText = "CONNECTING...";
        myCube = new BTCube();
        await myCube.init(document.getElementById('macInput').value.trim());
        localStorage.setItem('gan_mac_v4', document.getElementById('macInput').value);
        document.getElementById('status').innerText = "CONNECTED";
        document.getElementById('connectBtn').innerText = "UNLINK";
        document.getElementById('instruction').innerText = "LINK ESTABLISHED. CLICK GENERATE.";

        myCube.on('move', data => {
            const move = data.move;
            updateGhostOverlay(move);
            animateMove(move); // Sync 3D Cube
            addMoveToHistory(move);

            // STATE MACHINE LOGIC
            if (timerState === 'scrambling') {
                if (wrongMoves.length > 0) {
                    // Must undo the last wrong move
                    const expectedUndo = reverseMove(wrongMoves[wrongMoves.length - 1]);
                    if (move === expectedUndo) {
                        wrongMoves.pop(); // Fixed!
                    } else {
                        wrongMoves.push(move); // Messed up further
                    }
                } else {
                    // Clean slate, waiting for next correct move
                    if (move === targetScramble[scrambleIndex]) {
                        scrambleIndex++;
                        if (scrambleIndex >= targetScramble.length) {
                            startInspection();
                        }
                    } else {
                        wrongMoves.push(move); // Made a mistake
                    }
                }
                renderScrambleState();
            }
            else if (timerState === 'inspection') {
                // Turning the cube during inspection starts the timer
                startSolvingTimer();
            }
        });

        // Auto-fetch battery
        const internal = myCube.getCube();
        if(internal?.getBatteryLevel) {
            const [lvl] = await internal.getBatteryLevel();
            document.getElementById('battery').innerText = `${lvl}%`;
        }
    } catch(e) {
        document.getElementById('status').innerText = "FAILED";
    }
}

function reverseMove(m) {
    if (m.endsWith("2")) return m; // Double moves reverse themselves
    if (m.endsWith("'")) return m[0]; // U' reverses to U
    return m + "'"; // U reverses to U'
}