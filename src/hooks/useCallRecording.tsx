
import { useState, useCallback, useEffect, useRef } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import dbService from "@/services/dbService";
import { CallRecord } from "@/models/CallRecord";
import { useToast } from "@/components/ui/use-toast";
import { AudioSource } from "@/utils/systemAudioCapture";

export const useCallRecording = () => {
  const { toast } = useToast();
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callEndTime, setCallEndTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedRecords, setSavedRecords] = useState<CallRecord[]>([]);
  const autoSaveTimeoutRef = useRef<number | null>(null);

  // Define clearTranscript first so it can be used in other functions
  const clearTranscript = useCallback(() => {
    if (resetTranscript) {
      resetTranscript();
    }
    setCallStartTime(null);
    setCallEndTime(null);
  }, []);
  
  const {
    transcript,
    isRecording,
    startRecording,
    stopRecording,
    resetTranscript,
    error,
    hasRecognitionEnded,
    audioSource,
    changeAudioSource,
    availableDevices,
    isSystemAudioSupported,
    segments,
    speakers,
    interimText
  } = useSpeechRecognition();

  // Auto-save when recognition unexpectedly ends
  useEffect(() => {
    if (!isRecording && hasRecognitionEnded && callStartTime && transcript && !isSaving) {
      console.log("Auto-saving call due to unexpected end of speech recognition");
      endCall();
    }
  }, [isRecording, hasRecognitionEnded, callStartTime, transcript, isSaving]);

  // Initialize database
  useEffect(() => {
    dbService.init().catch(err => {
      console.error("Failed to initialize database:", err);
      toast({
        variant: "destructive",
        title: "Database Error",
        description: "Could not connect to local database. Some features may be unavailable."
      });
    });
  }, [toast]);

  // Load saved records
  useEffect(() => {
    loadSavedRecords();
  }, []);

  // Set up auto-save inactivity timer (increased to 5 minutes)
  useEffect(() => {
    if (isRecording && transcript) {
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        window.clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save after inactivity
      autoSaveTimeoutRef.current = window.setTimeout(() => {
        if (isRecording && callStartTime) {
          console.log("Auto-saving call due to inactivity");
          endCall();
        }
      }, 300000); // 5 minutes of inactivity (increased from 2 minutes)
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        window.clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isRecording, transcript]);

  const loadSavedRecords = useCallback(async () => {
    try {
      const records = await dbService.getAllCallRecords();
      setSavedRecords(records);
    } catch (err) {
      console.error("Error loading records:", err);
      toast({
        variant: "destructive",
        title: "Error Loading Records",
        description: "Failed to load saved call records."
      });
    }
  }, [toast]);

  const startCall = useCallback(async (source?: AudioSource) => {
    const now = new Date();
    setCallStartTime(now);
    
    if (source) {
      await changeAudioSource(source);
    }
    
    const needsScreenSharing = source === 'system' || 
                              source === 'meeting' || 
                              source === 'multimedia' || 
                              source === 'voip' ||
                              (!source && (audioSource === 'system' || 
                                          audioSource === 'meeting' || 
                                          audioSource === 'multimedia' || 
                                          audioSource === 'voip'));
    
    if (needsScreenSharing) {
      toast({
        title: "Screen Sharing Required",
        description: "Please select a window and check 'Share audio' in the dialog.",
        duration: 5000,
      });
    } else {
      toast({
        title: "Call Recording Started",
        description: "Listening to your voice...",
        duration: 3000,
      });
    }
    
    await startRecording();
  }, [startRecording, changeAudioSource, audioSource, toast]);

  const endCall = useCallback(async () => {
    if (!callStartTime) return;
    
    stopRecording();
    const now = new Date();
    setCallEndTime(now);
    
    if (callStartTime && transcript) {
      // Calculate duration in seconds
      const duration = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
      
      try {
        setIsSaving(true);
        
        // Create the call record
        const callRecord: CallRecord = {
          startTime: callStartTime,
          endTime: now,
          duration,
          transcript,
        };
        
        // Save to database
        await dbService.saveCallRecord(callRecord);
        
        toast({
          title: "Call Saved",
          description: `Transcript (${duration}s) saved successfully.`,
        });
        
        // Refresh the records list
        await loadSavedRecords();
        
        // Automatically clear the transcript after saving
        clearTranscript();
      } catch (err) {
        console.error("Error saving call:", err);
        toast({
          variant: "destructive",
          title: "Save Error",
          description: "Failed to save call recording."
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      // If there's no transcript to save, just clear everything
      clearTranscript();
    }
  }, [stopRecording, callStartTime, transcript, toast, loadSavedRecords, clearTranscript]);

  const deleteRecord = useCallback(async (id: string) => {
    try {
      await dbService.deleteCallRecord(id);
      toast({
        title: "Record Deleted",
        description: "Call record deleted successfully."
      });
      await loadSavedRecords();
    } catch (err) {
      console.error("Error deleting record:", err);
      toast({
        variant: "destructive",
        title: "Delete Error",
        description: "Failed to delete call record."
      });
    }
  }, [toast, loadSavedRecords]);

  return {
    transcript,
    isRecording,
    isSaving,
    error,
    savedRecords,
    startCall,
    endCall,
    deleteRecord,
    clearTranscript,
    callStartTime,
    callEndTime,
    audioSource,
    changeAudioSource,
    availableDevices,
    isSystemAudioSupported,
    segments,
    speakers,
    interimText
  };
};
