// Types for speech recognition functionality

export interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

export interface IWindow extends Window {
  SpeechRecognition: new () => ISpeechRecognition;
  webkitSpeechRecognition: new () => ISpeechRecognition;
}

export interface TranscriptionState {
  transcript: string;
  isRecording: boolean;
  error: string | null;
  hasRecognitionEnded: boolean;
}

export interface AudioDevices {
  headphones: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
}

// Speaker detection types
export interface Speaker {
  id: string;
  name: string;
  confidence: number;
}

export interface TranscriptionSegment {
  text: string;
  speaker?: Speaker;
  timestamp: number;
}

// System audio capture types
export interface SystemAudioOptions {
  sampleRate: number;
  channelCount: number;
}

// Enhanced transcription with speaker segments
export interface EnhancedTranscription {
  segments: TranscriptionSegment[];
  fullText: string;
}

// UI configuration for floating window
export interface FloatingWindowConfig {
  alwaysOnTop: boolean;
  opacity: number;
  fontSize: string;
  darkMode: boolean;
  width: number;
  height: number;
}

// Desktop integration options (for future Electron/Tauri implementation)
export interface DesktopIntegrationOptions {
  startOnBoot: boolean;
  minimizeToTray: boolean;
  globalHotkey: string;
}
