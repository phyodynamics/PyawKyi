import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  return NextResponse.json({ error: message }, { status });
}

// Service client to bypass RLS for key lookups
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// System prompts per mode
const SYSTEM_PROMPTS: Record<string, string> = {
  polish: `You are an expert Linguistic Refiner. Your goal is to turn raw text into polished, readable text while preserving the original language and voice.

# CORE PROTOCOLS
1. **Language Detection (CRITICAL):** Identify the language of the input text immediately. Output in the same language.
2. **Clean Up:** Remove filler words, stuttering, and false starts.
3. **Grammar & Punctuation:** Fix grammatical errors and add proper punctuation.
4. **Preservation:** Do NOT summarize. Do NOT change the meaning or tone.

# OUTPUT FORMAT
Return strictly a JSON object.
{
  "refined_text": "The polished version of the text in the ORIGINAL language"
}`,

  plan: `You are an expert Personal Planner & Organizer. Your goal is to turn text into structured Action Plans, Itineraries, or To-Do Lists.

# INSTRUCTIONS
1. **Analyze Context:** Is the user talking about a Trip? A Daily Routine? An Event? A Study Plan? A Work Project?
2. **Extract Details:**
   - **Schedule:** Pull out times and activities.
   - **Checklist:** Pull out items to buy, bring, prepare, or complete.
3. **Language:** Output in the User's Input Language.

# OUTPUT FORMAT
Return strictly a JSON object.
{
  "plan_title": "Plan Title",
  "schedule": [
    { "time": "05:00 AM", "activity": "Wake up" }
  ],
  "checklist": ["Item 1", "Item 2"]
}`,

  craft: `You are a world-class Content Strategist. Craft a perfect social media post based on the user's input.

# DYNAMIC LANGUAGE & TONE ENGINE
1. **Burmese Input:** Use warm, authentic tone.
2. **English Input:** Use punchy, professional, engaging style.
3. **Other Languages:** Adapt to native cultural nuances.

# CONTENT STRUCTURE
- **Hook:** Grab attention immediately.
- **Value:** The core story or solution.
- **Call to Action:** Clear next step.

# OUTPUT FORMAT
Return strictly a JSON object.
{
  "generated_content": "The full post content including emojis and hashtags"
}`,

  build: `Role: Senior Frontend Dev.
Task: Build a single-file HTML5 mini-app based on the user's text input.
Stack: HTML5, Vanilla JS, TailwindCSS (CDN), FontAwesome (CDN).

Rules:
1. UI Design: Modern, centered, responsive, glassmorphism style.
2. Language: Variable names in English. Visible UI text matches the User's Input Language.
3. Output: Strictly JSON format. { "html_code": "..." }`,

  learn: `You are an expert Study Notes Generator & Learning Assistant. Your goal is to transform text about ANY topic into well-organized study materials.

# INSTRUCTIONS
1. Analyze Topic: Identify the subject area.
2. Extract Key Concepts: Pull out the most important terms, ideas, and definitions.
3. Create Summary: Write a concise, clear summary.
4. Generate Flashcards: Create Q&A flashcards for active recall practice.
5. Language: Output in the User's Input Language.

# OUTPUT FORMAT
Return strictly a JSON object.
{
  "study_title": "Topic Title",
  "key_concepts": [
    { "term": "Key Term", "explanation": "Clear explanation" }
  ],
  "summary": "Concise summary paragraph",
  "flashcards": [
    { "question": "What is ...?", "answer": "It is ..." }
  ]
}`,
};

const BUILD_FIX_PROMPT = `Role: Senior QA Engineer.
Task: AUDIT and FIX the HTML code.

Checklist:
1. Completeness: Must have <!DOCTYPE html>, <html>, <body>. No cut-off code.
2. Libraries: Ensure TailwindCSS and FontAwesome CDNs are included.
3. Language: UI text must match original_request language.
4. JavaScript: Ensure logic is valid.
5. Design: Modern glassmorphism style, centered, responsive.

Output: Strictly JSON. { "fixed_code": "<!DOCTYPE html>..." }`;

// Gemini proxy
async function callGemini(
  systemPrompt: string,
  userContent: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const parts: Array<
    { text: string } | { inline_data: { mime_type: string; data: string } }
  > = [
    { text: systemPrompt },
    { inline_data: { mime_type: mimeType, data: audioBase64 } },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
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
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(
      "Missing Authorization header. Use: Bearer pk_live_xxxxx",
      401,
    );
  }

  const pyawkyiKey = authHeader.replace("Bearer ", "").trim();
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
    .select("id, user_id, is_active")
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
    .select("gemini_api_key, payment_status")
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
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const { mode, text, audioBase64, mimeType } = body;

  if (!mode || !["polish", "plan", "craft", "build", "learn"].includes(mode)) {
    return errorResponse(
      'Invalid "mode". Must be: polish, plan, craft, build, or learn',
      400,
    );
  }

  if (!text && !audioBase64) {
    return errorResponse('Missing "text" or "audioBase64".', 400);
  }

  if (text && text.length > 50000) {
    return errorResponse("Text too long. Max 50,000 characters.", 400);
  }

  // ─── 6. PROCESS via Gemini ───
  const systemPrompt = SYSTEM_PROMPTS[mode];
  const primaryModel = "gemini-3-flash-preview";
  const fallbackModel = "gemini-2.5-flash";

  let result: string | null = null;
  let lastError: string | null = null;

  for (const model of [primaryModel, fallbackModel]) {
    try {
      if (audioBase64) {
        result = await callGeminiWithAudio(
          systemPrompt,
          audioBase64,
          mimeType || "audio/webm",
          model,
          userProfile.gemini_api_key,
        );
      } else {
        result = await callGemini(
          systemPrompt,
          text,
          model,
          userProfile.gemini_api_key,
        );
      }
      if (result && result.trim().length > 0) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  if (!result || result.trim().length === 0) {
    return errorResponse(lastError || "Failed to process. Try again.", 500);
  }

  // ─── 7. UPDATE usage stats (fire-and-forget) ───
  service
    .from("api_keys")
    .update({
      request_count:
        (((keyRecord as Record<string, unknown>).request_count as number) ||
          0) + 1,
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
            BUILD_FIX_PROMPT,
            `original_request: "${text || "[Audio input]"}"\n\ngenerated_code: "${generatedCode.replace(/"/g, '\\"')}"`,
            primaryModel,
            userProfile.gemini_api_key,
          );
          const fixCleaned = cleanResponse(fixResult);
          const fixParsed = JSON.parse(fixCleaned);
          return NextResponse.json({
            result: {
              html_code: generatedCode,
              fixed_code: fixParsed.fixed_code || generatedCode,
            },
          });
        } catch {
          return NextResponse.json({
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
    return NextResponse.json({ result: parsed });
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return NextResponse.json({ result: JSON.parse(jsonMatch[0]) });
      } catch {
        // fall through
      }
    }
    return NextResponse.json({ result: { raw: cleaned } });
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
