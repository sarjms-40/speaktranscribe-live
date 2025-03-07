/**
 * System Audio Capture Utility
 * 
 * This utility helps capture audio from system devices including headphones/earphones
 * and system audio (loopback) for capturing online meeting audio.
 */

// Types for our audio sources - expanded for more specific sources
export type AudioSource = 'microphone' | 'system' | 'headphones' | 'meeting' | 'multimedia' | 'voip';

// Interface for audio capture options
export interface AudioCaptureOptions {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  channelCount?: number;
}

// Default options optimized for call center environment
const DEFAULT_OPTIONS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 16000, // 16kHz is optimal for speech recognition
  channelCount: 1, // Mono is better for speech recognition
};

// Options optimized for different source types
const SOURCE_SPECIFIC_OPTIONS: Record<AudioSource, Partial<AudioCaptureOptions>> = {
  'microphone': {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  'headphones': {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  'system': {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
  'meeting': {
    echoCancellation: false,
    noiseSuppression: true,
    autoGainControl: true,
  },
  'multimedia': {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
  'voip': {
    echoCancellation: false,
    noiseSuppression: true,
    autoGainControl: true,
  }
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
    // Merge default options with source-specific options and user options
    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...SOURCE_SPECIFIC_OPTIONS[source],
      ...options
    };
    
    // Different constraints based on audio source
    const constraints: MediaStreamConstraints = {
      audio: {
        ...mergedOptions,
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
    
    // Special handling for system audio, meeting audio, multimedia, and VoIP
    if (source === 'system' || source === 'meeting' || source === 'multimedia' || source === 'voip') {
      try {
        // This uses the getDisplayMedia API which can capture system audio
        // on supported browsers and platforms
        const displayMediaOptions: any = {
          video: source !== 'system', // Only include video for meeting/multimedia/voip capture
          audio: {
            // These are specific options for system audio capture
            echoCancellation: mergedOptions.echoCancellation,
            noiseSuppression: mergedOptions.noiseSuppression,
            autoGainControl: mergedOptions.autoGainControl,
            latency: 0.01, // Request lowest possible latency
            sampleRate: mergedOptions.sampleRate || 16000,
            channelCount: mergedOptions.channelCount || 1,
          },
          // Request system audio
          systemAudio: 'include',
          // For meeting/multimedia/voip we want the application window, for system audio just audio
          displaySurface: source === 'system' ? 'browser' : 'window',
          selfBrowserSurface: 'exclude', // Don't capture this browser window
          suppressLocalAudioPlayback: false, // Don't mute the audio while capturing
        };
        
        // Specific display constraints for different sources
        if (source === 'meeting') {
          displayMediaOptions.preferCurrentTab = false;
          displayMediaOptions.displaySurface = 'window';
        } else if (source === 'multimedia') {
          displayMediaOptions.preferCurrentTab = true;
          displayMediaOptions.displaySurface = 'browser';
        } else if (source === 'voip') {
          displayMediaOptions.preferCurrentTab = false;
          displayMediaOptions.displaySurface = 'window';
        }
        
        // This is the call to get system audio
        // @ts-ignore - TypeScript doesn't know about some of these experimental API options
        const displayStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        
        // Get only the audio tracks from the display capture
        const audioTracks = displayStream.getAudioTracks();
        
        if (audioTracks.length > 0) {
          console.log(`Captured ${audioTracks.length} audio tracks from ${source}`);
          
          // Create a new stream with just the audio from screen capture
          const systemAudioStream = new MediaStream(audioTracks);
          
          // Add labels to the tracks for debugging
          audioTracks.forEach(track => {
            console.log(`Audio track: ${track.label}, settings:`, track.getSettings());
          });
          
          return systemAudioStream;
        } else {
          console.warn(`No ${source} audio track found, falling back to microphone`);
          return stream;
        }
      } catch (err) {
        console.warn(`${source} audio capture failed, falling back to microphone:`, err);
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
 * Creates an audio processor to analyze audio in real-time
 * Used for features like VAD (voice activity detection), speaker diarization etc.
 */
export const createAudioProcessor = (
  stream: MediaStream, 
  audioContext: AudioContext,
  onAudioProcess: (audioData: Float32Array) => void,
  bufferSize = 4096
): () => void => {
  // Create source from stream
  const source = audioContext.createMediaStreamSource(stream);
  
  // Create script processor for audio analysis
  // @ts-ignore - AudioContext.createScriptProcessor is deprecated but still widely supported
  const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
  
  // Process audio data
  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    onAudioProcess(input);
  };
  
  // Connect nodes
  source.connect(processor);
  processor.connect(audioContext.destination);
  
  // Return cleanup function
  return () => {
    processor.disconnect();
    source.disconnect();
  };
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

/**
 * VAD (Voice Activity Detection) - detect voice vs. silence
 */
export class SilenceDetector {
  private readonly threshold: number;
  private readonly silenceDuration: number;
  private lastSound: number = Date.now();
  
  constructor(threshold = 0.01, silenceDuration = 1000) {
    this.threshold = threshold; // Volume level considered silence
    this.silenceDuration = silenceDuration; // Duration of silence in ms
  }
  
  /**
   * Analyzes audio data to detect silence
   * @param audioData - Float32Array of audio samples
   * @returns true if silence is detected for the configured duration
   */
  public isSilent(audioData: Float32Array): boolean {
    // Calculate RMS (root mean square) volume
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    
    // If volume is above threshold, update last sound time
    if (rms > this.threshold) {
      this.lastSound = Date.now();
      return false;
    }
    
    // Check if silence duration exceeds threshold
    return (Date.now() - this.lastSound) > this.silenceDuration;
  }
  
  /**
   * Reset the silence detector
   */
  public reset(): void {
    this.lastSound = Date.now();
  }
}

/**
 * Simple speaker diarization using energy-based segmentation
 * This is a best-effort approach for browser environments
 */
export class SpeakerDiarization {
  private energyThreshold: number = 0.02;
  private speakerChangeThreshold: number = 0.3;
  private prevEnergy: number = 0;
  private speakerId: number = 1;
  private lastSpeakerId: number = 1;
  private stabilityCounter: number = 0;
  
  /**
   * Detects potential speaker changes based on energy patterns
   * This is a simplified approach and not as accurate as ML-based diarization
   */
  public detectSpeakerChange(audioData: Float32Array): { 
    speakerId: number;
    confidence: number;
  } {
    // Calculate current energy (simple RMS)
    const energy = this.calculateEnergy(audioData);
    
    // If silence, return last speaker
    if (energy < this.energyThreshold) {
      return { speakerId: this.lastSpeakerId, confidence: 0.5 };
    }
    
    // Check for energy ratio change (potential speaker change)
    const energyRatio = energy / (this.prevEnergy || energy);
    const normalizedRatio = Math.min(energyRatio, 1/energyRatio);
    
    // If energy pattern changed significantly, potential new speaker
    if (normalizedRatio < this.speakerChangeThreshold) {
      this.stabilityCounter++;
      
      // Only change speaker after a few consistent frames to avoid fluctuation
      if (this.stabilityCounter > 3) {
        this.speakerId = this.speakerId === 1 ? 2 : 1; // Toggle between speakers
        this.lastSpeakerId = this.speakerId;
        this.stabilityCounter = 0;
      }
    } else {
      this.stabilityCounter = 0;
    }
    
    // Update previous energy
    this.prevEnergy = energy;
    
    // Calculate confidence based on how strong the energy change was
    const confidence = Math.min(
      1.0, 
      Math.max(0.5, 1.0 - normalizedRatio)
    );
    
    return { 
      speakerId: this.lastSpeakerId,
      confidence
    };
  }
  
  private calculateEnergy(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }
  
  public reset(): void {
    this.prevEnergy = 0;
    this.speakerId = 1;
    this.lastSpeakerId = 1;
    this.stabilityCounter = 0;
  }
}

/**
 * Checks if the system supports desktop integration features
 * This helps determine if we're running in a desktop environment
 * like Electron where system audio loopback would be fully supported
 */
export const checkDesktopIntegration = (): boolean => {
  try {
    // Check for Electron-specific properties
    // @ts-ignore - TypeScript doesn't know about Electron-specific APIs
    const isElectron = window.process && window.process.type === 'renderer';
    
    // Check for Tauri-specific properties
    // @ts-ignore - TypeScript doesn't know about Tauri-specific APIs
    const isTauri = !!window.__TAURI__;
    
    return isElectron || isTauri;
  } catch (err) {
    return false;
  }
};

/**
 * Checks if the browser has potential support for system audio capture
 */
export const checkPotentialSystemAudioSupport = (): {
  isSupported: boolean;
  capabilities: string[];
  limitations: string[];
} => {
  const capabilities: string[] = [];
  const limitations: string[] = [];
  
  // Check if getDisplayMedia is supported (required for screen sharing & system audio)
  // @ts-ignore - TypeScript doesn't know about some of these APIs
  const hasDisplayMedia = !!navigator.mediaDevices.getDisplayMedia;
  
  if (hasDisplayMedia) {
    capabilities.push("Screen sharing supported");
  } else {
    limitations.push("Screen sharing not supported (required for system audio)");
  }
  
  // Check if current browser is known to support system audio
  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
  const isEdge = userAgent.includes('edg');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  const isFirefox = userAgent.includes('firefox');
  
  if (isChrome && parseInt(userAgent.match(/chrome\/([0-9]+)/)?.[1] || '0', 10) >= 74) {
    capabilities.push("Chrome 74+ has system audio support");
  }
  
  if (isEdge && parseInt(userAgent.match(/edg\/([0-9]+)/)?.[1] || '0', 10) >= 79) {
    capabilities.push("Edge 79+ has system audio support");
  }
  
  if (isSafari) {
    limitations.push("Safari has limited system audio support");
  }
  
  if (isFirefox) {
    limitations.push("Firefox has limited system audio support");
  }
  
  // Check for secure context (required for modern audio APIs)
  if (window.isSecureContext) {
    capabilities.push("Running in secure context");
  } else {
    limitations.push("Not running in secure context (required for audio APIs)");
  }
  
  // Check for desktop integration
  if (checkDesktopIntegration()) {
    capabilities.push("Desktop integration detected (full system audio possible)");
  } else {
    limitations.push("No desktop integration (browser restrictions apply)");
  }
  
  return {
    isSupported: hasDisplayMedia && (isChrome || isEdge),
    capabilities,
    limitations
  };
};
