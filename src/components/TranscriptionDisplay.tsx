
import React, { useEffect, useRef } from "react";

interface TranscriptionDisplayProps {
  transcript: string;
  isRecording: boolean;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcript,
  isRecording,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div 
      ref={containerRef}
      className="transcription-container min-h-[200px] max-h-[400px] font-light"
    >
      {transcript ? (
        <p className="whitespace-pre-wrap break-words">{transcript}</p>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground italic">
          {isRecording 
            ? "Listening..." 
            : "Press the record button to start transcribing"}
        </div>
      )}
      {isRecording && transcript && (
        <div className="inline-block w-2 h-5 ml-1 bg-primary opacity-50 animate-pulse"></div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;
