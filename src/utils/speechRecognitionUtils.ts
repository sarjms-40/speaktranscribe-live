
import { ISpeechRecognition, IWindow } from "@/types/speechRecognition";

/**
 * Initialize speech recognition API
 * @returns Speech recognition instance or null if not supported
 */
export const initSpeechRecognition = (): ISpeechRecognition | null => {
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
  
  // Configure the recognition for call center environment
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy
  
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
    "not-allowed": "Microphone access was denied. Please allow microphone access.",
    "service-not-allowed": "Speech recognition service is not allowed.",
    "bad-grammar": "Error in speech grammar or language configuration.",
    "language-not-supported": "The selected language is not supported.",
  };
  
  return errorMessages[errorCode] || "An unknown error occurred.";
};
