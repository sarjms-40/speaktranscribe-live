
import React, { useEffect, useRef, useState } from "react";
import { Speaker, TranscriptionSegment } from "@/types/speechRecognition";
import SpeakerSegment from "./SpeakerSegment";

interface TranscriptionDisplayProps {
  transcript: string;
  isRecording: boolean;
  speakers?: Speaker[];
  segments?: TranscriptionSegment[];
  interimText?: string;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcript,
  isRecording,
  speakers = [],
  segments = [],
  interimText = ""
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [words, setWords] = useState<string[]>([]);
  
  // Process transcript into words for real-time display
  useEffect(() => {
    if (transcript) {
      // Split the transcript into words for animated display
      const newWords = transcript.split(/\s+/).filter(word => word.trim().length > 0);
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
  }, [transcript, segments, interimText]);

  // Animated appearance of words
  const getWordStyle = (index: number) => {
    // Add a slight delay to each word for a typing effect
    const baseDelay = 0.05; // 50ms
    return {
      animationDelay: `${baseDelay * index}s`,
    };
  };

  // Format paragraph breaks properly - this is crucial for readability
  const formatParagraphs = (text: string) => {
    return text.split(/\.\s+/).map((sentence, index, array) => (
      <React.Fragment key={index}>
        {sentence}{index < array.length - 1 ? '.' : ''}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Display modes - segmented with speakers or raw transcript
  const hasSegments = segments && segments.length > 0;

  return (
    <div 
      ref={containerRef}
      className="transcription-container min-h-[300px] max-h-[500px] font-light bg-white/50 dark:bg-black/30 p-4 rounded-lg border border-border/60 shadow-sm overflow-auto"
    >
      <div className="text-left">
        {transcript || hasSegments ? (
          <div>
            <div className="mb-2 text-xs text-muted-foreground">Real-time Speech:</div>
            
            {/* Speaker segmented view */}
            {hasSegments && (
              <div className="space-y-2">
                {segments.map((segment, index) => (
                  <SpeakerSegment 
                    key={`${index}-${segment.timestamp}`}
                    speaker={segment.speaker}
                    text={segment.text}
                  />
                ))}
                
                {/* Show interim results if available */}
                {interimText && (
                  <SpeakerSegment 
                    // Use the last speaker for interim text
                    speaker={segments.length > 0 ? segments[segments.length - 1].speaker : undefined}
                    text={interimText}
                    isInterim={true}
                  />
                )}
              </div>
            )}
            
            {/* Raw transcript view (used when no segments are available) */}
            {!hasSegments && (
              <div className="whitespace-pre-wrap break-words">
                {words.length > 0 ? (
                  formatParagraphs(words.join(' '))
                ) : null}
                {isRecording && interimText && (
                  <span className="text-muted-foreground">
                    {interimText}{' '}
                    <span className="inline-block w-2 h-5 ml-1 bg-primary opacity-50 animate-pulse"></span>
                  </span>
                )}
                {isRecording && !interimText && (
                  <span className="inline-block w-2 h-5 ml-1 bg-primary opacity-50 animate-pulse"></span>
                )}
              </div>
            )}
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
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div> 
              Processing audio
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;
