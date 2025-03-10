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
  
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const intentionalStopRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorCleanupRef = useRef<(() => void) | null>(null);
  const silenceDetectorRef = useRef<SilenceDetector>(new SilenceDetector());
  const speakerDiarizationRef = useRef<SpeakerDiarization>(new SpeakerDiarization());
  const speakersRef = useRef<Speaker[]>([]);
  const segmentsRef = useRef<TranscriptionSegment[]>([]);
  const interimSegmentRef = useRef<string>("");
  const recognitionRestartAttemptsRef = useRef<number>(0);
  const maxRecognitionRestartAttempts = 5;
  const recognitionRestartDelayRef = useRef<number>(1000);

  useEffect(() => {
    recognitionRef.current = initSpeechRecognition();
    
    if (!recognitionRef.current) {
      setError(
        "Speech recognition is not supported in this browser. Try using Chrome, Edge, or Safari."
      );
    }

    return () => {
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

  const updateTranscriptionSegments = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal && audioSource !== 'system' && audioSource !== 'meeting') return;
    
    if (isFinal) {
      const newSegment: TranscriptionSegment = {
        text: text.trim(),
        timestamp: Date.now(),
        speaker: detectSpeaker()
      };
      
      if (newSegment.text) {
        segmentsRef.current = [...segmentsRef.current, newSegment];
      }
      interimSegmentRef.current = "";
    } else if (text.trim()) {
      interimSegmentRef.current = text.trim();
    }
  }, [audioSource]);

  const detectSpeaker = useCallback((): Speaker | undefined => {
    const speakerCount = speakersRef.current.length;
    const { speakerId, confidence } = speakerDiarizationRef.current.detectSpeakerChange(new Float32Array(0));
    
    const existingSpeaker = speakersRef.current.find(s => s.id === `speaker-${speakerId}`);
    if (existingSpeaker) {
      return existingSpeaker;
    }
    
    const newSpeaker: Speaker = {
      id: `speaker-${speakerId}`,
      name: `Speaker ${speakerId}`,
      confidence: confidence
    };
    
    if (speakerCount < 5) {
      speakersRef.current = [...speakersRef.current, newSpeaker];
    }
    
    return newSpeaker;
  }, []);

  const restartRecognition = useCallback(() => {
    if (recognitionRef.current && isRecording && !intentionalStopRef.current) {
      if (recognitionRestartAttemptsRef.current < maxRecognitionRestartAttempts) {
        console.log(`Attempting to restart speech recognition (attempt ${recognitionRestartAttemptsRef.current + 1}/${maxRecognitionRestartAttempts})`);
        
        setTimeout(() => {
          try {
            if (interimResultsRef.current) {
              finalTranscriptRef.current += interimResultsRef.current + " ";
              updateTranscriptionSegments(interimResultsRef.current, true);
              interimResultsRef.current = "";
            }
            
            recognitionRef.current?.start();
            recognitionRestartAttemptsRef.current++;
            
            recognitionRestartDelayRef.current = Math.min(recognitionRestartDelayRef.current * 1.5, 10000);
            lastActivityRef.current = Date.now();
          } catch (e) {
            console.error("Error restarting speech recognition:", e);
            setError("Speech recognition failed to restart. Please try again manually.");
            setIsRecording(false);
          }
        }, recognitionRestartDelayRef.current);
      } else {
        console.log("Maximum restart attempts reached. Stopping recognition.");
        setError("Speech recognition has disconnected too many times. Please try again.");
        setIsRecording(false);
      }
    }
  }, [isRecording, updateTranscriptionSegments]);

  useEffect(() => {
    if (!recognitionRef.current) return;

    const handleResult = (event: any) => {
      let currentInterimTranscript = '';
      let newFinalTranscript = '';
      
      lastActivityRef.current = Date.now();
      recognitionRestartAttemptsRef.current = 0;
      recognitionRestartDelayRef.current = 1000;
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          const { hasDuplicates, cleanedText } = duplicateDetectorRef.current.checkForDuplicates(transcript);
          if (!hasDuplicates && cleanedText) {
            newFinalTranscript += cleanedText + " ";
            
            updateTranscriptionSegments(cleanedText, true);
          }
        } else {
          currentInterimTranscript += transcript;
          
          updateTranscriptionSegments(currentInterimTranscript, false);
        }
      }
      
      if (newFinalTranscript) {
        finalTranscriptRef.current += newFinalTranscript;
      }
      
      interimResultsRef.current = currentInterimTranscript;
      
      setTranscript(finalTranscriptRef.current + interimResultsRef.current);
    };

    const handleError = (event: any) => {
      console.log("Speech recognition error:", event);
      
      if (event.error === 'no-speech') {
        console.log("No speech detected, continuing silently");
      } else if (event.error === 'network') {
        console.log("Network error in speech recognition, attempting to restart");
        restartRecognition();
      } else if (event.error === 'aborted' && !intentionalStopRef.current) {
        console.log("Speech recognition aborted unexpectedly, attempting to restart");
        restartRecognition();
      } else if (!intentionalStopRef.current) {
        setError(getSpeechErrorMessage(event.error));
        setHasRecognitionEnded(true);
        setIsRecording(false);
      }
    };

    const handleEnd = () => {
      console.log("Speech recognition ended, intentional:", intentionalStopRef.current);
      
      if (!intentionalStopRef.current) {
        restartRecognition();
      } else {
        intentionalStopRef.current = false;
      }
    };

    recognitionRef.current.onresult = handleResult;
    recognitionRef.current.onerror = handleError;
    recognitionRef.current.onend = handleEnd;
    
    if (recognitionRef.current.continuous !== undefined) {
      recognitionRef.current.continuous = true;
    }
    
    if (recognitionRef.current.interimResults !== undefined) {
      recognitionRef.current.interimResults = true;
    }
    
    if (recognitionRef.current.maxAlternatives !== undefined) {
      recognitionRef.current.maxAlternatives = 3;
    }
  }, [isRecording, updateTranscriptionSegments, restartRecognition]);

  useEffect(() => {
    if (isRecording) {
      inactivityTimerRef.current = window.setInterval(() => {
        const now = Date.now();
        const inactivityTime = now - lastActivityRef.current;
        
        if (inactivityTime > 180000) {
          console.log(`No speech activity detected for ${inactivityTime/1000} seconds`);
        }
      }, 30000);
    } else {
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

  const changeAudioSource = useCallback(async (source: AudioSource) => {
    if (isRecording) {
      stopRecording();
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (audioProcessorCleanupRef.current) {
      audioProcessorCleanupRef.current();
      audioProcessorCleanupRef.current = null;
    }
    
    setAudioSource(source);
    setError(null);
    
    if (isRecording) {
      await startRecording(source);
    }
  }, [isRecording]);

  const startRecording = useCallback(async (source?: AudioSource) => {
    setError(null);
    setHasRecognitionEnded(false);
    
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    
    const audioSourceToUse = source || audioSource;
    
    try {
      finalTranscriptRef.current = "";
      interimResultsRef.current = "";
      interimSegmentRef.current = "";
      segmentsRef.current = [];
      intentionalStopRef.current = false;
      lastActivityRef.current = Date.now();
      recognitionRestartAttemptsRef.current = 0;
      recognitionRestartDelayRef.current = 1000;
      duplicateDetectorRef.current.reset();
      silenceDetectorRef.current.reset();
      silenceDetectorRef.current.configure({
        silenceThreshold: -75,
        minSilenceDuration: 5000
      });
      speakerDiarizationRef.current.reset();
      speakersRef.current = [];
      
      const stream = await getAudioStream(audioSourceToUse, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1
      });
      
      if (!stream) {
        setError(`Could not access ${audioSourceToUse} audio. Please check permissions.`);
        return;
      }
      
      audioStreamRef.current = stream;
      
      if (window.AudioContext) {
        audioContextRef.current = new AudioContext({
          sampleRate: 16000,
          latencyHint: 'interactive'
        });
        
        audioProcessorCleanupRef.current = createAudioProcessor(
          stream,
          audioContextRef.current,
          (audioData) => {
            const isSilent = silenceDetectorRef.current.isSilent(audioData);
            
            if (isSilent) {
              console.log("Silence detected");
            }
            
            if (audioSourceToUse === 'system' || audioSourceToUse === 'meeting') {
              const speakerResult = speakerDiarizationRef.current.detectSpeakerChange(audioData);
              console.log("Speaker detection:", speakerResult);
            }
          }
        );
      }
      
      if (recognitionRef.current.continuous !== undefined) {
        recognitionRef.current.continuous = true;
      }
      
      if (recognitionRef.current.interimResults !== undefined) {
        recognitionRef.current.interimResults = true;
      }
      
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setError("Failed to start speech recognition. Please try again.");
    }
  }, [audioSource]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      intentionalStopRef.current = true;
      recognitionRef.current.stop();
      setIsRecording(false);
      
      if (interimResultsRef.current) {
        finalTranscriptRef.current += interimResultsRef.current;
        interimResultsRef.current = "";
        
        if (interimSegmentRef.current) {
          updateTranscriptionSegments(interimSegmentRef.current, true);
          interimSegmentRef.current = "";
        }
        
        setTranscript(finalTranscriptRef.current);
      }
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      if (audioProcessorCleanupRef.current) {
        audioProcessorCleanupRef.current();
        audioProcessorCleanupRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    }
  }, [updateTranscriptionSegments]);

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
