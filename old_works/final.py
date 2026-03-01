import asyncio
import json
from bleak import BleakClient
from websockets.server import serve
try:
    from Crypto.Cipher import AES
except ImportError:
    print("ERROR: Missing pycryptodome. Run: pip install pycryptodome")
    exit(1)

# --- READ REAL MAC ADDRESS ---
try:
    with open('mac_address.txt', 'r') as f:
        CUBE_ADDRESS = f.read().strip().upper()
except FileNotFoundError:
    print("ERROR: mac_address.txt not found.")
    exit(1)

MOVE_CHAR_UUID = "28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4" 
WEBSOCKET_PORT = 8001
CLIENTS = set()

# --- THE MAGIC KEY MATH ---
def get_gan_key(mac):
    mac_clean = mac.replace(':', '').replace('-', '')
    mac_bytes = bytes.fromhex(mac_clean)
    # The true GAN Carry Formula: Reversed MAC + 8C11 suffix
    return mac_bytes[::-1] + bytes.fromhex("8c110000000000000000")

CUBE_KEY = get_gan_key(CUBE_ADDRESS)

async def ble_notification_handler(sender: int, data: bytearray):
    # Decrypt the 20-byte payload using the REAL key
    cipher = AES.new(CUBE_KEY, AES.MODE_ECB)
    decrypted = cipher.decrypt(bytes(data[:16]))
    full_hex = decrypted.hex() + data[16:].hex()
    
    # In GAN protocol, the move is at Byte 3 (Index 4) or Byte 4
    # The web UI will handle the exact bit-shifting now that the hex is clean!
    print(f"[CUBE] Clean Decrypted Payload: {full_hex}")

    if CLIENTS:
        payload = json.dumps({"decrypted": full_hex})
        for client in list(CLIENTS):
            try: await client.send(payload)
            except: CLIENTS.remove(client)

async def websocket_handler(websocket):
    CLIENTS.add(websocket)
    print("[WS] Web UI Connected!")
    try: await websocket.wait_closed()
    finally: CLIENTS.remove(websocket)

async def ble_listener():
    print(f"Connecting to REAL MAC: {CUBE_ADDRESS}")
    print(f"Using AES Key: {CUBE_KEY.hex()}")
    while True:
        try:
            async with BleakClient(CUBE_ADDRESS) as client:
                print("[BLE] ✅ Connected to Cube!")
                await client.start_notify(MOVE_CHAR_UUID, ble_notification_handler)
                while client.is_connected: await asyncio.sleep(1)
        except Exception as e:
            print(f"[BLE] Connection dropped: {e}. Retrying in 3s...")
            await asyncio.sleep(3)

async def main():
    async with serve(websocket_handler, "0.0.0.0", WEBSOCKET_PORT):
        print(f"🚀 Bridge running on ws://localhost:{WEBSOCKET_PORT}")
        await ble_listener()

if __name__ == "__main__":
    asyncio.run(main())