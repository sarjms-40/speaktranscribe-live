
import React from "react";
import { Headphones, Mic, Volume2, Video, ExternalLink, Laptop, Youtube } from "lucide-react";
import { AudioSource } from "@/utils/systemAudioCapture";

interface AudioSourceSelectorProps {
  currentSource: AudioSource;
  onChange: (source: AudioSource) => void;
  availableDevices: {
    headphones: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  };
  disabled?: boolean;
  isSystemAudioSupported?: boolean;
}

const AudioSourceSelector: React.FC<AudioSourceSelectorProps> = ({
  currentSource,
  onChange,
  availableDevices,
  disabled = false,
  isSystemAudioSupported = false
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium mb-1">Audio Source</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange('microphone')}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'microphone' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Mic size={16} />
          <span>Microphone {availableDevices.microphones.length > 0 && `(${availableDevices.microphones.length})`}</span>
        </button>
        
        <button
          type="button"
          onClick={() => onChange('headphones')}
          disabled={disabled || availableDevices.headphones.length === 0}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'headphones' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${(disabled || availableDevices.headphones.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Headphones size={16} />
          <span>Headphones {availableDevices.headphones.length > 0 && `(${availableDevices.headphones.length})`}</span>
        </button>
        
        <button
          type="button"
          onClick={() => onChange('system')}
          disabled={disabled || !isSystemAudioSupported}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'system' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${(disabled || !isSystemAudioSupported) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Volume2 size={16} />
          <span>System Audio</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('meeting')}
          disabled={disabled || !isSystemAudioSupported}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'meeting' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${(disabled || !isSystemAudioSupported) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Video size={16} />
          <span>Meeting Audio</span>
        </button>
        
        <button
          type="button"
          onClick={() => onChange('multimedia')}
          disabled={disabled || !isSystemAudioSupported}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'multimedia' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${(disabled || !isSystemAudioSupported) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Youtube size={16} />
          <span>Media/YouTube</span>
        </button>
        
        <button
          type="button"
          onClick={() => onChange('voip')}
          disabled={disabled || !isSystemAudioSupported}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'voip' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${(disabled || !isSystemAudioSupported) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <ExternalLink size={16} />
          <span>VoIP/Call Center</span>
        </button>
      </div>
      
      {currentSource === 'system' && (
        <div className="text-xs text-amber-500 mt-1 flex items-center gap-1">
          <span>⚠️</span>
          <span>System audio capture requires screen sharing permission</span>
        </div>
      )}

      {(currentSource === 'meeting' || currentSource === 'multimedia' || currentSource === 'voip') && (
        <div className="text-xs text-amber-500 mt-1 flex items-center gap-1">
          <span>⚠️</span>
          <span>This requires sharing the specific application window</span>
        </div>
      )}
      
      {!isSystemAudioSupported && (
        <div className="text-xs text-destructive mt-1">
          System audio capture is not supported in this browser. Try Chrome or Edge.
        </div>
      )}
      
      {availableDevices.headphones.length === 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          No headphones detected. Please connect headphones for better call quality.
        </div>
      )}
      
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-700 dark:text-blue-300 text-xs">
        <p className="font-medium mb-1">📢 Browser Limitations:</p>
        <p>For full system audio capture, desktop functionality, and HIPAA compliance, a dedicated desktop application (using Electron/Tauri) is recommended. Current web functionality is limited by browser security restrictions.</p>
      </div>
    </div>
  );
};

export default AudioSourceSelector;
