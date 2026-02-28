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
} from "lucide-react";
import { StaggerBlurEffect } from "@/components/ui/stagger-blur-effect";
import { SocialProofAvatars } from "@/components/ui/social-proof-avatars";
import { Marquee } from "@/components/ui/marquee";
import { GradientSlideButton } from "@/components/ui/gradient-slide-button";
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
    description:
      "သင့်အသံကို ပြည့်စုံသော စာသားအဖြစ် ပြောင်းလဲပေးပါတယ်။ Grammar, punctuation အားလုံး ပြင်ပေးပါတယ်။",
  },
  {
    icon: ClipboardList,
    title: "Plan",
    description:
      "သင်ပြောလိုက်တဲ့ အကြံဥာဏ်ကို Action Plan, Schedule, Checklist အဖြစ် စီစဉ်ပေးပါတယ်။",
  },
  {
    icon: Palette,
    title: "Craft",
    description:
      "Social media post များကို professional ဆန်ဆန် ဖန်တီးပေးပါတယ်။ Emoji, hashtag အပြည့်အစုံပါပါတယ်။",
  },
  {
    icon: Code,
    title: "Build",
    description:
      "သင့်အသံနဲ့ app idea ကို ပြောလိုက်ယုံပါပဲ။ Working HTML prototype ရရှိပါမယ်။",
  },
  {
    icon: BookOpen,
    title: "Learn",
    description:
      "သင်လေ့လာနေတဲ့ အကြောင်းအရာကို ပြောလိုက်ယုံပါပဲ။ Study Notes, Key Concepts, Flashcards ရရှိပါမယ်။",
  },
];

const pricingFeatures = [
  "Modes ၅ မျိုး (Polish, Plan, Craft, Build, Learn)",
  "Burmese & English Support",
  "Unlimited Voice Input",
  "Save & History",
  "Lifetime Updates",
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

  // Load real user avatars from Supabase
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
          .filter((u) => u.avatar_url)
          .map((u) => ({
            src: u.avatar_url!,
            alt: u.name || "User",
          }));
        setAvatars(realAvatars);
      }
      if (count !== null) {
        setUserCount(count);
      }
    };
    loadUsers();
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
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
        >
          <GoogleLogo className="w-4 h-4" />
          {loading ? "Connecting..." : "Sign In"}
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-24 pb-20">
        <div className="relative z-10 flex flex-col items-center gap-7 max-w-2xl">
          {/* Badge */}
          <motion.div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Mic className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs font-medium text-neutral-500">
              Voice-Powered AI Tool
            </span>
          </motion.div>

          {/* Animated title */}
          <div className="text-center">
            <StaggerBlurEffect className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight">
              Pyaw Kyi
            </StaggerBlurEffect>
            <motion.p
              className="mt-3 text-lg sm:text-xl text-neutral-400 font-light"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              ပြောလိုက်ယုံပါပဲ · Just Say It
            </motion.p>
          </div>

          {/* Subtitle */}
          <motion.p
            className="text-center text-base sm:text-lg text-neutral-500 max-w-lg leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            သင့်အသံကို AI နဲ့ polished text, action plan, social media post,
            working code အဖြစ် ပြောင်းလဲပေးတဲ့ tool
          </motion.p>

          {/* CTA Button with Google Logo */}
          <motion.div
            className="flex flex-col items-center gap-4 w-full max-w-xs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 px-4 py-2 rounded-xl w-full text-center">
                {error}
              </p>
            )}
            <GradientSlideButton
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-sm font-semibold h-12"
              colorFrom="#000000"
              colorTo="#333333"
            >
              <GoogleLogo className="w-5 h-5" />
              {loading ? "Connecting..." : "Continue with Google"}
            </GradientSlideButton>
            <p className="text-xs text-neutral-400 text-center">
              Account ဖန်တီးရန် အခမဲ့ · တစ်ကြိမ်ပေးချေ · တစ်သက်တာ
            </p>
          </motion.div>

          {/* Social Proof - Real users from Supabase */}
          {avatars.length > 0 && (
            <motion.div
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              <SocialProofAvatars
                avatars={avatars}
                extraCount={userCount > 5 ? userCount - 5 : undefined}
                stars={false}
              >
                <p className="text-xs text-neutral-400">
                  {userCount > 0
                    ? `${userCount} users already using PyawKyi`
                    : "Join creators using PyawKyi"}
                </p>
              </SocialProofAvatars>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 py-24 md:px-8 border-t border-neutral-100 dark:border-neutral-900">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              PyawKyi နဲ့ ဘာတွေလုပ်လို့ရလဲ
            </h2>
            <p className="text-neutral-500 max-w-md mx-auto">
              Modes ၅ မျိုးနဲ့ သင့်အသံကို လိုချင်တဲ့ format အဖြစ်
              ပြောင်းလဲပေးပါတယ်
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="group relative p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-5 h-5 text-white dark:text-black" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
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
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Simple Pricing
            </h2>
            <p className="text-neutral-500 text-sm">
              တစ်ကြိမ်ပေးချေ · Subscription မလို
            </p>
          </motion.div>

          <motion.div
            className="p-8 rounded-2xl border-2 border-black dark:border-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4">
              Lifetime Access
            </p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold">20,000</span>
              <span className="text-lg text-neutral-400 font-medium">MMK</span>
            </div>

            {/* Pricing features */}
            <div className="space-y-3 mb-8">
              {pricingFeatures.map((feat) => (
                <div key={feat} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-black dark:bg-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white dark:text-black" />
                  </div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {feat}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <GoogleLogo className="w-4 h-4" />
              {loading ? "Connecting..." : "Get Started"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center border-t border-neutral-100 dark:border-neutral-900">
        <p className="text-xs text-neutral-400">
          © 2025 Pyaw Kyi. Built with ❤️ in Myanmar.
        </p>
      </footer>
    </main>
  );
}
