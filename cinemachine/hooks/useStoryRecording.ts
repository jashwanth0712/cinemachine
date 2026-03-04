import { useState, useCallback, useRef, useEffect } from 'react';
import { uploadWithProgress } from '../services/storage';
import * as api from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordedShot {
  id: string;
  emoji: string;
  title: string;
  duration: number;
  videoUri: string | null;
}

export type UploadStatus = 'idle' | 'uploading' | 'complete' | 'error';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStoryRecording() {
  const [shots, setShots] = useState<RecordedShot[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storyId, setStoryId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRecordingPromise = useRef<Promise<{ uri: string }> | null>(null);

  // -----------------------------------------------------------------------
  // Recording lifecycle
  // -----------------------------------------------------------------------

  /**
   * Start recording. Optionally pass a CameraView ref to trigger
   * `recordAsync()`.  If no ref is provided the hook still tracks
   * elapsed time (demo / fallback mode).
   */
  const startRecording = useCallback(
    (cameraRef?: React.RefObject<any>) => {
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

      // If a camera ref is available, start actual video capture
      if (cameraRef?.current?.recordAsync) {
        cameraRecordingPromise.current = cameraRef.current.recordAsync();
      }
    },
    []
  );

  /**
   * Stop recording and return a `RecordedShot`.
   *
   * If the camera was recording, this stops it and waits for the URI.
   * Otherwise it creates a shot without a video URI (demo mode).
   */
  const stopRecording = useCallback(
    async (cameraRef?: React.RefObject<any>): Promise<RecordedShot> => {
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      let videoUri: string | null = null;

      // Stop camera recording if it was active
      if (cameraRef?.current?.stopRecording) {
        cameraRef.current.stopRecording();
      }

      if (cameraRecordingPromise.current) {
        try {
          const result = await cameraRecordingPromise.current;
          videoUri = result.uri;
        } catch {
          console.warn('Camera recording did not produce a file');
        }
        cameraRecordingPromise.current = null;
      }

      const shotIndex = shots.length;

      return {
        id: `shot-${Date.now()}`,
        emoji: shotEmojis[shotIndex % shotEmojis.length],
        title: shotTitles[shotIndex % shotTitles.length],
        duration: Math.max(recordingTime, 3), // minimum 3 seconds
        videoUri,
      };
    },
    [shots.length, recordingTime]
  );

  // -----------------------------------------------------------------------
  // Shot management
  // -----------------------------------------------------------------------

  /**
   * Accept a shot — optionally upload the video and persist via the API.
   *
   * If `token` is provided and the shot has a `videoUri`, the file will
   * be uploaded to GCS and a Shot record will be created on the backend.
   */
  const acceptShot = useCallback(
    async (shot: RecordedShot, token?: string) => {
      // Always add to local state immediately
      setShots((prev) => [...prev, shot]);
      setRecordingTime(0);

      // If we have a video and auth, do the upload + persist dance
      if (token && shot.videoUri && storyId) {
        try {
          setUploadStatus('uploading');
          setUploadProgress(0);

          const filename = `${storyId}_shot_${shot.id}.mp4`;
          const { gcsUri } = await uploadWithProgress(
            token,
            shot.videoUri,
            filename,
            (progress) => setUploadProgress(progress)
          );

          await api.createShot(token, {
            story_id: storyId,
            shot_order: shots.length + 1,
            emoji: shot.emoji,
            title: shot.title,
            description: undefined,
            duration_seconds: shot.duration,
            video_gcs_uri: gcsUri,
          });

          setUploadStatus('complete');
        } catch (err) {
          console.error('Shot upload/save failed:', err);
          setUploadStatus('error');
        }
      }
    },
    [storyId, shots.length]
  );

  const redoShot = useCallback(() => {
    setRecordingTime(0);
    setUploadStatus('idle');
    setUploadProgress(0);
  }, []);

  const reset = useCallback(() => {
    setShots([]);
    setIsRecording(false);
    setRecordingTime(0);
    setUploadStatus('idle');
    setUploadProgress(0);
    setStoryId(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up timer on unmount
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
    uploadStatus,
    uploadProgress,
    storyId,
    setStoryId,
    startRecording,
    stopRecording,
    acceptShot,
    redoShot,
    reset,
  };
}
