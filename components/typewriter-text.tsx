"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

interface TypewriterTextProps {
  text: string
  speed?: number
  className?: string
}

export function TypewriterText({ text, speed = 15, className = "" }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [isComplete, setIsComplete] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // Reset when text changes
    setDisplayedText("")
    setCurrentIndex(0)
    setIsComplete(false)
  }, [text])

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)
      
      return () => clearTimeout(timeout)
    } else if (currentIndex === text.length && text.length > 0) {
      setIsComplete(true)
    }
  }, [currentIndex, text, speed])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
        {displayedText}
        {!isComplete && (
          <motion.span
            className="inline-block w-0.5 h-5 bg-foreground ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          />
        )}
      </p>
    </motion.div>
  )
}
