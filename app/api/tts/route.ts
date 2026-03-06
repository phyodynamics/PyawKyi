import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Burmese voice (Myanmar)
const BURMESE_VOICE = "my-MM-NilarNeural";
// English fallback
const ENGLISH_VOICE = "en-US-AriaNeural";

function detectLanguage(text: string): "my" | "en" {
  // Check for Burmese Unicode range (U+1000–U+109F)
  const burmeseChars = text.match(/[\u1000-\u109F]/g);
  if (burmeseChars && burmeseChars.length > text.length * 0.1) {
    return "my";
  }
  return "en";
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Text too long. Maximum 5000 characters." },
        { status: 400 },
      );
    }

    const lang = detectLanguage(text);
    const voiceName = lang === "my" ? BURMESE_VOICE : ENGLISH_VOICE;

    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voiceName,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
    );

    const { audioStream } = tts.toStream(text);

    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      audioStream.on("end", () => resolve());
      audioStream.on("error", (err: Error) => reject(err));
    });

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[TTS API] Error:", error);
    const message =
      error instanceof Error ? error.message : "TTS generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
