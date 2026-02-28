"use client";

import React from "react";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, X, Upload } from "lucide-react";
import Image from "next/image";

export const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
  selectedImage: File | null;
  disabled?: boolean;
}

export function ImageUpload({
  onImageSelect,
  selectedImage,
  disabled,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Please upload a valid image file (JPEG, PNG, GIF, or WebP)";
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return `File size must be less than ${MAX_IMAGE_SIZE_MB}MB`;
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onImageSelect(file);
    },
    [onImageSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onImageSelect(null);
    setError(null);
  }, [previewUrl, onImageSelect]);

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <AnimatePresence mode="wait">
        {selectedImage && previewUrl ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-lg overflow-hidden border border-border bg-muted"
          >
            <div className="relative w-full h-32">
              <Image
                src={previewUrl || "/placeholder.svg"}
                alt="Selected image"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute top-2 right-2">
              <button
                onClick={handleRemove}
                className="p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
                disabled={disabled}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-background/80 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground truncate">
                {selectedImage.name}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative flex flex-col items-center justify-center gap-2 p-4
              border-2 border-dashed rounded-lg cursor-pointer
              transition-all duration-200
              ${
                isDragging
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:border-foreground/50 hover:bg-muted/50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <div
              className={`p-2 rounded-full ${isDragging ? "bg-foreground/10" : "bg-muted"}`}
            >
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Add image</span>{" "}
                (optional)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                For visual context in content creation
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive mt-2 text-center"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
