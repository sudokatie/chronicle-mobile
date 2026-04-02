import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { takePhoto, pickImage, pickMultipleImages } from '../services/media';

interface ImagePickerButtonProps {
  onImageSelected: (asset: ImagePicker.ImagePickerAsset) => void;
  onMultipleSelected?: (assets: ImagePicker.ImagePickerAsset[]) => void;
  allowMultiple?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: object;
}

const BUTTON_SIZES = {
  small: { button: 36, icon: 18 },
  medium: { button: 44, icon: 22 },
  large: { button: 56, icon: 28 },
};

/**
 * Image picker button with camera/gallery options.
 * Shows a modal to choose between camera and gallery.
 */
export function ImagePickerButton({
  onImageSelected,
  onMultipleSelected,
  allowMultiple = false,
  size = 'medium',
  style,
}: ImagePickerButtonProps): React.ReactElement {
  const [showOptions, setShowOptions] = useState(false);
  const dimensions = BUTTON_SIZES[size];

  const handleCameraPress = useCallback(async () => {
    setShowOptions(false);
    const asset = await takePhoto();
    if (asset) {
      onImageSelected(asset);
    }
  }, [onImageSelected]);

  const handleGalleryPress = useCallback(async () => {
    setShowOptions(false);

    if (allowMultiple && onMultipleSelected) {
      const assets = await pickMultipleImages();
      if (assets.length > 0) {
        onMultipleSelected(assets);
      }
    } else {
      const asset = await pickImage();
      if (asset) {
        onImageSelected(asset);
      }
    }
  }, [allowMultiple, onImageSelected, onMultipleSelected]);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: dimensions.button,
            height: dimensions.button,
            borderRadius: dimensions.button / 2,
          },
        ]}
        onPress={() => setShowOptions(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="image" size={dimensions.icon} color="#007AFF" />
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowOptions(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Photo</Text>

            <TouchableOpacity style={styles.optionButton} onPress={handleCameraPress}>
              <Ionicons name="camera" size={24} color="#007AFF" />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={handleGalleryPress}>
              <Ionicons name="images" size={24} color="#007AFF" />
              <Text style={styles.optionText}>
                {allowMultiple ? 'Choose from Gallery' : 'Choose Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.cancelButton]}
              onPress={() => setShowOptions(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  optionText: {
    fontSize: 17,
    color: '#000',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
});
