import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Attachment } from '../types';

/**
 * Generate a unique filename for recordings
 */
function generateRecordingFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `recording-${timestamp}.m4a`;
}

/**
 * Request audio recording permissions
 */
export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting audio permissions:', error);
    return false;
  }
}

/**
 * Configure audio mode for recording
 */
export async function configureAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

/**
 * Voice recording service using expo-av
 */
export class VoiceRecorder {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private onDurationUpdate?: (duration: number) => void;
  private durationInterval?: NodeJS.Timeout;
  private startTime: number = 0;

  /**
   * Start recording audio
   */
  async startRecording(onDurationUpdate?: (duration: number) => void): Promise<boolean> {
    try {
      const hasPermission = await requestAudioPermissions();
      if (!hasPermission) {
        throw new Error('Audio recording permission not granted');
      }

      await configureAudioMode();

      this.onDurationUpdate = onDurationUpdate;
      this.startTime = Date.now();

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;

      // Start duration tracking
      if (this.onDurationUpdate) {
        this.durationInterval = setInterval(() => {
          const duration = Math.floor((Date.now() - this.startTime) / 1000);
          this.onDurationUpdate?.(duration);
        }, 1000);
      }

      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  /**
   * Stop recording and return the file URI
   */
  async stopRecording(): Promise<string | null> {
    try {
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = undefined;
      }

      if (!this.recording) {
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      return null;
    }
  }

  /**
   * Cancel the current recording
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = undefined;
      }

      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        this.recording = null;

        // Delete the file
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      }
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  }

  /**
   * Play a recorded audio file
   */
  async playRecording(uri: string): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri });
      this.sound = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing recording:', error);
    }
  }

  /**
   * Stop playback
   */
  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.cancelRecording();
    await this.stopPlayback();
  }
}

/**
 * Save recording to vault attachments folder
 */
export async function saveRecordingToVault(
  uri: string,
  vaultPath: string
): Promise<Attachment> {
  const filename = generateRecordingFilename();
  const attachmentsDir = `${vaultPath}/attachments`;
  const destPath = `${attachmentsDir}/${filename}`;

  // Ensure attachments directory exists
  const dirInfo = await FileSystem.getInfoAsync(attachmentsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(attachmentsDir, { intermediates: true });
  }

  // Copy recording to vault
  await FileSystem.copyAsync({ from: uri, to: destPath });

  // Get file info
  const fileInfo = await FileSystem.getInfoAsync(destPath);

  return {
    id: `audio-${Date.now()}`,
    type: 'audio',
    uri: destPath,
    filename,
    mimeType: 'audio/m4a',
    size: fileInfo.exists ? fileInfo.size : undefined,
  };
}

/**
 * Format duration in MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Transcription service interface (for future implementation)
 * This is a placeholder for actual speech-to-text integration.
 * Options include:
 * - expo-speech-to-text (when available for Expo)
 * - OpenAI Whisper API
 * - Google Speech-to-Text API
 * - Local on-device transcription
 */
export async function transcribeAudio(uri: string): Promise<string | null> {
  // TODO: Implement actual transcription
  // For now, return null to indicate transcription is not available
  // In production, this would call a transcription API
  console.log('Transcription requested for:', uri);
  return null;
}
