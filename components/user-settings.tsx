"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  LogOut,
  Key,
  BarChart3,
  Shield,
  Sparkles,
  ClipboardList,
  Palette,
  Code,
  Eye,
  EyeOff,
  ExternalLink,
  BookOpen,
  CreditCard,
  Bot,
  MessageSquareText,
  Check,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CUSTOM_PROMPT_MAX_LENGTH,
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_OPTIONS,
  type GeminiModel,
  normalizeCustomPrompt,
  resolveGeminiModel,
} from "@/lib/ai-preferences";

interface UserProfile {
  email: string;
  name: string;
  avatar_url: string;
  gemini_api_key: string | null;
  custom_prompt: string | null;
  gemini_model: GeminiModel | null;
  price_paid: number | null;
}

interface UsageStats {
  polish: number;
  plan: number;
  craft: number;
  build: number;
  learn: number;
  total_words: number;
}

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onOpenAdmin: () => void;
}

export function UserSettings({
  isOpen,
  onClose,
  isAdmin,
  onOpenAdmin,
}: UserSettingsProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UsageStats>({
    polish: 0,
    plan: 0,
    craft: 0,
    build: 0,
    learn: 0,
    total_words: 0,
  });
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [geminiModel, setGeminiModel] =
    useState<GeminiModel>(DEFAULT_GEMINI_MODEL);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferenceStatus, setPreferenceStatus] = useState<
    "idle" | "saved" | "error"
  >("idle");

  useEffect(() => {
    if (!isOpen) return;
    loadProfile();
    loadStats();
  }, [isOpen]);

  const loadProfile = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select(
          "email, name, avatar_url, gemini_api_key, custom_prompt, gemini_model, price_paid",
        )
        .eq("id", user.id)
        .single();
      if (data) {
        const normalizedProfile = {
          ...data,
          gemini_model: resolveGeminiModel(data.gemini_model),
        } as UserProfile;
        setProfile(normalizedProfile);
        setApiKey(data.gemini_api_key || "");
        setCustomPrompt(data.custom_prompt || "");
        setGeminiModel(resolveGeminiModel(data.gemini_model));
        setPreferenceStatus("idle");
      }
    }
  };

  const loadStats = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: items } = await supabase
        .from("saved_items")
        .select("mode, content")
        .eq("user_id", user.id);

      if (items) {
        const modeCount = { polish: 0, plan: 0, craft: 0, build: 0, learn: 0 };
        let totalWords = 0;
        items.forEach((item: any) => {
          if (item.mode in modeCount) {
            modeCount[item.mode as keyof typeof modeCount]++;
          }
          totalWords += item.content.split(/\s+/).filter(Boolean).length;
        });
        setStats({ ...modeCount, total_words: totalWords });
      }
    }
  };

  const handleSaveKey = async () => {
    const normalizedKey = apiKey.trim();
    if (!normalizedKey) {
      setKeyError("Please enter your Gemini API key.");
      return;
    }

    setSaving(true);
    setKeyError(null);

    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: normalizedKey }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setKeyError(data.error || "Invalid API key. Please try again.");
        setSaving(false);
        return;
      }
    } catch {
      setKeyError("Could not validate the API key. Please try again.");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("users")
        .update({ gemini_api_key: normalizedKey })
        .eq("id", user.id);

      if (error) {
        setKeyError("Failed to save the API key. Please try again.");
        setSaving(false);
        return;
      }

      setProfile((prev) =>
        prev ? { ...prev, gemini_api_key: normalizedKey } : prev,
      );
    } else {
      setKeyError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditingKey(false);
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    setPreferenceStatus("idle");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSavingPreferences(false);
      setPreferenceStatus("error");
      return;
    }

    const normalizedPrompt = normalizeCustomPrompt(customPrompt);
    const normalizedModel = resolveGeminiModel(geminiModel);
    const { data, error } = await supabase
      .from("users")
      .update({
        custom_prompt: normalizedPrompt || null,
        gemini_model: normalizedModel,
      })
      .eq("id", user.id)
      .select("custom_prompt, gemini_model")
      .single();

    if (error || !data) {
      setPreferenceStatus("error");
    } else {
      const savedPrompt = data.custom_prompt || "";
      const savedModel = resolveGeminiModel(data.gemini_model);
      setCustomPrompt(savedPrompt);
      setGeminiModel(savedModel);
      setProfile((previous) =>
        previous
          ? {
              ...previous,
              custom_prompt: savedPrompt || null,
              gemini_model: savedModel,
            }
          : previous,
      );
      setPreferenceStatus("saved");
    }

    setSavingPreferences(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/welcome";
  };

  const totalUsage =
    stats.polish + stats.plan + stats.craft + stats.build + stats.learn;
  const maskedKey = profile?.gemini_api_key
    ? `${profile.gemini_api_key.slice(0, 8)}${"•".repeat(20)}${profile.gemini_api_key.slice(-4)}`
    : "Not set";

  const modeStats = [
    { mode: "Polish", count: stats.polish, icon: Sparkles },
    { mode: "Plan", count: stats.plan, icon: ClipboardList },
    { mode: "Craft", count: stats.craft, icon: Palette },
    { mode: "Build", count: stats.build, icon: Code },
    { mode: "Learn", count: stats.learn, icon: BookOpen },
  ];

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
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <h2 className="font-semibold text-base">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Card */}
            <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Profile"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full border border-neutral-200 dark:border-neutral-800"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-lg font-bold">
                    {profile?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {profile?.name || "—"}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {profile?.email || "—"}
                  </p>
                  {profile?.price_paid != null ? (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CreditCard className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {profile.price_paid.toLocaleString()} MMK
                      </span>
                      <span className="text-[10px] text-neutral-400">paid</span>
                    </div>
                  ) : isAdmin ? (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Shield className="w-3 h-3 text-violet-500" />
                      <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                        Admin · Free Access
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-neutral-500" />
                <h3 className="text-sm font-medium">Usage Statistics</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <p className="text-2xl font-bold">{totalUsage}</p>
                  <p className="text-xs text-neutral-500">Total Saves</p>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <p className="text-2xl font-bold">
                    {stats.total_words.toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-500">Words Processed</p>
                </div>
              </div>

              <div className="space-y-2">
                {modeStats.map(({ mode, count, icon: Icon }) => (
                  <div
                    key={mode}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm">{mode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{count}</span>
                      {totalUsage > 0 && (
                        <div className="w-16 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-black dark:bg-white transition-all"
                            style={{ width: `${(count / totalUsage) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gemini API Key */}
            <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-neutral-500" />
                  <h3 className="text-sm font-medium">Gemini API Key</h3>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {editingKey ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setKeyError(null);
                    }}
                    placeholder="AQ.… or AIza…"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                  <p className="text-[11px] text-neutral-400">
                    Supports current AQ. authorization keys and legacy AIza
                    keys.
                  </p>
                  {keyError && (
                    <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {keyError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveKey}
                      disabled={saving || !apiKey.trim()}
                      className="flex-1 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-medium disabled:opacity-30"
                    >
                      {saving ? "Validating..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingKey(false);
                        setApiKey(profile?.gemini_api_key || "");
                        setKeyError(null);
                      }}
                      className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <code className="text-xs text-neutral-500 font-mono">
                    {showKey && profile?.gemini_api_key
                      ? profile.gemini_api_key
                      : maskedKey}
                  </code>
                  <div className="flex items-center gap-1">
                    {profile?.gemini_api_key && (
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900"
                      >
                        {showKey ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingKey(true);
                        setKeyError(null);
                      }}
                      className="text-xs text-neutral-500 hover:text-black dark:hover:text-white px-2 py-1"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Preferences */}
            <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-neutral-500" />
                <h3 className="text-sm font-medium">AI Preferences</h3>
              </div>
              <p className="text-xs leading-relaxed text-neutral-500 mb-4">
                These settings are automatically used in the web app and with
                your PyawKyi API key, including iOS Shortcuts.
              </p>

              <div className="space-y-2 mb-5">
                <p className="text-xs font-medium">Gemini model</p>
                {GEMINI_MODEL_OPTIONS.map((option) => {
                  const isSelected = geminiModel === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setGeminiModel(option.id);
                        setPreferenceStatus("idle");
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? "border-black bg-neutral-50 dark:border-white dark:bg-neutral-950"
                          : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium">
                          {option.name}
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                              : "border-neutral-300 dark:border-neutral-700"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-neutral-500 mt-1">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="custom-prompt"
                    className="flex items-center gap-1.5 text-xs font-medium"
                  >
                    <MessageSquareText className="w-3.5 h-3.5 text-neutral-500" />
                    Customize Prompt
                  </label>
                  <span className="text-[10px] tabular-nums text-neutral-400">
                    {customPrompt.length}/{CUSTOM_PROMPT_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(event) => {
                    setCustomPrompt(event.target.value);
                    setPreferenceStatus("idle");
                  }}
                  maxLength={CUSTOM_PROMPT_MAX_LENGTH}
                  rows={6}
                  placeholder="Example: I am a software developer writing to clients. Preserve technical terms such as API, deployment, database, and production. Keep the message clear and professional."
                  className="w-full resize-y px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-xs leading-relaxed placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
                <p className="text-[11px] leading-relaxed text-neutral-500">
                  Added after PyawKyi&apos;s main prompt. It guides vocabulary,
                  domain terms, audience, and tone without replacing the mode
                  rules.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="w-full mt-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-medium disabled:opacity-40 transition-opacity"
              >
                {savingPreferences
                  ? "Saving preferences..."
                  : "Save AI Preferences"}
              </button>

              {preferenceStatus === "saved" && (
                <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                  Saved. New web and API requests will use these preferences.
                </p>
              )}
              {preferenceStatus === "error" && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Could not save preferences. Please try again.
                </p>
              )}
            </div>

            {/* Admin Button */}
            {isAdmin && (
              <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Admin Dashboard
                </button>
              </div>
            )}

            {/* Logout */}
            <div className="px-5 py-4 mt-auto">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
