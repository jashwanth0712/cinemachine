import { useState, useCallback, useRef, useEffect } from 'react';

export interface RecordedShot {
  id: string;
  emoji: string;
  title: string;
  duration: number;
}

const shotEmojis = ['🎬', '🌟', '🎭', '🎪', '🎨', '🎯', '🎲', '🎸'];
const shotTitles = [
  'Opening Scene',
  'The Adventure',
  'The Discovery',
  'The Challenge',
  'The Resolution',
  'Grand Finale',
  'Bonus Scene',
  'Credits Roll',
];

export function useStoryRecording() {
  const [shots, setShots] = useState<RecordedShot[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((t) => t + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback((): RecordedShot => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const shotIndex = shots.length;
    return {
      id: `shot-${Date.now()}`,
      emoji: shotEmojis[shotIndex % shotEmojis.length],
      title: shotTitles[shotIndex % shotTitles.length],
      duration: Math.max(recordingTime, 3), // min 3 seconds
    };
  }, [shots.length, recordingTime]);

  const acceptShot = useCallback((shot: RecordedShot) => {
    setShots((prev) => [...prev, shot]);
    setRecordingTime(0);
  }, []);

  const redoShot = useCallback(() => {
    setRecordingTime(0);
  }, []);

  const reset = useCallback(() => {
    setShots([]);
    setIsRecording(false);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    shots,
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    acceptShot,
    redoShot,
    reset,
  };
}
