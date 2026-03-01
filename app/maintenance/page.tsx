"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Wrench, RefreshCw } from "lucide-react";

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col items-center justify-center px-4">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear_gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

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

        <motion.button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </motion.button>
      </motion.div>
    </main>
  );
}
