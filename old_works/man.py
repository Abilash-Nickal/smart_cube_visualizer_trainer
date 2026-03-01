import asyncio
from bleak import BleakClient
try:
    from Crypto.Cipher import AES
except ImportError:
    print("ERROR: Missing pycryptodome. Run: pip install pycryptodome")
    exit(1)

# The 7 consecutive U-turns from your log
TEST_PACKETS = [
    bytes.fromhex("fba8aebdd46fed796ea582906548402596321c80"),
    bytes.fromhex("e623dda25fc9b9a39b3a74f46b519e2cf436977d"),
    bytes.fromhex("464020676a44c01c0b9840d41aff28f337a41325")
]

async def main():
    try:
        with open('mac_address.txt', 'r') as f:
            mac = f.read().strip()
    except FileNotFoundError:
        print("ERROR: mac_address.txt not found.")
        return

    print(f"Connecting to {mac} to hunt for internal AES Keys...")
    
    try:
        async with BleakClient(mac) as client:
            print("✅ Connected! Scanning all internal characteristics...\n")
            
            for service in client.services:
                for char in service.characteristics:
                    if "read" in char.properties:
                        try:
                            val = await client.read_gatt_char(char.uuid)
                            
                            # If the characteristic contains exactly 16 bytes, it's a prime suspect for an AES Key
                            if len(val) == 16:
                                print("=" * 60)
                                print(f"🎯 SUSPECT FOUND! 16-Byte Characteristic: {char.uuid}")
                                print(f"   Value (Hex): {val.hex()}")
                                
                                # Test it as a key
                                print("\n   --- Decryption Test ---")
                                cipher = AES.new(val, AES.MODE_ECB)
                                for i, pkt in enumerate(TEST_PACKETS):
                                    dec = cipher.decrypt(pkt[:16])
                                    print(f"   Packet {i+1}: {dec.hex()}")
                                print("=" * 60 + "\n")
                                
                        except Exception as e:
                            # Some characteristics require authentication to read, we ignore those
                            pass
            
            print("🏁 Done hunting through all characteristics.")
            print("If any of the decrypted test packets show a repeating pattern, we found it!")

    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    asyncio.run(main())