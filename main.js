// main.js - Main application initialization

import { initThreeJS, initCube, loop, onResize, setAutoRotate, centerView, initMouseControls } from './cube.js';
import { initUIHandlers } from './ui.js';
import { connectCube } from './bluetooth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize 3D Cube
    const canvasContainer = document.getElementById('canvas-container');
    initThreeJS(canvasContainer);
    initCube();
    initMouseControls();
    loop();

    // Initialize UI
    initUIHandlers();

    // Load saved MAC address
    document.getElementById('macInput').value = localStorage.getItem('gan_mac_v4') || "";

    // Connect button
    document.getElementById('connectBtn').onclick = connectCube;

    // Auto-view and center buttons
    document.getElementById('autoView').onclick = () => setAutoRotate(!document.getElementById('autoView').classList.contains('active'));
    document.getElementById('centerView').onclick = centerView;

    // Window resize
    window.onresize = onResize;
});