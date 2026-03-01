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
  ArrowUpRight,
  Activity,
  Settings,
  Wrench,
  Clock,
  DollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tab =
  | "analytics"
  | "forms"
  | "status"
  | "keys"
  | "management"
  | "notify"
  | "settings";

interface AppSettings {
  maintenance_mode: boolean;
  waitlist_mode: boolean;
  price: number;
  currency: string;
}

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
  price_paid: number | null;
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
  { id: "settings", label: "Settings", icon: Settings },
];

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  delay = 0,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  subtitle: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="relative overflow-hidden p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-neutral-100/50 dark:bg-neutral-800/20 rounded-full -translate-x-4 -translate-y-4 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
            <Icon className="w-4 h-4 text-neutral-500" />
          </div>
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-neutral-400 mt-1.5">{subtitle}</p>
      </div>
    </motion.div>
  );
}

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
  const [notiTitle, setNotiTitle] = useState("");
  const [notiMessage, setNotiMessage] = useState("");
  const [notiType, setNotiType] = useState<
    "info" | "update" | "promo" | "alert"
  >("info");
  const [notiSending, setNotiSending] = useState(false);
  const [notiSent, setNotiSent] = useState(false);
  // Settings state
  const [appSettings, setAppSettings] = useState<AppSettings>({
    maintenance_mode: false,
    waitlist_mode: false,
    price: 20000,
    currency: "MMK",
  });
  const [priceInput, setPriceInput] = useState("20000");
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);

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
      if (data.settings) {
        setAppSettings(data.settings);
        setPriceInput(String(data.settings.price));
      }
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

  const updatePaymentStatus = (userId: string, status: string) =>
    adminAction({ action: "update_payment_status", userId, status });

  const approveSubmission = (subId: string, userId: string) =>
    adminAction({
      action: "approve_submission",
      submissionId: subId,
      userId,
    });

  const rejectSubmission = (subId: string) =>
    adminAction({ action: "reject_submission", submissionId: subId });

  const deleteNotification = (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    adminAction({ action: "delete_notification", notificationId });
  };

  const deleteUser = (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    adminAction({ action: "delete_user", userId });
  };

  const revokeApiKey = (userId: string) => {
    if (!confirm("Revoke this user's Gemini API key?")) return;
    adminAction({ action: "revoke_api_key", userId });
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

  const toggleMaintenance = async (enabled: boolean) => {
    setAppSettings((prev) => ({ ...prev, maintenance_mode: enabled }));
    await adminAction({
      action: "toggle_maintenance",
      enabled: String(enabled),
    });
  };

  const toggleWaitlist = async (enabled: boolean) => {
    setAppSettings((prev) => ({ ...prev, waitlist_mode: enabled }));
    await adminAction({ action: "toggle_waitlist", enabled: String(enabled) });
  };

  const updatePrice = async () => {
    const num = parseInt(priceInput, 10);
    if (isNaN(num) || num < 0) return;
    setPriceSaving(true);
    await adminAction({ action: "update_price", price: String(num) });
    setPriceSaving(false);
    setPriceSaved(true);
    setTimeout(() => setPriceSaved(false), 2000);
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

  const analytics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const paidUsers = users.filter((u) => u.payment_status === "paid").length;
    const pendingUsers = users.filter(
      (u) => u.payment_status === "pending",
    ).length;
    const usersWithKey = users.filter((u) => u.gemini_api_key).length;
    const newUsersThisWeek = users.filter(
      (u) => new Date(u.created_at) >= weekAgo,
    ).length;

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

    const totalApiKeys = apiKeys.length;
    const activeApiKeys = apiKeys.filter((k) => k.is_active).length;
    const totalApiRequests = apiKeys.reduce(
      (sum, k) => sum + k.request_count,
      0,
    );

    const topApiUsers = [...apiKeys]
      .sort((a, b) => b.request_count - a.request_count)
      .slice(0, 5);

    const approvedPayments = submissions.filter(
      (s) => s.status === "approved",
    ).length;
    const totalRevenue = approvedPayments * 20000;

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
    const configs: Record<string, string> = {
      pending:
        "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
      paid: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
      suspended:
        "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 border-neutral-200 dark:border-neutral-800 line-through",
      approved:
        "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
      rejected:
        "bg-red-50 dark:bg-red-950/50 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800/50 line-through",
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${configs[status] || "bg-neutral-100 dark:bg-neutral-900"}`}
      >
        {status}
      </span>
    );
  };

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black gap-3">
        <Shield className="w-10 h-10 text-neutral-300 dark:text-neutral-700" />
        <p className="text-neutral-500 font-medium">Access denied.</p>
      </div>
    );
  }

  const pendingSubmissions = submissions.filter(
    (s) => s.status === "pending",
  ).length;

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-black text-black dark:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3.5 md:px-8 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-900">
        <div className="flex items-center gap-3">
          <Image
            src="/pyaw_kyi.png"
            alt="Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight">Admin</span>
            <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-500 text-[10px] font-semibold uppercase tracking-wider border border-neutral-200 dark:border-neutral-800">
              Dashboard
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors bg-white dark:bg-neutral-950"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </motion.button>
          <motion.button
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors bg-white dark:bg-neutral-950"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </header>

      <div className="pt-[72px] px-4 md:px-8 max-w-6xl mx-auto pb-16">
        {/* Tabs */}
        <div className="sticky top-[72px] z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-neutral-50/80 dark:bg-black/80 backdrop-blur-xl">
          <div className="flex gap-1 p-1 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 overflow-x-auto shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                    : "text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "forms" && pendingSubmissions > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {pendingSubmissions}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        {activeTab !== "analytics" &&
          activeTab !== "notify" &&
          activeTab !== "settings" && (
            <div className="relative mt-4 mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 shadow-sm"
              />
            </div>
          )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
              <p className="text-xs text-neutral-400">Loading data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="space-y-5 mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    icon={Users}
                    label="Users"
                    value={users.length}
                    subtitle={`+${analytics.newUsersThisWeek} this week`}
                    delay={0}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Revenue"
                    value={`${(analytics.totalRevenue / 1000).toFixed(0)}K`}
                    subtitle={`${analytics.approvedPayments} payments · MMK`}
                    delay={0.05}
                  />
                  <StatCard
                    icon={Zap}
                    label="API Reqs"
                    value={analytics.totalApiRequests}
                    subtitle={`${analytics.activeApiKeys} active keys`}
                    delay={0.1}
                  />
                  <StatCard
                    icon={Activity}
                    label="Processed"
                    value={analytics.totalProcessed}
                    subtitle="across all modes"
                    delay={0.15}
                  />
                </div>

                {/* 7-Day Chart */}
                <motion.div
                  className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-semibold">7-Day Activity</h3>
                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                      Items Processed
                    </span>
                  </div>
                  <div className="flex items-end gap-2 h-36">
                    {analytics.dailyActivity.map((day, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1.5"
                      >
                        <span className="text-[10px] text-neutral-400 font-bold tabular-nums">
                          {day.count}
                        </span>
                        <motion.div
                          className="w-full rounded-lg bg-black dark:bg-white"
                          initial={{ height: 0 }}
                          animate={{
                            height: `${Math.max((day.count / analytics.maxDaily) * 100, 4)}%`,
                          }}
                          transition={{ delay: 0.25 + i * 0.05, duration: 0.4 }}
                        />
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {day.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mode Breakdown */}
                  <motion.div
                    className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-sm font-semibold mb-4">Mode Usage</h3>
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
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-neutral-500" />
                          </div>
                          <span className="text-sm w-12 font-medium">
                            {mode}
                          </span>
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
                          <span className="text-sm font-bold tabular-nums w-8 text-right">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* User Breakdown */}
                  <motion.div
                    className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <h3 className="text-sm font-semibold mb-4">User Status</h3>
                    <div className="space-y-4">
                      {[
                        {
                          label: "Paid",
                          value: analytics.paidUsers,
                          color: "bg-emerald-500",
                        },
                        {
                          label: "Pending",
                          value: analytics.pendingUsers,
                          color: "bg-amber-500",
                        },
                        {
                          label: "With Gemini Key",
                          value: analytics.usersWithKey,
                          color: "bg-black dark:bg-white",
                        },
                      ].map(({ label, value, color }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-neutral-500">
                            {label}
                          </span>
                          <div className="flex items-center gap-2.5">
                            <div className="w-24 h-2 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${color}`}
                                style={{
                                  width: users.length
                                    ? `${(value / users.length) * 100}%`
                                    : "0%",
                                }}
                              />
                            </div>
                            <span className="text-sm font-bold tabular-nums w-8 text-right">
                              {value}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-500">
                            PyawKyi API Keys
                          </span>
                          <span className="text-sm font-bold">
                            {analytics.totalApiKeys}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Top API Key Users */}
                {analytics.topApiUsers.length > 0 && (
                  <motion.div
                    className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h3 className="text-sm font-semibold mb-4">
                      Top API Key Users
                    </h3>
                    <div className="space-y-2.5">
                      {analytics.topApiUsers.map((k, i) => {
                        const user = users.find((u) => u.id === k.user_id);
                        return (
                          <div
                            key={k.id}
                            className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-bold text-neutral-300 dark:text-neutral-700 w-4">
                                {i + 1}
                              </span>
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
                              <p className="text-sm font-bold tabular-nums">
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
                  </motion.div>
                )}
              </div>
            )}

            {/* PAYMENT FORMS */}
            {activeTab === "forms" && (
              <div className="space-y-3 mt-1">
                {submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ClipboardList className="w-10 h-10 text-neutral-200 dark:text-neutral-800 mb-3" />
                    <p className="text-neutral-500 font-medium">
                      No payment submissions yet
                    </p>
                  </div>
                ) : (
                  submissions.map((sub) => (
                    <motion.div
                      key={sub.id}
                      className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <p className="font-semibold text-sm truncate">
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
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-medium">
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
                              className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                              whileTap={{ scale: 0.95 }}
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => rejectSubmission(sub.id)}
                              className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                              whileTap={{ scale: 0.95 }}
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* USER STATUS */}
            {activeTab === "status" && (
              <div className="space-y-3 mt-1">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-xl"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs font-bold">
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
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:outline-none cursor-pointer"
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

            {/* API KEYS */}
            {activeTab === "keys" && (
              <div className="space-y-3 mt-1">
                {filteredUsers.map((user) => {
                  const userKeys = apiKeys.filter((k) => k.user_id === user.id);
                  return (
                    <div
                      key={user.id}
                      className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-xl"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs font-bold">
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
                              <code className="text-xs px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono">
                                {user.gemini_api_key.slice(0, 10)}...
                              </code>
                              <motion.button
                                onClick={() => revokeApiKey(user.id)}
                                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 dark:hover:border-red-800/50 transition-colors"
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

                      {userKeys.length > 0 && (
                        <div className="ml-12 space-y-1.5">
                          {userKeys.map((k) => (
                            <div
                              key={k.id}
                              className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50"
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
                              <span className="text-[10px] font-bold text-neutral-500 shrink-0 tabular-nums">
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

            {/* USER MANAGEMENT */}
            {activeTab === "management" && (
              <div className="space-y-3 mt-1">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-xl"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs font-bold">
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
                            {user.price_paid != null && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-medium">
                                {user.price_paid.toLocaleString()} MMK
                              </span>
                            )}
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
                      <motion.button
                        onClick={() => deleteUser(user.id)}
                        className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 dark:hover:border-red-800/50 text-neutral-400 hover:text-red-500 transition-all"
                        whileTap={{ scale: 0.95 }}
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeTab === "notify" && (
              <div className="max-w-lg mx-auto space-y-6 mt-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-1">Send Notification</h2>
                  <p className="text-sm text-neutral-500">
                    Broadcast a message to all connected users
                  </p>
                </div>

                <div className="space-y-4 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                  {/* Type selector */}
                  <div className="space-y-2">
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
                              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                                notiType === t
                                  ? "bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm"
                                  : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <input
                      type="text"
                      value={notiTitle}
                      onChange={(e) => setNotiTitle(e.target.value)}
                      placeholder="Notification title..."
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <textarea
                      value={notiMessage}
                      onChange={(e) => setNotiMessage(e.target.value)}
                      placeholder="Write your notification message..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 resize-none"
                    />
                  </div>

                  {/* Preview */}
                  {(notiTitle || notiMessage) && (
                    <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2 font-semibold">
                        Preview
                      </p>
                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5">
                          {
                            (
                              {
                                info: "ℹ️",
                                update: "🚀",
                                promo: "🎉",
                                alert: "⚠️",
                              } as const
                            )[notiType]
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
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold disabled:opacity-40 transition-opacity"
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

                {/* Recent Notifications */}
                <div className="space-y-4 mt-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Recent Notifications</h3>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      {notifications.length} Total
                    </span>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                      <Bell className="w-8 h-8 text-neutral-200 dark:text-neutral-800 mb-2" />
                      <p className="text-sm text-neutral-500">
                        No notifications sent yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {notifications.map((notif) => {
                        const icon =
                          {
                            info: "ℹ️",
                            update: "🚀",
                            promo: "🎉",
                            alert: "⚠️",
                          }[notif.type] || "ℹ️";

                        return (
                          <div
                            key={notif.id}
                            className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="text-xl shrink-0 mt-0.5">
                                {icon}
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
                              className="p-2 shrink-0 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
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

            {/* SETTINGS */}
            {activeTab === "settings" && (
              <div className="max-w-lg mx-auto space-y-6 mt-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-1">App Settings</h2>
                  <p className="text-sm text-neutral-500">
                    Control maintenance mode, waitlist, and pricing
                  </p>
                </div>

                {/* Mode toggles */}
                <div className="space-y-3">
                  {/* Maintenance Mode */}
                  <div className="flex items-center justify-between p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          Maintenance Mode
                        </p>
                        <p className="text-xs text-neutral-400">
                          Only admin can access. All users see maintenance
                          screen.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        toggleMaintenance(!appSettings.maintenance_mode)
                      }
                      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                        appSettings.maintenance_mode
                          ? "bg-amber-500"
                          : "bg-neutral-200 dark:bg-neutral-800"
                      }`}
                    >
                      <motion.div
                        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm"
                        animate={{
                          left: appSettings.maintenance_mode ? 22 : 2,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    </button>
                  </div>

                  {/* Waitlist Mode */}
                  <div className="flex items-center justify-between p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Waitlist Mode</p>
                        <p className="text-xs text-neutral-400">
                          Presale: users sign up &amp; pay, but see waitlist
                          screen.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleWaitlist(!appSettings.waitlist_mode)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                        appSettings.waitlist_mode
                          ? "bg-violet-500"
                          : "bg-neutral-200 dark:bg-neutral-800"
                      }`}
                    >
                      <motion.div
                        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm"
                        animate={{ left: appSettings.waitlist_mode ? 22 : 2 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    </button>
                  </div>
                </div>

                {/* Price Editor */}
                <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Pricing</p>
                      <p className="text-xs text-neutral-400">
                        Change price for welcome &amp; payment pages
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={priceInput}
                        onChange={(e) => {
                          setPriceInput(e.target.value);
                          setPriceSaved(false);
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                        min={0}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium">
                        MMK
                      </span>
                    </div>
                    <motion.button
                      onClick={updatePrice}
                      disabled={priceSaving || priceSaved}
                      className="px-5 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold disabled:opacity-50 transition-opacity"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {priceSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : priceSaved ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        "Save"
                      )}
                    </motion.button>
                  </div>

                  <p className="text-[10px] text-neutral-400 mt-3">
                    Current price:{" "}
                    <span className="font-bold">
                      {appSettings.price.toLocaleString()}
                    </span>{" "}
                    {appSettings.currency}
                  </p>
                </div>

                {/* Current status summary */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-dashed border-neutral-300 dark:border-neutral-700">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-3">
                    Current Status
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p
                        className={`text-sm font-bold ${appSettings.maintenance_mode ? "text-amber-500" : "text-emerald-500"}`}
                      >
                        {appSettings.maintenance_mode ? "ON" : "OFF"}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        Maintenance
                      </p>
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-sm font-bold ${appSettings.waitlist_mode ? "text-violet-500" : "text-emerald-500"}`}
                      >
                        {appSettings.waitlist_mode ? "ON" : "OFF"}
                      </p>
                      <p className="text-[10px] text-neutral-400">Waitlist</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">
                        {appSettings.price.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {appSettings.currency}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
