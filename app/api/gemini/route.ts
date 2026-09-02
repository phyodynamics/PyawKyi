import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { composeSystemPrompt, resolveGeminiModel } from "@/lib/ai-preferences";

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
  isCodeRefine: boolean = false,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userContent }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: isCodeRefine ? 65536 : 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(
      `[Gemini API] Text call failed (${model}):`,
      response.status,
      error,
    );
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Check for blocked responses
  if (data.candidates?.[0]?.finishReason === "SAFETY") {
    console.error(`[Gemini API] Response blocked by safety filter (${model})`);
    throw new Error(
      "Response was blocked by safety filters. Please rephrase your request.",
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error(
      `[Gemini API] Empty response from model (${model}):`,
      JSON.stringify(data).slice(0, 500),
    );
    throw new Error(
      "No content generated. The model returned an empty response.",
    );
  }

  return text;
}

async function callGeminiWithAudio(
  systemPrompt: string,
  audioBase64: string,
  mimeType: string,
  model: string,
  apiKey: string,
  imageBase64?: string,
  imageMimeType?: string,
  maxTokens?: number,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // User content parts: audio + optional image
  const userParts: Array<
    { text: string } | { inline_data: { mime_type: string; data: string } }
  > = [];

  if (audioBase64) {
    userParts.push({
      inline_data: {
        mime_type: mimeType,
        data: audioBase64,
      },
    });
  }

  // Add image if provided (for craft mode)
  if (imageBase64 && imageMimeType) {
    userParts.push({
      inline_data: {
        mime_type: imageMimeType,
        data: imageBase64,
      },
    });
  }

  // Add a text prompt so the model knows what to do with the audio
  userParts.push({
    text: "Process the audio input according to your instructions.",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: maxTokens || 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(
      `[Gemini API] Audio call failed (${model}):`,
      response.status,
      error,
    );
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Check for blocked responses
  if (data.candidates?.[0]?.finishReason === "SAFETY") {
    console.error(`[Gemini API] Response blocked by safety filter (${model})`);
    throw new Error(
      "Response was blocked by safety filters. Please rephrase your request.",
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error(
      `[Gemini API] Empty response from model (${model}):`,
      JSON.stringify(data).slice(0, 500),
    );
    throw new Error(
      "No content generated. The model returned an empty response.",
    );
  }

  return text;
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
      .select("gemini_api_key, payment_status, custom_prompt, gemini_model")
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
      isCodeRefine,
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

    const maxContentLength = isCodeRefine ? 200000 : 50000;
    if (
      userContent &&
      typeof userContent === "string" &&
      userContent.length > maxContentLength
    ) {
      return errorResponse("Content too long.", 400);
    }

    // ─── 5. PROXY REQUEST TO GEMINI API ───
    // User's API key stays on the server — never sent to the browser
    const selectedModel = resolveGeminiModel(profile?.gemini_model);
    const effectiveSystemPrompt = composeSystemPrompt(
      systemPrompt,
      profile?.custom_prompt,
    );

    let result: string | null = null;
    let lastError: { message: string; isRetryable: boolean } | null = null;

    try {
      console.log(
        `[Gemini API] Trying saved model: ${selectedModel}, isAudio: ${isAudio}`,
      );
      if (isAudio && audioBase64) {
        // Build mode needs more output tokens for a complete HTML document.
        const isBuildMode =
          systemPrompt.includes("Frontend Engineer") ||
          systemPrompt.includes("HTML5 mini-application");
        result = await callGeminiWithAudio(
          effectiveSystemPrompt,
          audioBase64,
          mimeType || "audio/webm",
          selectedModel,
          userApiKey,
          imageBase64,
          imageMimeType,
          isBuildMode ? 65536 : undefined,
        );
      } else {
        result = await callGeminiAPI(
          effectiveSystemPrompt,
          userContent,
          selectedModel,
          userApiKey,
          !!isCodeRefine,
        );
      }
      console.log(
        `[Gemini API] Success with saved model: ${selectedModel}, response length: ${result.length}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[Gemini API] Saved model ${selectedModel} failed:`,
        errorMessage.slice(0, 300),
      );
      const statusMatch = errorMessage.match(/(\d{3})/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 500;
      lastError = parseApiError(statusCode, errorMessage);
    }

    if (!result || result.trim().length === 0) {
      const errorMessage =
        lastError?.message ||
        "Failed to process your request. Please try again.";
      console.error(
        `[Gemini API] All models failed. Last error:`,
        errorMessage,
      );
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
      // Ensure html_code/fixed_code have real newlines
      if (parsed.html_code && typeof parsed.html_code === "string") {
        parsed.html_code = parsed.html_code
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"');
      }
      if (parsed.fixed_code && typeof parsed.fixed_code === "string") {
        parsed.fixed_code = parsed.fixed_code
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"');
      }
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

      // If it looks like raw HTML (truncated JSON), try to extract it
      if (cleanResult.includes("<!DOCTYPE") || cleanResult.includes("<html")) {
        // Extract HTML from the raw string
        const htmlStart = cleanResult.indexOf("<!DOCTYPE");
        const htmlStartAlt = cleanResult.indexOf("<html");
        const start = htmlStart >= 0 ? htmlStart : htmlStartAlt;
        if (start >= 0) {
          let htmlCode = cleanResult.slice(start);
          // Clean trailing JSON artifacts
          htmlCode = htmlCode.replace(/["'}\]\s]*$/, "");
          htmlCode = htmlCode
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
          return NextResponse.json({ result: { html_code: htmlCode } });
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
