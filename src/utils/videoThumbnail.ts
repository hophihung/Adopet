/**
 * Video Thumbnail Generation Utilities
 * Tạo thumbnail từ video để tiết kiệm bandwidth
 */

import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { generateImageThumbnail } from './storageOptimization';

/**
 * Generate thumbnail from video at specific time
 * Tạo thumbnail từ video tại thời điểm cụ thể (mặc định: 1 giây)
 */
export async function generateVideoThumbnail(
  videoUri: string,
  options: {
    time?: number; // Time in seconds (default: 1s)
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): Promise<string | null> {
  try {
    const {
      time = 1, // Default: 1 second
      width = 400,
      height = 400,
      quality = 0.75,
    } = options;

    // Create a temporary video component to capture frame
    // Note: expo-av doesn't have direct frame extraction API
    // We'll use a workaround with Video component and canvas
    
    // For now, we'll use a simpler approach:
    // 1. Load video and seek to time
    // 2. Capture frame using expo-av's onLoad callback
    // 3. Convert to image
    
    // Since expo-av doesn't support direct frame extraction,
    // we'll need to use a different approach:
    // Option 1: Use expo-video-thumbnails (if available)
    // Option 2: Use native module
    // Option 3: Generate on server side
    
    // For React Native, the best approach is to:
    // 1. Use expo-video-thumbnails package (if available)
    // 2. Or generate thumbnail on server when video is uploaded
    // 3. Or use first frame of video as thumbnail
    
    // Temporary solution: Return null and let the upload service handle it
    // The upload service should require thumbnail to be provided
    console.warn('Video thumbnail generation not fully implemented. Please provide thumbnail when uploading video.');
    return null;
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    return null;
  }
}

/**
 * Generate thumbnail from video using first frame
 * Sử dụng frame đầu tiên của video làm thumbnail
 */
export async function generateVideoThumbnailFromFirstFrame(
  videoUri: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): Promise<string | null> {
  return generateVideoThumbnail(videoUri, { time: 0, ...options });
}

/**
 * Check if video has thumbnail
 */
export function hasVideoThumbnail(thumbnailUrl: string | null | undefined): boolean {
  return !!thumbnailUrl && thumbnailUrl.trim() !== '';
}

