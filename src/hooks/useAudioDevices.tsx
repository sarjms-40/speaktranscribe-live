
import { useState, useEffect } from "react";
import { AudioSource, getAvailableAudioDevices, checkPotentialSystemAudioSupport } from "@/utils/systemAudioCapture";
import { AudioDevices } from "@/types/speechRecognition";

export const useAudioDevices = () => {
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');
  const [availableDevices, setAvailableDevices] = useState<AudioDevices>({ 
    headphones: [], 
    microphones: [] 
  });
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isSystemAudioSupported, setIsSystemAudioSupported] = useState<boolean>(false);

  // Check if system audio capture is supported
  useEffect(() => {
    const checkSystemAudioSupport = async () => {
      try {
        console.log("Checking system audio support...");
        
        // First use our utility function to check potential support
        const systemSupport = checkPotentialSystemAudioSupport();
        console.log("System support check result:", systemSupport);
        
        // Start optimistic - if browser checks indicate support, we'll start as true
        // This helps users try system audio even if detection isn't perfect
        setIsSystemAudioSupported(systemSupport.isSupported);
        
        // In browsers, we'll be more permissive about allowing users to try
        // system audio even if we're not 100% sure it will work
        // @ts-ignore - TypeScript doesn't know about this experimental API
        if (navigator.mediaDevices.getDisplayMedia) {
          // Try to actually request display media with audio
          try {
            const constraints = {
              video: {
                width: 1,     // Request minimal video
                height: 1,
                frameRate: 1
              },
              audio: true,
              // @ts-ignore - Experimental property
              systemAudio: 'include'
            };
            
            console.log("Testing system audio capture with constraints:", JSON.stringify(constraints, null, 2));
            
            // @ts-ignore
            const testStream = await navigator.mediaDevices.getDisplayMedia(constraints);
            
            // If we get here, check if we actually got an audio track
            const audioTracks = testStream.getAudioTracks();
            const hasAudioTrack = audioTracks.length > 0;
            console.log(`Test captured ${audioTracks.length} audio tracks`);
            
            if (hasAudioTrack) {
              // Log the tracks for debugging
              audioTracks.forEach((track, i) => {
                console.log(`Audio track ${i + 1}: ${track.label}`);
                console.log(`Settings:`, JSON.stringify(track.getSettings(), null, 2));
              });
            }
            
            // Clean up the test stream
            testStream.getTracks().forEach(track => track.stop());
            
            // If we got an audio track, system audio is definitely supported
            setIsSystemAudioSupported(hasAudioTrack);
            console.log("System audio test result:", hasAudioTrack ? "Supported" : "Not supported");
          } catch (innerErr) {
            // If we get a security error, it might be supported but requires user permission
            const errMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
            console.log("Error during system audio test:", errMsg);
            
            // Be optimistic - if we have the API, we'll let users try it
            // even if the test failed due to permissions
            setIsSystemAudioSupported(true);
            console.log("Setting system audio as potentially supported");
          }
        }
      } catch (err) {
        console.warn("System audio capture check failed:", err);
        // We'll be optimistic and still allow users to try system audio
        // This is a better UX than blocking it completely
        setIsSystemAudioSupported(true);
      }
    };
    
    checkSystemAudioSupport();
  }, []);

  // Fetch available audio devices when component mounts
  useEffect(() => {
    const loadDevices = async () => {
      try {
        console.log("Requesting initial audio permission...");
        // Request initial permission to access devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Audio permission granted");
        
        const devices = await getAvailableAudioDevices();
        console.log("Available audio devices:", devices);
        setAvailableDevices(devices);
        
        // Auto-select headphones if available
        if (devices.headphones.length > 0) {
          console.log("Auto-selecting headphones as audio source");
          setAudioSource('headphones');
        }
      } catch (err) {
        console.error("Error loading audio devices:", err);
        setDeviceError("Could not access audio devices. Please check your browser permissions.");
      }
    };
    
    loadDevices();
    
    // Listen for device changes (e.g., plugging in headphones)
    const handleDeviceChange = async () => {
      console.log("Audio device change detected");
      const devices = await getAvailableAudioDevices();
      setAvailableDevices(devices);
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  return {
    audioSource,
    setAudioSource,
    availableDevices,
    deviceError,
    isSystemAudioSupported
  };
};
