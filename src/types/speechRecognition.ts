
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
