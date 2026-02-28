"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  X,
  Copy,
  Check,
  RefreshCw,
  Code,
  Terminal,
  Zap,
} from "lucide-react";

const STORAGE_KEY = "pyawkyi-developer-api-key";

function generateApiKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let random = "";
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < 32; i++) {
    random += chars[array[i] % chars.length];
  }
  return `pk_live_${random}`;
}

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

function setStoredApiKey(key: string): void {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Register the API key with the server
async function registerApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"key" | "docs">("key");

  // Load stored key on mount
  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) setApiKey(stored);
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const newKey = generateApiKey();

    // Register on server
    const ok = await registerApiKey(newKey);
    if (ok) {
      setStoredApiKey(newKey);
      setApiKey(newKey);
    }
    setGenerating(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [apiKey]);

  const handleRevoke = useCallback(() => {
    setStoredApiKey("");
    setApiKey("");
    setCopied(false);
  }, []);

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 12)}${"•".repeat(20)}${apiKey.slice(-6)}`
    : "";

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://pyawkyi.app";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Key className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Developer API
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    PyawKyi API for developers
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-6 shrink-0">
              <button
                onClick={() => setActiveTab("key")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === "key"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5" />
                  API Key
                </span>
              </button>
              <button
                onClick={() => setActiveTab("docs")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === "docs"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Code className="w-3.5 h-3.5" />
                  API Docs
                </span>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <AnimatePresence mode="wait">
                {activeTab === "key" ? (
                  <motion.div
                    key="key"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Generate an API key to access PyawKyi&apos;s features
                      programmatically. Use it to integrate voice-to-text,
                      planning, content creation, and code generation into your
                      own apps.
                    </p>

                    {apiKey ? (
                      <>
                        {/* Key display */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Your API Key
                          </label>
                          <div className="flex gap-2">
                            <div className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border font-mono text-sm text-foreground truncate select-all">
                              {maskedKey}
                            </div>
                            <motion.button
                              onClick={handleCopy}
                              className="px-3 py-3 rounded-xl bg-muted border border-border hover:bg-muted/80 transition-colors shrink-0"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              title="Copy full key"
                            >
                              {copied ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-muted-foreground" />
                              )}
                            </motion.button>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                          <span>Active — ready to use in API requests</span>
                        </div>

                        {/* Quick usage */}
                        <div className="p-3 rounded-xl bg-neutral-900 text-neutral-100">
                          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
                            <Terminal className="w-3.5 h-3.5" />
                            Quick Test
                          </div>
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                            <span className="text-emerald-400">curl</span>
                            {" -X POST "}
                            <span className="text-amber-300">
                              {baseUrl}/api/v1/process
                            </span>
                            {" \\\n  -H "}
                            <span className="text-sky-300">
                              {'"Content-Type: application/json"'}
                            </span>
                            {" \\\n  -H "}
                            <span className="text-sky-300">
                              {`"Authorization: Bearer ${apiKey.slice(0, 12)}..."`}
                            </span>
                            {" \\\n  -d "}
                            <span className="text-orange-300">
                              {"'"}
                              {'{"mode":"polish","text":"hello world"}'}
                              {"'"}
                            </span>
                          </pre>
                        </div>

                        {/* Regenerate / revoke */}
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`}
                            />
                            Regenerate
                          </motion.button>
                          <motion.button
                            onClick={handleRevoke}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Revoke Key
                          </motion.button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* No key yet */}
                        <div className="flex flex-col items-center gap-4 py-6">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-600/10 border border-violet-500/20 flex items-center justify-center">
                            <Key className="w-7 h-7 text-violet-500" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-foreground">
                              No API key yet
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Generate one to start using the PyawKyi API
                            </p>
                          </div>
                          <motion.button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-60"
                            whileHover={
                              !generating ? { scale: 1.02 } : undefined
                            }
                            whileTap={!generating ? { scale: 0.98 } : undefined}
                          >
                            {generating ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 1,
                                    ease: "linear",
                                  }}
                                >
                                  <Zap className="w-4 h-4" />
                                </motion.div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                Generate API Key
                              </>
                            )}
                          </motion.button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="docs"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    {/* Endpoint */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Base URL
                      </h3>
                      <code className="block px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono text-foreground">
                        POST {baseUrl}/api/v1/process
                      </code>
                    </div>

                    {/* Auth */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Authentication
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Include your API key in the{" "}
                        <code className="px-1.5 py-0.5 rounded bg-muted border border-border text-xs font-mono">
                          Authorization
                        </code>{" "}
                        header:
                      </p>
                      <code className="block px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-foreground">
                        Authorization: Bearer pk_live_xxxxx
                      </code>
                    </div>

                    {/* Modes */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Available Modes
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            mode: "polish",
                            desc: "Refine & polish text",
                            emoji: "✨",
                          },
                          {
                            mode: "plan",
                            desc: "Generate plans",
                            emoji: "📋",
                          },
                          {
                            mode: "craft",
                            desc: "Create content",
                            emoji: "🎨",
                          },
                          {
                            mode: "build",
                            desc: "Generate HTML code",
                            emoji: "🏗️",
                          },
                        ].map((m) => (
                          <div
                            key={m.mode}
                            className="p-2.5 rounded-lg bg-muted/50 border border-border"
                          >
                            <div className="flex items-center gap-2">
                              <span>{m.emoji}</span>
                              <span className="text-xs font-mono font-medium text-foreground">
                                {m.mode}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {m.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Request body */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Request Body (JSON)
                      </h3>
                      <div className="p-3 rounded-xl bg-neutral-900 text-neutral-100">
                        <pre className="text-xs overflow-x-auto leading-relaxed">
                          {`{
  "mode": "polish",       // Required: polish|plan|craft|build
  "text": "your text",    // Required (text input)
  "audioBase64": "...",   // Optional (base64 audio)
  "mimeType": "audio/webm" // Required if audioBase64
}`}
                        </pre>
                      </div>
                    </div>

                    {/* Example response */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Response
                      </h3>
                      <div className="p-3 rounded-xl bg-neutral-900 text-neutral-100">
                        <pre className="text-xs overflow-x-auto leading-relaxed">
                          {`// Polish mode
{ "result": { "refined_text": "..." } }

// Plan mode
{ "result": { "plan_title": "...", 
  "schedule": [...], "checklist": [...] } }

// Craft mode
{ "result": { "generated_content": "..." } }

// Build mode
{ "result": { "html_code": "...", 
  "fixed_code": "..." } }`}
                        </pre>
                      </div>
                    </div>

                    {/* Full example */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Full Example (JavaScript)
                      </h3>
                      <div className="p-3 rounded-xl bg-neutral-900 text-neutral-100">
                        <pre className="text-xs overflow-x-auto leading-relaxed">
                          {`const response = await fetch(
  "${baseUrl}/api/v1/process",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_API_KEY"
    },
    body: JSON.stringify({
      mode: "polish",
      text: "make this text better plz"
    })
  }
);

const data = await response.json();
console.log(data.result.refined_text);`}
                        </pre>
                      </div>
                    </div>

                    {/* Rate limits */}
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        ⚡ <strong>Rate Limits:</strong> 30 requests per minute
                        per API key. Responses are generated using Gemini AI.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-muted/30 shrink-0">
              <motion.button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
