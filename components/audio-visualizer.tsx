"use client"

import { useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"

interface AudioVisualizerProps {
  isRecording: boolean
  analyser: AnalyserNode | null
}

export function AudioVisualizer({ isRecording, analyser }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const smoothedDataRef = useRef<Float32Array | null>(null)
  const lastFrameTimeRef = useRef<number>(0)

  // Initialize data arrays when analyser changes
  useEffect(() => {
    if (analyser) {
      const bufferLength = analyser.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)
      smoothedDataRef.current = new Float32Array(64).fill(0)
    }
  }, [analyser])

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) {
      animationRef.current = requestAnimationFrame(draw)
      return
    }

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) {
      animationRef.current = requestAnimationFrame(draw)
      return
    }

    // Setup canvas with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    const width = rect.width
    const height = rect.height
    const centerY = height / 2
    const barCount = 64
    const barWidth = width / barCount - 2
    const maxBarHeight = height * 0.8

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Get theme colors once per frame
    const isDark = document.documentElement.classList.contains('dark')

    if (isRecording && analyser && dataArrayRef.current && smoothedDataRef.current) {
      // Get frequency data
      analyser.getByteFrequencyData(dataArrayRef.current)
      
      const bufferLength = analyser.frequencyBinCount
      const smoothingFactor = 0.3 // Lower = smoother, higher = more responsive

      // Pre-calculate colors
      const barColor = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
      const barColorFaded = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'

      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency bin with better distribution for voice
        const dataIndex = Math.floor(Math.pow(i / barCount, 1.5) * bufferLength * 0.5)
        const rawValue = dataArrayRef.current[dataIndex] / 255
        
        // Smooth the data for fluid animation
        smoothedDataRef.current[i] += (rawValue - smoothedDataRef.current[i]) * smoothingFactor
        const value = smoothedDataRef.current[i]
        
        // Calculate bar height with minimum visibility
        const barHeight = Math.max(4, value * maxBarHeight)

        const x = i * (barWidth + 2) + 1
        const y = centerY - barHeight / 2

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
        gradient.addColorStop(0, barColor)
        gradient.addColorStop(0.5, barColor)
        gradient.addColorStop(1, barColorFaded)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 2)
        ctx.fill()
      }
    } else {
      // Idle animation - smooth wave effect
      const barColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
      const time = timestamp / 1000

      for (let i = 0; i < barCount; i++) {
        const wave = Math.sin(time * 2 + i * 0.15) * 0.5 + 0.5
        const barHeight = 4 + wave * 16

        const x = i * (barWidth + 2) + 1
        const y = centerY - barHeight / 2

        ctx.fillStyle = barColor
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 2)
        ctx.fill()
      }
      
      // Reset smoothed data when not recording
      if (smoothedDataRef.current) {
        for (let i = 0; i < smoothedDataRef.current.length; i++) {
          smoothedDataRef.current[i] *= 0.9 // Decay smoothly
        }
      }
    }

    // Continue animation loop at 60fps
    animationRef.current = requestAnimationFrame(draw)
  }, [isRecording, analyser])

  useEffect(() => {
    // Start animation loop
    animationRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [draw])

  return (
    <motion.div
      className="w-full max-w-md h-32 md:h-40"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </motion.div>
  )
}
