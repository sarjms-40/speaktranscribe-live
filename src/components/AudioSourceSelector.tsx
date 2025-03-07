
import React from "react";
import { Headphones, Mic, Volume2, Video, ExternalLink, Youtube } from "lucide-react";
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
  onTestSystemAudio?: () => Promise<boolean>;
}

const AudioSourceSelector: React.FC<AudioSourceSelectorProps> = ({
  currentSource,
  onChange,
  availableDevices,
  disabled = false,
  isSystemAudioSupported = false,
  onTestSystemAudio
}) => {
  // Always enable system audio options for better UX - we'll show a warning instead of disabling
  const forceEnable = true;
  
  // Helper to check if this source requires screen sharing
  const requiresScreenSharing = (source: AudioSource): boolean => {
    return source === 'system' || source === 'meeting' || source === 'multimedia' || source === 'voip';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium mb-1 flex justify-between items-center">
        <span>Audio Source</span>
        {onTestSystemAudio && (
          <button 
            onClick={() => onTestSystemAudio()}
            className="text-xs px-2 py-1 bg-secondary rounded-md hover:bg-secondary/80"
          >
            Test System Audio
          </button>
        )}
      </div>
      
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
      
      {requiresScreenSharing(currentSource) && (
        <div className="text-xs bg-amber-500/10 p-3 rounded border border-amber-500/20 mt-1 flex flex-col gap-1 animate-pulse">
          <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
            ⚠️ IMPORTANT: You MUST check "Share audio" checkbox!
          </span>
          <ol className="list-decimal ml-5 space-y-1 text-amber-700 dark:text-amber-400">
            <li>When the browser sharing dialog appears, select the window you want to capture</li>
            <li><strong className="underline">Check the "Share system audio" or "Share audio" checkbox</strong></li>
            <li>Then click the Share button</li>
          </ol>
          <div className="mt-1 text-amber-700 dark:text-amber-400">
            <strong>Without checking "Share audio", no sound will be captured!</strong>
          </div>
        </div>
      )}

      {currentSource === 'microphone' && (
        <div className="text-xs bg-blue-500/10 p-2 rounded border border-blue-500/20 mt-1 flex items-center gap-1">
          <span>ℹ️</span>
          <span>The <strong>Microphone</strong> option uses your device's built-in or external microphone. <strong>No screen sharing required</strong>.</span>
        </div>
      )}

      {currentSource === 'headphones' && (
        <div className="text-xs bg-blue-500/10 p-2 rounded border border-blue-500/20 mt-1 flex items-center gap-1">
          <span>ℹ️</span>
          <span>The <strong>Headphones</strong> option uses the microphone in your headset. <strong>No screen sharing required</strong>.</span>
        </div>
      )}

      {currentSource === 'system' && (
        <div className="text-xs bg-amber-500/10 p-2 rounded border border-amber-500/20 mt-1 flex items-center gap-1">
          <span>ℹ️</span>
          <span>Choose this option to capture <strong>all system sounds</strong> including application audio, alerts, etc. <strong>Requires screen sharing with "Share audio" enabled</strong>.</span>
        </div>
      )}

      {currentSource === 'meeting' && (
        <div className="text-xs bg-blue-500/10 p-2 rounded border border-blue-500/20 mt-1 flex flex-col gap-1">
          <span className="flex items-center gap-1 font-semibold"><span>🎯</span> <strong>Best for Zoom, Teams, Meet, etc:</strong></span>
          <ul className="list-disc ml-5 space-y-1">
            <li>Select the specific meeting application window</li>
            <li>Make sure to check "Share audio" when prompted</li>
            <li>Works best in Chrome or Edge browsers</li>
          </ul>
        </div>
      )}

      {currentSource === 'multimedia' && (
        <div className="text-xs bg-blue-500/10 p-2 rounded border border-blue-500/20 mt-1 flex flex-col gap-1">
          <span className="flex items-center gap-1 font-semibold"><span>🎬</span> <strong>Best for YouTube, Videos & Training:</strong></span>
          <ul className="list-disc ml-5 space-y-1">
            <li>Select the browser tab playing the video/content</li>
            <li>Make sure to check "Share audio" when prompted</li>
            <li>For best results, try sharing a specific tab rather than the whole window</li>
          </ul>
        </div>
      )}
      
      {currentSource === 'voip' && (
        <div className="text-xs bg-blue-500/10 p-2 rounded border border-blue-500/20 mt-1 flex flex-col gap-1">
          <span className="flex items-center gap-1 font-semibold"><span>☎️</span> <strong>Best for Call Centers & VoIP Calls:</strong></span>
          <ul className="list-disc ml-5 space-y-1">
            <li>Select your VoIP or call center application window</li>
            <li>Make sure to check "Share audio" when prompted</li>
            <li>This mode is optimized for capturing customer voices</li>
          </ul>
        </div>
      )}
      
      {(!isSystemAudioSupported && forceEnable && requiresScreenSharing(currentSource)) && (
        <div className="text-xs text-amber-600 mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
          <p className="font-medium">⚠️ Limited Browser Support:</p>
          <p>System audio capture works best in Chrome and Edge. You can try it in this browser, but results may vary.</p>
        </div>
      )}
      
      {availableDevices.headphones.length === 0 && currentSource === 'headphones' && (
        <div className="text-xs text-muted-foreground mt-1">
          No headphones detected. Please connect headphones for better call quality.
        </div>
      )}
      
      {requiresScreenSharing(currentSource) && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-700 dark:text-blue-300 text-xs">
          <p className="font-medium mb-1">📢 How to use system/meeting audio:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Select the appropriate audio source above</li>
            <li>Click the "Start Recording" button below</li>
            <li>When the browser asks to share your screen:</li>
            <li className="font-semibold underline">Check the "Share system audio" or "Share audio" checkbox</li>
            <li>Then click the Share button</li>
            <li>The transcription will appear as audio is captured</li>
          </ol>
          <p className="mt-2">For full system audio capture with no limitations, try our desktop application.</p>
        </div>
      )}
    </div>
  );
};

export default AudioSourceSelector;
