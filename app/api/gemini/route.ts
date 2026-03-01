import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ═══════════════════════════════════════════════════
// SECURITY: Rate limiting per user (20 req/min)
// ═══════════════════════════════════════════════════
const rateLimits = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimits.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimits.entries()) {
      if (now - entry.windowStart > RATE_WINDOW_MS * 2) {
        rateLimits.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

// ═══════════════════════════════════════════════════
// Error response helper
// ═══════════════════════════════════════════════════
function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message, status }, { status });
}

// ═══════════════════════════════════════════════════
// Gemini API proxy functions
// The user's API key NEVER leaves the server.
// Client → Next.js API Route (proxy) → Gemini API
// ═══════════════════════════════════════════════════
async function callGeminiAPI(
  systemPrompt: string,
  userContent: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userContent}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callGeminiWithAudio(
  systemPrompt: string,
  audioBase64: string,
  mimeType: string,
  model: string,
  apiKey: string,
  imageBase64?: string,
  imageMimeType?: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: Array<
    { text: string } | { inline_data: { mime_type: string; data: string } }
  > = [{ text: systemPrompt }];

  if (audioBase64) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: audioBase64,
      },
    });
  }

  // Add image if provided (for craft mode)
  if (imageBase64 && imageMimeType) {
    parts.push({
      inline_data: {
        mime_type: imageMimeType,
        data: imageBase64,
      },
    });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ═══════════════════════════════════════════════════
// Error parsing
// ═══════════════════════════════════════════════════
function parseApiError(
  statusCode: number,
  errorText: string,
): { message: string; isRetryable: boolean } {
  try {
    const parsed = JSON.parse(errorText);
    const message = parsed.error?.message || parsed.message || errorText;

    if (
      statusCode === 429 ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate limit")
    ) {
      return {
        message: "Too many requests. Please wait a moment and try again.",
        isRetryable: true,
      };
    }

    if (
      statusCode === 403 ||
      message.toLowerCase().includes("permission denied")
    ) {
      return {
        message:
          "API access denied. Your API key may be invalid. Please check it in Settings.",
        isRetryable: false,
      };
    }

    if (statusCode >= 500) {
      return {
        message: "Server is temporarily unavailable. Please try again.",
        isRetryable: true,
      };
    }

    return { message: message.slice(0, 200), isRetryable: statusCode >= 500 };
  } catch {
    return {
      message: "API request failed. Please try again.",
      isRetryable: true,
    };
  }
}

// ═══════════════════════════════════════════════════
// MAIN HANDLER — Authenticated users only
// ═══════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // ─── 1. AUTHENTICATE: Verify user is logged in ───
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Not needed in API routes
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse("Unauthorized. Please sign in.", 401);
    }

    // ─── 2. RATE LIMIT: 20 requests per minute per user ───
    if (!checkRateLimit(user.id)) {
      return errorResponse(
        "Rate limit exceeded. Please wait a moment before trying again.",
        429,
      );
    }

    // ─── 3. FETCH USER'S API KEY from Supabase ───
    const { data: profile } = await supabase
      .from("users")
      .select("gemini_api_key, payment_status")
      .eq("id", user.id)
      .single();

    // Verify payment status
    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    if (!isAdmin && profile?.payment_status !== "paid") {
      return errorResponse("Access denied. Payment required.", 403);
    }

    // Verify API key exists
    const userApiKey = profile?.gemini_api_key;
    if (!userApiKey) {
      return errorResponse(
        "No Gemini API key found. Please set up your API key in Settings.",
        403,
      );
    }

    // ─── 4. VALIDATE REQUEST BODY ───
    // Check content length
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return errorResponse("Request too large. Maximum 10MB.", 413);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request format.", 400);
    }

    const {
      systemPrompt,
      userContent,
      audioBase64,
      mimeType,
      isAudio,
      imageBase64,
      imageMimeType,
    } = body;

    // Validate required fields
    if (!systemPrompt || typeof systemPrompt !== "string") {
      return errorResponse("Missing or invalid system prompt.", 400);
    }

    if (systemPrompt.length > 10000) {
      return errorResponse("System prompt too long.", 400);
    }

    if (isAudio && !audioBase64) {
      return errorResponse("Missing audio data.", 400);
    }

    if (!isAudio && !userContent && !imageBase64) {
      return errorResponse("Missing content.", 400);
    }

    if (
      userContent &&
      typeof userContent === "string" &&
      userContent.length > 50000
    ) {
      return errorResponse("Content too long.", 400);
    }

    // ─── 5. PROXY REQUEST TO GEMINI API ───
    // User's API key stays on the server — never sent to the browser
    const primaryModel = "gemini-3-flash-preview";
    const fallbackModel = "gemini-2.5-flash";

    let result: string | null = null;
    let lastError: { message: string; isRetryable: boolean } | null = null;

    for (const model of [primaryModel, fallbackModel]) {
      try {
        if (isAudio && audioBase64) {
          result = await callGeminiWithAudio(
            systemPrompt,
            audioBase64,
            mimeType || "audio/webm",
            model,
            userApiKey,
            imageBase64,
            imageMimeType,
          );
        } else {
          result = await callGeminiAPI(
            systemPrompt,
            userContent,
            model,
            userApiKey,
          );
        }
        if (result && result.trim().length > 0) break;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const statusMatch = errorMessage.match(/(\d{3})/);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 500;
        lastError = parseApiError(statusCode, errorMessage);
        if (!lastError.isRetryable) break;
      }
    }

    if (!result || result.trim().length === 0) {
      const errorMessage =
        lastError?.message ||
        "Failed to process your request. Please try again.";
      return errorResponse(errorMessage, 500);
    }

    // ─── 6. CLEAN AND RETURN RESPONSE ───
    let cleanResult = result.trim();

    // Remove markdown code blocks if present
    const codeBlockPatterns = [
      /^```json\s*/i,
      /^```jsx?\s*/i,
      /^```tsx?\s*/i,
      /^```\s*/,
    ];

    for (const pattern of codeBlockPatterns) {
      if (pattern.test(cleanResult)) {
        cleanResult = cleanResult.replace(pattern, "");
        break;
      }
    }

    if (cleanResult.endsWith("```")) {
      cleanResult = cleanResult.slice(0, -3);
    }
    cleanResult = cleanResult.trim();

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(cleanResult);
      return NextResponse.json({ result: parsed });
    } catch {
      // For HTML code responses, try to extract html_code directly
      const htmlCodeMatch = cleanResult.match(
        /"html_code"\s*:\s*"((?:[^"\\]|\\.)*)"/,
      );
      if (htmlCodeMatch) {
        try {
          const htmlCode = JSON.parse('"' + htmlCodeMatch[1] + '"');
          return NextResponse.json({ result: { html_code: htmlCode } });
        } catch {
          // Try unescaping manually
          const rawHtml = htmlCodeMatch[1]
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
          return NextResponse.json({ result: { html_code: rawHtml } });
        }
      }

      // For fixed_code responses (build fix pass)
      const fixedCodeMatch = cleanResult.match(
        /"fixed_code"\s*:\s*"((?:[^"\\]|\\.)*)"/,
      );
      if (fixedCodeMatch) {
        try {
          const fixedCode = JSON.parse('"' + fixedCodeMatch[1] + '"');
          return NextResponse.json({ result: { fixed_code: fixedCode } });
        } catch {
          const rawFixed = fixedCodeMatch[1]
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
          return NextResponse.json({ result: { fixed_code: rawFixed } });
        }
      }

      // Generic JSON object extraction fallback
      const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ result: extracted });
        } catch {
          // Fall through to raw result
        }
      }
      return NextResponse.json({ result: { raw: cleanResult } });
    }
  } catch (error) {
    console.error("Gemini API proxy error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return errorResponse(message.slice(0, 200), 500);
  }
}

// Health check
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
