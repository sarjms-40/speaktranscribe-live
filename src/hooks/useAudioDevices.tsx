
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
        // @ts-ignore - TypeScript doesn't know about this experimental API
        if (navigator.mediaDevices.getDisplayMedia) {
          setIsSystemAudioSupported(true);
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
