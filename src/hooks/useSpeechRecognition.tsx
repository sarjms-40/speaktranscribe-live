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
        text,
        timestamp: Date.now(),
        speaker: detectSpeaker()
      };
      
      segmentsRef.current = [...segmentsRef.current, newSegment];
      interimSegmentRef.current = "";
    } else {
      interimSegmentRef.current = text;
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

  useEffect(() => {
    if (!recognitionRef.current) return;

    const handleResult = (event: any) => {
      let currentInterimTranscript = '';
      let newFinalTranscript = '';
      
      lastActivityRef.current = Date.now();
      
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
      console.error("Speech recognition error:", event);
      
      setError(getSpeechErrorMessage(event.error));
      
      if (!intentionalStopRef.current) {
        setHasRecognitionEnded(true);
      }
      
      setIsRecording(false);
    };

    const handleEnd = () => {
      console.log("Speech recognition ended, intentional:", intentionalStopRef.current);
      
      if (!intentionalStopRef.current) {
        setHasRecognitionEnded(true);
        setIsRecording(false);
      } else {
        intentionalStopRef.current = false;
      }
      
      if (isRecording && recognitionRef.current && !intentionalStopRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log("Error restarting recognition:", e);
        }
      }
    };

    recognitionRef.current.onresult = handleResult;
    recognitionRef.current.onerror = handleError;
    recognitionRef.current.onend = handleEnd;
  }, [isRecording, updateTranscriptionSegments]);

  useEffect(() => {
    if (isRecording) {
      inactivityTimerRef.current = window.setInterval(() => {
        const now = Date.now();
        const inactivityTime = now - lastActivityRef.current;
        
        if (inactivityTime > 60000) {
          console.log(`No speech activity detected for ${inactivityTime/1000} seconds`);
          setHasRecognitionEnded(true);
        }
      }, 10000);
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
      duplicateDetectorRef.current.reset();
      silenceDetectorRef.current.reset();
      silenceDetectorRef.current.configure({
        silenceThreshold: -65,
        minSilenceDuration: 2000
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
