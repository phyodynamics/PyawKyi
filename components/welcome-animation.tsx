"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

interface WelcomeAnimationProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string | null;
}

export function WelcomeAnimation({
  onComplete,
  userName,
  userAvatar,
}: WelcomeAnimationProps) {
  const [stage, setStage] = useState<"logo" | "text" | "exit">("logo");

  useEffect(() => {
    const logoTimer = setTimeout(() => setStage("text"), 800);
    const textTimer = setTimeout(() => setStage("exit"), 2200);
    const exitTimer = setTimeout(() => onComplete(), 2800);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage !== "exit" && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Logo */}
            <motion.div
              className="relative w-48 h-48 md:w-64 md:h-64"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.1,
              }}
            >
              <Image
                src="/pyaw_kyi.png"
                alt="Pyaw Kyi Logo"
                fill
                className="object-contain"
                priority
              />
            </motion.div>

            {/* Welcome text */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: stage === "text" || stage === "logo" ? 1 : 0,
                y: 0,
              }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <motion.p
                className="text-lg md:text-xl text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                Welcome to Pyaw Kyi
              </motion.p>

              {/* User info */}
              {userName && (
                <motion.div
                  className="flex items-center justify-center gap-2.5 mt-3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
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
                  <span className="text-base font-medium text-foreground">
                    {userName}
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Built by */}
            <motion.p
              className="text-sm text-muted-foreground/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              Built by Phyo Zin Ko
            </motion.p>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            className="absolute bottom-20 w-48 h-0.5 bg-muted overflow-hidden rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="h-full bg-foreground"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "linear", delay: 0.6 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
