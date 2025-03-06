
import React from "react";
import { Speaker } from "@/types/speechRecognition";

interface SpeakerSegmentProps {
  speaker?: Speaker;
  text: string;
  isInterim?: boolean;
}

const SpeakerSegment: React.FC<SpeakerSegmentProps> = ({
  speaker,
  text,
  isInterim = false
}) => {
  // Generate speaker display name or default
  const speakerName = speaker 
    ? speaker.name 
    : "Speaker";
  
  // Generate a consistent color based on speaker ID
  const getSpeakerColor = (id: string) => {
    const colors = [
      "text-blue-600 dark:text-blue-400",
      "text-green-600 dark:text-green-400",
      "text-purple-600 dark:text-purple-400",
      "text-amber-600 dark:text-amber-400",
      "text-rose-600 dark:text-rose-400"
    ];
    
    // Simple hash function to get consistent color
    const hash = id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  const speakerColor = speaker 
    ? getSpeakerColor(speaker.id)
    : "text-muted-foreground";
  
  return (
    <div className={`mb-3 ${isInterim ? 'opacity-70' : ''}`}>
      <div className={`text-xs font-medium mb-1 ${speakerColor}`}>
        {speakerName}
        {speaker?.confidence && (
          <span className="text-xs opacity-60 ml-2">
            ({Math.round(speaker.confidence * 100)}%)
          </span>
        )}
      </div>
      <p className="text-sm sm:text-base break-words">
        {text}
        {isInterim && (
          <span className="inline-block w-2 h-5 ml-1 bg-primary opacity-50 animate-pulse"></span>
        )}
      </p>
    </div>
  );
};

export default SpeakerSegment;
