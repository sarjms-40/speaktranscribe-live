
import React from "react";
import { Mic, MicOff, Headset } from "lucide-react";

interface RecordButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}

const RecordButton: React.FC<RecordButtonProps> = ({
  isRecording,
  onStart,
  onStop,
}) => {
  return (
    <button
      onClick={isRecording ? onStop : onStart}
      className={`
        btn-hover-effect
        flex items-center justify-center gap-2 
        px-6 py-3 rounded-full font-medium
        transition-all duration-300 ease-in-out
        ${
          isRecording
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }
      `}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      {isRecording ? (
        <>
          <MicOff size={18} />
          <span>End Call</span>
        </>
      ) : (
        <>
          <Headset size={18} />
          <span>Start Call</span>
        </>
      )}
    </button>
  );
};

export default RecordButton;
