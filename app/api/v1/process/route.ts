import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SYSTEM_PROMPTS, BUILD_FIX_PROMPT } from "@/lib/prompts";
import type { Mode } from "@/lib/types";
import { composeSystemPrompt, resolveGeminiModel } from "@/lib/ai-preferences";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════
// PUBLIC API: Authenticate via PyawKyi API key (pk_live_xxx)
// Used by Apple Shortcuts, developer integrations, etc.
//
// POST /api/v1/process
// Headers: Authorization: Bearer pk_live_xxxxx
// Body: { mode: "polish"|"plan"|"craft"|"build"|"learn", text: "..." }
// ═══════════════════════════════════════════════════

// Rate limiting per API key (30 req/min)
const rateLimits = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(apiKey);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimits.set(apiKey, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Cleanup stale entries
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimits.entries()) {
      if (now - entry.windowStart > RATE_WINDOW_MS * 2) rateLimits.delete(key);
    }
  },
  5 * 60 * 1000,
);

function errorResponse(message: string, status: number = 500) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
}

function jsonResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Service client to bypass RLS for key lookups
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// System prompts per mode are imported at the top of the file from lib/prompts.ts

// Gemini proxy
async function callGemini(
  systemPrompt: string,
  userContent: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
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
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(
      `[V1 API] Text call failed (${model}):`,
      response.status,
      error,
    );
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error(
      `[V1 API] Empty response from model (${model}):`,
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
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const userParts: Array<
    { text: string } | { inline_data: { mime_type: string; data: string } }
  > = [];

  if (audioBase64) {
    userParts.push({ inline_data: { mime_type: mimeType, data: audioBase64 } });
  }

  if (imageBase64 && imageMimeType) {
    userParts.push({
      inline_data: { mime_type: imageMimeType, data: imageBase64 },
    });
  }

  userParts.push({
    text: "Process the audio input according to your instructions.",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ role: "user", parts: userParts }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(
      `[V1 API] Audio call failed (${model}):`,
      response.status,
      error,
    );
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error(
      `[V1 API] Empty response from model (${model}):`,
      JSON.stringify(data).slice(0, 500),
    );
    throw new Error(
      "No content generated. The model returned an empty response.",
    );
  }
  return text;
}

function cleanResponse(raw: string): string {
  let clean = raw.trim();
  const patterns = [/^```json\s*/i, /^```jsx?\s*/i, /^```tsx?\s*/i, /^```\s*/];
  for (const pattern of patterns) {
    if (pattern.test(clean)) {
      clean = clean.replace(pattern, "");
      break;
    }
  }
  if (clean.endsWith("```")) clean = clean.slice(0, -3);
  return clean.trim();
}

export async function POST(request: NextRequest) {
  // ─── 1. AUTHENTICATE via PyawKyi API key ───
  // Support both: Authorization header OR `apiKey` field in body
  const authHeader = request.headers.get("authorization");
  let bodyRaw;
  try {
    bodyRaw = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  let pyawkyiKey = "";

  // Option 1: Authorization header
  if (authHeader && authHeader.startsWith("Bearer ")) {
    pyawkyiKey = authHeader.replace("Bearer ", "").trim();
  }

  // Option 2: apiKey in body (easier for iOS Shortcuts)
  if (!pyawkyiKey && bodyRaw.apiKey) {
    pyawkyiKey = bodyRaw.apiKey.trim();
  }

  if (!pyawkyiKey) {
    return errorResponse(
      'Missing API key. Send via Authorization header (Bearer pk_live_xxx) or "apiKey" field in body.',
      401,
    );
  }

  if (!pyawkyiKey.startsWith("pk_live_")) {
    return errorResponse(
      "Invalid API key format. Must start with pk_live_",
      401,
    );
  }

  // ─── 2. LOOK UP the key in database ───
  const service = getServiceClient();
  const { data: keyRecord } = await service
    .from("api_keys")
    .select("id, user_id, is_active, request_count")
    .eq("key", pyawkyiKey)
    .single();

  if (!keyRecord || !keyRecord.is_active) {
    return errorResponse("Invalid or deactivated API key.", 401);
  }

  // ─── 3. RATE LIMIT ───
  if (!checkRateLimit(pyawkyiKey)) {
    return errorResponse(
      "Rate limit exceeded. Max 30 requests per minute.",
      429,
    );
  }

  // ─── 4. FETCH user's Gemini key ───
  const { data: userProfile } = await service
    .from("users")
    .select("gemini_api_key, payment_status, custom_prompt, gemini_model")
    .eq("id", keyRecord.user_id)
    .single();

  if (!userProfile || userProfile.payment_status !== "paid") {
    return errorResponse("Account is not active. Payment required.", 403);
  }

  if (!userProfile.gemini_api_key) {
    return errorResponse(
      "No Gemini API key configured. Set up your key in the PyawKyi dashboard.",
      403,
    );
  }

  // ─── 5. PARSE & VALIDATE body ───
  const body = bodyRaw;

  const { mode, text, audioBase64, mimeType, imageBase64, imageMimeType } =
    body;

  if (!mode || !["polish", "plan", "craft", "build", "learn"].includes(mode)) {
    return errorResponse(
      'Invalid "mode". Must be: polish, plan, craft, build, or learn',
      400,
    );
  }

  if (!text && !audioBase64 && !imageBase64) {
    return errorResponse(
      'Missing "text", "audioBase64", or "imageBase64".',
      400,
    );
  }

  if (text && text.length > 50000) {
    return errorResponse("Text too long. Max 50,000 characters.", 400);
  }

  // ─── 6. PROCESS via Gemini ───
  const selectedModel = resolveGeminiModel(userProfile.gemini_model);
  const systemPrompt = composeSystemPrompt(
    SYSTEM_PROMPTS[mode as Mode],
    userProfile.custom_prompt,
  );

  let result: string | null = null;
  let lastError: string | null = null;

  try {
    if (audioBase64 || imageBase64) {
      result = await callGeminiWithAudio(
        systemPrompt,
        audioBase64 || "", // Fallback empty string if just sending an image
        mimeType || "audio/webm",
        selectedModel,
        userProfile.gemini_api_key,
        imageBase64,
        imageMimeType,
      );
    } else {
      result = await callGemini(
        systemPrompt,
        text,
        selectedModel,
        userProfile.gemini_api_key,
      );
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Unknown error";
  }

  if (!result || result.trim().length === 0) {
    return errorResponse(lastError || "Failed to process. Try again.", 500);
  }

  // ─── 7. UPDATE usage stats (fire-and-forget) ───
  service
    .from("api_keys")
    .update({
      request_count: ((keyRecord.request_count as number) || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", keyRecord.id)
    .then(() => {});

  // ─── 8. HANDLE build mode (double pass) ───
  if (mode === "build") {
    const cleaned = cleanResponse(result);
    try {
      const parsed = JSON.parse(cleaned);
      const generatedCode = parsed.html_code;
      if (generatedCode) {
        try {
          const fixResult = await callGemini(
            composeSystemPrompt(BUILD_FIX_PROMPT, userProfile.custom_prompt),
            `original_request: "${text || "[Audio input]"}"\n\ngenerated_code: "${generatedCode.replace(/"/g, '\\"')}"`,
            selectedModel,
            userProfile.gemini_api_key,
          );
          const fixCleaned = cleanResponse(fixResult);
          const fixParsed = JSON.parse(fixCleaned);
          return jsonResponse({
            result: {
              html_code: generatedCode,
              fixed_code: fixParsed.fixed_code || generatedCode,
            },
          });
        } catch {
          return jsonResponse({
            result: { html_code: generatedCode, fixed_code: generatedCode },
          });
        }
      }
    } catch {
      // fall through
    }
  }

  // ─── 9. RETURN cleaned result ───
  const cleaned = cleanResponse(result);
  try {
    const parsed = JSON.parse(cleaned);
    return jsonResponse({ result: parsed });
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return jsonResponse({ result: JSON.parse(jsonMatch[0]) });
      } catch {
        // fall through
      }
    }
    return jsonResponse({ result: { raw: cleaned } });
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
