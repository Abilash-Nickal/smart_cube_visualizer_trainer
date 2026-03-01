// =====================================================================
// 1. CONFIGURATION AND INITIALIZATION
// =====================================================================
const CUBE_MAC = 'AB:12:34:5C:D5:39'; // **VERIFY THIS MAC ADDRESS**
const WS_URL = `ws://localhost:8001`;

const logElement = document.getElementById('log');

// --- Three.js Globals (Keeping for structure) ---
let scene, camera, renderer, cubeModel;
const CUBE_SIZE = 2; 
let isInitialized = false;

// --- CRITICAL DECRYPTION CONFIGURATION ---
// 1. Change this index to match the byte where the move data appears
//    Start at 3, then try 4, 5, 6, etc.
const MOVE_BYTE_INDEX = 3; // <--- CHANGE THIS: Byte 4 (Hex Index 6)

// 2. Change this string to test different bit-packing arrangements:
//    - 'STANDARD_LOWER_3': Lower Nibble, Bit 3 = Direction (Original Logic)
//    - 'LOWER_BIT_0_DIR': Lower Nibble, Bit 0 = Direction
//    - 'UPPER_NIBBLE': Upper Nibble, Bit 7 = Direction
const PACKING_SCHEME = 'STANDARD_LOWER_3'; // <--- CHANGE THIS for bit logic test
const REVERSE_DIRECTION = false; // Set to true if the direction (prime) is wrong

// Converts a hex string to a decimal value (helper for parsing)
function hexToDec(hex) {
    return parseInt(hex, 16);
}

// =====================================================================
// 2. DECRYPTION LOGIC (GAN GEN2 PROTOCOL)
// =====================================================================

// 2a. Key Derivation from MAC Address 
function deriveKeyFromMac(mac) {
    // This is the known community XOR logic for GAN Gen2 cubes.
    const macBytes = CryptoJS.enc.Hex.parse(mac.replace(/:/g, ''));
    const templateHex = '27546C7E6A9A8C110000000000000000'; 
    let keyWordArray = CryptoJS.enc.Hex.parse(templateHex);

    for (let i = 0; i < 6; i++) {
        const wordIndex = Math.floor(i / 4);
        const byteShift = 24 - (i % 4) * 8; 
        
        let macByte = macBytes.words[wordIndex] >>> byteShift & 0xFF;
        let templateByte = keyWordArray.words[wordIndex] >>> byteShift & 0xFF;
        
        keyWordArray.words[wordIndex] ^= ((macByte ^ templateByte) & 0xFF) << byteShift;
    }
    
    return keyWordArray; 
}

// 2b. Main Decryption and Parsing Function (with Bitwise Extraction)
function decryptGanPacket(mac, encryptedHex) {
    const key = deriveKeyFromMac(mac);
    const encryptedWordArray = CryptoJS.enc.Hex.parse(encryptedHex);

    const decryptedWordArray = CryptoJS.AES.decrypt(
        { ciphertext: encryptedWordArray }, 
        key, 
        { 
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding 
        }
    );

    const decryptedHex = decryptedWordArray.toString(CryptoJS.enc.Hex);
    
    // --- BITWISE EXTRACTION PARSING ---
    
    const startHexIndex = MOVE_BYTE_INDEX * 2; 
    
    // Extract the packed byte value
    const packedMoveByteHex = decryptedHex.substring(startHexIndex, startHexIndex + 2); 
    const packedMoveValue = hexToDec(packedMoveByteHex); 

    let FaceID = 0;
    let DirectionFlag = 0;

    // --- BITWISE EXTRACTION LOGIC SWITCHER ---
    switch (PACKING_SCHEME) {
        case 'STANDARD_LOWER_3': // Lower Nibble, Bit 3 = Direction (Original)
            {
                const packedMoveNibble = packedMoveValue & 0x0F; 
                FaceID = packedMoveNibble & 0b111; // Bits 0-2
                DirectionFlag = (packedMoveNibble >> 3) & 0b1; // Bit 3
            }
            break;

        case 'LOWER_BIT_0_DIR': // Lower Nibble, Bit 0 = Direction
            {
                const packedMoveNibble = packedMoveValue & 0x0F; 
                DirectionFlag = packedMoveNibble & 0b1; // Bit 0
                FaceID = (packedMoveNibble >> 1) & 0b111; // Bits 1-3
            }
            break;

        case 'UPPER_NIBBLE': // Upper Nibble, Bit 7 = Direction
            {
                const packedUpperNibble = (packedMoveValue & 0xF0) >> 4; 
                FaceID = packedUpperNibble & 0b111; // Bits 4-6
                DirectionFlag = (packedUpperNibble >> 3) & 0b1; // Bit 7
            }
            break;

        default:
            console.error("Invalid PACKING_SCHEME configuration.");
            break;
    }
    
    // --- MAP TO NOTATION ---
    const faceMap = { 1: 'R', 2: 'U', 3: 'F', 4: 'L', 5: 'D', 6: 'B' };

    let moveNotation = "Unknown";
    
    if (FaceID >= 1 && FaceID <= 6) { 
        moveNotation = faceMap[FaceID];
        
        // Direction Logic based on REVERSE_DIRECTION config flag
        const isCCW = REVERSE_DIRECTION ? (DirectionFlag === 0) : (DirectionFlag === 1);

        if (isCCW) { 
            moveNotation += "'"; 
        }
    } 
    
    // State data starts after the move byte
    const stateDataHex = decryptedHex.substring(startHexIndex + 2); 

    return { 
        rawDecrypted: decryptedHex, 
        move: moveNotation, 
        faceId: FaceID,
        directionFlag: DirectionFlag,
        stateHex: stateDataHex,
        packingScheme: PACKING_SCHEME,
        byteIndex: MOVE_BYTE_INDEX
    };
}


// =====================================================================
// 3. THREE.JS VISUALIZATION LOGIC (Simplified Placeholders)
// =====================================================================

function initThreeJS() {
    if (isInitialized) return;
    
    // Placeholder to prevent errors, actual 3D rendering removed for focus
    isInitialized = true;
}

function update3DCube(move, stateHex) {
    if (!isInitialized) return;
    
    logElement.innerHTML = `Status: Connected and receiving moves.<br>
                            Last Move: <b>${move}</b><br>
                            Sticker State (Hex): <i>${stateHex.substring(0, 32)}...</i>`;
}


// =====================================================================
// 4. WEBSOCKET CLIENT AND DATA FLOW
// =====================================================================

const ws = new WebSocket(WS_URL);

ws.onopen = () => {
    logElement.textContent = "Status: Connected to WebSocket Bridge. Waiting for cube data...";
    initThreeJS();
};

ws.onmessage = (event) => {
    const encryptedHex = event.data;
    
    try {
        const decryptedPacket = decryptGanPacket(CUBE_MAC, encryptedHex); 
        
        // CRITICAL DEBUG: Check the console for the extracted Face ID and Direction!
        console.log(`--- NEW PACKET --- (Scheme: ${decryptedPacket.packingScheme}, Byte: ${decryptedPacket.byteIndex})`);
        console.log(`[Decrypted] Hex: ${decryptedPacket.rawDecrypted}`);
        console.log(`[Parsed] Move: ${decryptedPacket.move}, Face ID: ${decryptedPacket.faceId}, Direction Flag: ${decryptedPacket.directionFlag}`);
        
        update3DCube(decryptedPacket.move, decryptedPacket.stateHex); 

    } catch (error) {
        logElement.innerHTML = "Status: **DECRYPTION ERROR!** Check console (F12).";
        console.error("Decryption failed for packet:", encryptedHex, error);
    }
};

ws.onclose = () => {
    logElement.textContent = "Status: Disconnected from WebSocket Bridge.";
};

ws.onerror = (error) => {
    logElement.textContent = `Status: WebSocket Error! Is Python script running?`;
    console.error("WebSocket Error:", error);
};