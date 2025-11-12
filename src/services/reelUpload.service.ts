/**
 * Reel Upload Service
 * Upload video/ảnh cho reels với content moderation
 */

import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabaseClient';
import { contentModerationService } from './contentModeration.service';
import { Alert } from 'react-native';

interface UploadReelOptions {
  videoUri?: string;
  thumbnailUri?: string;
  caption?: string;
  petId?: string;
  sellerId: string;
  enableModeration?: boolean;
}

interface UploadResult {
  success: boolean;
  reelId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

class ReelUploadService {
  private bucket = 'reels';
  private maxVideoSize = 100 * 1024 * 1024; // 100MB
  private maxThumbnailSize = 5 * 1024 * 1024; // 5MB

  /**
   * Upload reel với content moderation
   */
  async uploadReel(options: UploadReelOptions): Promise<UploadResult> {
    const { videoUri, thumbnailUri, caption, petId, sellerId, enableModeration = true } = options;

    try {
      // Validate
      if (!videoUri && !thumbnailUri) {
        return {
          success: false,
          error: 'Cần có video hoặc thumbnail',
        };
      }

      // Content moderation
      if (enableModeration) {
        if (videoUri) {
          const videoModeration = await contentModerationService.moderateVideo(videoUri);
          if (!videoModeration.isSafe || !videoModeration.isPet) {
            return {
              success: false,
              error: `Nội dung không phù hợp: ${videoModeration.reasons.join(', ')}`,
            };
          }
        }

        if (thumbnailUri) {
          const imageModeration = await contentModerationService.moderateImage(thumbnailUri);
          if (!imageModeration.isSafe || !imageModeration.isPet) {
            return {
              success: false,
              error: `Ảnh không phù hợp: ${imageModeration.reasons.join(', ')}`,
            };
          }
        }
      }

      // Upload video
      let videoUrl: string | null = null;
      if (videoUri) {
        const videoResult = await this.uploadVideo(videoUri);
        if (!videoResult.success || !videoResult.url) {
          return {
            success: false,
            error: videoResult.error || 'Không thể upload video',
          };
        }
        videoUrl = videoResult.url;
      }

      // Upload thumbnail
      let thumbnailUrl: string | null = null;
      if (thumbnailUri) {
        const thumbnailResult = await this.uploadThumbnail(thumbnailUri);
        if (!thumbnailResult.success || !thumbnailResult.url) {
          return {
            success: false,
            error: thumbnailResult.error || 'Không thể upload thumbnail',
          };
        }
        thumbnailUrl = thumbnailResult.url;
      }

      // Create reel record
      const { data: reelData, error: reelError } = await supabase
        .from('reels')
        .insert({
          pet_id: petId || null,
          seller_id: sellerId,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          caption: caption || null,
          views_count: 0,
          likes_count: 0,
          comments_count: 0,
        })
        .select()
        .single();

      if (reelError) {
        // Cleanup uploaded files if reel creation fails
        if (videoUrl) {
          await this.deleteFile(videoUrl);
        }
        if (thumbnailUrl) {
          await this.deleteFile(thumbnailUrl);
        }
        throw reelError;
      }

      return {
        success: true,
        reelId: reelData.id,
        videoUrl: videoUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
      };
    } catch (error: any) {
      console.error('Upload reel error:', error);
      return {
        success: false,
        error: error.message || 'Không thể upload reel',
      };
    }
  }

  /**
   * Upload video file
   */
  private async uploadVideo(videoUri: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Check file size
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (fileInfo.exists && 'size' in fileInfo) {
        if (fileInfo.size > this.maxVideoSize) {
          return {
            success: false,
            error: `Video quá lớn. Tối đa ${this.maxVideoSize / 1024 / 1024}MB`,
          };
        }
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = videoUri.split('.').pop() || 'mp4';
      const fileName = `${timestamp}_${randomString}.${fileExtension}`;
      const filePath = `videos/${fileName}`;

      // Read file
      const fileData = await FileSystem.readAsStringAsync(videoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer
      const arrayBuffer = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(filePath, arrayBuffer, {
          contentType: `video/${fileExtension}`,
          upsert: false,
        });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(this.bucket).getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Không thể upload video',
      };
    }
  }

  /**
   * Upload thumbnail image
   */
  private async uploadThumbnail(thumbnailUri: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Check file size
      const fileInfo = await FileSystem.getInfoAsync(thumbnailUri);
      if (fileInfo.exists && 'size' in fileInfo) {
        if (fileInfo.size > this.maxThumbnailSize) {
          return {
            success: false,
            error: `Ảnh quá lớn. Tối đa ${this.maxThumbnailSize / 1024 / 1024}MB`,
          };
        }
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = thumbnailUri.split('.').pop() || 'jpg';
      const fileName = `${timestamp}_${randomString}.${fileExtension}`;
      const filePath = `thumbnails/${fileName}`;

      // Read file
      const fileData = await FileSystem.readAsStringAsync(thumbnailUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer
      const arrayBuffer = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(this.bucket).getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Không thể upload thumbnail',
      };
    }
  }

  /**
   * Delete file from storage
   */
  private async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract path from URL
      const urlParts = fileUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf(this.bucket) + 1).join('/');
      
      await supabase.storage.from(this.bucket).remove([filePath]);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}

// Export singleton instance
export const reelUploadService = new ReelUploadService();

// Export class for custom instances
export default ReelUploadService;

