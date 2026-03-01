import asyncio
from bleak import BleakClient
from websockets.server import serve
import os

# --- CUBE/BLE CONSTANTS ---
# Read MAC from file
try:
    with open('mac_address.txt', 'r') as f:
        CUBE_ADDRESS = f.read().strip()
except FileNotFoundError:
    print("ERROR: mac_address.txt not found. Please create it and add your cube's MAC address.")
    exit(1)

# UUID confirmed from your nRF Connect log
MOVE_CHAR_UUID = "28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4" 
WEBSOCKET_PORT = 8001

# Global set to track active WebSocket connections
CLIENTS = set()

async def ble_notification_handler(sender: int, data: bytearray):
    """Called when the cube sends a new move/state packet."""
    raw_hex_data = data.hex()
    
    # 1. Print the raw data to console for confirmation
    print(f"[BLE] Cube Sent Encrypted Data: {raw_hex_data}")

    # 2. Forward the raw data to all connected web clients via WebSocket
    if CLIENTS:
        # Send the raw hex string. It will be decrypted on the JavaScript side.
        await asyncio.gather(*[
            client.send(raw_hex_data) for client in CLIENTS
        ], return_exceptions=True)

async def websocket_handler(websocket):
    """Handles a new web client connecting via WebSocket."""
    CLIENTS.add(websocket)
    print(f"[WS] New client connected. Total clients: {len(CLIENTS)}")
    
    try:
        await websocket.wait_closed()
    finally:
        CLIENTS.remove(websocket)
        print(f"[WS] Client disconnected. Total clients: {len(CLIENTS)}")

async def ble_listener():
    """Manages the Bluetooth connection to the cube."""
    print(f"[BLE] Attempting to connect to cube: {CUBE_ADDRESS}")
    while True:
        try:
            async with BleakClient(CUBE_ADDRESS) as client:
                print("[BLE] Connected! Subscribing to notifications...")
                
                # Start listening for moves
                await client.start_notify(MOVE_CHAR_UUID, ble_notification_handler)
                
                # Keep the connection alive
                while client.is_connected:
                    await asyncio.sleep(1)

        except Exception as e:
            # Handle common errors like device not found or connection loss
            print(f"[BLE] Error: {e}. Retrying connection in 5 seconds...")
            await asyncio.sleep(5)

async def main():
    # Run the WebSocket server and the BLE listener concurrently
    ble_task = asyncio.create_task(ble_listener())
    websocket_server = await serve(websocket_handler, "0.0.0.0", WEBSOCKET_PORT)
    print(f"--- WebSocket Server running on ws://localhost:{WEBSOCKET_PORT} ---")
    
    await asyncio.gather(ble_task, websocket_server.serve_forever())

if __name__ == "__main__":
    asyncio.run(main())