"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Shield, KeyRound, Sparkles } from "lucide-react";

type Stage = "welcome" | "auth" | "credentials" | "ready" | "exit";

interface WelcomeAnimationProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string | null;
  authStage?: "welcome" | "auth" | "credentials" | "ready";
}

const STAGE_CONFIG = {
  welcome: {
    label: "Welcome to Pyaw Kyi",
    sublabel: "ပြောလိုက်ယုံပါပဲ · Just Say It",
    icon: null,
  },
  auth: {
    label: "Checking Authentication",
    sublabel: "Verifying your account...",
    icon: Shield,
  },
  credentials: {
    label: "Getting Credentials",
    sublabel: "Loading your data...",
    icon: KeyRound,
  },
  ready: {
    label: "All Set!",
    sublabel: "Let's get started",
    icon: Sparkles,
  },
};

export function WelcomeAnimation({
  onComplete,
  userName,
  userAvatar,
  authStage = "welcome",
}: WelcomeAnimationProps) {
  const [displayStage, setDisplayStage] = useState<Stage>("welcome");

  // React to external authStage changes
  useEffect(() => {
    setDisplayStage(authStage);
  }, [authStage]);

  // Once we hit "ready", wait a beat then exit
  useEffect(() => {
    if (displayStage === "ready") {
      const timer = setTimeout(() => setDisplayStage("exit"), 800);
      return () => clearTimeout(timer);
    }
  }, [displayStage]);

  useEffect(() => {
    if (displayStage === "exit") {
      const timer = setTimeout(() => onComplete(), 500);
      return () => clearTimeout(timer);
    }
  }, [displayStage, onComplete]);

  const config =
    displayStage !== "exit"
      ? STAGE_CONFIG[displayStage]
      : STAGE_CONFIG["ready"];
  const StageIcon = config.icon;

  // Progress width based on stage
  const progressMap: Record<Stage, string> = {
    welcome: "15%",
    auth: "45%",
    credentials: "75%",
    ready: "100%",
    exit: "100%",
  };

  return (
    <AnimatePresence>
      {displayStage !== "exit" && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col items-center gap-6 max-w-sm px-6">
            {/* Logo */}
            <motion.div
              className="relative w-32 h-32 md:w-40 md:h-40"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image
                src="/pyaw_kyi.png"
                alt="Pyaw Kyi Logo"
                fill
                className="object-contain"
                priority
              />
            </motion.div>

            {/* Stage Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={displayStage}
                className="text-center flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {/* Stage icon */}
                {StageIcon && (
                  <motion.div
                    className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                  >
                    <StageIcon className="w-5 h-5 text-foreground" />
                  </motion.div>
                )}

                {/* Stage label */}
                <div>
                  <p className="text-lg md:text-xl font-semibold text-foreground">
                    {config.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {config.sublabel}
                  </p>
                </div>

                {/* User info — only on welcome stage */}
                {displayStage === "welcome" && userName && (
                  <motion.div
                    className="flex items-center justify-center gap-2.5 mt-1"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {userAvatar && (
                      <Image
                        src={userAvatar}
                        alt={userName}
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded-full border border-border"
                      />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {userName}
                    </span>
                  </motion.div>
                )}

                {/* Loading dots for auth/credentials stages */}
                {(displayStage === "auth" ||
                  displayStage === "credentials") && (
                  <div className="flex items-center gap-1 mt-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-foreground/40"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Checkmark for ready stage */}
                {displayStage === "ready" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                    }}
                    className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center"
                  >
                    <svg
                      className="w-4 h-4 text-background"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-20 w-48">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-foreground rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: progressMap[displayStage] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
              Built by Phyo Zin Ko
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
