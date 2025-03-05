
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
      className="transcription-container min-h-[300px] max-h-[500px] font-light bg-white/50 dark:bg-black/30 p-4 rounded-lg border border-border/60 shadow-sm"
    >
      <div className="text-left">
        {transcript ? (
          <div>
            <div className="mb-2 text-xs text-muted-foreground">Customer Speech:</div>
            <p className="whitespace-pre-wrap break-words">{transcript}</p>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground italic">
            {isRecording 
              ? "Listening to customer..." 
              : "Start a call to begin transcribing customer speech"}
          </div>
        )}
        {isRecording && transcript && (
          <div className="inline-block w-2 h-5 ml-1 bg-primary opacity-50 animate-pulse"></div>
        )}
      </div>
    </div>
  );
};

export default TranscriptionDisplay;
