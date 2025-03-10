
import React, { useEffect, useRef, useState } from "react";
import { Speaker, TranscriptionSegment } from "@/types/speechRecognition";
import SpeakerSegment from "./SpeakerSegment";
import { AudioSource } from "@/utils/systemAudioCapture";

interface TranscriptionDisplayProps {
  transcript: string;
  isRecording: boolean;
  speakers?: Speaker[];
  segments?: TranscriptionSegment[];
  interimText?: string;
  audioSource?: AudioSource;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcript,
  isRecording,
  speakers = [],
  segments = [],
  interimText = "",
  audioSource = "microphone"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [words, setWords] = useState<string[]>([]);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  
  // Process transcript into words and paragraphs for better formatted display
  useEffect(() => {
    if (transcript) {
      // Split the transcript into words for animated display
      const newWords = transcript.split(/\s+/).filter(word => word.trim().length > 0);
      setWords(newWords);
      
      // Create paragraphs for better readability
      // Split on sentences that end with period followed by space, question mark, or exclamation
      const newParagraphs = transcript
        .split(/[.!?](?:\s+)/)
        .filter(para => para.trim().length > 0)
        .map(para => {
          const trimmed = para.trim();
          // Add appropriate punctuation if missing
          if (!/[.!?]$/.test(trimmed)) {
            return trimmed + '.';
          }
          return trimmed;
        });
      
      setParagraphs(newParagraphs);
    } else {
      setWords([]);
      setParagraphs([]);
    }
  }, [transcript]);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript, segments, interimText]);

  // Display modes - segmented with speakers or raw transcript
  const hasSegments = segments && segments.length > 0;
  
  // Check if we need to display the listening prompt
  const showListeningPrompt = isRecording && !transcript && !hasSegments && !interimText;
  
  // Check if we have content to display
  const hasContent = transcript || hasSegments || interimText;

  return (
    <div 
      ref={containerRef}
      className="transcription-container min-h-[300px] max-h-[500px] font-light bg-white/50 dark:bg-black/30 p-4 rounded-lg border border-border/60 shadow-sm overflow-auto"
    >
      <div className="text-left">
        {hasContent ? (
          <div>
            <div className="mb-2 text-xs text-muted-foreground">Real-time Transcription:</div>
            
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
            
            {/* Raw transcript view with improved paragraph formatting */}
            {!hasSegments && (
              <div className="whitespace-pre-wrap break-words">
                {paragraphs.length > 0 ? (
                  <div className="space-y-2">
                    {paragraphs.map((paragraph, index) => (
                      <p key={index} className="leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : null}
                
                {isRecording && interimText && (
                  <p className="text-muted-foreground mt-2">
                    {interimText}{' '}
                    <span className="inline-block w-2 h-5 ml-1 bg-primary opacity-50 animate-pulse"></span>
                  </p>
                )}
                
                {isRecording && !interimText && !showListeningPrompt && (
                  <span className="inline-block w-2 h-5 ml-1 bg-primary opacity-50 animate-pulse"></span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col gap-3 items-center justify-center text-muted-foreground">
            {isRecording ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Listening to system audio...</span>
                </div>
                <p className="text-sm max-w-md text-center">
                  {audioSource === 'system' || audioSource === 'multimedia' ? 
                    "Capturing system sounds. Play audio or video content to see transcription." :
                    audioSource === 'meeting' ? 
                    "Capturing meeting audio. Start your meeting to see transcription." :
                    "Waiting for audio input. Speak or play content to begin transcription."}
                </p>
              </>
            ) : (
              <>
                <span className="font-medium">No transcription yet</span>
                <p className="text-sm max-w-md text-center">
                  Start recording to capture audio from your system or microphone
                </p>
              </>
            )}
          </div>
        )}
      </div>
      
      {speakers.length > 0 && (
        <div className="mt-4 border-t border-border/30 pt-3">
          <div className="text-xs text-muted-foreground mb-1">Detected Speakers:</div>
          <div className="flex gap-2 flex-wrap">
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
              {hasContent ? "Transcribing audio" : "Waiting for audio"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;
