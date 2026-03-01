"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface AudioVisualizerProps {
  isRecording: boolean;
  analyser: AnalyserNode | null;
}

interface Bubble {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  targetRadius: number;
  vx: number;
  vy: number;
  phase: number;
  freqBand: number; // which frequency band this bubble responds to
  alpha: number;
  targetAlpha: number;
  pulseSpeed: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
}

export function AudioVisualizer({
  isRecording,
  analyser,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const volumeRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (analyser) {
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
  }, [analyser]);

  // Initialize bubbles once
  const initBubbles = useCallback((width: number, height: number) => {
    if (initializedRef.current && bubblesRef.current.length > 0) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const bubbles: Bubble[] = [];

    // Create layered bubble cluster
    const configs = [
      // Core bubbles (respond to low freq / bass)
      {
        count: 3,
        minR: 18,
        maxR: 28,
        orbitR: 0,
        freqStart: 0,
        freqEnd: 0.15,
        alphaBase: 0.55,
      },
      // Inner ring (respond to low-mid freq)
      {
        count: 5,
        minR: 12,
        maxR: 20,
        orbitR: 35,
        freqStart: 0.1,
        freqEnd: 0.3,
        alphaBase: 0.45,
      },
      // Mid ring (respond to mid freq / voice)
      {
        count: 7,
        minR: 8,
        maxR: 15,
        orbitR: 60,
        freqStart: 0.2,
        freqEnd: 0.5,
        alphaBase: 0.38,
      },
      // Outer ring (respond to high freq)
      {
        count: 9,
        minR: 4,
        maxR: 10,
        orbitR: 85,
        freqStart: 0.4,
        freqEnd: 0.7,
        alphaBase: 0.28,
      },
      // Scattered tiny bubbles
      {
        count: 12,
        minR: 2,
        maxR: 5,
        orbitR: 110,
        freqStart: 0.5,
        freqEnd: 0.9,
        alphaBase: 0.2,
      },
    ];

    for (const cfg of configs) {
      for (let i = 0; i < cfg.count; i++) {
        const angle = (i / cfg.count) * Math.PI * 2 + Math.random() * 0.5;
        const orbitR = cfg.orbitR + (Math.random() - 0.5) * 20;
        const baseR = cfg.minR + Math.random() * (cfg.maxR - cfg.minR);
        const freqBand =
          cfg.freqStart + Math.random() * (cfg.freqEnd - cfg.freqStart);

        bubbles.push({
          x: centerX + Math.cos(angle) * orbitR,
          y: centerY + Math.sin(angle) * orbitR,
          radius: baseR,
          baseRadius: baseR,
          targetRadius: baseR,
          vx: 0,
          vy: 0,
          phase: Math.random() * Math.PI * 2,
          freqBand,
          alpha: cfg.alphaBase,
          targetAlpha: cfg.alphaBase,
          pulseSpeed: 0.5 + Math.random() * 1.5,
          orbitRadius: orbitR,
          orbitAngle: angle,
          orbitSpeed:
            (0.1 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1),
        });
      }
    }

    bubblesRef.current = bubbles;
    initializedRef.current = true;
  }, []);

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
      const centerX = width / 2;
      const centerY = height / 2;
      const isDark = document.documentElement.classList.contains("dark");
      const time = timestamp / 1000;

      initBubbles(width, height);
      ctx.clearRect(0, 0, width, height);

      const bubbles = bubblesRef.current;
      let vol = 0;

      if (isRecording && analyser && dataArrayRef.current) {
        analyser.getByteFrequencyData(dataArrayRef.current);
        const bufferLength = analyser.frequencyBinCount;

        // Calculate overall volume
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArrayRef.current[i];
        }
        vol = total / (bufferLength * 255);
        volumeRef.current += (vol - volumeRef.current) * 0.15;

        // Update bubbles based on voice frequency
        for (const bubble of bubbles) {
          const freqIdx = Math.floor(bubble.freqBand * bufferLength);
          const freqValue =
            dataArrayRef.current[Math.min(freqIdx, bufferLength - 1)] / 255;

          // Bubble grows with its frequency band
          bubble.targetRadius = bubble.baseRadius * (1 + freqValue * 1.8);
          bubble.targetAlpha = 0.3 + freqValue * 0.7;

          // Faster orbit when voice is active
          bubble.orbitAngle += bubble.orbitSpeed * (0.008 + freqValue * 0.025);

          // Orbit expands/contracts with volume
          const dynamicOrbit =
            bubble.orbitRadius * (1 + volumeRef.current * 0.35);

          // Target position: orbit around center
          const targetX = centerX + Math.cos(bubble.orbitAngle) * dynamicOrbit;
          const targetY = centerY + Math.sin(bubble.orbitAngle) * dynamicOrbit;

          // Smooth movement toward target
          bubble.x += (targetX - bubble.x) * 0.06;
          bubble.y += (targetY - bubble.y) * 0.06;
        }
      } else {
        // Idle: gentle floating
        volumeRef.current *= 0.96;

        for (const bubble of bubbles) {
          bubble.targetRadius =
            bubble.baseRadius *
            (0.85 + Math.sin(time * bubble.pulseSpeed + bubble.phase) * 0.15);
          bubble.targetAlpha =
            0.18 + Math.sin(time * 0.5 + bubble.phase) * 0.08;

          bubble.orbitAngle += bubble.orbitSpeed * 0.004;

          const targetX =
            centerX + Math.cos(bubble.orbitAngle) * bubble.orbitRadius * 0.85;
          const targetY =
            centerY + Math.sin(bubble.orbitAngle) * bubble.orbitRadius * 0.85;

          bubble.x += (targetX - bubble.x) * 0.03;
          bubble.y += (targetY - bubble.y) * 0.03;
        }
      }

      // ── Smooth radius and alpha interpolation ──
      for (const bubble of bubbles) {
        bubble.radius += (bubble.targetRadius - bubble.radius) * 0.12;
        bubble.alpha += (bubble.targetAlpha - bubble.alpha) * 0.1;
      }

      // ── Draw bubbles (back to front by size) ──
      const sorted = [...bubbles].sort((a, b) => a.radius - b.radius);

      for (const bubble of sorted) {
        const r = Math.max(1, bubble.radius);

        // Radial gradient for glassy bubble effect
        const gradient = ctx.createRadialGradient(
          bubble.x - r * 0.25,
          bubble.y - r * 0.25,
          r * 0.1,
          bubble.x,
          bubble.y,
          r,
        );

        if (isDark) {
          gradient.addColorStop(
            0,
            `rgba(255, 255, 255, ${Math.min(bubble.alpha * 1.4, 1)})`,
          );
          gradient.addColorStop(
            0.5,
            `rgba(255, 255, 255, ${bubble.alpha * 0.85})`,
          );
          gradient.addColorStop(
            1,
            `rgba(255, 255, 255, ${bubble.alpha * 0.3})`,
          );
        } else {
          gradient.addColorStop(
            0,
            `rgba(0, 0, 0, ${Math.min(bubble.alpha * 1.2, 1)})`,
          );
          gradient.addColorStop(0.5, `rgba(0, 0, 0, ${bubble.alpha * 0.7})`);
          gradient.addColorStop(1, `rgba(0, 0, 0, ${bubble.alpha * 0.2})`);
        }

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Subtle highlight on top-left of larger bubbles
        if (r > 8) {
          const highlightR = r * 0.35;
          const hx = bubble.x - r * 0.3;
          const hy = bubble.y - r * 0.3;
          const highlightGrad = ctx.createRadialGradient(
            hx,
            hy,
            0,
            hx,
            hy,
            highlightR,
          );

          if (isDark) {
            highlightGrad.addColorStop(
              0,
              `rgba(255, 255, 255, ${Math.min(bubble.alpha * 0.8, 0.9)})`,
            );
            highlightGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
          } else {
            highlightGrad.addColorStop(
              0,
              `rgba(255, 255, 255, ${Math.min(bubble.alpha * 1.2, 0.95)})`,
            );
            highlightGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
          }

          ctx.beginPath();
          ctx.arc(hx, hy, highlightR, 0, Math.PI * 2);
          ctx.fillStyle = highlightGrad;
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    },
    [isRecording, analyser, initBubbles],
  );

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  return (
    <motion.div
      className="w-full max-w-md h-56 md:h-64"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </motion.div>
  );
}
