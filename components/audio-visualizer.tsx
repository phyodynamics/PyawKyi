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
  const smoothVolumeRef = useRef(0);
  const particlesRef = useRef<
    { angle: number; dist: number; speed: number; size: number; life: number }[]
  >([]);
  const historyRef = useRef<number[]>(Array(64).fill(0));

  useEffect(() => {
    if (analyser) {
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
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

      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const isDark = document.documentElement.classList.contains("dark");
      const t = timestamp / 1000;

      ctx.clearRect(0, 0, w, h);

      // ── Frequency data ──
      let vol = 0;
      const bands = historyRef.current;
      const numBands = bands.length;

      if (isRecording && analyser && dataArrayRef.current) {
        analyser.getByteFrequencyData(dataArrayRef.current);
        const len = analyser.frequencyBinCount;

        let total = 0;
        for (let i = 0; i < len; i++) total += dataArrayRef.current[i];
        vol = total / (len * 255);

        // Map frequency bins to our bands
        for (let i = 0; i < numBands; i++) {
          const idx = Math.floor((i / numBands) * len);
          const target = dataArrayRef.current[idx] / 255;
          bands[i] += (target - bands[i]) * 0.25;
        }
      } else {
        // Idle decay
        for (let i = 0; i < numBands; i++) {
          bands[i] *= 0.92;
        }
      }

      smoothVolumeRef.current +=
        (vol - smoothVolumeRef.current) * (isRecording ? 0.15 : 0.05);
      const sv = smoothVolumeRef.current;

      const baseRadius = Math.min(w, h) * 0.22;
      const mainRadius = baseRadius + sv * baseRadius * 0.5;

      // ═══════════════════════════════════════════════════
      // 1. Outer glow rings (3 concentric pulsing rings)
      // ═══════════════════════════════════════════════════
      for (let ring = 3; ring >= 1; ring--) {
        const ringExpand = sv * 30 * ring + Math.sin(t * 1.5 + ring) * 4;
        const ringR = mainRadius + 12 * ring + ringExpand;
        const ringAlpha = isDark
          ? 0.03 + (sv * 0.06) / ring
          : 0.02 + (sv * 0.04) / ring;

        const grad = ctx.createRadialGradient(
          cx,
          cy,
          ringR * 0.85,
          cx,
          cy,
          ringR,
        );
        const c = isDark ? "255,255,255" : "0,0,0";
        grad.addColorStop(0, `rgba(${c},0)`);
        grad.addColorStop(0.5, `rgba(${c},${ringAlpha})`);
        grad.addColorStop(1, `rgba(${c},0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // ═══════════════════════════════════════════════════
      // 2. Frequency waveform ring (radial bars)
      // ═══════════════════════════════════════════════════
      const barCount = numBands;
      ctx.lineCap = "round";

      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const freqVal = bands[i];
        const barLen = freqVal * baseRadius * 1.2 + 2;

        const innerR = mainRadius + 6;
        const outerR = innerR + barLen;

        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * outerR;
        const y2 = cy + Math.sin(angle) * outerR;

        const barAlpha = isDark ? 0.15 + freqVal * 0.6 : 0.1 + freqVal * 0.5;
        const c = isDark ? "255,255,255" : "0,0,0";

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${c},${barAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // ═══════════════════════════════════════════════════
      // 3. Inner waveform ring (smooth curve)
      // ═══════════════════════════════════════════════════
      ctx.beginPath();
      for (let i = 0; i <= barCount; i++) {
        const idx = i % barCount;
        const angle = (idx / barCount) * Math.PI * 2 - Math.PI / 2;
        const freqVal = bands[idx];
        const waveR = mainRadius - 4 - freqVal * 12;

        const x = cx + Math.cos(angle) * waveR;
        const y = cy + Math.sin(angle) * waveR;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const waveAlpha = isDark ? 0.06 + sv * 0.12 : 0.04 + sv * 0.08;
      const wc = isDark ? "255,255,255" : "0,0,0";
      ctx.strokeStyle = `rgba(${wc},${waveAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ═══════════════════════════════════════════════════
      // 4. Main circle (the orb)
      // ═══════════════════════════════════════════════════
      // Subtle wobble based on low frequencies
      const wobblePoints = 128;
      ctx.beginPath();
      for (let i = 0; i <= wobblePoints; i++) {
        const angle = (i / wobblePoints) * Math.PI * 2;
        const bandIdx = Math.floor((i / wobblePoints) * numBands);
        const wobble = bands[bandIdx] * 6;
        const breathe = Math.sin(t * 2) * 2;
        const r = mainRadius + wobble + breathe;

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Fill with gradient
      const orbGrad = ctx.createRadialGradient(
        cx - mainRadius * 0.15,
        cy - mainRadius * 0.15,
        mainRadius * 0.1,
        cx,
        cy,
        mainRadius * 1.1,
      );

      if (isDark) {
        const intensity = 0.08 + sv * 0.15;
        orbGrad.addColorStop(0, `rgba(255,255,255,${intensity * 1.8})`);
        orbGrad.addColorStop(0.4, `rgba(255,255,255,${intensity})`);
        orbGrad.addColorStop(0.8, `rgba(255,255,255,${intensity * 0.5})`);
        orbGrad.addColorStop(1, `rgba(255,255,255,${intensity * 0.15})`);
      } else {
        const intensity = 0.04 + sv * 0.1;
        orbGrad.addColorStop(0, `rgba(0,0,0,${intensity * 1.5})`);
        orbGrad.addColorStop(0.4, `rgba(0,0,0,${intensity})`);
        orbGrad.addColorStop(0.8, `rgba(0,0,0,${intensity * 0.5})`);
        orbGrad.addColorStop(1, `rgba(0,0,0,${intensity * 0.12})`);
      }
      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Orb border
      const borderAlpha = isDark ? 0.12 + sv * 0.2 : 0.08 + sv * 0.15;
      ctx.strokeStyle = isDark
        ? `rgba(255,255,255,${borderAlpha})`
        : `rgba(0,0,0,${borderAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ═══════════════════════════════════════════════════
      // 5. Highlight (glass effect on orb)
      // ═══════════════════════════════════════════════════
      const hlR = mainRadius * 0.7;
      const hlGrad = ctx.createRadialGradient(
        cx - mainRadius * 0.2,
        cy - mainRadius * 0.25,
        0,
        cx - mainRadius * 0.2,
        cy - mainRadius * 0.25,
        hlR,
      );
      const hlAlpha = isDark ? 0.06 + sv * 0.08 : 0.08 + sv * 0.06;
      hlGrad.addColorStop(0, `rgba(255,255,255,${hlAlpha})`);
      hlGrad.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, mainRadius * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = hlGrad;
      ctx.fill();

      // ═══════════════════════════════════════════════════
      // 6. Floating particles (spawn on voice)
      // ═══════════════════════════════════════════════════
      const particles = particlesRef.current;

      // Spawn particles when voice is active
      if (isRecording && sv > 0.08) {
        const spawnCount = Math.floor(sv * 4);
        for (let i = 0; i < spawnCount; i++) {
          if (particles.length < 60) {
            particles.push({
              angle: Math.random() * Math.PI * 2,
              dist: mainRadius + 10 + Math.random() * 20,
              speed: 0.3 + Math.random() * 0.8,
              size: 1 + Math.random() * 2.5,
              life: 1,
            });
          }
        }
      }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.dist += p.speed;
        p.life -= 0.012;
        p.angle += 0.003;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const px = cx + Math.cos(p.angle) * p.dist;
        const py = cy + Math.sin(p.angle) * p.dist;
        const pAlpha = p.life * (isDark ? 0.4 : 0.25);
        const pc = isDark ? "255,255,255" : "0,0,0";

        ctx.beginPath();
        ctx.arc(px, py, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pc},${pAlpha})`;
        ctx.fill();
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
      className="relative w-full flex items-center justify-center"
      style={{ height: "280px" }}
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
