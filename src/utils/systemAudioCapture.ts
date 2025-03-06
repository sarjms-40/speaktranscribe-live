
/**
 * System Audio Capture Utility
 * 
 * This utility helps capture audio from system devices including headphones/earphones
 * Note: Due to browser security restrictions, capturing system audio requires user permissions
 * and may be limited on some browsers.
 */

// Types for our audio sources
export type AudioSource = 'microphone' | 'system' | 'headphones';

// Interface for audio capture options
export interface AudioCaptureOptions {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

// Default options optimized for call center environment
const DEFAULT_OPTIONS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/**
 * Attempts to get audio from the specified source
 * Note: System audio capture is limited by browser security
 */
export const getAudioStream = async (
  source: AudioSource = 'microphone',
  options: AudioCaptureOptions = DEFAULT_OPTIONS
): Promise<MediaStream | null> => {
  try {
    // Different constraints based on audio source
    const constraints: MediaStreamConstraints = {
      audio: {
        ...options,
        // For headphones, we want to ensure we're getting audio input
        // from a headset if available
        ...(source === 'headphones' && {
          deviceId: await getHeadphonesDeviceId(),
        }),
      },
      video: false,
    };

    // Request user media with the appropriate constraints
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // For system audio, we would ideally use getDisplayMedia, but this has limitations
    // and may require additional browser extensions or screen sharing
    if (source === 'system') {
      try {
        // This is experimental and may not work in all browsers
        // @ts-ignore - TypeScript doesn't know about this experimental API
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        // Get only the audio tracks from the display capture
        const audioTracks = displayStream.getAudioTracks();
        
        if (audioTracks.length > 0) {
          // Create a new stream with just the audio from screen capture
          const systemAudioStream = new MediaStream(audioTracks);
          return systemAudioStream;
        } else {
          console.warn("No audio track found in display media");
          // Fall back to regular microphone if no system audio
          return stream;
        }
      } catch (err) {
        console.warn("System audio capture failed, falling back to microphone:", err);
        return stream;
      }
    }
    
    return stream;
  } catch (err) {
    console.error("Error getting audio stream:", err);
    return null;
  }
};

/**
 * Helper to find a headphone/headset device if available
 */
const getHeadphonesDeviceId = async (): Promise<string | undefined> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
    
    // Look for devices that are likely headsets or headphones
    // This is a best effort - device naming isn't standardized
    const headphonesDevice = audioInputDevices.find(device => {
      const label = device.label.toLowerCase();
      return label.includes('headphone') || 
             label.includes('headset') || 
             label.includes('earphone') ||
             label.includes('bluetooth');
    });
    
    return headphonesDevice?.deviceId;
  } catch (error) {
    console.error("Error enumerating audio devices:", error);
    return undefined;
  }
};

/**
 * Detects available audio input devices and returns them categorized
 */
export const getAvailableAudioDevices = async (): Promise<{
  headphones: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
}> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(device => device.kind === 'audioinput');
    
    // Categorize devices (best effort)
    const headphones = audioDevices.filter(device => {
      const label = device.label.toLowerCase();
      return label.includes('headphone') || 
             label.includes('headset') || 
             label.includes('earphone') ||
             label.includes('bluetooth');
    });
    
    const microphones = audioDevices.filter(device => !headphones.includes(device));
    
    return { headphones, microphones };
  } catch (error) {
    console.error("Error getting audio devices:", error);
    return { headphones: [], microphones: [] };
  }
};

/**
 * Utility to help prevent duplicate phrases in transcription
 */
export class DuplicateSpeechDetector {
  private recentPhrases: string[] = [];
  private maxPhraseHistory = 10;
  
  /**
   * Checks if text contains duplicate phrases from recent history
   */
  public checkForDuplicates(text: string): { 
    hasDuplicates: boolean;
    cleanedText: string;
  } {
    const phrases = this.breakIntoSentences(text);
    let cleanedPhrases: string[] = [];
    let hasDuplicates = false;
    
    // Check each phrase against our recent history
    phrases.forEach(phrase => {
      if (this.isDuplicate(phrase)) {
        hasDuplicates = true;
      } else {
        cleanedPhrases.push(phrase);
        this.addToHistory(phrase);
      }
    });
    
    return {
      hasDuplicates,
      cleanedText: cleanedPhrases.join(' ')
    };
  }
  
  private breakIntoSentences(text: string): string[] {
    // Simple sentence splitting logic
    return text
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  private isDuplicate(phrase: string): boolean {
    // Consider it duplicate if >75% similar to any recent phrase
    return this.recentPhrases.some(recent => this.similarityScore(phrase, recent) > 0.75);
  }
  
  private similarityScore(str1: string, str2: string): number {
    // Simple implementation of Jaccard similarity
    const set1 = new Set(str1.toLowerCase().split(' '));
    const set2 = new Set(str2.toLowerCase().split(' '));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  private addToHistory(phrase: string): void {
    this.recentPhrases.push(phrase);
    if (this.recentPhrases.length > this.maxPhraseHistory) {
      this.recentPhrases.shift();
    }
  }
  
  public reset(): void {
    this.recentPhrases = [];
  }
}
