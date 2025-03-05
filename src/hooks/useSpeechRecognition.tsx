
import { useState, useEffect, useCallback, useRef } from "react";

// Define the SpeechRecognition type
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

// Define the window with SpeechRecognition property
interface IWindow extends Window {
  SpeechRecognition: new () => ISpeechRecognition;
  webkitSpeechRecognition: new () => ISpeechRecognition;
}

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reference to the SpeechRecognition instance
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    const windowWithSpeech = window as unknown as IWindow;
    const SpeechRecognitionAPI = 
      windowWithSpeech.SpeechRecognition || 
      windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError(
        "Speech recognition is not supported in this browser. Try using Chrome, Edge, or Safari."
      );
      return;
    }

    // Create a new recognition instance
    recognitionRef.current = new SpeechRecognitionAPI();
    
    // Configure the recognition for call center environment
    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true; // Get real-time interim results
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.maxAlternatives = 3; // Get multiple alternatives for better accuracy
    }

    return () => {
      // Clean up
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Add event handlers for the recognition instance
  useEffect(() => {
    if (!recognitionRef.current) return;

    const handleResult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      // Process the results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update the transcript with both final and interim results for real-time display
      setTranscript((prev) => {
        const updatedTranscript = finalTranscript 
          ? prev + (prev ? " " : "") + finalTranscript 
          : prev;
          
        return interimTranscript 
          ? updatedTranscript + (updatedTranscript ? " " : "") + interimTranscript 
          : updatedTranscript;
      });
    };

    const handleError = (event: any) => {
      console.error("Speech recognition error:", event);
      
      // Map error codes to user-friendly messages
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
      
      setError(errorMessages[event.error] || "An unknown error occurred.");
      setIsRecording(false);
    };

    const handleEnd = () => {
      // Auto-restart recognition if we're still in recording state
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log("Error restarting recognition:", e);
        }
      }
    };

    // Attach event handlers
    recognitionRef.current.onresult = handleResult;
    recognitionRef.current.onerror = handleError;
    recognitionRef.current.onend = handleEnd;

  }, [isRecording]);

  // Function to start recording
  const startRecording = useCallback(() => {
    setError(null);
    
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setError("Failed to start speech recognition. Please try again.");
    }
  }, []);

  // Function to stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // Function to reset the transcript
  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    isRecording,
    startRecording,
    stopRecording,
    resetTranscript,
    error,
  };
};
