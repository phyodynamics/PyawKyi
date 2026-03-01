"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Wrench, RefreshCw, Bell, Check } from "lucide-react";

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

export default function MaintenancePage() {
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    setPushSupported(true);

    const checkPush = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        if (existing) setPushEnabled(true);
        else if (Notification.permission === "granted") {
          await subscribeToPush(reg);
        }
      } catch {}
    };
    checkPush();
  }, []);

  const subscribeToPush = async (registration: ServiceWorkerRegistration) => {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setPushEnabled(true);
    } catch {}
  };

  const handleEnablePush = async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const reg = await navigator.serviceWorker.ready;
        await subscribeToPush(reg);
      }
    } catch {}
    setSubscribing(false);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col items-center justify-center px-4">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <motion.div
        className="relative flex flex-col items-center gap-6 max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <Image
          src="/pyaw_kyi.png"
          alt="Pyaw Kyi"
          width={64}
          height={64}
          className="w-16 h-16 object-contain"
          priority
        />

        {/* Animated wrench */}
        <motion.div
          className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center"
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
        >
          <Wrench className="w-8 h-8 text-neutral-400" />
        </motion.div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Under Maintenance
          </h1>
          <p className="text-neutral-500 text-sm leading-relaxed max-w-sm">
            Pyaw Kyi ကို ပိုမိုကောင်းမွန်စေဖို့ ပြုပြင်နေပါတယ်။ ခဏအကြာမှာ
            ပြန်ဖွင့်ပေးပါမယ်။
          </p>
          <p className="text-neutral-400 text-xs mt-2">
            We&apos;re improving things. We&apos;ll be back shortly.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <motion.button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </motion.button>

          {/* Push notification button */}
          {pushSupported && !pushEnabled && (
            <motion.button
              onClick={handleEnablePush}
              disabled={subscribing}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Bell className="w-4 h-4" />
              {subscribing ? "Enabling..." : "Notify me when it\u0027s back"}
            </motion.button>
          )}

          {pushSupported && pushEnabled && (
            <motion.div
              className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Check className="w-3.5 h-3.5" />
              We&apos;ll notify you when we&apos;re back online
            </motion.div>
          )}
        </div>
      </motion.div>
    </main>
  );
}
