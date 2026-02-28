"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

interface WelcomeAnimationProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string | null;
  authStage?: "welcome" | "auth" | "credentials" | "ready";
}

export function WelcomeAnimation({
  onComplete,
  userName,
  userAvatar,
  authStage = "welcome",
}: WelcomeAnimationProps) {
  const [shouldExit, setShouldExit] = useState(false);

  // When authStage is "ready", wait a beat then exit
  useEffect(() => {
    if (authStage === "ready") {
      const timer = setTimeout(() => setShouldExit(true), 600);
      return () => clearTimeout(timer);
    }
  }, [authStage]);

  useEffect(() => {
    if (shouldExit) {
      const timer = setTimeout(() => onComplete(), 500);
      return () => clearTimeout(timer);
    }
  }, [shouldExit, onComplete]);

  // Progress based on stage
  const progressMap = {
    welcome: "20%",
    auth: "50%",
    credentials: "80%",
    ready: "100%",
  };

  // Status text
  const statusMap = {
    welcome: "",
    auth: "Checking authentication...",
    credentials: "Loading your data...",
    ready: "Ready!",
  };

  return (
    <AnimatePresence>
      {!shouldExit && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col items-center gap-5">
            {/* Logo */}
            <motion.div
              className="relative w-28 h-28 sm:w-36 sm:h-36"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image
                src="/pyaw_kyi.png"
                alt="Pyaw Kyi"
                fill
                className="object-contain"
                priority
              />
            </motion.div>

            {/* Welcome text */}
            <motion.p
              className="text-lg sm:text-xl font-semibold text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Welcome to Pyaw Kyi
            </motion.p>

            {/* User info */}
            {userName && (
              <motion.div
                className="flex items-center gap-2.5"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={userName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border border-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {userName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  {userName}
                </span>
              </motion.div>
            )}

            {/* Status text */}
            <AnimatePresence mode="wait">
              {statusMap[authStage] && (
                <motion.p
                  key={authStage}
                  className="text-xs text-muted-foreground/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {statusMap[authStage]}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-16 sm:bottom-20 w-40 sm:w-48">
            <div className="h-0.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-foreground rounded-full"
                animate={{ width: progressMap[authStage] }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
              Built by Phyo Zin Ko
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
