import { useState, useEffect, useCallback, useRef } from "react";
import { AudioSource, getAudioStream, DuplicateSpeechDetector } from "../utils/systemAudioCapture";

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
  const [hasRecognitionEnded, setHasRecognitionEnded] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');
  const [availableDevices, setAvailableDevices] = useState<{
    headphones: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({ headphones: [], microphones: [] });
  
  // Reference to the SpeechRecognition instance
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  // Reference to store final transcript parts to prevent duplication
  const finalTranscriptRef = useRef<string>("");
  // Reference to store the current interim results
  const interimResultsRef = useRef<string>("");
  // Reference to track if stop was intentional
  const intentionalStopRef = useRef<boolean>(false);
  // Reference to track last activity time
  const lastActivityRef = useRef<number>(Date.now());
  // Reference to inactivity timer
  const inactivityTimerRef = useRef<number | null>(null);
  // Reference to audio stream
  const audioStreamRef = useRef<MediaStream | null>(null);
  // Duplicate speech detector
  const duplicateDetectorRef = useRef<DuplicateSpeechDetector>(new DuplicateSpeechDetector());

  // Fetch available audio devices when component mounts
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request initial permission to access devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await getAvailableAudioDevices();
        setAvailableDevices(devices);
        
        // Auto-select headphones if available
        if (devices.headphones.length > 0) {
          setAudioSource('headphones');
        }
      } catch (err) {
        console.error("Error loading audio devices:", err);
        setError("Could not access audio devices. Please check your browser permissions.");
      }
    };
    
    loadDevices();
    
    // Listen for device changes (e.g., plugging in headphones)
    const handleDeviceChange = async () => {
      const devices = await getAvailableAudioDevices();
      setAvailableDevices(devices);
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

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
        intentionalStopRef.current = true;
        recognitionRef.current.stop();
      }
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Add event handlers for the recognition instance
  useEffect(() => {
    if (!recognitionRef.current) return;

    const handleResult = (event: any) => {
      let currentInterimTranscript = '';
      let newFinalTranscript = '';
      
      // Update last activity time when we get results
      lastActivityRef.current = Date.now();
      
      // Process the results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          // Check for duplicates before adding final transcript
          const { hasDuplicates, cleanedText } = duplicateDetectorRef.current.checkForDuplicates(transcript);
          if (!hasDuplicates && cleanedText) {
            newFinalTranscript += cleanedText + " ";
          }
        } else {
          currentInterimTranscript += transcript;
        }
      }
      
      // Update the final transcript reference
      if (newFinalTranscript) {
        finalTranscriptRef.current += newFinalTranscript;
      }
      
      // Store the current interim results
      interimResultsRef.current = currentInterimTranscript;
      
      // Update the displayed transcript with both final and interim results
      setTranscript(finalTranscriptRef.current + interimResultsRef.current);
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
      
      // If it's not an intentional stop, mark it as unexpected end
      if (!intentionalStopRef.current) {
        setHasRecognitionEnded(true);
      }
      
      setIsRecording(false);
    };

    const handleEnd = () => {
      console.log("Speech recognition ended, intentional:", intentionalStopRef.current);
      
      // If it wasn't an intentional stop, mark it as an unexpected end
      if (!intentionalStopRef.current) {
        setHasRecognitionEnded(true);
        setIsRecording(false);
      } else {
        // Reset the flag if it was intentional
        intentionalStopRef.current = false;
      }
      
      // Auto-restart recognition if we're still in recording state
      // and it wasn't intentionally stopped
      if (isRecording && recognitionRef.current && !intentionalStopRef.current) {
        try {
          console.log("Auto-restarting speech recognition");
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

  // Set up inactivity detection
  useEffect(() => {
    if (isRecording) {
      // Check for inactivity every 5 seconds
      inactivityTimerRef.current = window.setInterval(() => {
        const now = Date.now();
        const inactivityTime = now - lastActivityRef.current;
        
        // If no activity for more than 10 seconds, consider it as a potential call end
        if (inactivityTime > 10000) {
          console.log(`No speech activity detected for ${inactivityTime/1000} seconds`);
          setHasRecognitionEnded(true);
        }
      }, 5000);
    } else {
      // Clear the timer when not recording
      if (inactivityTimerRef.current) {
        window.clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    }
    
    return () => {
      if (inactivityTimerRef.current) {
        window.clearInterval(inactivityTimerRef.current);
      }
    };
  }, [isRecording]);

  // Function to change audio source
  const changeAudioSource = useCallback(async (source: AudioSource) => {
    // Stop current recording if active
    if (isRecording) {
      stopRecording();
    }
    
    // Stop any existing audio stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    setAudioSource(source);
    setError(null);
    
    // If we're already recording, restart with new source
    if (isRecording) {
      await startRecording(source);
    }
  }, [isRecording]);

  // Function to start recording
  const startRecording = useCallback(async (source?: AudioSource) => {
    setError(null);
    setHasRecognitionEnded(false);
    
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    
    // Use provided source or current source
    const audioSourceToUse = source || audioSource;
    
    try {
      // Reset the transcript references when starting a new recording
      finalTranscriptRef.current = "";
      interimResultsRef.current = "";
      intentionalStopRef.current = false;
      lastActivityRef.current = Date.now();
      duplicateDetectorRef.current.reset();
      
      // Get audio stream for the selected source
      const stream = await getAudioStream(audioSourceToUse);
      
      if (!stream) {
        setError(`Could not access ${audioSourceToUse} audio. Please check permissions.`);
        return;
      }
      
      // Store the stream for later cleanup
      audioStreamRef.current = stream;
      
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setError("Failed to start speech recognition. Please try again.");
    }
  }, [audioSource]);

  // Function to stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      intentionalStopRef.current = true;
      recognitionRef.current.stop();
      setIsRecording(false);
      
      // Add any remaining interim results to the final transcript
      if (interimResultsRef.current) {
        finalTranscriptRef.current += interimResultsRef.current;
        interimResultsRef.current = "";
        setTranscript(finalTranscriptRef.current);
      }
      
      // Stop the audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
    }
  }, []);

  // Function to reset the transcript
  const resetTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
    interimResultsRef.current = "";
    setHasRecognitionEnded(false);
  }, []);

  return {
    transcript,
    isRecording,
    startRecording,
    stopRecording,
    resetTranscript,
    error,
    hasRecognitionEnded,
    audioSource,
    changeAudioSource,
    availableDevices
  };
};
