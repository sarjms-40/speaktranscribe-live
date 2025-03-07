import React, { useState } from "react";
import TranscriptionDisplay from "@/components/TranscriptionDisplay";
import RecordButton from "@/components/RecordButton";
import CallRecordsList from "@/components/CallRecordsList";
import AudioSourceSelector from "@/components/AudioSourceSelector";
import FloatingTranscription from "@/components/FloatingTranscription";
import { useCallRecording } from "@/hooks/useCallRecording";
import { Headset, Volume2, Save, Clock, Info, Shield, Boxes, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { AudioSource, checkPotentialSystemAudioSupport } from "@/utils/systemAudioCapture";
import { useToast } from "@/components/ui/use-toast";
import { useAudioDevices } from "@/hooks/useAudioDevices";

const Index = () => {
  const { toast } = useToast();
  const [showRecords, setShowRecords] = useState(false);
  const [showFloatingWindow, setShowFloatingWindow] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  
  const { testSystemAudio } = useAudioDevices();
  
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
    availableDevices,
    isSystemAudioSupported,
    segments,
    speakers,
    interimText
  } = useCallRecording();

  const handleStartCall = () => {
    startCall();
  };

  const handleSourceChange = (source: AudioSource) => {
    if (!isRecording) {
      changeAudioSource(source);
      
      if (source === 'system' || source === 'meeting' || source === 'multimedia' || source === 'voip') {
        toast({
          title: `${source.charAt(0).toUpperCase() + source.slice(1)} Audio Selected`,
          description: "You'll need to share your screen when recording starts.",
          duration: 4000,
        });
      } else {
        toast({
          title: `${source.charAt(0).toUpperCase() + source.slice(1)} Selected`,
          description: "No screen sharing needed for this audio source.",
          duration: 3000,
        });
      }
    } else {
      endCall();
      setTimeout(() => {
        startCall(source);
      }, 500);
    }
  };
  
  const handleFloatingWindowToggle = () => {
    setShowFloatingWindow(!showFloatingWindow);
    
    if (!showFloatingWindow) {
      toast({
        title: "Floating Window Enabled",
        description: "Drag the window to position it on your screen",
      });
    }
  };
  
  const handleShowSystemInfo = () => {
    const systemInfo = checkPotentialSystemAudioSupport();
    setShowSystemInfo(!showSystemInfo);
    
    if (!showSystemInfo) {
      toast({
        title: `System Audio ${systemInfo.isSupported ? 'Supported' : 'Limited Support'}`,
        description: systemInfo.isSupported 
          ? "Your browser supports system audio capture" 
          : "Your browser has limited system audio support",
        variant: systemInfo.isSupported ? "default" : "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-secondary/50">
      <div className="w-full max-w-3xl flex flex-col gap-8 animate-fade-in">
        <header className="text-center">
          <div className="inline-flex items-center mb-2 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium uppercase tracking-wider">
            <Shield className="h-3 w-3 mr-1" />
            HIPAA Compliant
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-2">
            <Headset className="inline-block mr-2 h-10 w-10" />
            Real-Time Transcriber
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Speech-to-text with ultra-low latency and system audio capture. 
            Optimized for online meetings, training sessions, and customer calls.
          </p>
        </header>

        <main className="flex flex-col gap-6">
          <div className="glass-panel p-6 shadow-sm bg-background/80 backdrop-blur-sm border border-border rounded-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-medium flex items-center">
                <Volume2 className="h-5 w-5 mr-2" />
                Audio Transcription
              </h2>
              {isRecording && callStartTime && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
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
                isSystemAudioSupported={isSystemAudioSupported}
                onTestSystemAudio={testSystemAudio}
              />
            </div>
            
            <TranscriptionDisplay 
              transcript={transcript} 
              isRecording={isRecording}
              speakers={speakers}
              segments={segments}
              interimText={interimText}
            />
            
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {error}
              </div>
            )}
            
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleFloatingWindowToggle}
                className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-md text-sm"
              >
                <Boxes size={16} />
                {showFloatingWindow ? "Hide Floating Window" : "Show Floating Window"}
              </button>
              
              <button
                onClick={handleShowSystemInfo}
                className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-md text-sm"
              >
                <Info size={16} />
                System Info
              </button>
              
              <a 
                href="https://github.com/lovable-devs/desktop" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-md text-sm"
              >
                <ExternalLink size={16} />
                Full Desktop Version
              </a>
            </div>
            
            {showSystemInfo && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-sm">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Info size={16} className="text-blue-500" />
                  System Audio Support
                </h3>
                
                {(() => {
                  const systemInfo = checkPotentialSystemAudioSupport();
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${systemInfo.isSupported ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        <span>{systemInfo.isSupported ? 'System audio supported' : 'Limited system audio support'}</span>
                      </div>
                      
                      {systemInfo.capabilities.length > 0 && (
                        <div className="text-xs">
                          <div className="font-medium text-green-600 dark:text-green-400">Capabilities:</div>
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            {systemInfo.capabilities.map((cap, i) => (
                              <li key={i}>{cap}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {systemInfo.limitations.length > 0 && (
                        <div className="text-xs">
                          <div className="font-medium text-amber-600 dark:text-amber-400">Limitations:</div>
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            {systemInfo.limitations.map((limit, i) => (
                              <li key={i}>{limit}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="text-xs mt-2 pt-2 border-t border-border/30">
                        <p className="font-medium">Full System Audio Support:</p>
                        <p>For complete system audio loopback with WASAPI (Windows), CoreAudio (Mac), or ALSA (Linux), a desktop application is needed. Browser APIs have limitations due to security restrictions.</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
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
          <p className="flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            <span>HIPAA Compliant: All processing happens locally in your browser.</span>
          </p>
          <p>No audio or transcripts are transmitted to external servers.</p>
        </footer>
      </div>
      
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-md flex items-center gap-2 animate-in fade-in">
          <div className="h-2 w-2 bg-current rounded-full animate-pulse"></div>
          Saving record...
        </div>
      )}
      
      {showFloatingWindow && (
        <FloatingTranscription
          transcript={transcript}
          isRecording={isRecording}
          speakers={speakers}
          segments={segments}
          interimText={interimText}
          onStartRecording={handleStartCall}
          onStopRecording={endCall}
          onClose={() => setShowFloatingWindow(false)}
        />
      )}
    </div>
  );
};

export default Index;
