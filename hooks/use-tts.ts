"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const findBestVoice = useCallback(
    (text: string): SpeechSynthesisVoice | null => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return null;

      // Detect if text is Burmese (Myanmar Unicode range)
      const isBurmese = /[\u1000-\u109F]/.test(text);
      const targetLang = isBurmese ? "my" : "en";

      // Priority: Microsoft voices > Google voices > any matching voice
      const priorityOrder = ["Microsoft", "Google", "Apple"];

      for (const vendor of priorityOrder) {
        const match = voices.find(
          (v) => v.lang.startsWith(targetLang) && v.name.includes(vendor),
        );
        if (match) return match;
      }

      // Fallback: any voice matching the language
      const langMatch = voices.find((v) => v.lang.startsWith(targetLang));
      if (langMatch) return langMatch;

      // Last fallback: default voice
      return voices.find((v) => v.default) || voices[0] || null;
    },
    [],
  );

  const speak = useCallback(
    (text: string, id: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      // If same id is already speaking, stop it
      if (isSpeaking && activeId === id) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setActiveId(null);
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Try to find the best voice
      const voice = findBestVoice(text);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }

      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setActiveId(id);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setActiveId(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setActiveId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSpeaking, activeId, findBestVoice],
  );

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setActiveId(null);
  }, []);

  return { speak, stop, isSpeaking, activeId };
}
