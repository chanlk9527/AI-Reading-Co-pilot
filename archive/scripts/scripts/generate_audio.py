import asyncio
import os
import edge_tts

VOICE_NARRATOR = "en-GB-RyanNeural"
VOICE_MRS_BENNET = "en-GB-SoniaNeural"

async def generate_audio(text, voice, output_file):
    print(f"Generating {output_file} with {voice}...")
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)

async def main():
    os.makedirs("audio", exist_ok=True)

    targets = [
        # P1 - Narrator
        {
            "text": "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
            "voice": VOICE_NARRATOR,
            "file": "audio/p1_full.mp3"
        },
        # P2 - Narrator
        {
            "text": "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.",
            "voice": VOICE_NARRATOR,
            "file": "audio/p2_full.mp3"
        },
        # P3 - Dialogue Split
        # 1. Mrs. Bennet
        {
            "text": "My dear Mr. Bennet,",
            "voice": VOICE_MRS_BENNET,
            "file": "audio/p3_part1.mp3"
        },
        # 2. Narrator
        {
            "text": " said his lady to him one day, ",
            "voice": VOICE_NARRATOR,
            "file": "audio/p3_part2.mp3"
        },
        # 3. Mrs. Bennet
        {
            "text": "have you heard that Netherfield Park is let at last?",
            "voice": VOICE_MRS_BENNET,
            "file": "audio/p3_part3.mp3"
        }
    ]

    tasks = []
    for t in targets:
        tasks.append(generate_audio(t["text"], t["voice"], t["file"]))
    
    await asyncio.gather(*tasks)
    print("All audio generated successfully!")

if __name__ == "__main__":
    asyncio.run(main())
