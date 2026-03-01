"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  Bell,
  RefreshCw,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function WaitlistPage() {
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserName(
          user.user_metadata?.full_name || user.user_metadata?.name || "",
        );
        setUserAvatar(
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        );

        // Get waitlist position (order by created_at)
        const { data: allUsers } = await supabase
          .from("users")
          .select("id, created_at")
          .order("created_at", { ascending: true });

        if (allUsers) {
          const idx = allUsers.findIndex(
            (u: { id: string }) => u.id === user.id,
          );
          if (idx >= 0) setPosition(idx + 1);
        }
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/welcome";
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4 md:px-8 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-900">
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
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-16">
        <motion.div
          className="relative flex flex-col items-center gap-6 max-w-md text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Avatar with badge */}
          <div className="relative">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full border-2 border-neutral-200 dark:border-neutral-800"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                <Users className="w-8 h-8 text-neutral-400" />
              </div>
            )}
            <motion.div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950 border-2 border-white dark:border-black flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Clock className="w-4 h-4 text-amber-500" />
            </motion.div>
          </div>

          {/* Waitlist position */}
          {position && (
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                #{position} in waitlist
              </span>
            </motion.div>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              You&apos;re on the Waitlist! 🎉
            </h1>
            <p className="text-neutral-500 text-sm leading-relaxed max-w-sm">
              {userName ? `${userName.split(" ")[0]}, ` : ""}
              Pyaw Kyi ကို Presale ကာလအတွင်း စာရင်းပေးသွင်းထားပြီးပါပြီ။
              အသုံးပြုခွင့်ဖွင့်ပေးသည့်အခါ အကြောင်းကြားပေးပါမယ်။
            </p>
          </div>

          {/* Status info */}
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400 text-left">
                Account created successfully
              </p>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <Bell className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400 text-left">
                We&apos;ll notify you when the app goes live
              </p>
            </div>
          </div>

          <motion.button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className="w-4 h-4" />
            Check Status
          </motion.button>
        </motion.div>
      </div>
    </main>
  );
}
