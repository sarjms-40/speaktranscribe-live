
import { ISpeechRecognition, IWindow } from "@/types/speechRecognition";

/**
 * Initialize speech recognition API
 * @param options Optional configuration options
 * @returns Speech recognition instance or null if not supported
 */
export const initSpeechRecognition = (options?: {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}): ISpeechRecognition | null => {
  // Default options
  const defaults = {
    language: "en-US",
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
  };
  
  // Merge provided options with defaults
  const config = { ...defaults, ...options };
  
  // Check if browser supports speech recognition
  const windowWithSpeech = window as unknown as IWindow;
  const SpeechRecognitionAPI = 
    windowWithSpeech.SpeechRecognition || 
    windowWithSpeech.webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    return null;
  }

  // Create a new recognition instance
  const recognition = new SpeechRecognitionAPI();
  
  // Configure the recognition for optimal speech transcription
  recognition.continuous = config.continuous;
  recognition.interimResults = config.interimResults;
  recognition.lang = config.language;
  recognition.maxAlternatives = config.maxAlternatives;
  
  return recognition;
};

/**
 * Maps browser speech recognition error codes to user-friendly messages
 */
export const getSpeechErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    "no-speech": "No speech was detected. Please try again.",
    "aborted": "Speech recognition was aborted.",
    "audio-capture": "No microphone was found or microphone access was denied.",
    "network": "Network error occurred. Please check your connection.",
    "not-allowed": "Microphone access was denied. Please allow microphone access in your browser settings.",
    "service-not-allowed": "Speech recognition service is not allowed.",
    "bad-grammar": "Error in speech grammar or language configuration.",
    "language-not-supported": "The selected language is not supported.",
  };
  
  return errorMessages[errorCode] || "An unknown error occurred.";
};

/**
 * Check if browser supports system audio capture
 */
export const checkSystemAudioSupport = async (): Promise<boolean> => {
  try {
    // Check if getDisplayMedia is available
    // @ts-ignore - TypeScript doesn't know about this experimental API
    if (!navigator.mediaDevices.getDisplayMedia) {
      return false;
    }
    
    // Some browsers support getDisplayMedia but not system audio capture
    // We need to try to actually capture system audio to confirm
    try {
      const constraints = {
        video: false,
        audio: true,
        // @ts-ignore - TypeScript doesn't know about this experimental property
        systemAudio: 'include'
      };
      
      // @ts-ignore
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      const hasAudioTracks = stream.getAudioTracks().length > 0;
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
      
      return hasAudioTracks;
    } catch (err) {
      // If we get a security or permission error, it might still be supported
      const errMsg = err instanceof Error ? err.message : String(err);
      return errMsg.includes("security") || errMsg.includes("permission");
    }
  } catch (err) {
    console.warn("System audio capture not supported:", err);
    return false;
  }
};

/**
 * Get available languages for speech recognition
 */
export const getAvailableSpeechLanguages = (): { code: string; name: string }[] => {
  return [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "es-ES", name: "Spanish" },
    { code: "fr-FR", name: "French" },
    { code: "de-DE", name: "German" },
    { code: "it-IT", name: "Italian" },
    { code: "pt-BR", name: "Portuguese (Brazil)" },
    { code: "zh-CN", name: "Chinese (Simplified)" },
    { code: "ja-JP", name: "Japanese" },
    { code: "ko-KR", name: "Korean" },
    { code: "ru-RU", name: "Russian" },
    { code: "nl-NL", name: "Dutch" },
    { code: "hi-IN", name: "Hindi" },
  ];
};

/**
 * Generate pseudo-random speaker ID
 * For more accurate speaker diarization, ML models would be better
 */
export const generateSpeakerId = (): string => {
  return `speaker-${Math.floor(Math.random() * 1000)}`;
};
