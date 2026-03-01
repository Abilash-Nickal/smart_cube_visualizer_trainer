// cube.js - Cube 3D rendering and animation

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export const COLORS = { U:0xffffff, D:0xffd500, L:0xff5800, R:0xc41e3a, F:0x009e60, B:0x0051ba, CORE:0x050505 };
export const FACES = ['U','D','L','R','F','B'];

export let cubePieces = [];
export let isAnimating = false, autoRotate = false;
export let moveQueue = [];

export let scene, camera, renderer, container;

export function initThreeJS(canvasContainer) {
    container = canvasContainer;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1));
    camera.position.set(7, 6, 11);
    camera.lookAt(0,0,0);
}

export function initCube() {
    cubePieces.forEach(p => scene.remove(p));
    cubePieces = [];
    for(let x=-1; x<=1; x++) {
        for(let y=-1; y<=1; y++) {
            for(let z=-1; z<=1; z++) {
                if(x===0 && y===0 && z===0) continue;
                const group = new THREE.Group();
                const core = new THREE.Mesh(new THREE.BoxGeometry(0.96,0.96,0.96), new THREE.MeshLambertMaterial({color: COLORS.CORE}));
                group.add(core);
                const stickerG = new THREE.BoxGeometry(0.84, 0.84, 0.02);
                const sConf = [
                    {p:[0,0,0.485], r:[0,0,0], c:z===1?COLORS.F:null},
                    {p:[0,0,-0.485], r:[0,Math.PI,0], c:z===-1?COLORS.B:null},
                    {p:[0,0.485,0], r:[-Math.PI/2,0,0], c:y===1?COLORS.U:null},
                    {p:[0,-0.485,0], r:[Math.PI/2,0,0], c:y===-1?COLORS.D:null},
                    {p:[0.485,0,0], r:[0,Math.PI/2,0], c:x===1?COLORS.R:null},
                    {p:[-0.485,0,0], r:[0,-Math.PI/2,0], c:x===-1?COLORS.L:null}
                ];
                sConf.forEach(s => {
                    if(s.c) {
                        const st = new THREE.Mesh(stickerG, new THREE.MeshLambertMaterial({color: s.c}));
                        st.position.set(...s.p); st.rotation.set(...s.r);
                        group.add(st);
                    }
                });
                group.position.set(x,y,z);
                group.userData.home = new THREE.Vector3(x,y,z);
                scene.add(group);
                cubePieces.push(group);
            }
        }
    }
}

export function animateMove(moveStr, duration = 150) {
    if (isAnimating) { moveQueue.push({moveStr, duration}); return; }
    isAnimating = true;
    const face = moveStr[0], isPrime = moveStr.includes("'"), isDouble = moveStr.includes("2");
    let axis, val, dir = 1;
    switch(face) {
        case 'U': axis='y'; val=1;  dir=-1; break;
        case 'D': axis='y'; val=-1; dir=1;  break;
        case 'L': axis='x'; val=-1; dir=1;  break;
        case 'R': axis='x'; val=1;  dir=-1; break;
        case 'F': axis='z'; val=1;  dir=-1; break;
        case 'B': axis='z'; val=-1; dir=1;  break;
    }
    const group = new THREE.Group();
    scene.add(group);
    const targets = cubePieces.filter(p => Math.round(p.position[axis]) === val);
    targets.forEach(p => group.attach(p));
    let angle = (Math.PI/2) * dir;
    if(isPrime) angle *= -1; if(isDouble) angle = Math.PI;

    // Add glow light
    const glowLight = new THREE.PointLight(0xffffff, 3, 15); // Increased intensity and range
    glowLight.position.set(0, 0, 0);
    scene.add(glowLight);

    const start = performance.now();
    function step() {
        const now = performance.now();
        const progress = Math.min((now - start) / duration, 1);
        group.rotation[axis] = angle * (1 - Math.pow(1 - progress, 4));
        if(progress < 1) requestAnimationFrame(step);
        else {
            group.updateMatrixWorld();
            targets.forEach(p => {
                scene.attach(p);
                p.position.set(Math.round(p.position.x), Math.round(p.position.y), Math.round(p.position.z));
                p.rotation.set(Math.round(p.rotation.x/(Math.PI/2))*(Math.PI/2), Math.round(p.rotation.y/(Math.PI/2))*(Math.PI/2), Math.round(p.rotation.z/(Math.PI/2))*(Math.PI/2));
            });
            scene.remove(group);
            scene.remove(glowLight); // Remove glow
            isAnimating = false;
            if(moveQueue.length > 0) { const n = moveQueue.shift(); animateMove(n.moveStr, n.duration); }
        }
    }
    step();
}

export function checkSolved() {
    let solved = true;
    for(let p of cubePieces) {
        if(!p.position.equals(p.userData.home)) { solved = false; break; }
        if(Math.abs(p.rotation.x % (Math.PI*2)) > 0.1 || Math.abs(p.rotation.y % (Math.PI*2)) > 0.1 || Math.abs(p.rotation.z % (Math.PI*2)) > 0.1) { solved = false; break; }
    }
    return solved;
}

export function loop() {
    requestAnimationFrame(loop);
    if(autoRotate) {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.01, 0)); // Faster auto rotate
        camera.position.applyQuaternion(q); camera.lookAt(0,0,0);
    }
    renderer.render(scene, camera);
}

export function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

export function setAutoRotate(enabled) {
    autoRotate = enabled;
}

export function centerView() {
    camera.position.set(7,6,11); camera.lookAt(0,0,0);
}

// Mouse controls
let isDragging = false, lastM = {x:0, y:0};
export function initMouseControls() {
    container.onmousedown = (e) => { isDragging = true; lastM = {x:e.clientX, y:e.clientY}; };
    window.onmouseup = () => isDragging = false;
    window.onmousemove = (e) => {
        if(!isDragging) return;
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((e.clientY-lastM.y)*0.005, (e.clientX-lastM.x)*0.005, 0, 'XYZ'));
        camera.position.applyQuaternion(q); camera.lookAt(0,0,0);
        lastM = {x:e.clientX, y:e.clientY};
    };
}