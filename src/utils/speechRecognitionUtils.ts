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
export const checkSystemAudioSupport = async (): Promise<{
  isSupported: boolean;
  details: string;
}> => {
  try {
    // Check if getDisplayMedia is available
    // @ts-ignore - TypeScript doesn't know about this experimental API
    if (!navigator.mediaDevices.getDisplayMedia) {
      return {
        isSupported: false,
        details: "getDisplayMedia API not available"
      };
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
      
      // Get info about the tracks
      const trackInfo = stream.getAudioTracks().map(track => {
        const settings = track.getSettings();
        return {
          label: track.label,
          settings: {
            channelCount: settings.channelCount,
            sampleRate: settings.sampleRate
          }
        };
      });
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
      
      return {
        isSupported: hasAudioTracks,
        details: hasAudioTracks 
          ? `System audio supported with ${trackInfo.length} tracks. Details: ${JSON.stringify(trackInfo)}`
          : "No audio tracks found despite API support"
      };
    } catch (err) {
      // If we get a security or permission error, it might still be supported
      const errMsg = err instanceof Error ? err.message : String(err);
      const isPotentiallySupported = errMsg.includes("security") || errMsg.includes("permission");
      
      return {
        isSupported: isPotentiallySupported,
        details: `Error testing: ${errMsg}. ${
          isPotentiallySupported 
            ? "May be supported with permission" 
            : "Likely not supported"
        }`
      };
    }
  } catch (err) {
    console.warn("System audio capture not supported:", err);
    return {
      isSupported: false,
      details: `Error: ${err instanceof Error ? err.message : String(err)}`
    };
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

/**
 * Detect the environment we're running in
 * This helps adapt functionality based on the execution context
 */
export const detectEnvironment = (): {
  isDesktopApp: boolean;
  isBrowser: boolean;
  browserInfo: {
    name: string;
    version: string;
    isChrome: boolean;
    isFirefox: boolean;
    isSafari: boolean;
    isEdge: boolean;
  };
  systemCapabilities: {
    hasDisplayMedia: boolean;
    hasAudioWorklet: boolean;
    hasSecureContext: boolean;
  };
} => {
  // Check for desktop app environment
  // @ts-ignore - TypeScript doesn't know about these possible APIs
  const isElectron = !!(window.process && window.process.type);
  // @ts-ignore
  const isTauri = !!window.__TAURI__;
  const isDesktopApp = isElectron || isTauri;
  
  // Browser detection
  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
  const isFirefox = userAgent.includes('firefox');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  const isEdge = userAgent.includes('edg');
  
  // Get browser version
  let browserName = "unknown";
  let browserVersion = "unknown";
  
  if (isChrome) {
    browserName = "Chrome";
    browserVersion = (userAgent.match(/chrome\/([0-9.]+)/) || ['', ''])[1];
  } else if (isFirefox) {
    browserName = "Firefox";
    browserVersion = (userAgent.match(/firefox\/([0-9.]+)/) || ['', ''])[1];
  } else if (isSafari) {
    browserName = "Safari";
    browserVersion = (userAgent.match(/version\/([0-9.]+)/) || ['', ''])[1];
  } else if (isEdge) {
    browserName = "Edge";
    browserVersion = (userAgent.match(/edg\/([0-9.]+)/) || ['', ''])[1];
  }
  
  // System capabilities detection
  // @ts-ignore - TypeScript doesn't know about some of these APIs
  const hasDisplayMedia = !!navigator.mediaDevices.getDisplayMedia;
  const hasAudioWorklet = !!(window.AudioContext && AudioContext.prototype.audioWorklet);
  const hasSecureContext = window.isSecureContext;
  
  return {
    isDesktopApp,
    isBrowser: !isDesktopApp,
    browserInfo: {
      name: browserName,
      version: browserVersion,
      isChrome,
      isFirefox,
      isSafari,
      isEdge
    },
    systemCapabilities: {
      hasDisplayMedia,
      hasAudioWorklet,
      hasSecureContext
    }
  };
};
