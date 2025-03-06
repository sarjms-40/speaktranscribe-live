
import { useState, useEffect } from "react";
import { AudioSource, getAvailableAudioDevices } from "@/utils/systemAudioCapture";
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
        // Check if getDisplayMedia is available
        // @ts-ignore - TypeScript doesn't know about this experimental API
        if (navigator.mediaDevices.getDisplayMedia) {
          // Use feature detection to check for system audio
          const constraints = {
            video: false,
            audio: true,
            // @ts-ignore - Experimental property
            systemAudio: 'include'
          };
          
          try {
            // Just check if we can request it, don't actually get permission yet
            // @ts-ignore
            const testStream = await navigator.mediaDevices.getDisplayMedia(constraints);
            
            // If we get here, check if we actually got an audio track
            const hasAudioTrack = testStream.getAudioTracks().length > 0;
            
            // Clean up the test stream
            testStream.getTracks().forEach(track => track.stop());
            
            // If we got an audio track, system audio is supported
            setIsSystemAudioSupported(hasAudioTrack);
            
            console.log("System audio support check:", hasAudioTrack ? "Supported" : "Limited support");
          } catch (innerErr) {
            // If we get a security error, it might be supported but requires permission
            // If we get a not supported error, it's definitely not supported
            const errMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
            const possiblySupported = errMsg.includes("security") || errMsg.includes("permission");
            
            setIsSystemAudioSupported(possiblySupported);
            console.log("System audio support unknown, assuming:", possiblySupported ? "Possibly supported" : "Not supported");
          }
        } else {
          setIsSystemAudioSupported(false);
          console.log("System audio not supported: getDisplayMedia not available");
        }
      } catch (err) {
        console.warn("System audio capture not supported:", err);
        setIsSystemAudioSupported(false);
      }
    };
    
    checkSystemAudioSupport();
  }, []);

  // Fetch available audio devices when component mounts
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request initial permission to access devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await getAvailableAudioDevices();
        setAvailableDevices(devices);
        
        // Auto-select headphones if available
        if (devices.headphones.length > 0) {
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
