
import React from "react";
import TranscriptionDisplay from "@/components/TranscriptionDisplay";
import RecordButton from "@/components/RecordButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Headset, Volume2 } from "lucide-react";

const Index = () => {
  const { 
    transcript, 
    isRecording, 
    startRecording, 
    stopRecording, 
    resetTranscript,
    error
  } = useSpeechRecognition();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-secondary/50">
      <div className="w-full max-w-3xl flex flex-col gap-8 animate-fade-in">
        <header className="text-center">
          <div className="inline-block mb-2 px-3 py-1 bg-secondary rounded-full text-xs font-medium uppercase tracking-wider text-secondary-foreground animate-slide-up">
            HIPAA Compliant
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-2">
            <Headset className="inline-block mr-2 h-10 w-10" />
            Call Center Assistant
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Real-time customer speech transcription with zero latency.
            All processing happens locally - no data is stored or transmitted.
          </p>
        </header>

        <main className="flex flex-col gap-6">
          <div className="glass-panel p-6 shadow-sm">
            <div className="flex flex-row items-center justify-between mb-4">
              <h2 className="text-xl font-medium flex items-center">
                <Volume2 className="h-5 w-5 mr-2" />
                Customer Speech
              </h2>
              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="recording-dot animate-pulse-recording"></div>
                  <span className="text-sm text-muted-foreground">Call Active</span>
                </div>
              )}
            </div>
            
            <TranscriptionDisplay 
              transcript={transcript} 
              isRecording={isRecording}
            />
            
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <RecordButton 
              isRecording={isRecording} 
              onStart={startRecording} 
              onStop={stopRecording} 
            />
            
            <button
              onClick={resetTranscript}
              className="btn-hover-effect px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
              disabled={transcript.length === 0}
            >
              Clear Transcript
            </button>
          </div>
        </main>

        <footer className="text-center text-sm text-muted-foreground mt-8">
          <p>
            HIPAA Compliant: All processing happens locally in your browser.
            <br />No audio or transcripts are stored or transmitted to external servers.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
