"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Bookmark,
  RefreshCw,
  X,
  Send,
  BookOpen,
  Lightbulb,
  GraduationCap,
  Layers,
  Pencil,
  Volume2,
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
import { FlippingCard } from "./ui/flipping-card";
import { useTTS } from "@/hooks/use-tts";

interface ResultDisplayProps {
  mode: Mode;
  result: PolishResult | PlanResult | CraftResult | BuildResult | LearnResult;
  onRefine: (instruction: string) => Promise<void>;
  onReset: () => void;
  onSave: (name: string) => void;
  onUpdate?: () => void;
  isFromHistory?: boolean;
  onUpdateResult?: (
    result: PolishResult | PlanResult | CraftResult | BuildResult | LearnResult,
  ) => void;
  isRefining: boolean;
}

export function ResultDisplay({
  mode,
  result,
  onRefine,
  onReset,
  onSave,
  onUpdate,
  isFromHistory,
  onUpdateResult,
  isRefining,
}: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [showRefine, setShowRefine] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const saveInputRef = useRef<HTMLInputElement>(null);
  const editTextRef = useRef<HTMLTextAreaElement>(null);

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
  const isTextEditable = mode === "polish" || mode === "craft";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(isEditing ? editText : content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefineSubmit = async () => {
    if (!refineInput.trim()) return;
    await onRefine(refineInput);
    setRefineInput("");
    setShowRefine(false);
  };

  const handleSaveClick = () => {
    const defaultName = `${mode}-${new Date().toISOString().split("T")[0]}`;
    setSaveName(defaultName);
    setShowSaveDialog(true);
    setTimeout(() => saveInputRef.current?.select(), 100);
  };

  const handleSaveConfirm = () => {
    if (!saveName.trim()) return;
    onSave(saveName.trim());
    setShowSaveDialog(false);
    setSaveName("");
  };

  const handleStartEdit = () => {
    setEditText(content);
    setIsEditing(true);
    setTimeout(() => editTextRef.current?.focus(), 100);
  };

  const handleSaveEdit = () => {
    if (!onUpdateResult) return;
    if (mode === "polish") {
      onUpdateResult({ refined_text: editText });
    } else if (mode === "craft") {
      onUpdateResult({ generated_content: editText });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText("");
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
          <PlanView plan={result as PlanResult} onChange={onUpdateResult} />
        ) : mode === "build" ? (
          <CodePreview code={content} />
        ) : mode === "learn" && "study_title" in result ? (
          <LearnView learn={result as LearnResult} />
        ) : isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={editTextRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full min-h-[200px] p-4 rounded-xl bg-background border border-border text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-y"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <TypewriterText
              text={content}
              speed={10}
              className="prose prose-neutral dark:prose-invert max-w-none"
            />
            {isTextEditable && (
              <button
                onClick={handleStartEdit}
                className="absolute top-2 right-2 p-2 rounded-lg bg-muted/80 hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Edit text"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
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

        {isFromHistory && onUpdate ? (
          <motion.button
            onClick={onUpdate}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs sm:text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Update
          </motion.button>
        ) : (
          <motion.button
            onClick={handleSaveClick}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs sm:text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Save
          </motion.button>
        )}

        {isTextEditable && !isEditing && (
          <motion.button
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs sm:text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Edit
          </motion.button>
        )}

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

      {/* Save Name Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowSaveDialog(false)}
            />
            <motion.div
              className="relative w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-5"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
            >
              <h3 className="text-sm font-semibold mb-3">Save as</h3>
              <input
                ref={saveInputRef}
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter a name..."
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveConfirm();
                  if (e.key === "Escape") setShowSaveDialog(false);
                }}
              />
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfirm}
                  disabled={!saveName.trim()}
                  className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

// ── Learn Mode View ──
function LearnView({ learn }: { learn: LearnResult }) {
  const { speak, stop, isSpeaking, activeId } = useTTS();

  const handleSpeakAll = () => {
    if (isSpeaking && activeId === "all") {
      stop();
      return;
    }
    const allText = [
      learn.study_title,
      learn.summary || "",
      ...(learn.key_concepts?.map((c) => `${c.term}. ${c.explanation}`) || []),
    ]
      .filter(Boolean)
      .join(". ");
    speak(allText, "all");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center shrink-0">
          <BookOpen className="w-6 h-6 text-background" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight mb-1">
            {learn.study_title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {learn.key_concepts?.length || 0} concepts ·{" "}
            {learn.flashcards?.length || 0} flashcards
          </p>
        </div>
        <SpeakButton
          isActive={isSpeaking && activeId === "all"}
          onClick={handleSpeakAll}
          label="Listen all"
          size="lg"
        />
      </div>

      {/* Summary */}
      {learn.summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-foreground/[0.03] border border-border"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overview
              </span>
            </div>
            <SpeakButton
              isActive={isSpeaking && activeId === "summary"}
              onClick={() => speak(learn.summary!, "summary")}
            />
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
                className="flex gap-4 p-4 rounded-xl bg-background border border-border hover:border-foreground/20 transition-colors"
              >
                <span className="w-8 h-8 rounded-xl bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm mb-1">{concept.term}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {concept.explanation}
                  </p>
                </div>
                <SpeakButton
                  isActive={isSpeaking && activeId === `concept-${i}`}
                  onClick={() =>
                    speak(
                      `${concept.term}. ${concept.explanation}`,
                      `concept-${i}`,
                    )
                  }
                />
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
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Flashcards
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Tap to flip
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {learn.flashcards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                className="w-full"
              >
                <FlippingCard
                  height={180}
                  className="!w-full"
                  frontContent={
                    <div className="flex flex-col items-center justify-center h-full p-5 text-center relative">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                        Question
                      </span>
                      <p className="font-semibold text-sm leading-snug">
                        {card.question}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(card.question, `q-${i}`);
                        }}
                        className="absolute bottom-3 left-3 p-1.5 rounded-full hover:bg-foreground/5 transition-colors"
                        aria-label="Listen to question"
                      >
                        <Volume2
                          className={`w-3.5 h-3.5 ${isSpeaking && activeId === `q-${i}` ? "text-foreground animate-pulse" : "text-muted-foreground/40"}`}
                        />
                      </button>
                      <span className="absolute bottom-3 right-3 text-[10px] text-muted-foreground/40">
                        {i + 1}/{learn.flashcards.length}
                      </span>
                    </div>
                  }
                  backContent={
                    <div className="flex flex-col items-center justify-center h-full p-5 text-center relative">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500/70 mb-3">
                        Answer
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {card.answer}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(card.answer, `a-${i}`);
                        }}
                        className="absolute bottom-3 left-3 p-1.5 rounded-full hover:bg-foreground/5 transition-colors"
                        aria-label="Listen to answer"
                      >
                        <Volume2
                          className={`w-3.5 h-3.5 ${isSpeaking && activeId === `a-${i}` ? "text-emerald-500 animate-pulse" : "text-muted-foreground/40"}`}
                        />
                      </button>
                    </div>
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Speaker Button ──
function SpeakButton({
  isActive,
  onClick,
  label,
  size = "sm",
}: {
  isActive: boolean;
  onClick: () => void;
  label?: string;
  size?: "sm" | "lg";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full transition-all shrink-0 ${
        size === "lg"
          ? "px-3 py-1.5 bg-muted hover:bg-muted/80 text-xs font-medium"
          : "p-1.5 hover:bg-foreground/5"
      } ${isActive ? "text-foreground" : "text-muted-foreground"}`}
      aria-label={label || "Listen"}
    >
      <Volume2
        className={`${size === "lg" ? "w-3.5 h-3.5" : "w-3.5 h-3.5"} ${isActive ? "animate-pulse" : ""}`}
      />
      {size === "lg" && (
        <span className="hidden sm:inline">{isActive ? "Stop" : "Listen"}</span>
      )}
    </button>
  );
}
