import asyncio
from bleak import BleakClient

async def main():
    try:
        with open('mac_address.txt', 'r') as f:
            mac = f.read().strip()
    except FileNotFoundError:
        print("ERROR: mac_address.txt not found.")
        return

    print(f"Connecting to {mac} to read internal Bluetooth structure...")
    
    try:
        async with BleakClient(mac) as client:
            print("✅ Connected! Here is the internal structure:\n")
            for service in client.services:
                print(f"📁 SERVICE: {service.uuid}")
                for char in service.characteristics:
                    print(f"   └── 📄 CHAR: {char.uuid}")
                    if "28be4cb6" in char.uuid.lower():
                        print("       ⭐⭐ THIS IS OUR MOVE DATA! We need the Service above this! ⭐⭐")
                    
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    asyncio.run(main())