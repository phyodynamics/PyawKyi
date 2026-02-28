"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Mail, User, LogOut, Clock } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { GradientSlideButton } from "@/components/ui/gradient-slide-button";
import { SwipeButton } from "@/components/ui/swipe-button";
import { createClient } from "@/lib/supabase/client";

type Step = "intro" | "form" | "payment" | "waiting";

// Burmese reviews for the animated list
const reviews = [
  {
    name: "Khant Si Thu",
    text: "Pyaw Kyi က သုံးရတာ တကယ်လန်းတယ်။ Voice ကနေ Text ပြောင်းတဲ့နေရာမှာ မြန်သလို တိကျမှုကလည်း တော်တော်မိုက်တယ်။",
    stars: 5,
  },
  {
    name: "Su Myat Noe",
    text: "Social Media Post တွေ ရေးရတာ အရင်ကထက် အများကြီး ပိုလွယ်သွားတယ်။ အထူးသဖြင့် Craft Mode ကို တော်တော်လေး သဘောကျမိတယ်။",
    stars: 5,
  },
  {
    name: "Ye Min Aung",
    text: "Plan Mode နဲ့ Schedule တွေ ဆွဲလိုက်တိုင်း အလုပ်တွေက ပိုပြီး စနစ်ကျလာတယ်။ ရုံးသမားတွေအတွက် တော်တော်အဆင်ပြေတယ်။ 👌",
    stars: 5,
  },
  {
    name: "Hnin Wai Phyo",
    text: "Build Mode နဲ့ Mini App တွေကို လွယ်လွယ်ကူကူ ဖန်တီးလို့ရတယ်။ ကိုယ်က Developer မဟုတ်ပေမယ့် ကိုယ်ပိုင် App တွေ ရေးလို့ရလာပြီလေ။",
    stars: 4,
  },
  {
    name: "Aung Ko Min",
    text: "၂၀,၀၀၀ ကျပ်နဲ့ Lifetime Access ရတာကတော့ တကယ်တန်တဲ့ ရင်းနှီးမြုပ်နှံမှုပဲ။ သုံးရတာ တော်တော်လေး အားရတယ်။",
    stars: 5,
  },
  {
    name: "Thida Kyaw",
    text: "မြန်မာလိုပါ ပြောလို့ရတာက အကြိုက်ဆုံးပဲ။ English နဲ့ Myanmar နှစ်မျိုးလုံး ရောပြောရင်တောင် AI က သေချာနားလည်ပေးတယ်။",
    stars: 5,
  },
  {
    name: "Zaw Lin Htun",
    text: "Polish Mode က Meeting မှတ်တမ်းတွေကို သပ်သပ်ရပ်ရပ်ဖြစ်အောင် ပြင်ပေးတာ တော်တော်အသုံးဝင်တယ်။ လက်တွေ့လုပ်ငန်းခွင်မှာ တကယ်အဆင်ပြေတယ်။",
    stars: 4,
  },
  {
    name: "Ei Mon Kyaw",
    text: "Voice to App က တကယ် အံ့ဩစရာပဲ။ စကားပြောပြလိုက်ရုံနဲ့ Website တစ်ခု ချက်ချင်း ထွက်လာတာ ရူးချင်စရာပဲ။ 🚀",
    stars: 5,
  },
];

// Text animation variants
const textVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1] as const,
    },
  }),
};

const ReviewCard = memo(function ReviewCard({
  name,
  text,
}: {
  name: string;
  text: string;
  stars: number;
}) {
  return (
    <div className="w-80 shrink-0 px-5 py-4 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80">
      <p className="text-sm font-semibold mb-1.5">{name}</p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
        {text}
      </p>
    </div>
  );
});

export default function PendingPage() {
  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<
    "kbz_pay" | "wave_pay" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        const fullName =
          user.user_metadata?.full_name || user.user_metadata?.name || "";
        setName(fullName);
        setUserName(fullName);
        setUserAvatar(
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        );
      }

      if (user) {
        const { data } = await supabase
          .from("payment_submissions")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .limit(1);
        if (data && data.length > 0) {
          setHasSubmitted(true);
          setStep("waiting");
        }
      }
    };
    loadUser();
  }, []);

  const handleSubmitForm = async () => {
    if (!name.trim() || !email.trim()) return;
    setStep("payment");
  };

  const handleSubmitPayment = async () => {
    if (!selectedMethod) return;
    setSubmitting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("payment_submissions").insert({
        user_id: user.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        payment_method: selectedMethod,
      });

      await supabase
        .from("users")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", user.id);
    }

    setSubmitting(false);
    setHasSubmitted(true);
    setStep("waiting");
  };

  const handleSwipe = () => {
    handleSubmitPayment().then(() => {
      setTimeout(() => {
        window.open("https://t.me/phyodynamic", "_blank");
      }, 500);
    });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/welcome";
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
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
        <div className="flex items-center gap-3">
          {/* User profile in header */}
          {userAvatar && (
            <div className="flex items-center gap-2">
              <Image
                src={userAvatar}
                alt={userName}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-800"
              />
              <span className="text-sm font-medium hidden sm:block">
                {userName}
              </span>
            </div>
          )}
          <motion.button
            onClick={handleLogout}
            className="p-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-4 h-4 text-neutral-500" />
          </motion.button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pt-24 pb-16">
        <AnimatePresence mode="wait">
          {/* Step 1: Intro with Animated Reviews */}
          {step === "intro" && (
            <motion.div
              key="intro"
              className="flex flex-col items-center gap-8 max-w-lg w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center space-y-3">
                <motion.h1
                  className="text-2xl sm:text-3xl font-bold"
                  custom={0}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  Unlock the Full Power of Pyaw Kyi
                </motion.h1>
                <motion.p
                  className="text-neutral-500 text-sm sm:text-base max-w-sm mx-auto"
                  custom={1}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  Get lifetime access to all premium features — Polish, Plan,
                  Craft, Build, and Learn — with a single one-time payment.
                </motion.p>
              </div>

              <motion.div
                className="flex flex-col items-center gap-2"
                custom={2}
                variants={textVariants}
                initial="hidden"
                animate="visible"
              >
                <GradientSlideButton
                  onClick={() => setStep("form")}
                  className="px-10 py-3 text-base font-semibold rounded-xl h-12"
                  colorFrom="#000000"
                  colorTo="#333333"
                >
                  🎉 Get with 20,000 MMK
                </GradientSlideButton>
                <p className="text-xs text-neutral-400">
                  One-time payment · Lifetime access
                </p>
              </motion.div>

              {/* Reviews Marquee */}
              <div className="w-screen max-w-[100vw] mt-6 -mx-4 overflow-hidden">
                <Marquee direction="left" duration={50} repeat={4}>
                  {reviews.map((review, i) => (
                    <ReviewCard key={i} {...review} />
                  ))}
                </Marquee>
              </div>
            </motion.div>
          )}

          {/* Step 2: User Form */}
          {step === "form" && (
            <motion.div
              key="form"
              className="flex flex-col items-center gap-6 max-w-md w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <motion.button
                onClick={() => setStep("intro")}
                className="self-start flex items-center gap-1 text-sm text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </motion.button>

              {/* Avatar */}
              {userAvatar && (
                <motion.div
                  className="w-20 h-20 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-neutral-800"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <Image
                    src={userAvatar}
                    alt="Profile"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              )}

              <div className="text-center">
                <motion.h2
                  className="text-xl font-bold"
                  custom={0}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {userName
                    ? `Hey, ${userName.split(" ")[0]}!`
                    : "Your Information"}
                </motion.h2>
                <motion.p
                  className="text-sm text-neutral-500 mt-1"
                  custom={1}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  Confirm your details to proceed
                </motion.p>
              </div>

              <motion.div
                className="w-full space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-shadow"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Gmail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@gmail.com"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-shadow"
                    readOnly
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone{" "}
                    <span className="text-neutral-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xxxxxxxxx"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-shadow"
                  />
                </div>
              </motion.div>

              <motion.button
                onClick={handleSubmitForm}
                disabled={!name.trim() || !email.trim()}
                className="w-full py-3 rounded-xl text-sm font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40 transition-opacity"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Continue to Payment
              </motion.button>
            </motion.div>
          )}

          {/* Step 3: Payment Method */}
          {step === "payment" && (
            <motion.div
              key="payment"
              className="flex flex-col items-center gap-6 max-w-md w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <motion.button
                onClick={() => setStep("form")}
                className="self-start flex items-center gap-1 text-sm text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </motion.button>

              <div className="text-center">
                <motion.h2
                  className="text-xl font-bold"
                  custom={0}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  Choose Payment Method
                </motion.h2>
                <motion.p
                  className="text-sm text-neutral-500 mt-1"
                  custom={1}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  20,000 MMK ဖြင့်ပိုင်ဆိုင်လိုက်ပါ
                </motion.p>
              </div>

              {/* Payment buttons */}
              <motion.div
                className="w-full grid grid-cols-2 gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <motion.button
                  onClick={() => setSelectedMethod("kbz_pay")}
                  className={`p-4 rounded-2xl border-2 transition-all text-center ${
                    selectedMethod === "kbz_pay"
                      ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-950"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <p className="text-sm font-semibold">KBZ Pay</p>
                  <p className="text-xs text-neutral-400 mt-0.5">20,000 MMK</p>
                </motion.button>

                <motion.button
                  onClick={() => setSelectedMethod("wave_pay")}
                  className={`p-4 rounded-2xl border-2 transition-all text-center ${
                    selectedMethod === "wave_pay"
                      ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-950"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <p className="text-sm font-semibold">Wave Pay</p>
                  <p className="text-xs text-neutral-400 mt-0.5">20,000 MMK</p>
                </motion.button>
              </motion.div>

              {/* QR Code Display */}
              <AnimatePresence mode="wait">
                {selectedMethod && (
                  <motion.div
                    key={selectedMethod}
                    className="w-full flex flex-col items-center gap-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white p-2">
                      <Image
                        src={
                          selectedMethod === "kbz_pay"
                            ? "/Kpay.jpg"
                            : "/Wave.jpg"
                        }
                        alt={
                          selectedMethod === "kbz_pay"
                            ? "KBZ Pay QR"
                            : "Wave Pay QR"
                        }
                        width={280}
                        height={280}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                    <motion.p
                      className="text-xs text-neutral-400 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      Scan QR code with{" "}
                      {selectedMethod === "kbz_pay" ? "KBZ Pay" : "Wave Pay"}{" "}
                      app, then screenshot and send via Telegram
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Swipe to send screenshot */}
              {selectedMethod && (
                <motion.div
                  className="flex flex-col items-center gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <SwipeButton
                    onSwipeComplete={handleSwipe}
                    text="Screenshot ပေးပို့ရန်"
                    className="w-[280px] h-12"
                  />
                  <p className="text-xs text-neutral-400">
                    Swipe to send payment screenshot via Telegram
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 4: Waiting for admin approval */}
          {step === "waiting" && (
            <motion.div
              key="waiting"
              className="flex flex-col items-center gap-6 max-w-md w-full text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* User Avatar */}
              {userAvatar ? (
                <motion.div
                  className="relative"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <Image
                    src={userAvatar}
                    alt={userName}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full border-2 border-neutral-200 dark:border-neutral-800"
                  />
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-900 border-2 border-white dark:border-black flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Clock className="w-8 h-8 text-neutral-500" />
                </motion.div>
              )}

              {/* User Name */}
              {userName && (
                <motion.p
                  className="text-sm text-neutral-400"
                  custom={0}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {userName}
                </motion.p>
              )}

              <div>
                <motion.h2
                  className="text-xl font-bold"
                  custom={1}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  Payment Under Review
                </motion.h2>
                <motion.p
                  className="text-sm text-neutral-500 mt-2 max-w-sm"
                  custom={2}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  We&apos;ve received your payment submission! Our admin will
                  verify it shortly. You&apos;ll be redirected automatically
                  once approved.
                </motion.p>
              </div>

              <motion.div
                className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-500"
                custom={3}
                variants={textVariants}
                initial="hidden"
                animate="visible"
              >
                <p>
                  💬 Questions? Contact us on{" "}
                  <a
                    href="https://t.me/phyodynamic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black dark:text-white underline"
                  >
                    Telegram
                  </a>
                </p>
              </motion.div>

              <motion.button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                custom={4}
                variants={textVariants}
                initial="hidden"
                animate="visible"
              >
                Check Status
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
