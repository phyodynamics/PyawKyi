"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface AudioVisualizerProps {
  isRecording: boolean;
  analyser: AnalyserNode | null;
}

export function AudioVisualizer({
  isRecording,
  analyser,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const smoothedDataRef = useRef<Float32Array | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    if (analyser) {
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      smoothedDataRef.current = new Float32Array(48).fill(0);
    }
  }, [analyser]);

  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (
        canvas.width !== rect.width * dpr ||
        canvas.height !== rect.height * dpr
      ) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;
      const barCount = 48;
      const isDark = document.documentElement.classList.contains("dark");

      ctx.clearRect(0, 0, width, height);

      // Spacing calculation: bars radiate from center
      const totalBarWidth = width * 0.85;
      const gap = 3;
      const barWidth = (totalBarWidth - (barCount - 1) * gap) / barCount;
      const startX = (width - totalBarWidth) / 2;

      if (
        isRecording &&
        analyser &&
        dataArrayRef.current &&
        smoothedDataRef.current
      ) {
        analyser.getByteFrequencyData(dataArrayRef.current);
        const bufferLength = analyser.frequencyBinCount;

        phaseRef.current += 0.02;

        for (let i = 0; i < barCount; i++) {
          // Mirror effect: bars grow from center outward
          const mirrorIndex =
            i < barCount / 2 ? barCount / 2 - 1 - i : i - barCount / 2;

          // Frequency mapping: voice frequencies emphasized
          const dataIndex = Math.floor(
            Math.pow(mirrorIndex / (barCount / 2), 1.4) * bufferLength * 0.45,
          );
          const rawValue = dataArrayRef.current[dataIndex] / 255;

          // Smooth interpolation
          smoothedDataRef.current[i] +=
            (rawValue - smoothedDataRef.current[i]) * 0.25;
          const value = smoothedDataRef.current[i];

          // Distance from center affects max height (taller in center)
          const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
          const heightMultiplier = 1 - distFromCenter * 0.4;
          const maxBarHeight = height * 0.75 * heightMultiplier;

          const barHeight = Math.max(3, value * maxBarHeight);

          const x = startX + i * (barWidth + gap);
          const y = centerY - barHeight / 2;

          // Gradient intensity based on value
          const alpha = 0.35 + value * 0.65;
          const baseColor = isDark
            ? `rgba(255, 255, 255, ${alpha})`
            : `rgba(0, 0, 0, ${alpha})`;

          ctx.fillStyle = baseColor;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
          ctx.fill();
        }
      } else {
        // Idle: gentle breathing wave from center
        const time = timestamp / 1000;
        phaseRef.current = time;

        for (let i = 0; i < barCount; i++) {
          const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);

          // Multiple sine waves for organic feel
          const wave1 = Math.sin(time * 1.5 + i * 0.18) * 0.5 + 0.5;
          const wave2 = Math.sin(time * 0.8 + i * 0.12 + 1.5) * 0.3 + 0.5;
          const combined = wave1 * 0.6 + wave2 * 0.4;

          // Center bars are taller
          const heightMultiplier = 1 - distFromCenter * 0.7;
          const barHeight = 3 + combined * 18 * heightMultiplier;

          const x = startX + i * (barWidth + gap);
          const y = centerY - barHeight / 2;

          const alpha = 0.12 + combined * 0.12;
          const color = isDark
            ? `rgba(255, 255, 255, ${alpha})`
            : `rgba(0, 0, 0, ${alpha})`;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
          ctx.fill();
        }

        // Decay smoothed data gracefully
        if (smoothedDataRef.current) {
          for (let i = 0; i < smoothedDataRef.current.length; i++) {
            smoothedDataRef.current[i] *= 0.92;
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    },
    [isRecording, analyser],
  );

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  return (
    <motion.div
      className="w-full max-w-md h-28 md:h-36"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </motion.div>
  );
}
