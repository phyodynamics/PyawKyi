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
  const smoothedRef = useRef<Float32Array | null>(null);
  const volumeRef = useRef(0);

  useEffect(() => {
    if (analyser) {
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      smoothedRef.current = new Float32Array(bufferLength).fill(0);
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
      const isDark = document.documentElement.classList.contains("dark");
      const time = timestamp / 1000;

      ctx.clearRect(0, 0, width, height);

      if (
        isRecording &&
        analyser &&
        dataArrayRef.current &&
        smoothedRef.current
      ) {
        analyser.getByteFrequencyData(dataArrayRef.current);
        const bufferLength = analyser.frequencyBinCount;

        // Calculate overall voice volume
        let totalEnergy = 0;
        for (let i = 0; i < bufferLength; i++) {
          smoothedRef.current[i] +=
            (dataArrayRef.current[i] / 255 - smoothedRef.current[i]) * 0.18;
          totalEnergy += smoothedRef.current[i];
        }
        const avgVolume = totalEnergy / bufferLength;
        volumeRef.current += (avgVolume - volumeRef.current) * 0.15;

        const vol = volumeRef.current;

        // ── Draw 3 layered organic voice waves ──
        const layers = [
          {
            alpha: isDark ? 0.08 : 0.06,
            freqScale: 1.0,
            amplitude: 0.85,
            speed: 1.2,
            points: 200,
          },
          {
            alpha: isDark ? 0.18 : 0.14,
            freqScale: 0.7,
            amplitude: 0.65,
            speed: 0.9,
            points: 180,
          },
          {
            alpha: isDark ? 0.45 : 0.4,
            freqScale: 0.4,
            amplitude: 0.45,
            speed: 0.6,
            points: 160,
          },
        ];

        for (const layer of layers) {
          const color = isDark
            ? `rgba(255, 255, 255, ${layer.alpha + vol * 0.35})`
            : `rgba(0, 0, 0, ${layer.alpha + vol * 0.35})`;

          // Top half waveform
          ctx.beginPath();
          ctx.moveTo(0, centerY);

          for (let px = 0; px <= width; px += 2) {
            const t = px / width;
            // Map pixel to frequency bin
            const freqIdx = Math.floor(
              Math.pow(t, 1.3) * bufferLength * layer.freqScale,
            );
            const freqValue =
              smoothedRef.current[Math.min(freqIdx, bufferLength - 1)];

            // Organic wave based on actual voice frequency
            const baseWave = Math.sin(t * Math.PI); // Envelope: taper at edges
            const voiceWave = freqValue * layer.amplitude * height * 0.4;
            const breathe =
              Math.sin(time * layer.speed + t * 6) * 2 * (1 + vol);
            const micro = Math.sin(time * 3.5 + t * 20) * 1.5 * vol;

            const y = centerY - (voiceWave + breathe + micro) * baseWave;

            if (px === 0) ctx.moveTo(px, y);
            else ctx.lineTo(px, y);
          }

          // Mirror bottom half
          for (let px = width; px >= 0; px -= 2) {
            const t = px / width;
            const freqIdx = Math.floor(
              Math.pow(t, 1.3) * bufferLength * layer.freqScale,
            );
            const freqValue =
              smoothedRef.current[Math.min(freqIdx, bufferLength - 1)];

            const baseWave = Math.sin(t * Math.PI);
            const voiceWave = freqValue * layer.amplitude * height * 0.4;
            const breathe =
              Math.sin(time * layer.speed + t * 6 + 0.5) * 2 * (1 + vol);
            const micro = Math.sin(time * 3.5 + t * 20 + 1) * 1.5 * vol;

            const y = centerY + (voiceWave + breathe + micro) * baseWave;

            ctx.lineTo(px, y);
          }

          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        }

        // ── Center bright line (voice intensity) ──
        ctx.beginPath();
        ctx.moveTo(0, centerY);

        for (let px = 0; px <= width; px += 1) {
          const t = px / width;
          const freqIdx = Math.floor(Math.pow(t, 1.3) * bufferLength * 0.35);
          const freqValue =
            smoothedRef.current[Math.min(freqIdx, bufferLength - 1)];

          const baseWave = Math.sin(t * Math.PI);
          const lineY =
            centerY - freqValue * height * 0.2 * baseWave * (0.6 + vol * 1.5);

          if (px === 0) ctx.moveTo(px, lineY);
          else ctx.lineTo(px, lineY);
        }

        const lineAlpha = isDark ? 0.5 + vol * 0.5 : 0.4 + vol * 0.5;
        ctx.strokeStyle = isDark
          ? `rgba(255, 255, 255, ${lineAlpha})`
          : `rgba(0, 0, 0, ${lineAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // ── Idle: gentle ambient breathing waveform ──
        volumeRef.current *= 0.94;

        const layers = [
          { alpha: isDark ? 0.04 : 0.03, amplitude: 8, speed: 0.8, offset: 0 },
          {
            alpha: isDark ? 0.07 : 0.05,
            amplitude: 5,
            speed: 0.5,
            offset: 1.2,
          },
          {
            alpha: isDark ? 0.12 : 0.08,
            amplitude: 3,
            speed: 0.3,
            offset: 2.4,
          },
        ];

        for (const layer of layers) {
          const color = isDark
            ? `rgba(255, 255, 255, ${layer.alpha})`
            : `rgba(0, 0, 0, ${layer.alpha})`;

          ctx.beginPath();
          ctx.moveTo(0, centerY);

          // Top wave
          for (let px = 0; px <= width; px += 2) {
            const t = px / width;
            const envelope = Math.sin(t * Math.PI); // Edge taper
            const wave1 = Math.sin(time * layer.speed + t * 4 + layer.offset);
            const wave2 =
              Math.sin(time * layer.speed * 0.7 + t * 7 + layer.offset) * 0.4;
            const y = centerY - (wave1 + wave2) * layer.amplitude * envelope;

            if (px === 0) ctx.moveTo(px, y);
            else ctx.lineTo(px, y);
          }

          // Bottom mirror
          for (let px = width; px >= 0; px -= 2) {
            const t = px / width;
            const envelope = Math.sin(t * Math.PI);
            const wave1 = Math.sin(
              time * layer.speed + t * 4 + layer.offset + 0.3,
            );
            const wave2 =
              Math.sin(time * layer.speed * 0.7 + t * 7 + layer.offset + 0.3) *
              0.4;
            const y = centerY + (wave1 + wave2) * layer.amplitude * envelope;

            ctx.lineTo(px, y);
          }

          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        }

        // Thin idle center line
        ctx.beginPath();
        for (let px = 0; px <= width; px += 1) {
          const t = px / width;
          const envelope = Math.sin(t * Math.PI);
          const y = centerY - Math.sin(time * 0.6 + t * 5) * 2 * envelope;

          if (px === 0) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        ctx.strokeStyle = isDark
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(0, 0, 0, 0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Decay smoothed data
        if (smoothedRef.current) {
          for (let i = 0; i < smoothedRef.current.length; i++) {
            smoothedRef.current[i] *= 0.93;
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
      className="w-full max-w-lg h-32 md:h-40"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </motion.div>
  );
}
