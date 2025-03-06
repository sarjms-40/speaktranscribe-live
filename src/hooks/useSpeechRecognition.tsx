
import { useEffect, useCallback, useRef } from "react";
import { AudioSource, getAudioStream, SilenceDetector, createAudioProcessor, SpeakerDiarization } from "@/utils/systemAudioCapture";
import { initSpeechRecognition, getSpeechErrorMessage } from "@/utils/speechRecognitionUtils";
import { ISpeechRecognition, Speaker, TranscriptionSegment } from "@/types/speechRecognition";
import { useAudioDevices } from "./useAudioDevices";
import { useTranscriptionState } from "./useTranscriptionState";

export const useSpeechRecognition = () => {
  const { 
    audioSource, 
    setAudioSource, 
    availableDevices, 
    deviceError,
    isSystemAudioSupported 
  } = useAudioDevices();
  
  const { 
    state: { transcript, isRecording, error, hasRecognitionEnded },
    setState: { setTranscript, setIsRecording, setError, setHasRecognitionEnded, resetTranscript },
    refs: { finalTranscriptRef, interimResultsRef, duplicateDetectorRef }
  } = useTranscriptionState();
  
  // Reference to the SpeechRecognition instance
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  // Reference to track if stop was intentional
  const intentionalStopRef = useRef<boolean>(false);
  // Reference to track last activity time
  const lastActivityRef = useRef<number>(Date.now());
  // Reference to inactivity timer
  const inactivityTimerRef = useRef<number | null>(null);
  // Reference to audio stream
  const audioStreamRef = useRef<MediaStream | null>(null);
  // Reference to AudioContext for processing
  const audioContextRef = useRef<AudioContext | null>(null);
  // Reference to audio processor cleanup function
  const audioProcessorCleanupRef = useRef<(() => void) | null>(null);
  // Reference to silence detector
  const silenceDetectorRef = useRef<SilenceDetector>(new SilenceDetector());
  // Reference to speaker diarization
  const speakerDiarizationRef = useRef<SpeakerDiarization>(new SpeakerDiarization());
  // Reference to detected speakers
  const speakersRef = useRef<Speaker[]>([]);
  // Reference to transcription segments
  const segmentsRef = useRef<TranscriptionSegment[]>([]);
  // Reference to current interim segment
  const interimSegmentRef = useRef<string>("");

  // Initialize speech recognition
  useEffect(() => {
    // Initialize speech recognition API
    recognitionRef.current = initSpeechRecognition();
    
    if (!recognitionRef.current) {
      setError(
        "Speech recognition is not supported in this browser. Try using Chrome, Edge, or Safari."
      );
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
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioProcessorCleanupRef.current) {
        audioProcessorCleanupRef.current();
      }
    };
  }, []);

  // Update segments when we get a new final transcript
  const updateTranscriptionSegments = useCallback((text: string, isFinal: boolean) => {
    // Only update segments for final results or if we're processing system audio
    if (!isFinal && audioSource !== 'system' && audioSource !== 'meeting') return;
    
    if (isFinal) {
      // Store interim text as final
      const newSegment: TranscriptionSegment = {
        text,
        timestamp: Date.now(),
        speaker: detectSpeaker()
      };
      
      segmentsRef.current = [...segmentsRef.current, newSegment];
      interimSegmentRef.current = "";
    } else {
      // Update interim text
      interimSegmentRef.current = text;
    }
  }, [audioSource]);
  
  // Helper to detect speaker
  const detectSpeaker = useCallback((): Speaker | undefined => {
    // For now we'll use a simple approach - assign based on known speakers
    const speakerCount = speakersRef.current.length;
    const { speakerId, confidence } = speakerDiarizationRef.current.detectSpeakerChange(new Float32Array(0));
    
    // Use existing speaker if we have one with this ID
    const existingSpeaker = speakersRef.current.find(s => s.id === `speaker-${speakerId}`);
    if (existingSpeaker) {
      return existingSpeaker;
    }
    
    // Create a new speaker
    const newSpeaker: Speaker = {
      id: `speaker-${speakerId}`,
      name: `Speaker ${speakerId}`,
      confidence: confidence
    };
    
    // Add to speakers list if new
    if (speakerCount < 5) { // Limit to 5 speakers for simplicity
      speakersRef.current = [...speakersRef.current, newSpeaker];
    }
    
    return newSpeaker;
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
            
            // Add to segments
            updateTranscriptionSegments(cleanedText, true);
          }
        } else {
          currentInterimTranscript += transcript;
          
          // Update interim segment
          updateTranscriptionSegments(currentInterimTranscript, false);
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
      setError(getSpeechErrorMessage(event.error));
      
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

  }, [isRecording, updateTranscriptionSegments]);

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
    
    // Close AudioContext if it exists
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Clean up audio processor if it exists
    if (audioProcessorCleanupRef.current) {
      audioProcessorCleanupRef.current();
      audioProcessorCleanupRef.current = null;
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
      interimSegmentRef.current = "";
      segmentsRef.current = [];
      intentionalStopRef.current = false;
      lastActivityRef.current = Date.now();
      duplicateDetectorRef.current.reset();
      silenceDetectorRef.current.reset();
      speakerDiarizationRef.current.reset();
      speakersRef.current = [];
      
      // Get audio stream for the selected source
      const stream = await getAudioStream(audioSourceToUse, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000, // 16kHz is optimal for speech recognition
        channelCount: 1,   // Mono is better for speech recognition
      });
      
      if (!stream) {
        setError(`Could not access ${audioSourceToUse} audio. Please check permissions.`);
        return;
      }
      
      // Store the stream for later cleanup
      audioStreamRef.current = stream;
      
      // Set up audio processing for enhanced features
      if (window.AudioContext) {
        audioContextRef.current = new AudioContext({
          sampleRate: 16000,
          latencyHint: 'interactive'
        });
        
        // Set up audio processor for analysis (VAD, speaker detection)
        audioProcessorCleanupRef.current = createAudioProcessor(
          stream,
          audioContextRef.current,
          (audioData) => {
            // Process audio data for silence detection
            const isSilent = silenceDetectorRef.current.isSilent(audioData);
            
            if (isSilent) {
              console.log("Silence detected");
              // Silence detected - could be used to trigger events
            }
            
            // Process audio for speaker detection (only if we have system audio)
            if (audioSourceToUse === 'system' || audioSourceToUse === 'meeting') {
              // Detect potential speaker changes
              const speakerResult = speakerDiarizationRef.current.detectSpeakerChange(audioData);
              console.log("Speaker detection:", speakerResult);
            }
          }
        );
      }
      
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
        
        // Add interim as final segment if there's content
        if (interimSegmentRef.current) {
          updateTranscriptionSegments(interimSegmentRef.current, true);
          interimSegmentRef.current = "";
        }
        
        setTranscript(finalTranscriptRef.current);
      }
      
      // Stop the audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      // Clean up audio processor
      if (audioProcessorCleanupRef.current) {
        audioProcessorCleanupRef.current();
        audioProcessorCleanupRef.current = null;
      }
      
      // Close the AudioContext
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    }
  }, [updateTranscriptionSegments]);

  // Combine device error with speech recognition error
  const combinedError = deviceError || error;

  return {
    transcript,
    isRecording,
    startRecording,
    stopRecording,
    resetTranscript,
    error: combinedError,
    hasRecognitionEnded,
    audioSource,
    changeAudioSource,
    availableDevices,
    isSystemAudioSupported,
    speakers: speakersRef.current,
    segments: segmentsRef.current,
    interimText: interimSegmentRef.current
  };
};
