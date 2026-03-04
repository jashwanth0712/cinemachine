import { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import { useStoryRecording, type RecordedShot } from '../../hooks/useStoryRecording';
import VoiceAgentOverlay from '../../components/VoiceAgentOverlay';
import RecordingOverlay from '../../components/RecordingOverlay';
import ShotReviewCard from '../../components/ShotReviewCard';
import ShotTimeline from '../../components/ShotTimeline';
import CelebrationOverlay from '../../components/CelebrationOverlay';
import StatusPill from '../../components/StatusPill';

export default function RecordingScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const voiceAgent = useVoiceAgent();
  const recording = useStoryRecording();
  const pendingShotRef = useRef<RecordedShot | null>(null);

  // Handle state transitions that need recording coordination
  useEffect(() => {
    if (voiceAgent.state === 'recording' && !recording.isRecording) {
      recording.startRecording();
    }
  }, [voiceAgent.state, recording.isRecording, recording]);

  // Navigate to preview when movie complete
  useEffect(() => {
    if (voiceAgent.isComplete) {
      const timer = setTimeout(() => {
        router.replace({
          pathname: '/story/preview',
          params: { shotCount: String(recording.shots.length) },
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [voiceAgent.isComplete, recording.shots.length]);

  const handleDemoTap = useCallback(() => {
    // Handle recording stop specially
    if (voiceAgent.state === 'recording') {
      const shot = recording.stopRecording();
      pendingShotRef.current = shot;
      voiceAgent.stopRecording();
      return;
    }

    // Handle review actions
    if (voiceAgent.state === 'reviewing_shot') {
      if (pendingShotRef.current) {
        recording.acceptShot(pendingShotRef.current);
        pendingShotRef.current = null;
      }
      voiceAgent.keepShot();
      return;
    }

    voiceAgent.handleDemoTap();
  }, [voiceAgent, recording]);

  const handleKeepShot = useCallback(() => {
    if (pendingShotRef.current) {
      recording.acceptShot(pendingShotRef.current);
      pendingShotRef.current = null;
    }
    voiceAgent.keepShot();
  }, [voiceAgent, recording]);

  const handleRedoShot = useCallback(() => {
    pendingShotRef.current = null;
    recording.redoShot();
    voiceAgent.redoShot();
  }, [voiceAgent, recording]);

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

  // Permission not granted yet
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

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <CameraView style={styles.camera} facing="back" />

      {/* Dark overlay for non-recording states */}
      {voiceAgent.state !== 'recording' && (
        <View style={styles.darkOverlay} />
      )}

      {/* Status pill */}
      <View style={styles.statusContainer}>
        <StatusPill text={getStatusText()} variant={getStatusVariant()} />
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

      {/* Full-screen tap target for demo mode */}
      {voiceAgent.state !== 'reviewing_shot' && !voiceAgent.isComplete && (
        <Pressable
          style={styles.tapTarget}
          onPress={handleDemoTap}
        />
      )}

      {/* Close button */}
      <Pressable
        style={styles.closeButton}
        onPress={() => router.back()}
      >
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
