
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
  // Always enable system audio options for better UX - we'll show a warning instead of disabling
  const forceEnable = true;

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
          disabled={disabled || (!isSystemAudioSupported && !forceEnable)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'system' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${(disabled || (!isSystemAudioSupported && !forceEnable)) ? 'opacity-50 cursor-not-allowed' : ''}
            ${(!isSystemAudioSupported && forceEnable) ? 'border border-amber-500' : ''}
          `}
        >
          <Volume2 size={16} />
          <span>System Audio</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('meeting')}
          disabled={disabled || (!isSystemAudioSupported && !forceEnable)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'meeting' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${(disabled || (!isSystemAudioSupported && !forceEnable)) ? 'opacity-50 cursor-not-allowed' : ''}
            ${(!isSystemAudioSupported && forceEnable) ? 'border border-amber-500' : ''}
          `}
        >
          <Video size={16} />
          <span>Meeting Audio</span>
        </button>
        
        <button
          type="button"
          onClick={() => onChange('multimedia')}
          disabled={disabled || (!isSystemAudioSupported && !forceEnable)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'multimedia' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${(disabled || (!isSystemAudioSupported && !forceEnable)) ? 'opacity-50 cursor-not-allowed' : ''}
            ${(!isSystemAudioSupported && forceEnable) ? 'border border-amber-500' : ''}
          `}
        >
          <Youtube size={16} />
          <span>Media/YouTube</span>
        </button>
        
        <button
          type="button"
          onClick={() => onChange('voip')}
          disabled={disabled || (!isSystemAudioSupported && !forceEnable)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm
            ${currentSource === 'voip' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            ${(disabled || (!isSystemAudioSupported && !forceEnable)) ? 'opacity-50 cursor-not-allowed' : ''}
            ${(!isSystemAudioSupported && forceEnable) ? 'border border-amber-500' : ''}
          `}
        >
          <ExternalLink size={16} />
          <span>VoIP/Call Center</span>
        </button>
      </div>
      
      {currentSource === 'system' && (
        <div className="text-xs bg-amber-500/10 p-2 rounded border border-amber-500/20 mt-1 flex items-center gap-1">
          <span>⚠️</span>
          <span><strong>Important:</strong> When prompted, you MUST check "Share audio" or "Share system audio" checkbox when sharing your screen.</span>
        </div>
      )}

      {(currentSource === 'meeting' || currentSource === 'multimedia' || currentSource === 'voip') && (
        <div className="text-xs bg-amber-500/10 p-2 rounded border border-amber-500/20 mt-1 flex flex-col gap-1">
          <span className="flex items-center gap-1"><span>⚠️</span> <strong>Important:</strong></span>
          <ul className="list-disc ml-5 space-y-1">
            <li>Select the specific window or application (Zoom, Teams, browser with YouTube, etc.)</li>
            <li>Make sure to check "Share audio" or "Share system audio" checkbox</li>
            <li>For meeting apps, try sharing the entire application window, not just a specific area</li>
          </ul>
        </div>
      )}
      
      {(!isSystemAudioSupported && forceEnable) && (
        <div className="text-xs text-amber-600 mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
          <p className="font-medium">⚠️ Limited Browser Support:</p>
          <p>System audio capture works best in Chrome and Edge. You can try it in this browser, but results may vary.</p>
        </div>
      )}
      
      {availableDevices.headphones.length === 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          No headphones detected. Please connect headphones for better call quality.
        </div>
      )}
      
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-700 dark:text-blue-300 text-xs">
        <p className="font-medium mb-1">📢 How to use system/meeting audio:</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Select "System Audio", "Meeting Audio", or other option above</li>
          <li>Click "Start Recording" button below</li>
          <li>When prompted to share your screen, select application window (Zoom, Teams, etc.)</li>
          <li><strong>IMPORTANT:</strong> Check the "Share system audio" checkbox before clicking Share</li>
          <li>Speak or play audio to see the transcription appear</li>
        </ol>
        <p className="mt-2">For full system audio capture with no limitations, a dedicated desktop application is required.</p>
      </div>
    </div>
  );
};

export default AudioSourceSelector;
