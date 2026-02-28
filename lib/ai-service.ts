import type {
  Mode,
  PolishResult,
  PlanResult,
  CraftResult,
  BuildResult,
  LearnResult,
} from "./types";
import {
  SYSTEM_PROMPTS,
  BUILD_FIX_PROMPT,
  REFINE_CONTENT_PROMPT,
  REFINE_CODE_PROMPT,
} from "./prompts";
import { blobToBase64 } from "./audio-utils";
import {
  APIError,
  NetworkError,
  AudioProcessingError,
  getErrorMessage,
  parseGeminiError,
  checkNetworkConnectivity,
} from "./error-handler";

interface APIResponse<T> {
  result?: T;
  error?: string;
}

async function callAPI<T>(
  body: Record<string, unknown>,
  retryCount = 0,
): Promise<T> {
  const MAX_RETRIES = 2;

  // Check network connectivity first
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new NetworkError();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for multimodal requests

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw parseGeminiError(response.status, errorBody);
    }

    const data: APIResponse<T> = await response.json();

    if (data.error) {
      throw new APIError(data.error, 500, true);
    }

    if (!data.result) {
      throw new APIError("No result returned from API", 500, true);
    }

    return data.result as T;
  } catch (error) {
    // Handle abort/timeout
    if (error instanceof Error && error.name === "AbortError") {
      throw new APIError("Request timed out. Please try again.", 408, true);
    }

    // Handle network errors
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        throw new NetworkError();
      }
      throw new APIError("Connection failed. Please try again.", 0, true);
    }

    // Retry for retryable errors
    if (
      error instanceof APIError &&
      error.isRetryable &&
      retryCount < MAX_RETRIES
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (retryCount + 1)),
      );
      return callAPI<T>(body, retryCount + 1);
    }

    throw error;
  }
}

export async function processPolish(audioBlob: Blob): Promise<PolishResult> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new AudioProcessingError(
      "No audio recorded. Please try recording again.",
    );
  }

  try {
    const audioBase64 = await blobToBase64(audioBlob);

    if (!audioBase64) {
      throw new AudioProcessingError("Failed to process audio data.");
    }

    const result = await callAPI<PolishResult>({
      systemPrompt: SYSTEM_PROMPTS.polish,
      audioBase64,
      mimeType: audioBlob.type || "audio/webm",
      isAudio: true,
    });

    if (!result.refined_text) {
      throw new APIError(
        "No text was generated. Please speak clearly and try again.",
        500,
        true,
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof AudioProcessingError ||
      error instanceof APIError ||
      error instanceof NetworkError
    ) {
      throw error;
    }
    throw new AudioProcessingError(getErrorMessage(error));
  }
}

export async function processPlan(audioBlob: Blob): Promise<PlanResult> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new AudioProcessingError(
      "No audio recorded. Please try recording again.",
    );
  }

  try {
    const audioBase64 = await blobToBase64(audioBlob);

    const result = await callAPI<PlanResult>({
      systemPrompt: SYSTEM_PROMPTS.plan,
      audioBase64,
      mimeType: audioBlob.type || "audio/webm",
      isAudio: true,
    });

    if (!result.plan_title && !result.schedule && !result.checklist) {
      throw new APIError(
        "No plan was generated. Please speak clearly and try again.",
        500,
        true,
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof AudioProcessingError ||
      error instanceof APIError ||
      error instanceof NetworkError
    ) {
      throw error;
    }
    throw new AudioProcessingError(getErrorMessage(error));
  }
}

export async function processCraft(
  audioBlob: Blob,
  imageFile?: File | null,
): Promise<CraftResult> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new AudioProcessingError(
      "No audio recorded. Please try recording again.",
    );
  }

  try {
    const audioBase64 = await blobToBase64(audioBlob);

    // If image is provided, convert it to base64
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;

    if (imageFile) {
      const imageBuffer = await imageFile.arrayBuffer();
      const imageBytes = new Uint8Array(imageBuffer);
      let binary = "";
      for (let i = 0; i < imageBytes.byteLength; i++) {
        binary += String.fromCharCode(imageBytes[i]);
      }
      imageBase64 = btoa(binary);
      imageMimeType = imageFile.type;
    }

    const result = await callAPI<CraftResult>({
      systemPrompt: SYSTEM_PROMPTS.craft,
      audioBase64,
      mimeType: audioBlob.type || "audio/webm",
      isAudio: true,
      imageBase64,
      imageMimeType,
    });

    if (!result.generated_content) {
      throw new APIError(
        "No content was generated. Please speak clearly and try again.",
        500,
        true,
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof AudioProcessingError ||
      error instanceof APIError ||
      error instanceof NetworkError
    ) {
      throw error;
    }
    throw new AudioProcessingError(getErrorMessage(error));
  }
}

export async function processBuild(audioBlob: Blob): Promise<BuildResult> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new AudioProcessingError(
      "No audio recorded. Please try recording again.",
    );
  }

  try {
    const audioBase64 = await blobToBase64(audioBlob);

    // First pass: Generate HTML code
    const initialResult = await callAPI<BuildResult>({
      systemPrompt: SYSTEM_PROMPTS.build,
      audioBase64,
      mimeType: audioBlob.type || "audio/webm",
      isAudio: true,
    });

    const generatedCode = initialResult.html_code;

    if (!generatedCode) {
      throw new APIError(
        "No code was generated. Please describe your app clearly and try again.",
        500,
        true,
      );
    }

    // Second pass: Fix and polish the HTML code
    try {
      const fixedResult = await callAPI<{ fixed_code: string }>({
        systemPrompt: BUILD_FIX_PROMPT,
        userContent: `original_request: "[Audio transcription - the user's voice command]"\n\ngenerated_code: "${generatedCode.replace(/"/g, '\\"')}"`,
        isAudio: false,
      });

      return {
        html_code: generatedCode,
        fixed_code: fixedResult.fixed_code || generatedCode,
      };
    } catch {
      // If second pass fails, return the initial code
      return {
        html_code: generatedCode,
        fixed_code: generatedCode,
      };
    }
  } catch (error) {
    if (
      error instanceof AudioProcessingError ||
      error instanceof APIError ||
      error instanceof NetworkError
    ) {
      throw error;
    }
    throw new AudioProcessingError(getErrorMessage(error));
  }
}

export async function processLearn(audioBlob: Blob): Promise<LearnResult> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new AudioProcessingError(
      "No audio recorded. Please try recording again.",
    );
  }

  try {
    const audioBase64 = await blobToBase64(audioBlob);
    if (!audioBase64) {
      throw new AudioProcessingError("Failed to process audio data.");
    }

    const result = await callAPI<LearnResult>({
      systemPrompt: SYSTEM_PROMPTS.learn,
      audioBase64,
      mimeType: audioBlob.type || "audio/webm",
      isAudio: true,
    });

    if (!result.study_title && !result.summary) {
      throw new APIError(
        "No study notes were generated. Please speak clearly and try again.",
        500,
        true,
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof AudioProcessingError ||
      error instanceof APIError ||
      error instanceof NetworkError
    ) {
      throw error;
    }
    throw new AudioProcessingError(getErrorMessage(error));
  }
}

export async function processAudio(
  mode: Mode,
  audioBlob: Blob,
  imageFile?: File | null,
): Promise<
  PolishResult | PlanResult | CraftResult | BuildResult | LearnResult
> {
  switch (mode) {
    case "polish":
      return processPolish(audioBlob);
    case "plan":
      return processPlan(audioBlob);
    case "craft":
      return processCraft(audioBlob, imageFile);
    case "build":
      return processBuild(audioBlob);
    case "learn":
      return processLearn(audioBlob);
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}

export async function refineContent(
  currentContent: string,
  instruction: string,
): Promise<string> {
  if (!currentContent || !instruction) {
    throw new APIError(
      "Missing content or instruction for refinement.",
      400,
      false,
    );
  }

  try {
    const result = await callAPI<{ refined_result: string }>({
      systemPrompt: REFINE_CONTENT_PROMPT,
      userContent: `current_content: "${currentContent.replace(/"/g, '\\"')}"\n\nrefinement_instruction: "${instruction}"`,
      isAudio: false,
    });

    return result.refined_result || currentContent;
  } catch (error) {
    if (error instanceof APIError || error instanceof NetworkError) {
      throw error;
    }
    throw new APIError(
      "Failed to refine content. Please try again.",
      500,
      true,
    );
  }
}

export async function refineCode(
  currentCode: string,
  instruction: string,
): Promise<string> {
  if (!currentCode || !instruction) {
    throw new APIError(
      "Missing code or instruction for refinement.",
      400,
      false,
    );
  }

  try {
    const result = await callAPI<{ fixed_code: string }>({
      systemPrompt: REFINE_CODE_PROMPT,
      userContent: `current_code: "${currentCode.replace(/"/g, '\\"')}"\n\nrefinement_instruction: "${instruction}"`,
      isAudio: false,
    });

    return result.fixed_code || currentCode;
  } catch (error) {
    if (error instanceof APIError || error instanceof NetworkError) {
      throw error;
    }
    throw new APIError("Failed to refine code. Please try again.", 500, true);
  }
}
