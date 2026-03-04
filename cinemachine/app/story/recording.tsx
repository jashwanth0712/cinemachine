import { useRef, useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import { useStoryRecording, type RecordedShot } from '../../hooks/useStoryRecording';
import { useAuth } from '../../context/AuthContext';
import { VoiceSocket, type VoiceSocketState } from '../../services/voiceSocket';
import * as api from '../../services/api';
import VoiceAgentOverlay from '../../components/VoiceAgentOverlay';
import RecordingOverlay from '../../components/RecordingOverlay';
import ShotReviewCard from '../../components/ShotReviewCard';
import ShotTimeline from '../../components/ShotTimeline';
import CelebrationOverlay from '../../components/CelebrationOverlay';
import StatusPill from '../../components/StatusPill';

// Random story metadata generators
const STORY_EMOJIS = ['🎬', '🌟', '🐉', '🚀', '🧸', '🎭', '🦕', '🌈'];
const STORY_TITLES = [
  'My Awesome Movie',
  'Epic Adventure',
  'Super Story',
  'The Big Show',
  'Amazing Tale',
];

export default function RecordingScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const voiceAgent = useVoiceAgent();
  const recording = useStoryRecording();
  const { currentKid, token } = useAuth();

  const cameraRef = useRef<CameraView>(null);
  const pendingShotRef = useRef<RecordedShot | null>(null);
  const voiceSocketRef = useRef<VoiceSocket | null>(null);

  const [voiceState, setVoiceState] = useState<VoiceSocketState>('disconnected');

  // -----------------------------------------------------------------------
  // Create a story record when we enter the recording screen
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!token || !currentKid || recording.storyId) return;

    (async () => {
      try {
        const emoji = STORY_EMOJIS[Math.floor(Math.random() * STORY_EMOJIS.length)];
        const title = STORY_TITLES[Math.floor(Math.random() * STORY_TITLES.length)];
        const gradientIndex = Math.floor(Math.random() * 6);

        const story = await api.createStory(token, {
          kid_profile_id: currentKid.id,
          title,
          emoji,
          gradient_index: gradientIndex,
        });

        recording.setStoryId(story.id);
      } catch (err) {
        console.warn('Failed to create story:', err);
      }
    })();
  }, [token, currentKid, recording.storyId]);

  // -----------------------------------------------------------------------
  // Voice socket connection
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!token || !currentKid) return;

    const socket = new VoiceSocket(currentKid.id, token, {
      onStateChange: (state) => {
        setVoiceState(state);
        voiceAgent.setVoiceActive(state === 'connected');
      },
      onAudioData: (_data) => {
        // Audio playback would happen here via expo-av Audio.Sound
        // For now we receive but don't play
      },
      onCommand: (action) => {
        voiceAgent.handleVoiceCommand(action);
      },
      onStoryContext: (ctx) => {
        voiceAgent.updateStoryContext(ctx);
      },
      onTranscript: (text) => {
        voiceAgent.setGeminiDialogue(text);
      },
      onError: (error) => {
        console.warn('[Recording] Voice socket error:', error);
      },
    });

    voiceSocketRef.current = socket;
    socket.connect();

    return () => {
      socket.disconnect();
      voiceSocketRef.current = null;
    };
    // We intentionally only connect once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentKid?.id]);

  // -----------------------------------------------------------------------
  // Coordinate voice-agent state with camera recording
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (voiceAgent.state === 'recording' && !recording.isRecording) {
      recording.startRecording(cameraRef);
    }
  }, [voiceAgent.state, recording.isRecording, recording]);

  // Navigate to preview when movie complete
  useEffect(() => {
    if (voiceAgent.isComplete) {
      const timer = setTimeout(() => {
        // Update story status before navigating
        if (token && recording.storyId) {
          api.updateStory(token, recording.storyId, { status: 'complete' }).catch(() => {});
        }
        router.replace({
          pathname: '/story/preview',
          params: {
            id: recording.storyId ?? '',
            shotCount: String(recording.shots.length),
          },
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [voiceAgent.isComplete, recording.shots.length, recording.storyId, token]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleDemoTap = useCallback(() => {
    // Handle recording stop specially
    if (voiceAgent.state === 'recording') {
      (async () => {
        const shot = await recording.stopRecording(cameraRef);
        pendingShotRef.current = shot;
        voiceAgent.stopRecording();
      })();
      return;
    }

    // Handle review actions
    if (voiceAgent.state === 'reviewing_shot') {
      if (pendingShotRef.current) {
        recording.acceptShot(pendingShotRef.current, token ?? undefined);
        pendingShotRef.current = null;
      }
      voiceAgent.keepShot();
      return;
    }

    voiceAgent.handleDemoTap();
  }, [voiceAgent, recording, token]);

  const handleKeepShot = useCallback(() => {
    if (pendingShotRef.current) {
      recording.acceptShot(pendingShotRef.current, token ?? undefined);
      pendingShotRef.current = null;
    }
    voiceAgent.keepShot();
  }, [voiceAgent, recording, token]);

  const handleRedoShot = useCallback(() => {
    pendingShotRef.current = null;
    recording.redoShot();
    voiceAgent.redoShot();
  }, [voiceAgent, recording]);

  const handleEndMovie = useCallback(() => {
    voiceAgent.finishMovie();
  }, [voiceAgent]);

  const handleRecordButton = useCallback(() => {
    if (voiceAgent.state === 'ready_to_shoot') {
      voiceAgent.startRecording();
    } else if (voiceAgent.state === 'recording') {
      (async () => {
        const shot = await recording.stopRecording(cameraRef);
        pendingShotRef.current = shot;
        voiceAgent.stopRecording();
      })();
    }
  }, [voiceAgent, recording]);

  // -----------------------------------------------------------------------
  // Status helpers
  // -----------------------------------------------------------------------

  const getStatusText = () => {
    switch (voiceAgent.state) {
      case 'greeting':
      case 'asking_character':
      case 'asking_setting':
      case 'asking_plot':
        return 'Discussing...';
      case 'ready_to_shoot':
        return 'Ready!';
      case 'recording':
        return 'Recording';
      case 'reviewing_shot':
        return 'Review';
      case 'asking_next':
        return 'Planning...';
      case 'movie_complete':
        return 'Complete!';
      default:
        return '';
    }
  };

  const getStatusVariant = () => {
    if (voiceAgent.state === 'recording') return 'recording' as const;
    if (voiceAgent.state === 'movie_complete') return 'success' as const;
    return 'default' as const;
  };

  // -----------------------------------------------------------------------
  // Permission not granted
  // -----------------------------------------------------------------------

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <LinearGradient
          colors={[Colors.orange, Colors.salmon]}
          style={styles.permissionGradient}
        >
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionSubtitle}>
            We need your camera to record awesome movies!
          </Text>
          <Pressable
            style={[styles.permissionButton, Shadows.button]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </Pressable>
          <Pressable
            style={styles.skipButton}
            onPress={() => router.back()}
          >
            <Text style={styles.skipButtonText}>Go Back</Text>
          </Pressable>
        </LinearGradient>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Main recording UI
  // -----------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <CameraView ref={cameraRef} style={styles.camera} facing="back" mode="video" />

      {/* Dark overlay for non-recording states */}
      {voiceAgent.state !== 'recording' && (
        <View style={styles.darkOverlay} />
      )}

      {/* Status pill */}
      <View style={styles.statusContainer}>
        <StatusPill text={getStatusText()} variant={getStatusVariant()} />
        {/* Voice connection indicator */}
        {voiceState === 'connected' && (
          <View style={styles.voiceIndicator}>
            <View style={styles.voiceIndicatorDot} />
            <Text style={styles.voiceIndicatorText}>Voice</Text>
          </View>
        )}
      </View>

      {/* Shot timeline (when we have shots) */}
      {recording.shots.length > 0 && voiceAgent.state !== 'recording' && (
        <ShotTimeline shots={recording.shots} />
      )}

      {/* State-based overlays */}
      {(voiceAgent.state === 'greeting' ||
        voiceAgent.state === 'asking_character' ||
        voiceAgent.state === 'asking_setting' ||
        voiceAgent.state === 'asking_plot' ||
        voiceAgent.state === 'ready_to_shoot' ||
        voiceAgent.state === 'asking_next') && (
        <VoiceAgentOverlay
          dialogue={voiceAgent.dialogue}
          hint={voiceAgent.hint}
          isListening={voiceAgent.state !== 'ready_to_shoot'}
        />
      )}

      {voiceAgent.state === 'recording' && (
        <RecordingOverlay time={recording.recordingTime} />
      )}

      {voiceAgent.state === 'reviewing_shot' && pendingShotRef.current && (
        <ShotReviewCard
          shot={pendingShotRef.current}
          onKeep={handleKeepShot}
          onRedo={handleRedoShot}
        />
      )}

      {voiceAgent.isComplete && <CelebrationOverlay />}

      {/* Upload progress indicator */}
      {recording.uploadStatus === 'uploading' && (
        <View style={styles.uploadBanner}>
          <ActivityIndicator size="small" color={Colors.white} />
          <Text style={styles.uploadText}>
            Uploading... {Math.round(recording.uploadProgress * 100)}%
          </Text>
        </View>
      )}

      {/* Record / Stop button */}
      {(voiceAgent.state === 'ready_to_shoot' ||
        voiceAgent.state === 'recording') && (
        <View style={styles.recordButtonContainer}>
          <Pressable
            style={[
              styles.recordButton,
              voiceAgent.state === 'recording' && styles.recordButtonActive,
            ]}
            onPress={handleRecordButton}
          >
            {voiceAgent.state === 'recording' ? (
              <View style={styles.stopSquare} />
            ) : (
              <View style={styles.recordDot} />
            )}
          </Pressable>
        </View>
      )}

      {/* End Movie button in asking_next state */}
      {voiceAgent.state === 'asking_next' && (
        <View style={styles.endMovieContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.endMovieButton,
              pressed && styles.endMoviePressed,
            ]}
            onPress={handleEndMovie}
          >
            <Text style={styles.endMovieText}>End Movie</Text>
          </Pressable>
        </View>
      )}

      {/* Full-screen tap target for demo mode (reduced opacity, fallback) */}
      {voiceAgent.state !== 'reviewing_shot' &&
        voiceAgent.state !== 'recording' &&
        voiceAgent.state !== 'ready_to_shoot' &&
        !voiceAgent.isComplete && (
          <Pressable style={styles.tapTarget} onPress={handleDemoTap} />
        )}

      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.black + '40',
  },
  statusContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 10,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.black + '60',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  voiceIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  voiceIndicatorText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.white,
  },
  tapTarget: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.black + '60',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  closeText: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.bold,
  },

  // Record button
  recordButtonContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    zIndex: 15,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  recordButtonActive: {
    borderColor: Colors.recording,
  },
  recordDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.recording,
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: Colors.recording,
  },

  // End movie button
  endMovieContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    zIndex: 15,
  },
  endMovieButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    ...Shadows.button,
  },
  endMoviePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  endMovieText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.orange,
  },

  // Upload banner
  uploadBanner: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.black + 'CC',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    zIndex: 15,
  },
  uploadText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },

  // Permissions
  permissionContainer: {
    flex: 1,
  },
  permissionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  permissionEmoji: {
    fontSize: 72,
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.lg,
    color: Colors.white + 'CC',
    textAlign: 'center',
    lineHeight: 28,
  },
  permissionButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.full,
    marginTop: Spacing.xl,
  },
  permissionButtonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.orange,
  },
  skipButton: {
    paddingVertical: Spacing.md,
  },
  skipButtonText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.md,
    color: Colors.white + 'AA',
  },
});
