import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Attachment, QuickCaptureData } from '../types';
import { VoiceRecorder, formatDuration, saveRecordingToVault } from '../services/voice';
import { takePhoto, pickImage, saveImageToVault, deleteAttachment } from '../services/media';
import { getSetting } from '../services/storage';

interface QuickCaptureProps {
  onSubmit: (data: QuickCaptureData) => void;
  onCancel: () => void;
  initialTitle?: string;
  initialContent?: string;
  showTitle?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function QuickCapture({
  onSubmit,
  onCancel,
  initialTitle = '',
  initialContent = '',
  showTitle = true,
}: QuickCaptureProps): React.ReactElement {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const voiceRecorder = useRef(new VoiceRecorder());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);

  // Focus title input on mount
  useEffect(() => {
    if (showTitle) {
      setTimeout(() => titleInputRef.current?.focus(), 100);
    } else {
      setTimeout(() => contentInputRef.current?.focus(), 100);
    }
  }, [showTitle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceRecorder.current.cleanup();
    };
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
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

  const handleVoicePress = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      const uri = await voiceRecorder.current.stopRecording();
      setIsRecording(false);
      setRecordingDuration(0);

      if (uri) {
        try {
          const vaultPath = await getSetting<string>('vaultPath');
          if (vaultPath) {
            const attachment = await saveRecordingToVault(uri, vaultPath);
            setAttachments((prev) => [...prev, attachment]);
          }
        } catch (error) {
          console.error('Error saving recording:', error);
          Alert.alert('Error', 'Failed to save recording');
        }
      }
    } else {
      // Start recording
      const started = await voiceRecorder.current.startRecording(setRecordingDuration);
      if (started) {
        setIsRecording(true);
      } else {
        Alert.alert(
          'Permission Required',
          'Please grant microphone permission to record audio.'
        );
      }
    }
  }, [isRecording]);

  const handleCameraPress = useCallback(async () => {
    const asset = await takePhoto();
    if (asset) {
      try {
        const vaultPath = await getSetting<string>('vaultPath');
        if (vaultPath) {
          const attachment = await saveImageToVault(asset, vaultPath);
          setAttachments((prev) => [...prev, attachment]);
        }
      } catch (error) {
        console.error('Error saving photo:', error);
        Alert.alert('Error', 'Failed to save photo');
      }
    }
  }, []);

  const handleGalleryPress = useCallback(async () => {
    const asset = await pickImage();
    if (asset) {
      try {
        const vaultPath = await getSetting<string>('vaultPath');
        if (vaultPath) {
          const attachment = await saveImageToVault(asset, vaultPath);
          setAttachments((prev) => [...prev, attachment]);
        }
      } catch (error) {
        console.error('Error saving image:', error);
        Alert.alert('Error', 'Failed to save image');
      }
    }
  }, []);

  const handleRemoveAttachment = useCallback(async (attachment: Attachment) => {
    Alert.alert('Remove Attachment', 'Are you sure you want to remove this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteAttachment(attachment);
          setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
        },
      },
    ]);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent && attachments.length === 0) {
      Alert.alert('Empty Note', 'Please add some content to your note.');
      return;
    }

    setIsSubmitting(true);

    try {
      onSubmit({
        title: trimmedTitle || 'Untitled',
        content: trimmedContent,
        attachments,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, content, attachments, onSubmit]);

  const handleCancel = useCallback(async () => {
    if (isRecording) {
      await voiceRecorder.current.cancelRecording();
    }

    // Clean up unsaved attachments
    for (const attachment of attachments) {
      await deleteAttachment(attachment);
    }

    onCancel();
  }, [isRecording, attachments, onCancel]);

  const renderAttachment = useCallback(
    (attachment: Attachment) => (
      <TouchableOpacity
        key={attachment.id}
        style={styles.attachmentItem}
        onPress={() => handleRemoveAttachment(attachment)}
      >
        {attachment.type === 'image' ? (
          <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
        ) : (
          <View style={styles.audioAttachment}>
            <Ionicons name="musical-note" size={24} color="#007AFF" />
            <Text style={styles.audioText} numberOfLines={1}>
              {attachment.filename}
            </Text>
          </View>
        )}
        <View style={styles.removeButton}>
          <Ionicons name="close-circle" size={20} color="#FF3B30" />
        </View>
      </TouchableOpacity>
    ),
    [handleRemoveAttachment]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Note</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          style={styles.headerButton}
          disabled={isSubmitting}
        >
          <Text style={[styles.saveText, isSubmitting && styles.disabledText]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.scrollView} keyboardDismissMode="interactive">
        {/* Title Input */}
        {showTitle && (
          <TextInput
            ref={titleInputRef}
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Note title..."
            placeholderTextColor="#8E8E93"
            returnKeyType="next"
            onSubmitEditing={() => contentInputRef.current?.focus()}
            blurOnSubmit={false}
          />
        )}

        {/* Content Input */}
        <TextInput
          ref={contentInputRef}
          style={styles.contentInput}
          value={content}
          onChangeText={setContent}
          placeholder="Start typing your note..."
          placeholderTextColor="#8E8E93"
          multiline
          textAlignVertical="top"
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.attachmentsLabel}>Attachments</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentsList}
            >
              {attachments.map(renderAttachment)}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Animated.View
            style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]}
          />
          <Text style={styles.recordingText}>
            Recording... {formatDuration(recordingDuration)}
          </Text>
          <TouchableOpacity onPress={handleVoicePress} style={styles.stopButton}>
            <Ionicons name="stop" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, isRecording && styles.actionButtonRecording]}
          onPress={handleVoicePress}
        >
          <Ionicons
            name={isRecording ? 'mic' : 'mic-outline'}
            size={28}
            color={isRecording ? '#FF3B30' : '#007AFF'}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleCameraPress}>
          <Ionicons name="camera-outline" size={28} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleGalleryPress}>
          <Ionicons name="image-outline" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  saveText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  disabledText: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#000',
  },
  contentInput: {
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#000',
    minHeight: 200,
  },
  attachmentsContainer: {
    paddingVertical: 16,
  },
  attachmentsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  attachmentsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  audioAttachment: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  audioText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFD1D1',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    flex: 1,
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '500',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#F9F9F9',
    gap: 16,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonRecording: {
    backgroundColor: '#FFF5F5',
  },
});
