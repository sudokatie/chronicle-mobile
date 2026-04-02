import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceRecorder, formatDuration } from '../services/voice';

interface VoiceRecordButtonProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onRecordingCancel?: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: object;
}

const BUTTON_SIZES = {
  small: { button: 36, icon: 18 },
  medium: { button: 44, icon: 22 },
  large: { button: 56, icon: 28 },
};

/**
 * Standalone voice recording button component.
 * Shows recording state with animated pulse effect.
 */
export function VoiceRecordButton({
  onRecordingComplete,
  onRecordingCancel,
  size = 'medium',
  style,
}: VoiceRecordButtonProps): React.ReactElement {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const voiceRecorder = useRef(new VoiceRecorder());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const dimensions = BUTTON_SIZES[size];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceRecorder.current.cleanup();
    };
  }, []);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const handlePress = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      const uri = await voiceRecorder.current.stopRecording();
      const recordingDuration = duration;
      setIsRecording(false);
      setDuration(0);

      if (uri && recordingDuration > 0) {
        onRecordingComplete(uri, recordingDuration);
      } else if (onRecordingCancel) {
        onRecordingCancel();
      }
    } else {
      // Start recording
      const started = await voiceRecorder.current.startRecording(setDuration);
      if (started) {
        setIsRecording(true);
      } else {
        Alert.alert(
          'Permission Required',
          'Please grant microphone permission to record audio.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [isRecording, duration, onRecordingComplete, onRecordingCancel]);

  const handleLongPress = useCallback(async () => {
    if (isRecording) {
      // Cancel recording on long press
      await voiceRecorder.current.cancelRecording();
      setIsRecording(false);
      setDuration(0);
      onRecordingCancel?.();
    }
  }, [isRecording, onRecordingCancel]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.buttonWrapper,
          isRecording && styles.buttonWrapperRecording,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            {
              width: dimensions.button,
              height: dimensions.button,
              borderRadius: dimensions.button / 2,
            },
            isRecording && styles.buttonRecording,
          ]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={dimensions.icon}
            color={isRecording ? '#fff' : '#007AFF'}
          />
        </TouchableOpacity>
      </Animated.View>

      {isRecording && (
        <Text style={styles.durationText}>{formatDuration(duration)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  buttonWrapper: {
    // Used for pulse animation
  },
  buttonWrapperRecording: {
    // Additional styles when recording
  },
  button: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonRecording: {
    backgroundColor: '#FF3B30',
  },
  durationText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
    fontVariant: ['tabular-nums'],
  },
});
