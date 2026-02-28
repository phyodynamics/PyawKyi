"use client";

import { motion } from "framer-motion";
import { Mic, Square, Pause, Play, Loader2 } from "lucide-react";
import { formatDuration } from "@/lib/audio-utils";

interface RecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function RecordButton({
  isRecording,
  isPaused,
  isProcessing,
  duration,
  onStart,
  onStop,
  onPause,
  onResume,
}: RecordButtonProps) {
  if (isProcessing) {
    return (
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-muted flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-foreground animate-spin" />
        </motion.div>
        <p className="text-sm text-muted-foreground">Processing...</p>
      </motion.div>
    );
  }

  if (isRecording) {
    return (
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Duration display */}
        <motion.p
          className="text-2xl md:text-3xl font-mono font-bold text-foreground tabular-nums"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {formatDuration(duration)}
        </motion.p>

        {/* Control buttons */}
        <div className="flex items-center gap-4">
          {/* Pause/Resume button */}
          <motion.button
            onClick={isPaused ? onResume : onPause}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isPaused ? "Resume recording" : "Pause recording"}
          >
            {isPaused ? (
              <Play className="w-6 h-6 md:w-7 md:h-7 text-foreground ml-1" />
            ) : (
              <Pause className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
            )}
          </motion.button>

          {/* Stop button */}
          <motion.button
            onClick={onStop}
            className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-foreground hover:bg-foreground/90 flex items-center justify-center shadow-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Stop recording"
          >
            <Square className="w-8 h-8 md:w-10 md:h-10 text-background fill-current" />
          </motion.button>

          {/* Placeholder for symmetry */}
          <div className="w-14 h-14 md:w-16 md:h-16" />
        </div>

        {/* Recording indicator */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-red-500"
            animate={{ opacity: isPaused ? 0.5 : [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: isPaused ? 0 : Infinity }}
          />
          <span className="text-sm text-muted-foreground">
            {isPaused ? "Paused" : "Recording"}
          </span>
        </motion.div>
      </motion.div>
    );
  }

  // Idle state - show start recording button
  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.button
        onClick={onStart}
        className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-foreground hover:bg-foreground/90 flex items-center justify-center shadow-lg transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Start recording"
      >
        <Mic className="w-8 h-8 md:w-10 md:h-10 text-background" />
      </motion.button>
      <p className="text-sm text-muted-foreground">Tap to start recording</p>
    </motion.div>
  );
}
