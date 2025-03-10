import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import TranscriptionDisplay from "./TranscriptionDisplay";
import { Speaker, TranscriptionSegment } from "@/types/speechRecognition";
import { AudioSource } from "@/utils/systemAudioCapture";
import { X, Minimize2, Maximize2, Mic } from "lucide-react";

interface FloatingTranscriptionProps {
  transcript: string;
  isRecording: boolean;
  speakers?: Speaker[];
  segments?: TranscriptionSegment[];
  interimText?: string;
  audioSource?: AudioSource;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClose: () => void;
}

const FloatingTranscription: React.FC<FloatingTranscriptionProps> = ({
  transcript,
  isRecording,
  speakers = [],
  segments = [],
  interimText = "",
  audioSource = "microphone",
  onStartRecording,
  onStopRecording,
  onClose
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isMinimized, setIsMinimized] = useState(false);
  const floatingWindowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setContainer(containerRef.current);
  }, []);

  useEffect(() => {
    document.body.appendChild(containerRef.current);
    return () => {
      document.body.removeChild(containerRef.current);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    const initialX = e.clientX - position.x;
    const initialY = e.clientY - position.y;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - initialX,
          y: e.clientY - initialY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  
  return container ? createPortal(
    <div 
      ref={floatingWindowRef}
      className={`fixed z-50 bg-background/95 backdrop-blur-md border border-border shadow-lg rounded-lg overflow-hidden ${
        isMinimized ? 'w-48 h-12' : 'w-96 min-h-96 max-h-[80vh]'
      }`}
      style={{
        top: position.y,
        left: position.x,
        resize: isMinimized ? 'none' : 'both'
      }}
    >
      <div 
        className="bg-muted/50 p-2 cursor-move flex items-center justify-between"
        onMouseDown={startDrag}
      >
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
          <span className="text-sm font-medium truncate">
            {isMinimized ? 'Transcription' : 'Floating Transcription'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={toggleMinimize}
            className="p-1 hover:bg-muted rounded-md"
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          
          <button 
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="p-3 overflow-auto flex flex-col gap-3" style={{ height: 'calc(100% - 40px)' }}>
          <TranscriptionDisplay
            transcript={transcript}
            isRecording={isRecording}
            speakers={speakers}
            segments={segments}
            interimText={interimText}
            audioSource={audioSource}
          />
          
          <div className="flex justify-center mt-2">
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm ${
                isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              <Mic size={16} />
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        </div>
      )}
      
      {isMinimized && isRecording && (
        <div className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
      )}
    </div>,
    container
  ) : null;
};

export default FloatingTranscription;
