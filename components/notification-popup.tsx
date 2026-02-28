"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "update" | "promo" | "alert";
  created_at: string;
  is_read?: boolean;
}

const TYPE_STYLES: Record<string, { bg: string; icon: string }> = {
  info: { bg: "bg-blue-500", icon: "ℹ️" },
  update: { bg: "bg-green-500", icon: "🚀" },
  promo: { bg: "bg-purple-500", icon: "🎉" },
  alert: { bg: "bg-red-500", icon: "⚠️" },
};

// Convert VAPID public key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationPopup() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<Notification | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  // Register service worker and subscribe to push
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setPushSupported(true);

    const registerPush = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          setPushEnabled(true);
          return;
        }
        // Check if permission was already granted
        if (Notification.permission === "granted") {
          await subscribeToPush(registration);
        }
      } catch {
        // Service worker or push not available
      }
    };
    registerPush();
  }, []);

  const subscribeToPush = async (registration: ServiceWorkerRegistration) => {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const convertedKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey.buffer as ArrayBuffer,
      });

      // Send subscription to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      setPushEnabled(true);
    } catch {
      // User denied or error
    }
  };

  const handleEnablePush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        await subscribeToPush(registration);
      }
    } catch {
      // Permission denied
    }
  };

  // Load existing notifications
  const loadNotifications = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !data) return;

      setNotifications(data);

      // Check which ones are read (from localStorage)
      try {
        const readIds = JSON.parse(
          localStorage.getItem("pyawkyi_read_notifications") || "[]",
        );
        const unread = data.filter(
          (n: Notification) => !readIds.includes(n.id),
        ).length;
        setUnreadCount(unread);
      } catch {
        setUnreadCount(data.length);
      }
    } catch {
      // Notifications table might not exist yet — fail silently
    }
  }, []);

  // Subscribe to realtime notifications
  useEffect(() => {
    loadNotifications();

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;

    try {
      const supabase = createClient();
      channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
          },
          (payload: { new: Record<string, unknown> }) => {
            const newNotif = payload.new as unknown as Notification;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            // Show toast popup
            setToast(newNotif);
            // Auto-dismiss toast after 6 seconds
            setTimeout(() => setToast(null), 6000);
          },
        )
        .subscribe();
    } catch {
      // Realtime not available — fail silently
    }

    return () => {
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [loadNotifications]);

  const markAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    try {
      localStorage.setItem(
        "pyawkyi_read_notifications",
        JSON.stringify(allIds),
      );
    } catch {
      // localStorage not available (e.g. Safari private mode)
    }
    setUnreadCount(0);
  }, [notifications]);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const togglePanel = useCallback(() => {
    setShowPanel((prev) => {
      if (!prev) {
        // Opening panel — mark all as read
        markAllRead();
      }
      return !prev;
    });
  }, [markAllRead]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <>
      {/* Bell Icon Button */}
      <motion.button
        onClick={togglePanel}
        className="relative p-2 sm:p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
        whileTap={{ scale: 0.95 }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <motion.span
            className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPanel(false)}
            />
            {/* Panel — fixed position for mobile compatibility */}
            <motion.div
              className="fixed right-2 left-2 sm:left-auto sm:right-4 top-14 sm:top-16 sm:w-80 max-h-[70vh] overflow-y-auto bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50"
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-900 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm rounded-t-2xl z-10">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-semibold">Notifications</span>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              {/* List */}
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Bell className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mb-2" />
                  <p className="text-sm text-neutral-400">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {notifications.map((notif) => {
                    const style = TYPE_STYLES[notif.type] || TYPE_STYLES.info;
                    return (
                      <div
                        key={notif.id}
                        className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-base mt-0.5 shrink-0">
                            {style.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">
                              {notif.title}
                            </p>
                            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-1">
                              {formatTime(notif.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Push notification enable/status */}
              <div className="sticky bottom-0 px-4 py-3 border-t border-neutral-100 dark:border-neutral-900 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm rounded-b-2xl">
                {!pushSupported ? (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                    Push notifications not supported in this browser
                  </div>
                ) : pushEnabled ? (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Push notifications enabled
                  </div>
                ) : (
                  <button
                    onClick={handleEnablePush}
                    className="w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    🔔 Enable Push Notifications
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Popup (for new realtime notifications) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed top-3 right-3 left-3 sm:left-auto sm:right-4 sm:top-4 z-[9999] sm:w-80 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Color bar */}
            <div
              className={`h-1 ${TYPE_STYLES[toast.type]?.bg || "bg-blue-500"}`}
            />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-lg mt-0.5 shrink-0">
                    {TYPE_STYLES[toast.type]?.icon || "ℹ️"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">
                      {toast.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      {toast.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismissToast}
                  className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              </div>
            </div>
            {/* Auto-dismiss progress bar */}
            <motion.div
              className={`h-0.5 ${TYPE_STYLES[toast.type]?.bg || "bg-blue-500"}`}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 6, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
