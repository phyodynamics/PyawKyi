import { NextRequest, NextResponse } from "next/server";

// Validate a Gemini API key by trying to list models
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || !apiKey.trim().startsWith("AIza")) {
      return NextResponse.json(
        { valid: false, error: "Invalid key format" },
        { status: 400 },
      );
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
      { signal: AbortSignal.timeout(10000) },
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
