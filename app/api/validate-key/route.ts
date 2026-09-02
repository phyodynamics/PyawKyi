import { NextRequest, NextResponse } from "next/server";

// Validate a Gemini API key by trying to list models
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    const normalizedKey = typeof apiKey === "string" ? apiKey.trim() : "";

    // Google can change key prefixes (for example, AQ. authorization keys).
    // Treat the API response as authoritative instead of hard-coding a prefix.
    if (
      !normalizedKey ||
      normalizedKey.length > 4096 ||
      /\s/.test(normalizedKey)
    ) {
      return NextResponse.json(
        { valid: false, error: "Invalid key format" },
        { status: 400 },
      );
    }

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: { "x-goog-api-key": normalizedKey },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (res.ok) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json(
      { valid: false, error: "API key is not valid" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { valid: false, error: "Could not validate key" },
      { status: 500 },
    );
  }
}
