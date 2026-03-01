"use client";

import { useEffect, useState, useCallback, memo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Sparkles,
  ClipboardList,
  Palette,
  Code,
  BookOpen,
  Mic,
  ArrowRight,
  Check,
  Shield,
  Zap,
  Star,
  Bell,
} from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { createClient } from "@/lib/supabase/client";

// Google Logo SVG Component
const GoogleLogo = memo(function GoogleLogo({
  className,
}: {
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
});

const features = [
  {
    icon: Sparkles,
    title: "Polish",
    subtitle: "Voice → Text",
    description:
      "စကားပြောဆိုချက်တွေကို ဖတ်ရလွယ်ကူတဲ့ စာသားအဖြစ် ပြောင်းပေးပါတယ်။",
  },
  {
    icon: ClipboardList,
    title: "Plan",
    subtitle: "Voice → Schedule",
    description:
      "စိတ်ကူးထဲရှိတဲ့ အကြောင်းအရာတွေကို Action Plan, Checklist တွေအဖြစ် ဆွဲပေးပါတယ်။",
  },
  {
    icon: Palette,
    title: "Craft",
    subtitle: "Voice → Content",
    description:
      "ပြောလိုက်တဲ့ စကားတွေကို Social Media Post တွေအဖြစ် Emoji, Hashtag တွေနဲ့ ပြင်ဆင်ပေးပါတယ်။",
  },
  {
    icon: Code,
    title: "Build",
    subtitle: "Voice → Code",
    description:
      "App Idea တွေကို ပြောပြလိုက်ရုံနဲ့ အလုပ်လုပ်တဲ့ HTML Code တွေကို ရေးသားပေးမှာ ဖြစ်ပါတယ်။",
  },
  {
    icon: BookOpen,
    title: "Learn",
    subtitle: "Voice → Notes",
    description:
      "ရှည်လျားတဲ့ စာတွေကို Study Notes, Flashcards တွေ ဖန်တီးပေးပါတယ်။",
  },
];

const pricingFeatures = [
  { text: "Modes ၅ မျိုး (Polish, Plan, Craft, Build, Learn)", icon: Zap },
  { text: "Burmese & English Support", icon: Star },
  { text: "Unlimited Voice Input", icon: Mic },
  { text: "Save & History", icon: Shield },
  { text: "PyawKyi API Key (Apple Shortcuts & Integrations)", icon: Code },
  { text: "Lifetime Updates", icon: Sparkles },
];

interface UserAvatar {
  src: string;
  alt: string;
}

export default function WelcomePage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState<UserAvatar[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [price, setPrice] = useState(20000);
  const [currency, setCurrency] = useState("MMK");
  const [showNotiPrompt, setShowNotiPrompt] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const supabase = createClient();
      const { data, count } = await supabase
        .from("users")
        .select("avatar_url, name", { count: "exact" })
        .not("avatar_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        const realAvatars = data
          .filter((u: any) => u.avatar_url)
          .map((u: any) => ({
            src: u.avatar_url!,
            alt: u.name || "User",
          }));
        setAvatars(realAvatars);
      }
      if (count !== null) setUserCount(count);
    };
    loadUsers();

    // Fetch dynamic price
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.price) setPrice(data.price);
          if (data.currency) setCurrency(data.currency);
        }
      } catch {}
    };
    loadSettings();

    // Web push notification prompt
    const timer = setTimeout(() => {
      if ("Notification" in window && Notification.permission === "default") {
        setShowNotiPrompt(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth") {
      setError("Authentication failed. Please try again.");
    }
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }, [loading]);

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white overflow-hidden">
      {/* Subtle background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

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
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
        >
          <GoogleLogo className="w-4 h-4" />
          {loading ? "Connecting..." : "Sign In"}
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-24 pb-20">
        {/* Decorative gradient blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neutral-200/40 dark:bg-neutral-800/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neutral-300/30 dark:bg-neutral-700/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl">
          {/* Badge */}
          <motion.div
            className="flex items-center gap-2.5 px-5 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Mic className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs font-medium text-neutral-500">
              Voice-Powered AI Tool
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </motion.div>

          {/* Animated title */}
          <div className="text-center">
            <motion.h1
              className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.4, duration: 0.7 }}
            >
              Pyaw Kyi
            </motion.h1>
            <motion.p
              className="mt-3 text-lg sm:text-xl text-neutral-400 font-light"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              ပြောလိုက်ရုံပါပဲ · Just Say It
            </motion.p>
          </div>

          {/* Subtitle */}
          <motion.p
            className="text-center text-base sm:text-lg text-neutral-500 max-w-lg leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            သင့်အသံကို AI ကနေတဆင့် သပ်ရပ်တဲ့ စာသားတွေ၊ စနစ်ကျတဲ့ Action Plan
            တွေ၊ ဆွဲဆောင်မှုရှိတဲ့ Social Media ပို့စ်တွေနဲ့ Website Code
            တွေအဖြစ် ပြောင်းလဲပေးမှာပါ။
          </motion.p>

          {/* CTA Button */}
          <motion.div
            className="flex flex-col items-center gap-4 w-full max-w-xs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 px-4 py-2.5 rounded-xl w-full text-center">
                {error}
              </p>
            )}
            <motion.button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-black/10 dark:shadow-white/5"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <GoogleLogo className="w-5 h-5" />
              {loading ? "Connecting..." : "Continue with Google"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
            <p className="text-xs text-neutral-400 text-center">
              အကောင့်ဖွင့်ရန် အခမဲ့ · တစ်ကြိမ်ပေးသွင်းရုံဖြင့်
              တစ်သက်တာအသုံးပြုနိုင်သည်
            </p>
          </motion.div>

          {/* Social Proof */}
          {avatars.length > 0 && (
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.5 }}
            >
              <div className="flex -space-x-2.5">
                {avatars.slice(0, 5).map((avatar, i) => (
                  <Image
                    key={i}
                    src={avatar.src}
                    alt={avatar.alt}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-black object-cover"
                  />
                ))}
              </div>
              <p className="text-xs text-neutral-400">
                {userCount > 0
                  ? `${userCount}+ users already joined`
                  : "Join creators using PyawKyi"}
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 py-24 md:px-8 border-t border-neutral-100 dark:border-neutral-900">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 mb-4">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              PyawKyi နဲ့ ဘာတွေလုပ်လို့ရလဲ
            </h2>
            <p className="text-neutral-500 max-w-md mx-auto">
              Modes ၅ မျိုးနဲ့ သင့်အသံကို လိုချင်တဲ့ format အဖြစ်
              ပြောင်းလဲပေးပါတယ်
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="group relative p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-5 h-5 text-white dark:text-black" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">{feature.title}</h3>
                    <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                      {feature.subtitle}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Mode Marquee */}
          <div className="mt-16 w-screen max-w-[100vw] -mx-4 md:-mx-8 overflow-hidden">
            <Marquee direction="left" duration={20} repeat={4}>
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-900 shrink-0"
                >
                  <f.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{f.title}</span>
                </div>
              ))}
            </Marquee>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative px-4 py-24 md:px-8 border-t border-neutral-100 dark:border-neutral-900">
        <div className="max-w-sm mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 mb-4">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">
              Simple Pricing
            </h2>
            <p className="text-neutral-500 text-sm">
              တစ်ကြိမ်ပေးချေ · Subscription မလို
            </p>
          </motion.div>

          <motion.div
            className="relative p-8 rounded-3xl border-2 border-black dark:border-white overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Subtle gradient inside card */}
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-950 dark:to-black pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <span className="px-3 py-1 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest">
                  Lifetime Access
                </span>
              </div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-bold tracking-tight">
                  {price.toLocaleString()}
                </span>
                <span className="text-lg text-neutral-400 font-medium">
                  {currency}
                </span>
              </div>

              {/* Pricing features */}
              <div className="space-y-3.5 mb-8">
                {pricingFeatures.map((feat) => (
                  <div key={feat.text} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-black dark:bg-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white dark:text-black" />
                    </div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {feat.text}
                    </span>
                  </div>
                ))}
              </div>

              <motion.button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <GoogleLogo className="w-4 h-4" />
                {loading ? "Connecting..." : "Get Started"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-10 text-center border-t border-neutral-100 dark:border-neutral-900">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image
            src="/pyaw_kyi.png"
            alt="Pyaw Kyi"
            width={20}
            height={20}
            className="w-5 h-5 object-contain opacity-50"
          />
          <span className="text-xs text-neutral-400 font-medium">Pyaw Kyi</span>
        </div>
        <p className="text-xs text-neutral-400">
          © 2026 Pyaw Kyi. Built with ❤️ in Myanmar.
        </p>
      </footer>

      {/* Web Push Notification Prompt */}
      {showNotiPrompt && (
        <motion.div
          className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-black/10 dark:shadow-black/40"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-white dark:text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Stay Updated</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Get notified when we launch new features.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={async () => {
                    try {
                      const permission = await Notification.requestPermission();
                      if (permission === "granted") {
                        setShowNotiPrompt(false);
                      }
                    } catch {}
                    setShowNotiPrompt(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Allow
                </button>
                <button
                  onClick={() => setShowNotiPrompt(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </main>
  );
}
