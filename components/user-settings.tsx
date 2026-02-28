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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  email: string;
  name: string;
  avatar_url: string;
  gemini_api_key: string | null;
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
        .select("email, name, avatar_url, gemini_api_key")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data);
        setApiKey(data.gemini_api_key || "");
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
    if (!apiKey.trim() || !apiKey.startsWith("AIza")) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("users")
        .update({ gemini_api_key: apiKey.trim() })
        .eq("id", user.id);
      setProfile((prev) =>
        prev ? { ...prev, gemini_api_key: apiKey.trim() } : prev,
      );
    }
    setSaving(false);
    setEditingKey(false);
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
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveKey}
                      disabled={saving || !apiKey.startsWith("AIza")}
                      className="flex-1 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-medium disabled:opacity-30"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingKey(false);
                        setApiKey(profile?.gemini_api_key || "");
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
                      onClick={() => setEditingKey(true)}
                      className="text-xs text-neutral-500 hover:text-black dark:hover:text-white px-2 py-1"
                    >
                      Edit
                    </button>
                  </div>
                </div>
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
