"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Mail,
  User,
  LogOut,
  Clock,
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { SwipeButton } from "@/components/ui/swipe-button";
import { createClient } from "@/lib/supabase/client";

type Step = "intro" | "form" | "payment" | "waiting";

const reviews = [
  {
    name: "Khant Si Thu",
    text: "Pyaw Kyi က သုံးရတာ တကယ်လန်းတယ်။ Voice ကနေ Text ပြောင်းတဲ့နေရာမှာ မြန်သလို တိကျမှုကလည်း တော်တော်မိုက်တယ်။",
  },
  {
    name: "Su Myat Noe",
    text: "Social Media Post တွေ ရေးရတာ အရင်ကထက် အများကြီး ပိုလွယ်သွားတယ်။ အထူးသဖြင့် Craft Mode ကို တော်တော်လေး သဘောကျမိတယ်။",
  },
  {
    name: "Ye Min Aung",
    text: "Plan Mode နဲ့ Schedule တွေ ဆွဲလိုက်တိုင်း အလုပ်တွေက ပိုပြီး စနစ်ကျလာတယ်။ ရုံးသမားတွေအတွက် တော်တော်အဆင်ပြေတယ်။ 👌",
  },
  {
    name: "Hnin Wai Phyo",
    text: "Build Mode နဲ့ Mini App တွေကို လွယ်လွယ်ကူကူ ဖန်တီးလို့ရတယ်။ ကိုယ်ပိုင် App တွေ ရေးလို့ရလာပြီလေ။",
  },
  {
    name: "Aung Ko Min",
    text: "၂၀,၀၀၀ ကျပ်နဲ့ Lifetime Access ရတာကတော့ တကယ်တန်တဲ့ ရင်းနှီးမြုပ်နှံမှုပဲ။ သုံးရတာ တော်တော်လေး အားရတယ်။",
  },
  {
    name: "Thida Kyaw",
    text: "မြန်မာလိုပါ ပြောလို့ရတာက အကြိုက်ဆုံးပဲ။ English နဲ့ Myanmar နှစ်မျိုးလုံး ရောပြောရင်တောင် AI က သေချာနားလည်ပေးတယ်။",
  },
  {
    name: "Zaw Lin Htun",
    text: "Polish Mode က Meeting မှတ်တမ်းတွေကို သပ်သပ်ရပ်ရပ်ဖြစ်အောင် ပြင်ပေးတာ တော်တော်အသုံးဝင်တယ်။",
  },
  {
    name: "Ei Mon Kyaw",
    text: "Voice to App က တကယ် အံ့ဩစရာပဲ။ စကားပြောပြလိုက်ရုံနဲ့ Website တစ်ခု ချက်ချင်း ထွက်လာတာ ရူးချင်စရာပဲ။ 🚀",
  },
];

const ReviewCard = memo(function ReviewCard({
  name,
  text,
}: {
  name: string;
  text: string;
}) {
  return (
    <div className="w-80 shrink-0 px-5 py-4 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-800/50">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-black dark:bg-white flex items-center justify-center text-[10px] font-bold text-white dark:text-black">
          {name[0]}
        </div>
        <p className="text-sm font-semibold">{name}</p>
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
        {text}
      </p>
    </div>
  );
});

// Step indicator component
function StepIndicator({
  current,
  steps,
}: {
  current: number;
  steps: string[];
}) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < current
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : i === current
                    ? "bg-black dark:bg-white text-white dark:text-black ring-4 ring-black/10 dark:ring-white/10"
                    : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 border border-neutral-200 dark:border-neutral-800"
              }`}
            >
              {i < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${
                i <= current ? "text-foreground" : "text-neutral-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-px transition-colors duration-300 ${
                i < current
                  ? "bg-black dark:bg-white"
                  : "bg-neutral-200 dark:bg-neutral-800"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

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

  const stepIndex =
    step === "intro" ? 0 : step === "form" ? 1 : step === "payment" ? 2 : 3;

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Subtle background */}
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
        <div className="flex items-center gap-3">
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
          {/* Step 1: Intro */}
          {step === "intro" && (
            <motion.div
              key="intro"
              className="flex flex-col items-center gap-8 max-w-lg w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center space-y-4">
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-500">
                    Premium Access
                  </span>
                </motion.div>

                <motion.h1
                  className="text-3xl sm:text-4xl font-bold tracking-tight"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  Unlock the Full Power
                </motion.h1>

                <motion.p
                  className="text-neutral-500 text-sm sm:text-base max-w-sm mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  Get lifetime access to all premium features — Polish, Plan,
                  Craft, Build, and Learn — with a single one-time payment.
                </motion.p>
              </div>

              <motion.div
                className="flex flex-col items-center gap-3 w-full max-w-xs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <motion.button
                  onClick={() => setStep("form")}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold shadow-lg shadow-black/10 dark:shadow-white/5"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CreditCard className="w-4 h-4" />
                  Get with 20,000 MMK
                </motion.button>
                <p className="text-xs text-neutral-400">
                  One-time payment · Lifetime access
                </p>
              </motion.div>

              {/* Reviews Marquee */}
              <div className="w-screen max-w-[100vw] mt-4 -mx-4 overflow-hidden">
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
              <StepIndicator current={1} steps={["Info", "Payment", "Done"]} />

              <motion.button
                onClick={() => setStep("intro")}
                className="self-start flex items-center gap-1.5 text-sm text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </motion.button>

              {/* Avatar */}
              {userAvatar && (
                <motion.div
                  className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 shadow-lg"
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
                <h2 className="text-xl font-bold">
                  {userName
                    ? `Hey, ${userName.split(" ")[0]}!`
                    : "Your Information"}
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Confirm your details to proceed
                </p>
              </div>

              <motion.div
                className="w-full space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
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
                className="w-full py-3.5 rounded-xl text-sm font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40 transition-all"
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
              <StepIndicator current={2} steps={["Info", "Payment", "Done"]} />

              <motion.button
                onClick={() => setStep("form")}
                className="self-start flex items-center gap-1.5 text-sm text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </motion.button>

              <div className="text-center">
                <h2 className="text-xl font-bold">Choose Payment Method</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  20,000 MMK ဖြင့်ပိုင်ဆိုင်လိုက်ပါ
                </p>
              </div>

              {/* Payment buttons */}
              <motion.div
                className="w-full grid grid-cols-2 gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {(["kbz_pay", "wave_pay"] as const).map((method) => (
                  <motion.button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    className={`p-5 rounded-2xl border-2 transition-all text-center ${
                      selectedMethod === method
                        ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 shadow-lg shadow-black/5 dark:shadow-white/5"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <p className="text-sm font-bold">
                      {method === "kbz_pay" ? "KBZ Pay" : "Wave Pay"}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">20,000 MMK</p>
                  </motion.button>
                ))}
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
                    <div className="w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white p-2 shadow-lg shadow-black/5">
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
                      className="text-xs text-neutral-400 text-center max-w-xs"
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

              {/* Swipe to send */}
              {selectedMethod && (
                <motion.div
                  className="flex flex-col items-center gap-2 w-full max-w-xs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <SwipeButton
                    onSwipeComplete={handleSwipe}
                    text="Screenshot ပေးပို့ရန်"
                    className="w-full h-12"
                  />
                  <p className="text-xs text-neutral-400">
                    Swipe to send payment screenshot via Telegram
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 4: Waiting */}
          {step === "waiting" && (
            <motion.div
              key="waiting"
              className="flex flex-col items-center gap-6 max-w-md w-full text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Pulsing Avatar */}
              <motion.div
                className="relative"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                {/* Ripple rings */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-800"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeOut",
                  }}
                  style={{ width: "100%", height: "100%" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-800"
                  animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeOut",
                    delay: 0.5,
                  }}
                  style={{ width: "100%", height: "100%" }}
                />

                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={userName}
                    width={88}
                    height={88}
                    className="w-22 h-22 rounded-full border-2 border-neutral-200 dark:border-neutral-800 relative z-10"
                    style={{ width: 88, height: 88 }}
                  />
                ) : (
                  <div
                    className="w-22 h-22 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center relative z-10"
                    style={{ width: 88, height: 88 }}
                  >
                    <Clock className="w-8 h-8 text-neutral-400" />
                  </div>
                )}

                <motion.div
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950 border-2 border-white dark:border-black flex items-center justify-center z-20"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <Clock className="w-4 h-4 text-amber-500" />
                </motion.div>
              </motion.div>

              {userName && (
                <motion.p
                  className="text-sm text-neutral-400"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {userName}
                </motion.p>
              )}

              <div>
                <motion.h2
                  className="text-2xl font-bold"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  Payment Under Review
                </motion.h2>
                <motion.p
                  className="text-sm text-neutral-500 mt-3 max-w-sm leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  We&apos;ve received your payment submission! Our admin will
                  verify it shortly. You&apos;ll be redirected automatically
                  once approved.
                </motion.p>
              </div>

              <motion.div
                className="flex items-center gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <MessageCircle className="w-5 h-5 text-neutral-400 shrink-0" />
                <p className="text-sm text-neutral-500">
                  Questions? Contact us on{" "}
                  <a
                    href="https://t.me/phyodynamic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black dark:text-white font-medium underline underline-offset-2"
                  >
                    Telegram
                  </a>
                </p>
              </motion.div>

              <motion.button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Check Status
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
