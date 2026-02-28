"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Zap,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Terminal,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PyawKyiKey {
  id: string;
  key: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  request_count: number;
  is_active: boolean;
}

interface ApiKeyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyPanel({ isOpen, onClose }: ApiKeyPanelProps) {
  const [apiKey, setApiKey] = useState<PyawKyiKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [activeSection, setActiveSection] = useState<"key" | "docs">("key");
  const [docLanguage, setDocLanguage] = useState<"en" | "my">("en");

  useEffect(() => {
    if (!isOpen) return;
    loadKey();
  }, [isOpen]);

  const loadKey = async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setApiKey(data || null);
    }
    setLoading(false);
  };

  const generateKey = async () => {
    setGenerating(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const randomBytes = new Uint8Array(24);
      crypto.getRandomValues(randomBytes);
      const keyStr = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const newKey = `pk_live_${keyStr}`;

      await supabase.from("api_keys").insert({
        user_id: user.id,
        key: newKey,
        name: "My API Key",
      });

      await loadKey();
      setShowKey(true); // Show key immediately after generation
    }
    setGenerating(false);
  };

  const deleteKey = async () => {
    if (!apiKey) return;
    if (!confirm("Delete your API key? It will stop working immediately."))
      return;
    const supabase = createClient();
    await supabase.from("api_keys").delete().eq("id", apiKey.id);
    setApiKey(null);
    setShowKey(false);
  };

  const copyKey = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedKey = apiKey
    ? `pk_live_${"•".repeat(32)}${apiKey.key.slice(-6)}`
    : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <h2 className="font-semibold text-base">API</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section Toggle */}
            <div className="flex gap-1 p-1 mx-5 mt-4 rounded-xl bg-neutral-100 dark:bg-neutral-900">
              <button
                onClick={() => setActiveSection("key")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === "key"
                    ? "bg-white dark:bg-black shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                API Key
              </button>
              <button
                onClick={() => setActiveSection("docs")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === "docs"
                    ? "bg-white dark:bg-black shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Docs
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {activeSection === "key" ? (
                <div className="space-y-5">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-700 border-t-black dark:border-t-white rounded-full animate-spin" />
                    </div>
                  ) : apiKey ? (
                    <>
                      {/* Key Display */}
                      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-neutral-500">
                            Your API Key
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setShowKey(!showKey)}
                              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900"
                              title={showKey ? "Hide" : "Show"}
                            >
                              {showKey ? (
                                <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                              ) : (
                                <Eye className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </button>
                            <button
                              onClick={copyKey}
                              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900"
                              title="Copy"
                            >
                              {copied ? (
                                <Check className="w-3.5 h-3.5 text-neutral-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <code className="text-xs font-mono text-neutral-600 dark:text-neutral-400 block break-all leading-relaxed">
                          {showKey ? apiKey.key : maskedKey}
                        </code>
                      </div>

                      {/* Usage Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                          <p className="text-2xl font-bold">
                            {apiKey.request_count}
                          </p>
                          <p className="text-xs text-neutral-500">
                            Total Requests
                          </p>
                        </div>
                        <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                          <p className="text-sm font-medium truncate">
                            {apiKey.last_used_at
                              ? new Date(
                                  apiKey.last_used_at,
                                ).toLocaleDateString()
                              : "Never"}
                          </p>
                          <p className="text-xs text-neutral-500">Last Used</p>
                        </div>
                      </div>

                      {/* Created */}
                      <p className="text-xs text-neutral-400 text-center">
                        Created{" "}
                        {new Date(apiKey.created_at).toLocaleDateString()}
                      </p>

                      {/* Delete */}
                      <button
                        onClick={deleteKey}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete & Regenerate
                      </button>
                    </>
                  ) : (
                    /* No key — generate one */
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-neutral-400" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">
                        Generate Your API Key
                      </h3>
                      <p className="text-sm text-neutral-500 mb-6 max-w-xs mx-auto">
                        Use this key to call PyawKyi from Apple Shortcuts,
                        scripts, or integrate into your own apps.
                      </p>
                      <button
                        onClick={generateKey}
                        disabled={generating}
                        className="px-6 py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
                      >
                        {generating ? "Generating..." : "Generate API Key"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ═══ DOCS SECTION ═══ */
                <div className="space-y-6">
                  {/* Quick Start */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-neutral-400" />
                      Quick Start
                    </h3>
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                      <code className="text-xs font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed block">
                        {`curl -X POST https://your-domain.com/api/v1/process \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "polish",
    "text": "your text here"
  }'`}
                      </code>
                    </div>
                  </div>

                  {/* Endpoint */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Endpoint</h3>
                    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold">
                          POST
                        </span>
                        <code className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                          /api/v1/process
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Authentication */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">
                      Authentication
                    </h3>
                    <p className="text-xs text-neutral-500 mb-2">
                      Include your API key in the Authorization header:
                    </p>
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                      <code className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                        Authorization: Bearer pk_live_xxx...
                      </code>
                    </div>
                  </div>

                  {/* Modes */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Modes</h3>
                    <div className="space-y-2">
                      {[
                        {
                          mode: "polish",
                          title: "Polish",
                          desc: "Clean up raw text, fix grammar, preserve meaning",
                        },
                        {
                          mode: "plan",
                          title: "Plan",
                          desc: "Convert text into structured action plans & to-dos",
                        },
                        {
                          mode: "craft",
                          title: "Craft",
                          desc: "Generate social media posts with hooks & CTAs",
                        },
                        {
                          mode: "build",
                          title: "Build",
                          desc: "Create HTML5 mini-apps from text descriptions",
                        },
                        {
                          mode: "learn",
                          title: "Learn",
                          desc: "Generate study notes, key concepts & flashcards",
                        },
                      ].map(({ mode, title, desc }) => (
                        <div
                          key={mode}
                          className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900">
                              {mode}
                            </code>
                            <span className="text-xs font-medium">{title}</span>
                          </div>
                          <p className="text-[11px] text-neutral-500">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Request Body */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Request Body</h3>
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                      <code className="text-xs font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed block">
                        {`{
  "mode": "polish",       // required
  "text": "hello world",  // text input
  "audioBase64": "...",    // OR audio input
  "mimeType": "audio/webm"
}`}
                      </code>
                    </div>
                  </div>

                  {/* Response */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Response</h3>
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                      <code className="text-xs font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed block">
                        {`// Polish mode
{ "result": { "refined_text": "..." } }

// Plan mode
{ "result": {
    "plan_title": "...",
    "schedule": [...],
    "checklist": [...]
  }
}

// Craft mode
{ "result": { "generated_content": "..." } }

// Build mode
{ "result": {
    "html_code": "...",
    "fixed_code": "..."
  }
}

// Learn mode
{ "result": {
    "study_title": "...",
    "key_concepts": [...],
    "summary": "...",
    "flashcards": [...]
  }
}`}
                      </code>
                    </div>
                  </div>

                  {/* Apple Shortcuts */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-neutral-400" />
                        Apple Shortcuts
                      </h3>
                      <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                        <button
                          onClick={() => setDocLanguage("en")}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${docLanguage === "en" ? "bg-white dark:bg-black text-black dark:text-white shadow-sm" : "text-neutral-500 hover:text-black dark:hover:text-white"}`}
                        >
                          EN
                        </button>
                        <button
                          onClick={() => setDocLanguage("my")}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${docLanguage === "my" ? "bg-white dark:bg-black text-black dark:text-white shadow-sm" : "text-neutral-500 hover:text-black dark:hover:text-white"}`}
                        >
                          ျမန္မာ
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          en: "Open Shortcuts app → + New Shortcut",
                          my: "Shortcuts App ထဲဝင်ပြီး (+) New Shortcut အသစ်တစ်ခု ယူပါ။",
                        },
                        {
                          en: 'Add "Record Audio" action (Tap to stop)',
                          my: '"Record Audio" ကို ထည့်ပြီး ဖမ်းခြင်းရပ်ရန် On Tap ကို ရွေးချယ်ပေးပါ။',
                        },
                        {
                          en: 'Add "Base64 Encode" action (Encode the Recorded Audio, Line Breaks: None)',
                          my: '"Base64 Encode" ကို ထည့်ပြီး Record Audio မှရလာတဲ့ အသံဖိုင်ကို ရွေးပါ။ Line Breaks ကို None လုပ်ပေးပါ။',
                        },
                        {
                          en: 'Add a "Text" action immediately. Inside, type: { "mode": "polish", "audioBase64": "[Insert Base64 Encoded Variable Here]" }',
                          my: 'အောက်တွင် "Text" (စာသား) action တစ်ခု ထည့်ပြီး ၎င်းထဲတွင် အောက်ပါတိုင်း ရိုက်ထည့်ပါ။ { "mode": "polish", "audioBase64": "[Base64 Variable ကို ဤနေရာ၌ ရွေးထည့်ပါ]" }',
                        },
                        {
                          en: 'Add "Get Contents of URL" action below Text.',
                          my: 'ထို Text ၏ အောက်တွင် "Get Contents of URL" action ကို ထပ်ထည့်ပါ။',
                        },
                        {
                          en: "Set URL to: https://pyawkyi.phyozinko.com/api/v1/process",
                          my: "URL နေရာတွင် https://pyawkyi.phyozinko.com/api/v1/process ကို ဖြည့်ပါ။",
                        },
                        {
                          en: "Method: POST | Headers: Add 'Authorization' → 'Bearer YOUR_KEY'",
                          my: "Method ကို POST ပြောင်းပါ။ Headers တွင် Key ကို 'Authorization' အမည်ပေးပြီး တန်ဖိုးကို 'Bearer YOUR_KEY' ထည့်ပါ။",
                        },
                        {
                          en: "Headers: Add 'Content-Type' → 'application/json'",
                          my: "Headers တွင် နောက်ထပ်တစ်ခုအနေဖြင့် Key ကို 'Content-Type' ပေးပြီး 'application/json' ထည့်ပါ။",
                        },
                        {
                          en: "Request Body: FILE → Tap 'Choose Variable' -> Tap 'Select Variable' at the top -> Tap the 'Text' output from the step above.",
                          my: "Request Body ကို 'File' (ဖိုင်) သို့ပြောင်းပါ။ ပြီးလျှင် ဘေးနားမှ 'Choose Variable' ကို နှိပ်ပြီး အပေါ်ဆုံးမှ 'Select Variable' မှတစ်ဆင့် အထက်၌ ရေးခဲ့သော 'Text' (စာသား) ကို နှိပ်ပြီး ရွေးချယ်ပေးလိုက်ပါ။",
                        },
                        {
                          en: 'Add "Get Dictionary Value" → Get value for "result.refined_text" in Contents of URL',
                          my: '"Get Dictionary Value" ခေါ်ပြီး URL မှ ပြန်လာသော Contents ထဲမှ "result.refined_text" ကို ထုတ်ယူပါ။',
                        },
                        {
                          en: 'Add "Show Result" or "Speak Text" action with the Dictionary Value',
                          my: 'အဖြေကို ပြန်ဖတ်ပြချင်ပါက "Speak Text" သို့မဟုတ် မျက်နှာပြင်တွင် ကြည့်ချင်ပါက "Show Result" ထည့်ပြီး အဖြေကို ရွေးချယ်ပါ။',
                        },
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-xs text-neutral-800 dark:text-neutral-200 mt-1">
                            {docLanguage === "en" ? step.en : step.my}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rate Limits */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Rate Limits</h3>
                    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">
                          Requests per minute
                        </span>
                        <span className="text-xs font-bold">30</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-neutral-500">
                          Max text length
                        </span>
                        <span className="text-xs font-bold">50,000 chars</span>
                      </div>
                    </div>
                  </div>

                  {/* Error Codes */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Status Codes</h3>
                    <div className="space-y-1">
                      {[
                        { code: "200", desc: "Success" },
                        { code: "400", desc: "Invalid request body or mode" },
                        { code: "401", desc: "Invalid or missing API key" },
                        {
                          code: "403",
                          desc: "Account not active / no Gemini key",
                        },
                        { code: "429", desc: "Rate limit exceeded" },
                        { code: "500", desc: "Processing error" },
                      ].map(({ code, desc }) => (
                        <div
                          key={code}
                          className="flex items-center gap-2 py-1.5"
                        >
                          <code className="text-[10px] font-mono font-bold w-8">
                            {code}
                          </code>
                          <ChevronRight className="w-3 h-3 text-neutral-300" />
                          <span className="text-xs text-neutral-500">
                            {desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
