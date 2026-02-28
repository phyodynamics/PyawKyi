"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { History, LogOut, X, Trash2, Zap } from "lucide-react";
import Image from "next/image";
import { WelcomeAnimation } from "@/components/welcome-animation";
import { ThemeToggle } from "@/components/theme-toggle";
import { ModeSelector, getModeDescription } from "@/components/mode-selector";
import { RecordButton } from "@/components/record-button";
import { Footer } from "@/components/footer";
import { ErrorToast, useErrorToast } from "@/components/error-toast";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { processAudio, refineContent, refineCode } from "@/lib/ai-service";
import { getErrorMessage } from "@/lib/error-handler";
import { createClient } from "@/lib/supabase/client";
import type {
  Mode,
  PolishResult,
  CraftResult,
  BuildResult,
  PlanResult,
  LearnResult,
} from "@/lib/types";

// Dynamic imports — only loaded when needed
const ResultDisplay = dynamic(
  () =>
    import("@/components/result-display").then((m) => ({
      default: m.ResultDisplay,
    })),
  { ssr: false },
);
const UserSettings = dynamic(
  () =>
    import("@/components/user-settings").then((m) => ({
      default: m.UserSettings,
    })),
  { ssr: false },
);
const ApiKeyPanel = dynamic(
  () =>
    import("@/components/api-key-panel").then((m) => ({
      default: m.ApiKeyPanel,
    })),
  { ssr: false },
);
const AudioVisualizer = dynamic(
  () =>
    import("@/components/audio-visualizer").then((m) => ({
      default: m.AudioVisualizer,
    })),
  { ssr: false },
);
const ImageUpload = dynamic(
  () =>
    import("@/components/image-upload").then((m) => ({
      default: m.ImageUpload,
    })),
  { ssr: false },
);

// Static constant — never re-created
const MODE_EMOJI: Record<Mode, string> = {
  polish: "✨",
  plan: "📋",
  craft: "🎨",
  build: "🏗️",
  learn: "📚",
};

interface HistoryItem {
  id: string;
  mode: Mode;
  name: string;
  content: string;
  created_at: string;
}

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentMode, setCurrentMode] = useState<Mode>("polish");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [result, setResult] = useState<
    PolishResult | PlanResult | CraftResult | BuildResult | LearnResult | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [craftImage, setCraftImage] = useState<File | null>(null);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const { errors, showError, dismissError } = useErrorToast();

  const {
    isRecording,
    isPaused,
    duration,
    analyser,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useVoiceRecorder();

  // Load user info and history from Supabase
  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserName(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email ||
            "",
        );
        setUserAvatar(user.user_metadata?.avatar_url || null);
        setIsAdmin(user.email === "bababoi134459@gmail.com");
        const { data } = await supabase
          .from("saved_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (data) setHistoryItems(data);
      }
    };
    loadData();
  }, []);

  // Network connectivity listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      showError(
        "No internet connection. Please check your network.",
        "network",
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showError]);

  const handleStartRecording = useCallback(async () => {
    setError(null);
    if (!isOnline) {
      showError(
        "No internet connection. Please check your network.",
        "network",
      );
      return;
    }
    try {
      await startRecording();
    } catch (err) {
      const errorName = err instanceof Error ? err.name : "";
      let errorType: "error" | "microphone" = "error";
      let message =
        "Failed to access microphone. Please grant permission and try again.";

      if (errorName === "NotAllowedError") {
        errorType = "microphone";
        message =
          "Microphone access denied. Please allow microphone permissions in your browser settings.";
      } else if (errorName === "NotFoundError") {
        errorType = "microphone";
        message =
          "No microphone found. Please connect a microphone and try again.";
      } else if (errorName === "NotReadableError") {
        errorType = "microphone";
        message =
          "Microphone is busy. Please close other apps using the microphone.";
      }

      setError(message);
      showError(message, errorType);
    }
  }, [startRecording, isOnline, showError]);

  const handleStopRecording = useCallback(async () => {
    const blob = await stopRecording();
    if (blob) {
      if (!isOnline) {
        showError(
          "No internet connection. Please connect and try again.",
          "network",
        );
        return;
      }

      setIsProcessing(true);
      setError(null);
      try {
        const imageToUse = currentMode === "craft" ? craftImage : null;
        const aiResult = await processAudio(currentMode, blob, imageToUse);
        setResult(aiResult);
        if (currentMode === "craft") setCraftImage(null);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        showError(message, "error", () => handleStopRecording());
      } finally {
        setIsProcessing(false);
      }
    }
  }, [stopRecording, currentMode, isOnline, showError, craftImage]);

  const handleRefine = useCallback(
    async (instruction: string) => {
      if (!result) return;
      if (!isOnline) {
        showError(
          "No internet connection. Please connect and try again.",
          "network",
        );
        return;
      }

      setIsRefining(true);
      setError(null);
      try {
        if (currentMode === "build" && "fixed_code" in result) {
          const refined = await refineCode(
            result.fixed_code || result.html_code,
            instruction,
          );
          setResult({ ...result, fixed_code: refined });
        } else {
          let content = "";
          if ("refined_text" in result) content = result.refined_text;
          else if ("plan_title" in result) content = JSON.stringify(result);
          else if ("generated_content" in result)
            content = result.generated_content;

          const refined = await refineContent(content, instruction);

          if ("refined_text" in result) setResult({ refined_text: refined });
          else if ("plan_title" in result) {
            try {
              const parsed = JSON.parse(refined);
              setResult(parsed as PlanResult);
            } catch {
              // If parsing fails, keep the original result
            }
          } else if ("generated_content" in result)
            setResult({ generated_content: refined });
        }
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        showError(message, "error");
      } finally {
        setIsRefining(false);
      }
    },
    [result, currentMode, isOnline, showError],
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    resetRecording();
  }, [resetRecording]);

  // Save to Supabase
  const handleSave = useCallback(async () => {
    if (!result) return;

    let content = "";
    if ("refined_text" in result) content = result.refined_text;
    else if ("plan_title" in result) content = JSON.stringify(result, null, 2);
    else if ("generated_content" in result) content = result.generated_content;
    else if ("fixed_code" in result)
      content = result.fixed_code || result.html_code;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("saved_items")
        .insert({
          user_id: user.id,
          mode: currentMode,
          name: `${currentMode}-${new Date().toISOString().split("T")[0]}-${Date.now().toString(36)}`,
          content,
        })
        .select()
        .single();

      if (!error && data) {
        setHistoryItems((prev) => [data, ...prev]);
        showError("Saved to history!", "error"); // Using error toast as notification
      }
    }
  }, [result, currentMode, showError]);

  // Load from history
  const handleLoadHistory = useCallback((item: HistoryItem) => {
    setCurrentMode(item.mode);
    switch (item.mode) {
      case "polish":
        setResult({ refined_text: item.content });
        break;
      case "plan":
        try {
          const parsed = JSON.parse(item.content);
          setResult(parsed as PlanResult);
        } catch {
          setResult({
            plan_title: "Imported Plan",
            schedule: [],
            checklist: [],
          });
        }
        break;
      case "craft":
        setResult({ generated_content: item.content });
        break;
      case "build":
        setResult({ html_code: item.content, fixed_code: item.content });
        break;
      case "learn":
        try {
          const learnParsed = JSON.parse(item.content);
          setResult(learnParsed as LearnResult);
        } catch {
          setResult({
            study_title: "Imported Notes",
            key_concepts: [],
            summary: item.content,
            flashcards: [],
          });
        }
        break;
    }
    setShowHistory(false);
  }, []);

  // Delete from Supabase
  const handleDeleteHistory = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from("saved_items").delete().eq("id", id);
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/welcome";
  }, []);

  // Memoized derived values
  const modeDescription = useMemo(
    () => getModeDescription(currentMode),
    [currentMode],
  );
  const showRecordArea = !result;

  return (
    <>
      {/* Welcome Animation */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeAnimation onComplete={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>

      {/* Main App */}
      <main className="min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-4 md:px-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: showWelcome ? 0 : 1, y: showWelcome ? -20 : 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/pyaw_kyi.png"
              alt="Pyaw Kyi Logo"
              width={40}
              height={40}
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              priority
            />
            <span className="text-base sm:text-lg font-bold text-foreground">
              Pyaw Kyi{" "}
              <span className="font-normal text-muted-foreground">
                (Just Say)
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowHistory(true)}
              className="relative p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="History"
            >
              <History className="w-5 h-5 text-foreground" />
              {historyItems.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                  {historyItems.length > 99 ? "99+" : historyItems.length}
                </span>
              )}
            </motion.button>
            <motion.button
              onClick={() => setShowApiPanel(true)}
              className="p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="API"
            >
              <Zap className="w-5 h-5 text-foreground" />
            </motion.button>
            <ThemeToggle />
            <motion.button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted overflow-hidden border border-border flex items-center justify-center transition-transform"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="User Settings"
            >
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userName || "User profile"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs sm:text-sm font-bold text-muted-foreground">
                  {userName ? userName[0].toUpperCase() : "?"}
                </span>
              )}
            </motion.button>
          </div>
        </motion.header>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-8 sm:py-12 pt-20 sm:pt-24 pb-4">
          <AnimatePresence mode="wait">
            {result ? (
              <ResultDisplay
                key="result"
                mode={currentMode}
                result={result}
                onRefine={handleRefine}
                onReset={handleReset}
                onSave={handleSave}
                isRefining={isRefining}
              />
            ) : (
              <motion.div
                key="recorder"
                className="flex flex-col items-center gap-6 sm:gap-8 w-full max-w-lg px-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Mode description */}
                <motion.p
                  className="text-muted-foreground text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {modeDescription}
                </motion.p>

                {/* Image upload for Craft mode */}
                {currentMode === "craft" && !isRecording && !isProcessing && (
                  <motion.div
                    className="w-full max-w-xs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <ImageUpload
                      onImageSelect={setCraftImage}
                      selectedImage={craftImage}
                      disabled={isRecording || isProcessing}
                    />
                  </motion.div>
                )}

                {/* Visualizer */}
                <AudioVisualizer
                  isRecording={isRecording}
                  analyser={analyser}
                />

                {/* Record button */}
                <RecordButton
                  isRecording={isRecording}
                  isPaused={isPaused}
                  isProcessing={isProcessing}
                  duration={duration}
                  onStart={handleStartRecording}
                  onStop={handleStopRecording}
                  onPause={pauseRecording}
                  onResume={resumeRecording}
                />

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm text-destructive text-center"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Mode selector */}
                <ModeSelector
                  currentMode={currentMode}
                  onModeChange={(mode) => {
                    if (!isRecording && !isProcessing) {
                      setCurrentMode(mode);
                      if (mode !== "craft") setCraftImage(null);
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <Footer />
      </main>

      {/* History Panel (Slide-in) */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-background border-l border-border shadow-2xl flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* History header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  <h2 className="font-semibold">History</h2>
                  <span className="text-xs text-muted-foreground">
                    ({historyItems.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* History list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {historyItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <History className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No saved items yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Record something and save it to see it here
                    </p>
                  </div>
                ) : (
                  historyItems.map((item) => (
                    <motion.div
                      key={item.id}
                      className="group p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleLoadHistory(item)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{MODE_EMOJI[item.mode]}</span>
                            <span className="text-xs font-medium capitalize">
                              {item.mode}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.content.slice(0, 80)}...
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(item.created_at).toLocaleDateString()} ·{" "}
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistory(item.id);
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Settings Modal */}
      <UserSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isAdmin={isAdmin}
        onOpenAdmin={() => {
          window.location.href = "/admin";
        }}
      />

      {/* API Key Panel */}
      <ApiKeyPanel
        isOpen={showApiPanel}
        onClose={() => setShowApiPanel(false)}
      />

      {/* Error Toasts */}
      <AnimatePresence>
        {errors.map((error) => (
          <ErrorToast
            key={error.id}
            message={error.message}
            type={error.type}
            onDismiss={() => dismissError(error.id)}
            onRetry={error.onRetry}
            autoDismiss={!error.onRetry}
          />
        ))}
      </AnimatePresence>

      {/* Offline Indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-orange-500/90 text-white text-sm font-medium rounded-full shadow-lg"
          >
            You are offline
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
