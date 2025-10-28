import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabaseClient';
import { Alert } from 'react-native';

export interface ImageUploadResult {
  url: string;
  path: string;
  size: number;
}

export interface ImageUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
}

class ImageUploadService {
  // Request permissions for camera and photo library
  async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera and photo library permissions to upload images.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  // Show image picker options
  async showImagePickerOptions(): Promise<'camera' | 'library' | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Image',
        'Choose how you want to add an image',
        [
          {
            text: 'Camera',
            onPress: () => resolve('camera'),
          },
          {
            text: 'Photo Library',
            onPress: () => resolve('library'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ]
      );
    });
  }

  // Pick image from camera or library
  async pickImage(options: ImageUploadOptions = {}): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const source = await this.showImagePickerOptions();
      if (!source) return null;

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [1, 1],
        quality: options.quality ?? 0.8,
        maxWidth: options.maxWidth ?? 1024,
        maxHeight: options.maxHeight ?? 1024,
      };

      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(pickerOptions);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  }

  // Upload image to Supabase Storage
  async uploadImage(
    imageUri: string,
    bucket: string = 'pet-images',
    folder: string = 'pets'
  ): Promise<ImageUploadResult | null> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      const fileName = `${timestamp}_${randomString}.${fileExtension}`;
      const filePath = `${folder}/${fileName}`;

      // Convert URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to upload image');
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        size: blob.size,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
      return null;
    }
  }

  // Upload multiple images
  async uploadMultipleImages(
    imageUris: string[],
    bucket: string = 'pet-images',
    folder: string = 'pets'
  ): Promise<ImageUploadResult[]> {
    const results: ImageUploadResult[] = [];
    
    for (const uri of imageUris) {
      const result = await this.uploadImage(uri, bucket, folder);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  // Delete image from Supabase Storage
  async deleteImage(
    filePath: string,
    bucket: string = 'pet-images'
  ): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting image:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  // Get image size from URI
  async getImageSize(uri: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => {
          console.error('Error getting image size:', error);
          resolve(null);
        }
      );
    });
  }

  // Compress image if needed
  async compressImageIfNeeded(
    uri: string,
    maxSize: number = 1024 * 1024 // 1MB
  ): Promise<string> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      if (blob.size <= maxSize) {
        return uri;
      }

      // If image is too large, we'll let the picker handle compression
      // with the quality and maxWidth/maxHeight options
      return uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri;
    }
  }

  // Validate image file
  validateImage(uri: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = uri.toLowerCase().substring(uri.lastIndexOf('.'));
    return validExtensions.includes(extension);
  }

  // Get file size from URI
  async getFileSize(uri: string): Promise<number> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }
}

export const imageUploadService = new ImageUploadService();
