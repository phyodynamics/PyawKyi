"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { compressAudio } from "@/lib/audio-utils"

interface UseVoiceRecorderReturn {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
  audioUrl: string | null
  analyser: AnalyserNode | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  pauseRecording: () => void
  resumeRecording: () => void
  resetRecording: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  // Helper to safely close AudioContext
  const closeAudioContext = useCallback(async () => {
    const ctx = audioContextRef.current
    if (ctx && ctx.state !== 'closed') {
      try {
        await ctx.close()
      } catch (e) {
        // Ignore errors if already closed
      }
    }
    audioContextRef.current = null
  }, [])

  // Helper to cleanup stream
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  // Helper to cleanup interval
  const cleanupInterval = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    // Clean up any existing resources first
    cleanupInterval()
    cleanupStream()
    await closeAudioContext()

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const error = new Error('Your browser does not support audio recording.')
      error.name = 'NotSupportedError'
      throw error
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      })
    } catch (error) {
      // Re-throw with proper error name preserved
      throw error
    }
    
    streamRef.current = stream

    // Setup audio context and analyser
    let audioContext: AudioContext
    try {
      audioContext = new AudioContext()
      
      // Resume if suspended (Safari fix)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
    } catch (error) {
      // Clean up stream if audio context fails
      stream.getTracks().forEach(track => track.stop())
      const contextError = new Error('Failed to initialize audio. Please try again.')
      contextError.name = 'AudioContextError'
      throw contextError
    }
    
    const source = audioContext.createMediaStreamSource(stream)
    const analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 256
    analyserNode.smoothingTimeConstant = 0.8
    source.connect(analyserNode)
    
    audioContextRef.current = audioContext
    setAnalyser(analyserNode)

    // Setup media recorder
    let mimeType = 'audio/webm'
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus'
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4'
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg'
    }
    
    let mediaRecorder: MediaRecorder
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType })
    } catch (error) {
      // Fallback without mime type
      mediaRecorder = new MediaRecorder(stream)
    }
    
    mediaRecorderRef.current = mediaRecorder
    chunksRef.current = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }
    
    // Handle recording errors
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event)
      cleanupInterval()
      cleanupStream()
      closeAudioContext()
      setIsRecording(false)
    }

    mediaRecorder.start(100) // Collect data every 100ms
    setIsRecording(true)
    setIsPaused(false)
    setDuration(0)

    // Start duration timer
    durationIntervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1)
    }, 1000)
  }, [cleanupInterval, cleanupStream, closeAudioContext])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null)
        return
      }

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const compressedBlob = await compressAudio(blob)
        const url = URL.createObjectURL(compressedBlob)
        
        // Store url in ref for cleanup
        audioUrlRef.current = url
        
        setAudioBlob(compressedBlob)
        setAudioUrl(url)
        setIsRecording(false)
        setIsPaused(false)

        // Cleanup resources
        cleanupInterval()
        cleanupStream()
        await closeAudioContext()
        setAnalyser(null)
        mediaRecorderRef.current = null

        resolve(compressedBlob)
      }

      mediaRecorderRef.current.stop()
    })
  }, [cleanupInterval, cleanupStream, closeAudioContext])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      cleanupInterval()
    }
  }, [cleanupInterval])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    }
  }, [])

  const resetRecording = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    chunksRef.current = []
  }, [])

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Use refs to avoid stale closure issues
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      const ctx = audioContextRef.current
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {})
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
    }
  }, [])

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    analyser,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  }
}
