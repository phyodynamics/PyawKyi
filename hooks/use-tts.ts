"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const speak = useCallback(
    async (text: string, id: string) => {
      // If same id is already playing, stop it
      if ((isSpeaking || isLoading) && activeId === id) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        if (abortRef.current) {
          abortRef.current.abort();
        }
        setIsSpeaking(false);
        setIsLoading(false);
        setActiveId(null);
        return;
      }

      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }

      setIsLoading(true);
      setActiveId(id);

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("TTS request failed");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsLoading(false);
          setIsSpeaking(true);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          setActiveId(null);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          setIsLoading(false);
          setActiveId(null);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        await audio.play();
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // User cancelled, ignore
        } else {
          console.error("TTS error:", error);
        }
        setIsSpeaking(false);
        setIsLoading(false);
        setActiveId(null);
      }
    },
    [isSpeaking, isLoading, activeId],
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setIsSpeaking(false);
    setIsLoading(false);
    setActiveId(null);
  }, []);

  return { speak, stop, isSpeaking: isSpeaking || isLoading, activeId };
}
