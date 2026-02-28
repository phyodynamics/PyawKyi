"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Download,
  RefreshCw,
  X,
  Send,
  Play,
  BookOpen,
  Lightbulb,
  GraduationCap,
} from "lucide-react";
import type {
  Mode,
  PolishResult,
  PlanResult,
  CraftResult,
  BuildResult,
  LearnResult,
} from "@/lib/types";
import { PlanView } from "./plan-view";
import { CodePreview } from "./code-preview";
import { TypewriterText } from "./typewriter-text";

interface ResultDisplayProps {
  mode: Mode;
  result: PolishResult | PlanResult | CraftResult | BuildResult | LearnResult;
  onRefine: (instruction: string) => Promise<void>;
  onReset: () => void;
  onSave: () => void;
  isRefining: boolean;
}

export function ResultDisplay({
  mode,
  result,
  onRefine,
  onReset,
  onSave,
  isRefining,
}: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [showRefine, setShowRefine] = useState(false);

  const getContent = (): string => {
    if ("refined_text" in result) return result.refined_text;
    if ("plan_title" in result) return JSON.stringify(result, null, 2);
    if ("generated_content" in result) return result.generated_content;
    if ("fixed_code" in result) return result.fixed_code || result.html_code;
    if ("study_title" in result)
      return result.summary || JSON.stringify(result, null, 2);
    return "";
  };

  const content = getContent();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extension =
      mode === "build" ? "html" : mode === "plan" ? "json" : "txt";
    const mimeType =
      mode === "build"
        ? "text/html"
        : mode === "plan"
          ? "application/json"
          : "text/plain";
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pyawkyi-${mode}-${Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefineSubmit = async () => {
    if (!refineInput.trim()) return;
    await onRefine(refineInput);
    setRefineInput("");
    setShowRefine(false);
  };

  return (
    <motion.div
      className="w-full max-w-3xl mx-auto px-2 sm:px-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Result</h2>
        <button
          onClick={onReset}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close result"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="bg-muted/50 rounded-2xl p-4 md:p-6 border border-border">
        {mode === "plan" && "plan_title" in result ? (
          <PlanView plan={result as PlanResult} />
        ) : mode === "build" ? (
          <CodePreview code={content} />
        ) : mode === "learn" && "study_title" in result ? (
          (() => {
            const learn = result as LearnResult;
            return (
              <div className="space-y-8">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-background" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold leading-tight mb-1">
                      {learn.study_title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {learn.key_concepts?.length || 0} concepts ·{" "}
                      {learn.flashcards?.length || 0} flashcards
                    </p>
                  </div>
                </div>

                {/* Summary */}
                {learn.summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-2xl bg-foreground/[0.03] border border-border"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Overview
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{learn.summary}</p>
                  </motion.div>
                )}

                {/* Key Concepts */}
                {learn.key_concepts?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Key Concepts
                      </span>
                    </div>
                    <div className="grid gap-3">
                      {learn.key_concepts.map((concept, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.05 }}
                          className="flex gap-3 p-4 rounded-xl bg-background border border-border hover:border-foreground/20 transition-colors"
                        >
                          <span className="w-7 h-7 rounded-lg bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm mb-0.5">
                              {concept.term}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {concept.explanation}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flashcards */}
                {learn.flashcards?.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Flashcards
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        Tap to flip
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {learn.flashcards.map((card, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className="group relative"
                        >
                          <details className="rounded-xl border border-border bg-background overflow-hidden cursor-pointer">
                            <summary className="p-4 list-none select-none">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-sm leading-snug">
                                  {card.question}
                                </p>
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 group-open:hidden">
                                  ?
                                </span>
                              </div>
                            </summary>
                            <div className="px-4 pb-4 pt-0">
                              <div className="h-px bg-border mb-3" />
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {card.answer}
                              </p>
                            </div>
                          </details>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <TypewriterText
            text={content}
            speed={10}
            className="prose prose-neutral dark:prose-invert max-w-none"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-4">
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs sm:text-sm font-medium transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </motion.button>

        <motion.button
          onClick={handleDownload}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs sm:text-sm font-medium transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Download
        </motion.button>

        <motion.button
          onClick={onSave}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs sm:text-sm font-medium transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Save
        </motion.button>

        <motion.button
          onClick={() => setShowRefine(!showRefine)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-foreground text-background text-xs sm:text-sm font-medium transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Refine
        </motion.button>
      </div>

      {/* Refine input */}
      <AnimatePresence>
        {showRefine && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={refineInput}
                onChange={(e) => setRefineInput(e.target.value)}
                placeholder="Enter refinement instruction..."
                className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                onKeyDown={(e) => e.key === "Enter" && handleRefineSubmit()}
                disabled={isRefining}
              />
              <motion.button
                onClick={handleRefineSubmit}
                disabled={isRefining || !refineInput.trim()}
                className="px-4 py-3 rounded-xl bg-foreground text-background disabled:opacity-50 transition-opacity"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isRefining ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
