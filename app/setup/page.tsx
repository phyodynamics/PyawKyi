"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Key, ExternalLink, Check, AlertCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SetupPage() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadKey = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("gemini_api_key")
          .eq("id", user.id)
          .single();
        if (data?.gemini_api_key) {
          setApiKey(data.gemini_api_key);
        }
      }
    };
    loadKey();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }
    if (!apiKey.startsWith("AIza")) {
      setError("Invalid API key format. It should start with 'AIza'");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
      );
      if (!res.ok) {
        setError("Invalid API key. Please check and try again.");
        setSaving(false);
        return;
      }
    } catch {
      setError("Could not validate API key. Please check your connection.");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: dbError } = await supabase
        .from("users")
        .update({ gemini_api_key: apiKey.trim() })
        .eq("id", user.id);

      if (dbError) {
        setError("Failed to save API key. Please try again.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);

    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/welcome";
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4 md:px-8 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-900">
        <div className="flex items-center gap-2.5">
          <Image
            src="/pyaw_kyi.png"
            alt="Pyaw Kyi Logo"
            width={40}
            height={40}
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
            priority
          />
          <span className="text-base sm:text-lg font-bold tracking-tight">
            Pyaw Kyi
          </span>
        </div>
        <motion.button
          onClick={handleLogout}
          className="p-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LogOut className="w-4 h-4 text-neutral-500" />
        </motion.button>
      </header>

      {/* Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pt-24 pb-16">
        <motion.div
          className="flex flex-col items-center gap-8 max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
            <Key className="w-7 h-7 text-neutral-500" />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold">Set Up Your API Key</h1>
            <p className="text-sm text-neutral-500 mt-2 max-w-sm">
              PyawKyi uses Google&apos;s Gemini AI. You&apos;ll need your own
              free API key to get started.
            </p>
          </div>

          {/* Steps */}
          <div className="w-full space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <p className="text-sm font-medium">Get your free API key</p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-500 hover:text-black dark:hover:text-white hover:underline flex items-center gap-1 mt-0.5"
                >
                  Open Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <p className="text-sm font-medium">
                  Click &quot;Create API Key&quot; and copy it
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  It starts with{" "}
                  <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
                    AIza...
                  </code>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <p className="text-sm font-medium">Paste it below</p>
            </div>
          </div>

          {/* API Key Input */}
          <div className="w-full space-y-2">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
                setSaved(false);
              }}
              placeholder="AIza..."
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            />

            {error && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}

            {saved && (
              <motion.p
                className="flex items-center gap-1.5 text-xs text-neutral-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Check className="w-3.5 h-3.5" />
                API key saved! Redirecting to app...
              </motion.p>
            )}
          </div>

          {/* Save Button */}
          <motion.button
            onClick={handleSave}
            disabled={saving || saved || !apiKey.trim()}
            className="w-full py-3 rounded-xl text-sm font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40 transition-opacity"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {saving ? "Validating..." : saved ? "Saved ✓" : "Save & Continue"}
          </motion.button>

          {/* Info */}
          <p className="text-xs text-neutral-400 text-center leading-relaxed">
            Your API key is stored securely and only used for your personal AI
            requests. It&apos;s never shared with anyone.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
