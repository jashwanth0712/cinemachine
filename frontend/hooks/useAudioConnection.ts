import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { AudioContext } from 'react-native-audio-api';
import { ExpoAudioStreamModule } from '@siteed/expo-audio-studio';
import { useAudioRecorder } from '@siteed/expo-audio-studio';
import { LegacyEventEmitter } from 'expo-modules-core';
import base64js from 'base64-js';

// For physical device, use your computer's IP address on the same WiFi network
const BACKEND_URL = Platform.select({
  ios: 'ws://localhost:8000/ws',
  android: 'ws://localhost:8000/ws',
  default: 'ws://localhost:8000/ws',
});

interface UseAudioConnectionProps {
  onIntensityChange?: (intensity: number) => void;
}

export function useAudioConnection({ onIntensityChange }: UseAudioConnectionProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Ready to connect');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<any>(null);
  const isSourceStartedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Buffering Refs
  const pendingChunksRef = useRef<Uint8Array[]>([]);
  const pendingSizeRef = useRef(0);
  const BUFFER_THRESHOLD = 48000; // ~1 second of audio (24kHz * 2 bytes * 1s)

  // Queue Tracking
  const enqueuedCountRef = useRef(0);
  const processedCountRef = useRef(0);

  const { startRecording: startNativeRecording, stopRecording: stopNativeRecording } = useAudioRecorder();

  useEffect(() => {
    const emitter = new LegacyEventEmitter(ExpoAudioStreamModule);
    const subscription = emitter.addListener('AudioData', async (event: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && event.encoded) {
        wsRef.current.send(JSON.stringify({
          type: 'audio_chunk',
          data: event.encoded,
          timestamp: Date.now(),
        }));
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const setupAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        console.log('[Audio] Setting up new AudioContext');
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const context = audioContextRef.current;

      // Create BufferQueueSource if needed
      if (!audioSourceRef.current && Platform.OS !== 'web') {
        console.log('[Audio] Creating new BufferQueueSource');
        // @ts-ignore
        const source = context.createBufferQueueSource();
        source.connect(context.destination);

        source.onEnded = (event: any) => {
          processedCountRef.current += 1;
          const queueSize = enqueuedCountRef.current - processedCountRef.current;
          if (queueSize % 5 === 0) {
            console.log(`[Audio] Buffer finished. Processed: ${processedCountRef.current}, Queue Size: ${queueSize}`);
          }
        };

        audioSourceRef.current = source;
        isSourceStartedRef.current = false;
      }
    } catch (e) {
      console.error('[Audio] Error setting up AudioContext:', e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[Audio] Component unmounting, cleaning up');
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
          audioSourceRef.current.disconnect();
        } catch (e) { console.warn('Error stopping source:', e); }
        audioSourceRef.current = null;
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) { console.warn('Error closing context:', e); }
        audioContextRef.current = null;
      }
    };
  }, []);

  const flushAudioBuffer = () => {
    if (pendingChunksRef.current.length === 0) return;

    // Ensure context and source exist
    if (!audioContextRef.current || !audioSourceRef.current) {
      return;
    }

    try {
      const context = audioContextRef.current;
      const source = audioSourceRef.current;

      // Safety Check: Queue too large
      const currentQueueSize = enqueuedCountRef.current - processedCountRef.current;
      if (currentQueueSize > 50) {
        console.warn('[Audio] Queue too large (>50), recreating source to prevent crash');
        // Recreate source strategy
        source.stop();
        source.disconnect();
        audioSourceRef.current = null;
        isSourceStartedRef.current = false;
        enqueuedCountRef.current = 0;
        processedCountRef.current = 0;

        pendingChunksRef.current = [];
        pendingSizeRef.current = 0;
        return;
      }

      // Combine chunks
      const totalLength = pendingSizeRef.current;
      const combinedBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of pendingChunksRef.current) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Reset pending buffer
      pendingChunksRef.current = [];
      pendingSizeRef.current = 0;

      // Convert Int16 PCM to Float32
      const float32Data = new Float32Array(combinedBuffer.length / 2);
      const dataView = new DataView(combinedBuffer.buffer);

      for (let i = 0; i < float32Data.length; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        float32Data[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
      }

      // Create AudioBuffer
      const audioBuffer = context.createBuffer(1, float32Data.length, 24000);
      audioBuffer.copyToChannel(float32Data, 0);

      // Enqueue buffer
      source.enqueueBuffer(audioBuffer);
      enqueuedCountRef.current += 1;

      const newQueueSize = enqueuedCountRef.current - processedCountRef.current;
      console.log(`[Audio] Flushed buffer. Size: ${totalLength} bytes. Queue Size: ${newQueueSize}`);

      // Start if not started
      if (!isSourceStartedRef.current) {
        source.start();
        isSourceStartedRef.current = true;
        console.log('[Audio] Source started');
      }

    } catch (e) {
      console.error('Error flushing audio buffer:', e);
    }
  };

  const playAudioChunk = async (base64Data: string) => {
    try {
      if (!audioContextRef.current || !audioSourceRef.current) {
        await setupAudioContext();
      }

      const context = audioContextRef.current;
      if (context?.state === 'suspended') {
        await context.resume();
      }

      const byteArray = base64js.toByteArray(base64Data);

      // Add to pending buffer
      pendingChunksRef.current.push(byteArray);
      pendingSizeRef.current += byteArray.length;

      // Flush if threshold reached
      if (pendingSizeRef.current >= BUFFER_THRESHOLD) {
        flushAudioBuffer();
      }

    } catch (e) {
      console.error('Error playing chunk:', e);
    }
  };

  const connect = useCallback(async () => {
    try {
      setStatus('Connecting...');

      const status = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (!status.granted) {
        setStatus('Permission denied');
        return;
      }

      // Initialize Audio Context
      await setupAudioContext();

      const ws = new WebSocket(BACKEND_URL);

      ws.onopen = async () => {
        console.log('Connected to WebSocket');
        setIsConnected(true);
        setStatus('Connected - Listening...');
        wsRef.current = ws;

        await startNativeRecording({
          sampleRate: 16000,
          channels: 1,
          encoding: 'pcm_16bit',
          // @ts-ignore
          echoCancellation: true,
          // @ts-ignore
          autoGainControl: true,
          // @ts-ignore
          noiseSuppression: true,
        });
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'audio_response') {
            setIsSpeaking(true);
            isSpeakingRef.current = true;

            if (isSpeakingTimeoutRef.current) {
              clearTimeout(isSpeakingTimeoutRef.current);
              isSpeakingTimeoutRef.current = null;
            }

            playAudioChunk(data.data);
          } else if (data.type === 'transcription') {
            setStatus(`Gemini: ${data.text}`);
          } else if (data.type === 'turn_complete') {
            // Flush any remaining audio
            flushAudioBuffer();

            isSpeakingRef.current = false;
            setIsSpeaking(false);
          } else if (data.type === 'interrupted') {
            console.log('Received interruption signal');

            // Recreate source on interruption to prevent memory leaks
            if (audioSourceRef.current) {
              try {
                audioSourceRef.current.stop();
                audioSourceRef.current.disconnect();
              } catch (e) { console.warn('Error stopping source:', e); }
              audioSourceRef.current = null;
              isSourceStartedRef.current = false;
            }

            pendingChunksRef.current = [];
            pendingSizeRef.current = 0;

            enqueuedCountRef.current = 0;
            processedCountRef.current = 0;

            setIsSpeaking(false);
            isSpeakingRef.current = false;
            if (isSpeakingTimeoutRef.current) {
              clearTimeout(isSpeakingTimeoutRef.current);
              isSpeakingTimeoutRef.current = null;
            }
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      ws.onclose = async () => {
        console.log('Disconnected');
        setIsConnected(false);
        setStatus('Disconnected');
        wsRef.current = null;
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (isSpeakingTimeoutRef.current) clearTimeout(isSpeakingTimeoutRef.current);

        try {
          await stopNativeRecording();
          // Don't close AudioContext here, keep it alive for reconnection speed
          if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
            isSourceStartedRef.current = false;
          }
        } catch (e) {
          console.log('Stop recording error (onclose):', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('Connection error');
        setIsConnected(false);
      };

    } catch (err) {
      console.error('Connection error:', err);
      setStatus('Error connecting');
    }
  }, [startNativeRecording, stopNativeRecording]);

  const disconnect = useCallback(async () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    try {
      await stopNativeRecording();
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
        audioSourceRef.current = null;
        isSourceStartedRef.current = false;
      }
    } catch (e) {
      console.log('Stop recording error (likely not active):', e);
    }
    setIsConnected(false);
    setStatus('Disconnected');
    pendingChunksRef.current = [];
    pendingSizeRef.current = 0;
  }, [stopNativeRecording]);

  return {
    connect,
    disconnect,
    isConnected,
    isSpeaking,
    status,
    audioLevel: 0, // Placeholder
  };
}
