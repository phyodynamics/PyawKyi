"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Users,
  Key,
  Check,
  X,
  Search,
  LogOut,
  RefreshCw,
  Shield,
  Trash2,
  BarChart3,
  Zap,
  Sparkles,
  Palette,
  Code,
  TrendingUp,
  BookOpen,
  Bell,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tab = "analytics" | "forms" | "status" | "keys" | "management" | "notify";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  payment_status: string;
  gemini_api_key: string | null;
  created_at: string;
  paid_at: string | null;
}

interface PaymentSubmission {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  payment_method: string;
  status: string;
  created_at: string;
}

interface SavedItem {
  user_id: string;
  mode: string;
  created_at: string;
}

interface ApiKeyRecord {
  id: string;
  user_id: string;
  key: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  request_count: number;
  is_active: boolean;
}

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

const tabs: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "forms", label: "Payments", icon: ClipboardList },
  { id: "status", label: "Status", icon: Shield },
  { id: "keys", label: "API Keys", icon: Key },
  { id: "management", label: "Users", icon: Users },
  { id: "notify", label: "Notify", icon: Bell },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // Notification form state
  const [notiTitle, setNotiTitle] = useState("");
  const [notiMessage, setNotiMessage] = useState("");
  const [notiType, setNotiType] = useState<
    "info" | "update" | "promo" | "alert"
  >("info");
  const [notiSending, setNotiSending] = useState(false);
  const [notiSent, setNotiSent] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setIsAdmin(true);
      setUsers(data.users || []);
      setSubmissions(data.submissions || []);
      setSavedItems(data.savedItems || []);
      setApiKeys(data.apiKeys || []);
      setNotifications(data.notifications || []);
    } catch {
      setIsAdmin(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const adminAction = async (body: Record<string, string>) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    loadData();
  };

  const updatePaymentStatus = async (userId: string, status: string) => {
    await adminAction({ action: "update_payment_status", userId, status });
  };

  const approveSubmission = async (subId: string, userId: string) => {
    await adminAction({
      action: "approve_submission",
      submissionId: subId,
      userId,
    });
  };

  const rejectSubmission = async (subId: string) => {
    await adminAction({ action: "reject_submission", submissionId: subId });
  };

  const deleteNotification = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    await adminAction({ action: "delete_notification", notificationId });
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await adminAction({ action: "delete_user", userId });
  };

  const revokeApiKey = async (userId: string) => {
    if (!confirm("Revoke this user's Gemini API key?")) return;
    await adminAction({ action: "revoke_api_key", userId });
  };

  const sendNotification = async () => {
    if (!notiTitle.trim() || !notiMessage.trim()) return;
    setNotiSending(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notiTitle.trim(),
          message: notiMessage.trim(),
          type: notiType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNotiTitle("");
      setNotiMessage("");
      setNotiSent(true);
      setTimeout(() => setNotiSent(false), 3000);
    } catch {
      alert("Failed to send notification");
    }
    setNotiSending(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/welcome";
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())),
  );

  // ─── Analytics computed data ───
  const analytics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Users
    const paidUsers = users.filter((u) => u.payment_status === "paid").length;
    const pendingUsers = users.filter(
      (u) => u.payment_status === "pending",
    ).length;
    const usersWithKey = users.filter((u) => u.gemini_api_key).length;
    const newUsersThisWeek = users.filter(
      (u) => new Date(u.created_at) >= weekAgo,
    ).length;

    // Saved items per mode
    const modeCount: Record<string, number> = {
      polish: 0,
      plan: 0,
      craft: 0,
      build: 0,
      learn: 0,
    };
    savedItems.forEach((item) => {
      if (item.mode in modeCount) modeCount[item.mode]++;
    });
    const totalProcessed = savedItems.length;

    // Activity: items per day for last 7 days
    const dailyActivity: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = day.toLocaleDateString("en", { weekday: "short" });
      const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      const count = savedItems.filter((item) => {
        const d = new Date(item.created_at);
        return d >= day && d < nextDay;
      }).length;
      dailyActivity.push({ label: dayStr, count });
    }
    const maxDaily = Math.max(...dailyActivity.map((d) => d.count), 1);

    // API keys
    const totalApiKeys = apiKeys.length;
    const activeApiKeys = apiKeys.filter((k) => k.is_active).length;
    const totalApiRequests = apiKeys.reduce(
      (sum, k) => sum + k.request_count,
      0,
    );

    // Top API key users
    const topApiUsers = [...apiKeys]
      .sort((a, b) => b.request_count - a.request_count)
      .slice(0, 5);

    // Revenue
    const approvedPayments = submissions.filter(
      (s) => s.status === "approved",
    ).length;
    const totalRevenue = approvedPayments * 20000; // 20,000 MMK each

    return {
      paidUsers,
      pendingUsers,
      usersWithKey,
      newUsersThisWeek,
      modeCount,
      totalProcessed,
      dailyActivity,
      maxDaily,
      totalApiKeys,
      activeApiKeys,
      totalApiRequests,
      topApiUsers,
      approvedPayments,
      totalRevenue,
    };
  }, [users, savedItems, apiKeys, submissions]);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending:
        "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800",
      paid: "bg-black text-white dark:bg-white dark:text-black border-transparent",
      suspended:
        "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 border-neutral-200 dark:border-neutral-800 line-through",
      approved:
        "bg-black text-white dark:bg-white dark:text-black border-transparent",
      rejected:
        "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 border-neutral-200 dark:border-neutral-800 line-through",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || "bg-neutral-100 dark:bg-neutral-900"}`}
      >
        {status}
      </span>
    );
  };

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <p className="text-neutral-500">Access denied.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4 md:px-8 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-900">
        <div className="flex items-center gap-2.5">
          <Image
            src="/pyaw_kyi.png"
            alt="Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-base font-bold tracking-tight">Admin</span>
          <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 text-xs font-medium border border-neutral-200 dark:border-neutral-800">
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={loadData}
            className="p-2 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </motion.button>
          <motion.button
            onClick={handleLogout}
            className="p-2 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </header>

      <div className="pt-20 px-4 md:px-8 max-w-6xl mx-auto pb-16">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white dark:bg-black text-black dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-black dark:hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search (hidden on analytics and notify tabs) */}
        {activeTab !== "analytics" && activeTab !== "notify" && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════ */}
            {/* Tab: ANALYTICS                     */}
            {/* ═══════════════════════════════════ */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                {/* Top Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs text-neutral-500">
                        Total Users
                      </span>
                    </div>
                    <p className="text-3xl font-bold">{users.length}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      +{analytics.newUsersThisWeek} this week
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs text-neutral-500">Revenue</span>
                    </div>
                    <p className="text-3xl font-bold">
                      {(analytics.totalRevenue / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {analytics.approvedPayments} payments · MMK
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs text-neutral-500">
                        API Requests
                      </span>
                    </div>
                    <p className="text-3xl font-bold">
                      {analytics.totalApiRequests}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {analytics.activeApiKeys} active keys
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs text-neutral-500">
                        Items Processed
                      </span>
                    </div>
                    <p className="text-3xl font-bold">
                      {analytics.totalProcessed}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      across all modes
                    </p>
                  </div>
                </div>

                {/* 7-Day Activity Chart */}
                <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-sm font-medium mb-4">7-Day Activity</h3>
                  <div className="flex items-end gap-2 h-32">
                    {analytics.dailyActivity.map((day, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {day.count}
                        </span>
                        <motion.div
                          className="w-full rounded-md bg-black dark:bg-white"
                          initial={{ height: 0 }}
                          animate={{
                            height: `${Math.max((day.count / analytics.maxDaily) * 100, 4)}%`,
                          }}
                          transition={{ delay: i * 0.05, duration: 0.4 }}
                        />
                        <span className="text-[10px] text-neutral-400">
                          {day.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mode Breakdown */}
                  <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <h3 className="text-sm font-medium mb-4">Mode Usage</h3>
                    <div className="space-y-3">
                      {[
                        {
                          mode: "Polish",
                          count: analytics.modeCount.polish,
                          icon: Sparkles,
                        },
                        {
                          mode: "Plan",
                          count: analytics.modeCount.plan,
                          icon: ClipboardList,
                        },
                        {
                          mode: "Craft",
                          count: analytics.modeCount.craft,
                          icon: Palette,
                        },
                        {
                          mode: "Build",
                          count: analytics.modeCount.build,
                          icon: Code,
                        },
                        {
                          mode: "Learn",
                          count: analytics.modeCount.learn,
                          icon: BookOpen,
                        },
                      ].map(({ mode, count, icon: Icon }) => (
                        <div key={mode} className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span className="text-sm w-12">{mode}</span>
                          <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-black dark:bg-white"
                              initial={{ width: 0 }}
                              animate={{
                                width:
                                  analytics.totalProcessed > 0
                                    ? `${(count / analytics.totalProcessed) * 100}%`
                                    : "0%",
                              }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* User Breakdown */}
                  <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <h3 className="text-sm font-medium mb-4">User Status</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-500">Paid</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-black dark:bg-white"
                              style={{
                                width: users.length
                                  ? `${(analytics.paidUsers / users.length) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {analytics.paidUsers}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-500">
                          Pending
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-neutral-400"
                              style={{
                                width: users.length
                                  ? `${(analytics.pendingUsers / users.length) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {analytics.pendingUsers}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-500">
                          With Gemini Key
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-black dark:bg-white"
                              style={{
                                width: users.length
                                  ? `${(analytics.usersWithKey / users.length) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {analytics.usersWithKey}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-500">
                          PyawKyi API Keys
                        </span>
                        <span className="text-sm font-medium">
                          {analytics.totalApiKeys}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top API Key Users */}
                {analytics.topApiUsers.length > 0 && (
                  <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <h3 className="text-sm font-medium mb-4">
                      Top API Key Users
                    </h3>
                    <div className="space-y-2">
                      {analytics.topApiUsers.map((k) => {
                        const user = users.find((u) => u.id === k.user_id);
                        return (
                          <div
                            key={k.id}
                            className="flex items-center justify-between py-2"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {user?.avatar_url ? (
                                <Image
                                  src={user.avatar_url}
                                  alt=""
                                  width={28}
                                  height={28}
                                  className="w-7 h-7 rounded-full"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-[10px] font-bold">
                                  {(user?.name ||
                                    user?.email ||
                                    "?")[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {k.name}
                                </p>
                                <p className="text-[10px] text-neutral-400 truncate">
                                  {user?.email || "Unknown"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold">
                                {k.request_count}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                requests
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════ */}
            {/* Tab: PAYMENT FORMS                 */}
            {/* ═══════════════════════════════════ */}
            {activeTab === "forms" && (
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <p className="text-center text-neutral-500 py-10">
                    No payment submissions yet
                  </p>
                ) : (
                  submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {sub.name}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {sub.email}
                          </p>
                          {sub.phone && (
                            <p className="text-xs text-neutral-400">
                              {sub.phone}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                              {sub.payment_method === "kbz_pay"
                                ? "KBZ Pay"
                                : "Wave Pay"}
                            </span>
                            {statusBadge(sub.status)}
                            <span className="text-xs text-neutral-400">
                              {new Date(sub.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {sub.status === "pending" && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <motion.button
                              onClick={() =>
                                approveSubmission(sub.id, sub.user_id)
                              }
                              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
                              whileTap={{ scale: 0.95 }}
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => rejectSubmission(sub.id)}
                              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
                              whileTap={{ scale: 0.95 }}
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ═══════════════════════════════════ */}
            {/* Tab: USER STATUS                   */}
            {/* ═══════════════════════════════════ */}
            {activeTab === "status" && (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs font-bold">
                            {(user.name || user.email)[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.name || "—"}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusBadge(user.payment_status)}
                        <select
                          value={user.payment_status}
                          onChange={(e) =>
                            updatePaymentStatus(user.id, e.target.value)
                          }
                          className="text-xs px-2 py-1 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ═══════════════════════════════════ */}
            {/* Tab: API KEYS                      */}
            {/* ═══════════════════════════════════ */}
            {activeTab === "keys" && (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const userKeys = apiKeys.filter((k) => k.user_id === user.id);
                  return (
                    <div
                      key={user.id}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs font-bold">
                            {(user.name || user.email)[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {user.name || "—"}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {user.gemini_api_key ? (
                            <>
                              <code className="text-xs px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono">
                                {user.gemini_api_key.slice(0, 10)}...
                              </code>
                              <motion.button
                                onClick={() => revokeApiKey(user.id)}
                                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
                                whileTap={{ scale: 0.95 }}
                                title="Revoke Gemini key"
                              >
                                <X className="w-3.5 h-3.5" />
                              </motion.button>
                            </>
                          ) : (
                            <span className="text-xs text-neutral-400">
                              No Gemini key
                            </span>
                          )}
                        </div>
                      </div>

                      {/* PyawKyi API keys for this user */}
                      {userKeys.length > 0 && (
                        <div className="ml-12 space-y-1.5">
                          {userKeys.map((k) => (
                            <div
                              key={k.id}
                              className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-neutral-50 dark:bg-neutral-950"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Zap className="w-3 h-3 text-neutral-400 shrink-0" />
                                <code className="text-[10px] text-neutral-500 font-mono truncate">
                                  {k.key.slice(0, 20)}...
                                </code>
                                <span className="text-[10px] text-neutral-400 shrink-0">
                                  {k.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-neutral-500 shrink-0">
                                {k.request_count} req
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══════════════════════════════════ */}
            {/* Tab: USER MANAGEMENT               */}
            {/* ═══════════════════════════════════ */}
            {activeTab === "management" && (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs font-bold">
                            {(user.name || user.email)[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.name || "—"}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {statusBadge(user.payment_status)}
                            {user.phone && (
                              <span className="text-xs text-neutral-400">
                                {user.phone}
                              </span>
                            )}
                            <span className="text-xs text-neutral-400">
                              Joined{" "}
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <motion.button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
                          whileTap={{ scale: 0.95 }}
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ═══════════════════════════════════ */}
            {/* Tab: NOTIFICATIONS                 */}
            {/* ═══════════════════════════════════ */}
            {activeTab === "notify" && (
              <div className="max-w-lg mx-auto space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-1">Send Notification</h2>
                  <p className="text-sm text-neutral-500">
                    Broadcast a message to all connected users in real-time
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Type selector */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Type</label>
                    <div className="flex gap-2">
                      {(["info", "update", "promo", "alert"] as const).map(
                        (t) => {
                          const icons = {
                            info: "ℹ️",
                            update: "🚀",
                            promo: "🎉",
                            alert: "⚠️",
                          };
                          return (
                            <button
                              key={t}
                              onClick={() => setNotiType(t)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                                notiType === t
                                  ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                                  : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950"
                              }`}
                            >
                              <span>{icons[t]}</span>
                              <span className="capitalize">{t}</span>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Title</label>
                    <input
                      type="text"
                      value={notiTitle}
                      onChange={(e) => setNotiTitle(e.target.value)}
                      placeholder="Notification title..."
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Message</label>
                    <textarea
                      value={notiMessage}
                      onChange={(e) => setNotiMessage(e.target.value)}
                      placeholder="Write your notification message..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 resize-none"
                    />
                  </div>

                  {/* Preview */}
                  {(notiTitle || notiMessage) && (
                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2 font-medium">
                        Preview
                      </p>
                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5">
                          {
                            {
                              info: "ℹ️",
                              update: "🚀",
                              promo: "🎉",
                              alert: "⚠️",
                            }[notiType]
                          }
                        </span>
                        <div>
                          <p className="text-sm font-semibold">
                            {notiTitle || "Title"}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {notiMessage || "Message"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Send button */}
                  <motion.button
                    onClick={sendNotification}
                    disabled={
                      notiSending || !notiTitle.trim() || !notiMessage.trim()
                    }
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold disabled:opacity-40 transition-opacity"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {notiSending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : notiSent ? (
                      <>
                        <Check className="w-4 h-4" />
                        Sent Successfully!
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send to All Users
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Recent Notifications History */}
                <div className="mt-12 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Recent Notifications</h3>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900">
                      {notifications.length} Total
                    </span>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      No notifications sent yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notif) => {
                        const style = {
                          info: { bg: "bg-blue-500", icon: "ℹ️" },
                          update: { bg: "bg-green-500", icon: "🚀" },
                          promo: { bg: "bg-purple-500", icon: "🎉" },
                          alert: { bg: "bg-red-500", icon: "⚠️" },
                        }[notif.type] || { bg: "bg-blue-500", icon: "ℹ️" };

                        return (
                          <div
                            key={notif.id}
                            className="flex items-start justify-between gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="text-xl shrink-0 mt-0.5">
                                {style.icon}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {notif.title}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                                  {notif.message}
                                </p>
                                <p className="text-[10px] text-neutral-400 mt-2 font-medium">
                                  {new Date(notif.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteNotification(notif.id)}
                              className="p-2 shrink-0 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
