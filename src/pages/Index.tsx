
import React, { useState } from "react";
import TranscriptionDisplay from "@/components/TranscriptionDisplay";
import RecordButton from "@/components/RecordButton";
import CallRecordsList from "@/components/CallRecordsList";
import AudioSourceSelector from "@/components/AudioSourceSelector";
import { useCallRecording } from "@/hooks/useCallRecording";
import { Headset, Volume2, Save, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import { AudioSource } from "@/utils/systemAudioCapture";

const Index = () => {
  const [showRecords, setShowRecords] = useState(false);
  
  const { 
    transcript, 
    isRecording, 
    isSaving,
    startCall, 
    endCall, 
    clearTranscript,
    deleteRecord,
    savedRecords,
    error,
    callStartTime,
    audioSource,
    changeAudioSource,
    availableDevices
  } = useCallRecording();

  const handleStartCall = () => {
    startCall();
  };

  const handleSourceChange = (source: AudioSource) => {
    if (!isRecording) {
      changeAudioSource(source);
    } else {
      // If already recording, stop and restart with new source
      endCall();
      setTimeout(() => {
        startCall(source);
      }, 500);
    }
  };

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
            All processing happens locally - no data is stored on external servers.
          </p>
        </header>

        <main className="flex flex-col gap-6">
          <div className="glass-panel p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-medium flex items-center">
                <Volume2 className="h-5 w-5 mr-2" />
                Customer Speech
              </h2>
              {isRecording && callStartTime && (
                <div className="flex items-center gap-2">
                  <div className="recording-dot animate-pulse-recording"></div>
                  <span className="text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Started at {format(callStartTime, 'h:mm:ss a')}
                  </span>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <AudioSourceSelector 
                currentSource={audioSource}
                onChange={handleSourceChange}
                availableDevices={availableDevices}
                disabled={isRecording}
              />
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
            
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-500 text-sm flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">System Audio & Headphones Support</p>
                <p className="mt-1 text-xs">
                  Some browsers may limit system audio capture for security reasons. For best results:
                </p>
                <ul className="list-disc pl-5 mt-1 text-xs">
                  <li>Use Chrome or Edge for fullest compatibility</li>
                  <li>When using "System Audio", you'll need to share your screen</li>
                  <li>For call audio, connect headphones and select "Headphones"</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <RecordButton 
              isRecording={isRecording} 
              onStart={handleStartCall} 
              onStop={endCall} 
            />
            
            <button
              onClick={clearTranscript}
              className="btn-hover-effect px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
              disabled={transcript.length === 0}
            >
              Clear Transcript
            </button>
            
            <button
              onClick={() => setShowRecords(!showRecords)}
              className="btn-hover-effect px-4 py-2 border border-border rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary/50 transition-colors"
            >
              {showRecords ? "Hide Records" : "Show Records"}
              <Save className="h-4 w-4" />
            </button>
          </div>
          
          {showRecords && (
            <div className="mt-6 p-6 bg-background/80 border border-border rounded-lg">
              <CallRecordsList 
                records={savedRecords} 
                onDelete={deleteRecord} 
              />
            </div>
          )}
        </main>

        <footer className="text-center text-sm text-muted-foreground mt-8">
          <p>
            HIPAA Compliant: All processing happens locally in your browser.
            <br />No audio or transcripts are transmitted to external servers.
          </p>
        </footer>
      </div>
      
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-md flex items-center gap-2 animate-in fade-in">
          <div className="h-2 w-2 bg-current rounded-full animate-pulse"></div>
          Saving call record...
        </div>
      )}
    </div>
  );
};

export default Index;
