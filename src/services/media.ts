import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Attachment } from '../types';

/**
 * Generate a unique filename for images
 */
function generateImageFilename(originalFilename?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = originalFilename?.split('.').pop() || 'jpg';
  return `image-${timestamp}.${ext}`;
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Options for picking images
 */
export interface ImagePickerOptions {
  allowsEditing?: boolean;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Take a photo using the camera
 */
export async function takePhoto(options: ImagePickerOptions = {}): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: options.allowsEditing ?? false,
      quality: options.quality ?? 0.8,
      exif: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0];
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
}

/**
 * Pick an image from the media library
 */
export async function pickImage(options: ImagePickerOptions = {}): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) {
      throw new Error('Media library permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: options.allowsEditing ?? false,
      quality: options.quality ?? 0.8,
      exif: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0];
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
}

/**
 * Pick multiple images from the media library
 */
export async function pickMultipleImages(
  options: ImagePickerOptions = {}
): Promise<ImagePicker.ImagePickerAsset[]> {
  try {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) {
      throw new Error('Media library permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: options.quality ?? 0.8,
      selectionLimit: 10,
    });

    if (result.canceled || !result.assets) {
      return [];
    }

    return result.assets;
  } catch (error) {
    console.error('Error picking images:', error);
    return [];
  }
}

/**
 * Save an image to the vault attachments folder
 */
export async function saveImageToVault(
  asset: ImagePicker.ImagePickerAsset,
  vaultPath: string
): Promise<Attachment> {
  const filename = generateImageFilename(asset.fileName || undefined);
  const attachmentsDir = `${vaultPath}/attachments`;
  const destPath = `${attachmentsDir}/${filename}`;

  // Ensure attachments directory exists
  const dirInfo = await FileSystem.getInfoAsync(attachmentsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(attachmentsDir, { intermediates: true });
  }

  // Copy image to vault
  await FileSystem.copyAsync({ from: asset.uri, to: destPath });

  // Get file info
  const fileInfo = await FileSystem.getInfoAsync(destPath);

  return {
    id: `image-${Date.now()}`,
    type: 'image',
    uri: destPath,
    filename,
    mimeType: asset.mimeType || 'image/jpeg',
    size: fileInfo.exists ? fileInfo.size : undefined,
    width: asset.width,
    height: asset.height,
  };
}

/**
 * Delete an attachment from the vault
 */
export async function deleteAttachment(attachment: Attachment): Promise<void> {
  try {
    await FileSystem.deleteAsync(attachment.uri, { idempotent: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
  }
}

/**
 * Generate markdown for an attachment
 */
export function attachmentToMarkdown(attachment: Attachment): string {
  const relativePath = `attachments/${attachment.filename}`;
  
  switch (attachment.type) {
    case 'image':
      return `![${attachment.filename}](${relativePath})`;
    case 'audio':
      return `[${attachment.filename}](${relativePath})`;
    default:
      return `[${attachment.filename}](${relativePath})`;
  }
}

/**
 * Get thumbnail URI for an attachment (for display purposes)
 */
export function getThumbnailUri(attachment: Attachment): string {
  // For images, use the original URI
  // In a production app, you might want to generate actual thumbnails
  return attachment.uri;
}
