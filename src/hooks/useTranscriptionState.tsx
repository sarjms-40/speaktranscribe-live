
import { useState, useRef } from "react";
import { DuplicateSpeechDetector } from "@/utils/systemAudioCapture";
import { TranscriptionState } from "@/types/speechRecognition";

export const useTranscriptionState = (): {
  state: TranscriptionState;
  setState: {
    setTranscript: (transcript: string) => void;
    setIsRecording: (isRecording: boolean) => void;
    setError: (error: string | null) => void;
    setHasRecognitionEnded: (hasEnded: boolean) => void;
    resetTranscript: () => void;
  };
  refs: {
    finalTranscriptRef: React.MutableRefObject<string>;
    interimResultsRef: React.MutableRefObject<string>;
    duplicateDetectorRef: React.MutableRefObject<DuplicateSpeechDetector>;
  };
} => {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRecognitionEnded, setHasRecognitionEnded] = useState(false);
  
  // Reference to store final transcript parts to prevent duplication
  const finalTranscriptRef = useRef<string>("");
  // Reference to store the current interim results
  const interimResultsRef = useRef<string>("");
  // Duplicate speech detector
  const duplicateDetectorRef = useRef<DuplicateSpeechDetector>(new DuplicateSpeechDetector());

  const resetTranscript = () => {
    setTranscript("");
    finalTranscriptRef.current = "";
    interimResultsRef.current = "";
    setHasRecognitionEnded(false);
  };

  return {
    state: {
      transcript,
      isRecording,
      error,
      hasRecognitionEnded
    },
    setState: {
      setTranscript,
      setIsRecording,
      setError,
      setHasRecognitionEnded,
      resetTranscript
    },
    refs: {
      finalTranscriptRef,
      interimResultsRef,
      duplicateDetectorRef
    }
  };
};
