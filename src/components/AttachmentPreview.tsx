import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Attachment } from '../types';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (attachment: Attachment) => void;
  editable?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AttachmentPreview({
  attachments,
  onRemove,
  editable = false,
}: AttachmentPreviewProps): React.ReactElement | null {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  if (attachments.length === 0) {
    return null;
  }

  const renderThumbnail = (attachment: Attachment, index: number) => {
    if (attachment.type === 'image') {
      return (
        <TouchableOpacity
          key={attachment.id}
          style={styles.thumbnailContainer}
          onPress={() => setSelectedIndex(index)}
        >
          <Image source={{ uri: attachment.uri }} style={styles.thumbnail} />
          {editable && onRemove && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(attachment)}
            >
              <Ionicons name="close-circle" size={22} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    }

    if (attachment.type === 'audio') {
      return (
        <TouchableOpacity
          key={attachment.id}
          style={styles.audioThumbnail}
          onPress={() => {
            // TODO: Play audio
          }}
        >
          <Ionicons name="play-circle" size={32} color="#007AFF" />
          <Text style={styles.audioFilename} numberOfLines={1}>
            {attachment.filename}
          </Text>
          {editable && onRemove && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(attachment)}
            >
              <Ionicons name="close-circle" size={22} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity key={attachment.id} style={styles.fileThumbnail}>
        <Ionicons name="document" size={32} color="#8E8E93" />
        <Text style={styles.filename} numberOfLines={1}>
          {attachment.filename}
        </Text>
        {editable && onRemove && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(attachment)}
          >
            <Ionicons name="close-circle" size={22} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const selectedAttachment = selectedIndex !== null ? attachments[selectedIndex] : null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {attachments.map(renderThumbnail)}
      </ScrollView>

      {/* Full-screen image viewer */}
      <Modal
        visible={selectedIndex !== null && selectedAttachment?.type === 'image'}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedIndex(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedIndex(null)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedIndex !== null ? `${selectedIndex + 1} / ${attachments.length}` : ''}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedIndex ? selectedIndex * SCREEN_WIDTH : 0, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setSelectedIndex(newIndex);
            }}
          >
            {attachments
              .filter((a) => a.type === 'image')
              .map((attachment) => (
                <View key={attachment.id} style={styles.fullImageContainer}>
                  <Image
                    source={{ uri: attachment.uri }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  audioThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    position: 'relative',
  },
  audioFilename: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 72,
  },
  fileThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    position: 'relative',
  },
  filename: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 72,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  fullImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 100,
  },
});
