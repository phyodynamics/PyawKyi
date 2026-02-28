"use client";

import React, { memo } from "react";

import { motion } from "framer-motion";
import { Sparkles, CalendarDays, PenTool, Code2, BookOpen } from "lucide-react";
import type { Mode } from "@/lib/types";
import { Network } from "lucide-react"; // Added import for Network

interface ModeSelectorProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

const modes: {
  id: Mode;
  name: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "polish",
    name: "Polish",
    icon: <Sparkles className="w-5 h-5" />,
    description: "Voice to Refined Text",
  },
  {
    id: "plan",
    name: "Plan",
    icon: <CalendarDays className="w-5 h-5" />,
    description: "Voice to Life Planner",
  },
  {
    id: "craft",
    name: "Craft",
    icon: <PenTool className="w-5 h-5" />,
    description: "Voice to Content",
  },
  {
    id: "build",
    name: "Build",
    icon: <Code2 className="w-5 h-5" />,
    description: "Voice to App",
  },
  {
    id: "learn",
    name: "Learn",
    icon: <BookOpen className="w-5 h-5" />,
    description: "Voice to Study Notes",
  },
];

export const ModeSelector = memo(function ModeSelector({
  currentMode,
  onModeChange,
}: ModeSelectorProps) {
  return (
    <motion.div
      className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-3 w-full sm:w-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {modes.map((mode, index) => {
        const isActive = currentMode === mode.id;

        return (
          <motion.button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`
              relative flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-2.5 md:px-5 md:py-3 rounded-full
              font-medium text-xs sm:text-sm md:text-base transition-all duration-300
              ${
                isActive
                  ? "bg-foreground text-background shadow-lg"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }
            `}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isActive && (
              <motion.div
                layoutId="activeMode"
                className="absolute inset-0 bg-foreground rounded-full"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span
              className={`relative z-10 ${isActive ? "text-background" : ""}`}
            >
              {React.isValidElement(mode.icon) &&
                React.cloneElement(mode.icon as React.ReactElement<any>, {
                  className: "w-4 h-4 sm:w-5 sm:h-5",
                })}
            </span>
            <span
              className={`relative z-10 ${isActive ? "text-background" : ""}`}
            >
              {mode.name}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
});

export function getModeDescription(mode: Mode): string {
  return modes.find((m) => m.id === mode)?.description || "";
}
