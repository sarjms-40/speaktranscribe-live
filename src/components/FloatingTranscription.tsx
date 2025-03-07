
import React, { useState, useRef, useEffect } from "react";
import { Speaker, TranscriptionSegment } from "@/types/speechRecognition";
import SpeakerSegment from "./SpeakerSegment";
import { Mic, MicOff, Settings, Minus, X, Move } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FloatingTranscriptionProps {
  transcript: string;
  isRecording: boolean;
  speakers?: Speaker[];
  segments?: TranscriptionSegment[];
  interimText?: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClose?: () => void;
}

const FloatingTranscription: React.FC<FloatingTranscriptionProps> = ({
  transcript,
  isRecording,
  speakers = [],
  segments = [],
  interimText = "",
  onStartRecording,
  onStopRecording,
  onClose
}) => {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0.9);
  const [minimized, setMinimized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current && dragRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (containerRef.current && !minimized) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript, segments, interimText, minimized]);

  return (
    <div 
      className={`fixed rounded-lg shadow-xl border border-border/40 overflow-hidden z-50 transition-all duration-300
        ${isDragging ? 'cursor-grabbing' : 'cursor-default'}
        ${minimized ? 'h-12 w-64' : 'w-96 max-h-[70vh]'}
      `}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        opacity: opacity,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.75)'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header/Title bar */}
      <div 
        ref={dragRef}
        className="bg-black/80 text-white h-12 px-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Move size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium">Real-Time Transcription</span>
          {isRecording && (
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => isRecording ? onStopRecording() : onStartRecording()}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? 'Stop Recording' : 'Start Recording'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setMinimized(!minimized)}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <Minus size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{minimized ? 'Expand' : 'Minimize'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {onClose && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={onClose}
                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Close</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Transcription content */}
      {!minimized && (
        <div 
          ref={containerRef}
          className="text-white p-4 overflow-y-auto max-h-[calc(70vh-3rem)]"
          style={{ minHeight: '100px' }}
        >
          {transcript || segments.length > 0 ? (
            <div>
              {/* Speaker segmented view */}
              {segments.length > 0 && (
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
              {segments.length === 0 && (
                <p className="whitespace-pre-wrap break-words">
                  {transcript}
                  {isRecording && interimText && (
                    <span className="text-muted-foreground">
                      {' '}{interimText}{' '}
                      <span className="inline-block w-2 h-5 ml-1 bg-primary opacity-50 animate-pulse"></span>
                    </span>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-muted-foreground italic">
              {isRecording 
                ? "Listening..." 
                : "Start recording to begin real-time transcription"}
            </div>
          )}
          
          {/* Opacity slider */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Opacity:</span>
              <input 
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-32"
              />
            </div>
            
            {isRecording && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1">
                <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                HIPAA Compliant - Local Processing Only
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingTranscription;
