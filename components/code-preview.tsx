"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  Maximize2,
  X,
} from "lucide-react";

interface CodePreviewProps {
  code: string;
}

export function CodePreview({ code }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [key, setKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for the single iframe and its containers
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inlineContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Build a complete HTML document from the code
  const fullHtml = useMemo(() => {
    let html = code;

    const hasDoctype = /<!DOCTYPE\s+html>/i.test(html);
    const hasHtmlTag = /<html[\s>]/i.test(html);
    const hasBody = /<body[\s>]/i.test(html);

    if (!hasDoctype && !hasHtmlTag && !hasBody) {
      html = [
        "<!DOCTYPE html>",
        '<html lang="en">',
        "<head>",
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '  <script src="https://cdn.tailwindcss.com"><' + "/script>",
        '  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />',
        "</head>",
        "<body>",
        code,
        "</body>",
        "</html>",
      ].join("\n");
    } else {
      if (!html.includes("tailwindcss.com")) {
        html = html.replace(
          /<\/head>/i,
          '<script src="https://cdn.tailwindcss.com"><' + "/script>\n</head>",
        );
      }
      if (!html.includes("font-awesome") && !html.includes("fontawesome")) {
        html = html.replace(
          /<\/head>/i,
          '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />\n</head>',
        );
      }
    }

    return html;
  }, [code]);

  // Create a blob URL for the iframe src
  const blobUrl = useMemo(() => {
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [fullHtml]);

  // Clean up blob URL
  useEffect(() => {
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  // Move the single iframe between inline and fullscreen containers
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (isFullscreen && fullscreenContainerRef.current) {
      // Move iframe to fullscreen container
      iframe.className = "w-full h-full bg-white";
      fullscreenContainerRef.current.appendChild(iframe);
    } else if (!isFullscreen && inlineContainerRef.current) {
      // Move iframe back to inline container
      iframe.className = "w-full bg-white h-[350px] sm:h-[400px] md:h-[500px]";
      inlineContainerRef.current.appendChild(iframe);
    }
  }, [isFullscreen]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // Escape key closes fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setKey((k) => k + 1);
  }, []);

  // Render the loading/error overlay
  const renderOverlay = () => (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 gap-2">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Failed to load preview
          </p>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-md hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Hidden single iframe that persists across fullscreen toggle */}
      <iframe
        ref={iframeRef}
        key={`${key}-${blobUrl}`}
        src={blobUrl}
        className="w-full bg-white h-[350px] sm:h-[400px] md:h-[500px]"
        onLoad={() => {
          setIsLoading(false);
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
        title="Code Preview"
        style={{ display: activeTab === "preview" ? undefined : "none" }}
      />

      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "code"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">Code</span>
            </button>
          </div>

          {activeTab === "preview" && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Refresh preview"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Open fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Active panel */}
        {activeTab === "preview" ? (
          <div
            className={`relative bg-white overflow-hidden rounded-xl border border-border ${isFullscreen ? "invisible h-0" : ""}`}
          >
            {renderOverlay()}
            {/* Inline container — the iframe is moved here when not fullscreen */}
            <div ref={inlineContainerRef} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <pre className="bg-neutral-900 text-neutral-100 p-3 sm:p-4 rounded-xl overflow-x-auto text-xs sm:text-sm leading-relaxed max-h-[400px] md:max-h-[500px]">
              <code>{code}</code>
            </pre>
          </motion.div>
        )}
      </div>

      {/* Fullscreen overlay — uses a portal to render at document body level */}
      {isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-900">
                  Preview
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRefresh}
                  className="p-2 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                  title="Exit fullscreen (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              {renderOverlay()}
              {/* Fullscreen container — the iframe is moved here when fullscreen */}
              <div ref={fullscreenContainerRef} className="h-full" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
