"use client";

import React from "react";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Upload,
  Trash2,
  Play,
  X,
  FileText,
  Code,
  CalendarDays,
  PenTool,
  Sparkles,
  BookOpen,
  Network,
} from "lucide-react";
import type { Mode, SavedFile } from "@/lib/types";

interface FileManagerProps {
  savedFiles: SavedFile[];
  onLoadFile: (file: SavedFile) => void;
  onDeleteFile: (id: string) => void;
  onImportFile: (file: File) => void;
  isOpen: boolean;
  onClose: () => void;
}

const modeIcons: Record<Mode, React.ReactNode> = {
  polish: <Sparkles className="w-4 h-4" />,
  plan: <CalendarDays className="w-4 h-4" />,
  craft: <PenTool className="w-4 h-4" />,
  build: <Code className="w-4 h-4" />,
  learn: <BookOpen className="w-4 h-4" />,
};

const modeLabels: Record<Mode, string> = {
  polish: "Polished Text",
  plan: "Life Plan",
  craft: "Content",
  build: "App",
  learn: "Study Notes",
};

export function FileManager({
  savedFiles,
  onLoadFile,
  onDeleteFile,
  onImportFile,
  isOpen,
  onClose,
}: FileManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-foreground" />
                <h2 className="text-lg font-semibold text-foreground">
                  Saved Files
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close file manager"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Import button */}
            <div className="p-4 border-b border-border">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.tsx,.json"
                onChange={handleFileImport}
                className="hidden"
              />
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Upload className="w-5 h-5" />
                Import File
              </motion.button>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto p-4">
              {savedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No saved files yet</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    Save results to access them later
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedFiles.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                        {modeIcons[file.mode]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {modeLabels[file.mode]} - {formatDate(file.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onLoadFile(file)}
                          className="p-2 rounded-lg hover:bg-background transition-colors"
                          aria-label="Load file"
                        >
                          <Play className="w-4 h-4 text-foreground" />
                        </button>
                        <button
                          onClick={() => onDeleteFile(file.id)}
                          className="p-2 rounded-lg hover:bg-background transition-colors"
                          aria-label="Delete file"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
