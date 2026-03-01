"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  X,
  WifiOff,
  Mic,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";

export interface ErrorToastProps {
  message: string;
  type?: "error" | "warning" | "network" | "microphone" | "info" | "success";
  onDismiss?: () => void;
  onRetry?: () => void;
  autoDismiss?: boolean;
  duration?: number;
}

const TOAST_CONFIG = {
  error: {
    icon: AlertCircle,
    label: "Error",
    bg: "bg-red-950/80 dark:bg-red-950/90",
    border: "border-red-500/30",
    accent: "text-red-400",
    accentBg: "bg-red-500/20",
    progressBar: "bg-red-500",
    glow: "shadow-red-500/10",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    bg: "bg-amber-950/80 dark:bg-amber-950/90",
    border: "border-amber-500/30",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/20",
    progressBar: "bg-amber-500",
    glow: "shadow-amber-500/10",
  },
  network: {
    icon: WifiOff,
    label: "Connection",
    bg: "bg-orange-950/80 dark:bg-orange-950/90",
    border: "border-orange-500/30",
    accent: "text-orange-400",
    accentBg: "bg-orange-500/20",
    progressBar: "bg-orange-500",
    glow: "shadow-orange-500/10",
  },
  microphone: {
    icon: Mic,
    label: "Microphone",
    bg: "bg-violet-950/80 dark:bg-violet-950/90",
    border: "border-violet-500/30",
    accent: "text-violet-400",
    accentBg: "bg-violet-500/20",
    progressBar: "bg-violet-500",
    glow: "shadow-violet-500/10",
  },
  info: {
    icon: Info,
    label: "Info",
    bg: "bg-sky-950/80 dark:bg-sky-950/90",
    border: "border-sky-500/30",
    accent: "text-sky-400",
    accentBg: "bg-sky-500/20",
    progressBar: "bg-sky-500",
    glow: "shadow-sky-500/10",
  },
  success: {
    icon: CheckCircle2,
    label: "Success",
    bg: "bg-emerald-950/80 dark:bg-emerald-950/90",
    border: "border-emerald-500/30",
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/20",
    progressBar: "bg-emerald-500",
    glow: "shadow-emerald-500/10",
  },
};

export function ErrorToast({
  message,
  type = "error",
  onDismiss,
  onRetry,
  autoDismiss = true,
  duration = 6000,
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const config = TOAST_CONFIG[type];
  const Icon = config.icon;

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => onDismiss?.(), 300);
  }, [onDismiss]);

  useEffect(() => {
    if (autoDismiss) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        if (remaining <= 0) {
          handleDismiss();
        }
      }, 30);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [autoDismiss, duration, handleDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.9, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 30, scale: 0.95, filter: "blur(4px)" }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className={`w-full sm:max-w-sm
            overflow-hidden rounded-2xl border ${config.border} ${config.bg}
            shadow-2xl ${config.glow} backdrop-blur-xl`}
        >
          {/* Content */}
          <div className="flex items-start gap-3 p-4">
            {/* Icon with animated pulse */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                damping: 15,
                stiffness: 300,
                delay: 0.1,
              }}
              className={`flex-shrink-0 p-2 rounded-xl ${config.accentBg}`}
            >
              <Icon className={`w-4.5 h-4.5 ${config.accent}`} />
            </motion.div>

            {/* Text content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className={`text-[10px] uppercase tracking-widest font-bold ${config.accent} block mb-1`}
              >
                {config.label}
              </motion.span>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[13px] leading-relaxed text-neutral-200 font-medium"
              >
                {message}
              </motion.p>

              {onRetry && (
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                    handleDismiss();
                  }}
                  className={`mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    ${config.accentBg} ${config.accent} hover:brightness-125 transition-all active:scale-95`}
                >
                  <RefreshCw className="w-3 h-3" />
                  Try Again
                </motion.button>
              )}
            </div>

            {/* Dismiss button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Progress bar */}
          {autoDismiss && (
            <div className="h-[2px] w-full bg-white/5">
              <motion.div
                className={`h-full ${config.progressBar} opacity-60`}
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing error toasts
export function useErrorToast() {
  const [errors, setErrors] = useState<
    Array<{
      id: string;
      message: string;
      type: "error" | "warning" | "network" | "microphone" | "info" | "success";
      onRetry?: () => void;
    }>
  >([]);

  const showError = useCallback(
    (
      message: string,
      type:
        | "error"
        | "warning"
        | "network"
        | "microphone"
        | "info"
        | "success" = "error",
      onRetry?: () => void,
    ) => {
      // Deduplicate: don't show the same message if already visible
      setErrors((prev) => {
        if (prev.some((e) => e.message === message)) return prev;
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return [...prev.slice(-2), { id, message, type, onRetry }]; // Keep max 3 toasts
      });
    },
    [],
  );

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    showError,
    dismissError,
    clearAll,
  };
}
