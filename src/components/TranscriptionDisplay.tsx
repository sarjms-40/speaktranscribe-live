
import React, { useEffect, useRef, useState } from "react";
import { Speaker } from "@/types/speechRecognition";

interface TranscriptionDisplayProps {
  transcript: string;
  isRecording: boolean;
  speakers?: Speaker[];
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcript,
  isRecording,
  speakers = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [words, setWords] = useState<string[]>([]);
  
  // Process transcript into words for real-time display
  useEffect(() => {
    if (transcript) {
      // Split the transcript into words for animated display
      const newWords = transcript.split(/\s+/);
      setWords(newWords);
    } else {
      setWords([]);
    }
  }, [transcript]);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript]);

  // Animated appearance of words
  const getWordStyle = (index: number) => {
    // Add a slight delay to each word for a typing effect
    const baseDelay = 0.05; // 50ms
    return {
      animationDelay: `${baseDelay * index}s`,
    };
  };

  return (
    <div 
      ref={containerRef}
      className="transcription-container min-h-[300px] max-h-[500px] font-light bg-white/50 dark:bg-black/30 p-4 rounded-lg border border-border/60 shadow-sm overflow-auto"
    >
      <div className="text-left">
        {transcript ? (
          <div>
            <div className="mb-2 text-xs text-muted-foreground">Real-time Speech:</div>
            <p className="whitespace-pre-wrap break-words">
              {words.map((word, index) => (
                <span 
                  key={index} 
                  className="inline-block animate-fade-in" 
                  style={getWordStyle(index)}
                >
                  {word}{' '}
                </span>
              ))}
              {isRecording && (
                <span className="inline-block w-2 h-5 ml-1 bg-primary opacity-50 animate-pulse"></span>
              )}
            </p>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground italic">
            {isRecording 
              ? "Listening..." 
              : "Start recording to begin real-time transcription"}
          </div>
        )}
      </div>
      
      {speakers.length > 0 && (
        <div className="mt-4 border-t border-border/30 pt-3">
          <div className="text-xs text-muted-foreground mb-1">Detected Speakers:</div>
          <div className="flex gap-2">
            {speakers.map(speaker => (
              <div 
                key={speaker.id}
                className="px-2 py-1 bg-secondary/40 rounded-full text-xs"
              >
                {speaker.name} ({Math.round(speaker.confidence * 100)}%)
              </div>
            ))}
          </div>
        </div>
      )}

      {isRecording && (
        <div className="mt-4 text-xs text-muted-foreground border-t border-border/30 pt-3">
          <div className="flex items-center justify-between">
            <span>HIPAA Compliant: All processing happens locally</span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div> 
              Processing audio
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;
