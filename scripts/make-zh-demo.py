"""生成中文示例音频与逐词时间戳，结构对齐原版 public/demo/*.json"""
import asyncio, json, pathlib, sys
import edge_tts

ZH_VOICE = "zh-CN-XiaoxiaoNeural"
EN_VOICE = "en-US-AvaMultilingualNeural"
OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "demo"

CLIPS = [
    ("original", "我需要一点时间，但这句话我想用自己的话说。", ZH_VOICE, "chinese"),
    ("revised",  "我自己来回答。给我一点时间，我会告诉你我需要什么。", ZH_VOICE, "chinese"),
    ("original-en", "I need a little more time, but I want to answer this in my own words.", EN_VOICE, "english"),
    ("revised-en",  "I want to answer for myself. Give me a moment, and I will tell you what I need.", EN_VOICE, "english"),
]

async def build(name: str, text: str, voice: str, language: str):
    media = OUT / f"{name}.mp3"
    words = []
    first_audio = None
    communicate = edge_tts.Communicate(text, voice, boundary="WordBoundary")
    with open(media, "wb") as fh:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                if first_audio is None:
                    first_audio = chunk.get("offset", 0) / 10000.0
                fh.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start_ms = chunk["offset"] / 10000.0
                dur_ms = chunk["duration"] / 10000.0
                words.append({
                    "word": chunk["text"],
                    "start": round(start_ms),
                    "end": round(start_ms + dur_ms),
                    "confidence": 1.0,
                })
    duration = max((w["end"] for w in words), default=0)
    payload = {
        "text": text,
        "language": language,
        "voice": voice,
        "sampleRate": 24000,
        "firstAudioMs": round(first_audio or 0),
        "audioBytes": media.stat().st_size,
        "durationMs": duration,
        "wordTimingReceived": bool(words),
        "frames": [
            {"type": "FlushDone", "flush_id": 0, "audio_duration_ms": duration},
            {"type": "WordBoundaries", "flush_id": 0, "audio_start_ms": 0, "words": words},
        ],
    }
    (OUT / f"{name}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{name}: {len(words)} words, {duration} ms, {media.stat().st_size} bytes")
    for w in words[:6]:
        print("   ", w["word"], w["start"], "-", w["end"])

async def main():
    for name, text, voice, language in CLIPS:
        await build(name, text, voice, language)

asyncio.run(main())
