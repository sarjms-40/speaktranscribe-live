
import { useState, useCallback, useEffect } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import dbService from "@/services/dbService";
import { CallRecord } from "@/models/CallRecord";
import { useToast } from "@/components/ui/use-toast";

export const useCallRecording = () => {
  const { toast } = useToast();
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callEndTime, setCallEndTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedRecords, setSavedRecords] = useState<CallRecord[]>([]);
  
  const {
    transcript,
    isRecording,
    startRecording,
    stopRecording,
    resetTranscript,
    error,
  } = useSpeechRecognition();

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

  const startCall = useCallback(() => {
    const now = new Date();
    setCallStartTime(now);
    startRecording();
  }, [startRecording]);

  const endCall = useCallback(async () => {
    if (!isRecording) return;
    
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
          description: `Call transcript (${duration}s) saved successfully.`,
        });
        
        // Refresh the records list
        await loadSavedRecords();
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
    }
  }, [isRecording, stopRecording, callStartTime, transcript, toast, loadSavedRecords]);

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

  const clearTranscript = useCallback(() => {
    resetTranscript();
    setCallStartTime(null);
    setCallEndTime(null);
  }, [resetTranscript]);

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
  };
};
