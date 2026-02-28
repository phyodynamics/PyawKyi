"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X, WifiOff, Mic, RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

export interface ErrorToastProps {
  message: string;
  type?: "error" | "warning" | "network" | "microphone";
  onDismiss?: () => void;
  onRetry?: () => void;
  autoDismiss?: boolean;
  duration?: number;
}

export function ErrorToast({
  message,
  type = "error",
  onDismiss,
  onRetry,
  autoDismiss = true,
  duration = 5000,
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  }, [onDismiss]);

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(handleDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, duration, handleDismiss]);

  const getIcon = () => {
    switch (type) {
      case "network":
        return <WifiOff className="w-5 h-5" />;
      case "microphone":
        return <Mic className="w-5 h-5" />;
      case "warning":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400";
      case "network":
      case "microphone":
        return "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400";
      default:
        return "bg-destructive/10 border-destructive/20 text-destructive";
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 
            flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm ${getColors()}`}
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">{message}</p>

            {onRetry && (
              <motion.button
                onClick={onRetry}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </motion.button>
            )}
          </div>

          <motion.button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-foreground/10 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </motion.button>
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
      type: "error" | "warning" | "network" | "microphone";
      onRetry?: () => void;
    }>
  >([]);

  const showError = useCallback(
    (
      message: string,
      type: "error" | "warning" | "network" | "microphone" = "error",
      onRetry?: () => void,
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setErrors((prev) => [...prev, { id, message, type, onRetry }]);
      return id;
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
