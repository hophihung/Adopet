/**
 * Storage Optimization Utilities
 * Tối ưu storage URLs để giảm Cached Egress
 */

import { supabase } from '@/lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Get optimized storage URL with cache headers
 * Note: Supabase Storage tự động set cache headers, nhưng chúng ta có thể optimize thêm
 */
export function getOptimizedStorageUrl(
  bucket: string,
  path: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  
  // Supabase Storage không hỗ trợ image transformations trực tiếp
  // Nếu cần, bạn có thể:
  // 1. Sử dụng Supabase Image Transformations (nếu có)
  // 2. Integrate với Cloudinary/Imgix
  // 3. Generate thumbnails khi upload
  
  let url = data.publicUrl;
  
  // TODO: Nếu có image transformation service, append query params
  // Ví dụ: url += `?w=${options?.width}&h=${options?.height}&q=${options?.quality}&f=${options?.format}`;
  
  return url;
}

/**
 * Get thumbnail URL for images
 * Ưu tiên thumbnail nếu có, nếu không thì dùng image gốc
 */
export function getThumbnailUrl(
  imageUrl: string | null | undefined,
  thumbnailUrl: string | null | undefined
): string | null {
  // Ưu tiên thumbnail (nhỏ hơn, tiết kiệm bandwidth)
  if (thumbnailUrl && thumbnailUrl.trim() !== '') {
    return thumbnailUrl.trim();
  }
  
  // Fallback về image gốc
  if (imageUrl && imageUrl.trim() !== '') {
    return imageUrl.trim();
  }
  
  return null;
}

/**
 * Check if URL is from Supabase Storage
 */
export function isSupabaseStorageUrl(url: string): boolean {
  if (!url) return false;
  
  // Check common Supabase Storage patterns
  return url.includes('supabase.co/storage') || 
         url.includes('supabase.in/storage') ||
         url.includes('/storage/v1/object/public/');
}

/**
 * Optimize image URL for display
 * - Use WebP format if possible (smaller file size)
 * - Add cache headers hint
 * - Resize if needed
 */
export function optimizeImageUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
): string {
  if (!url) return url;
  
  // Nếu là Supabase Storage URL và có image transformation service
  // thì append query params để resize on-the-fly
  // TODO: Implement khi có image transformation service
  
  return url;
}

/**
 * Prevent hotlinking by checking referer
 * Note: This is a client-side check, real protection should be on server/CDN
 */
export function checkRefererAllowed(referer: string | null): boolean {
  if (!referer) return true; // Direct access from app is allowed
  
  const allowedDomains = [
    'localhost',
    '127.0.0.1',
    'adopet.app', // Thay bằng domain của bạn
    'expo.dev',
    'expo.io',
  ];
  
  try {
    const refererUrl = new URL(referer);
    const refererDomain = refererUrl.hostname;
    
    // Check if domain is allowed
    return allowedDomains.some(domain => 
      refererDomain === domain || 
      refererDomain.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Resize and compress image before upload
 * Giảm kích thước file để tiết kiệm bandwidth và storage
 */
export async function optimizeImageForUpload(
  imageUri: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: ImageManipulator.SaveFormat;
  } = {}
): Promise<string> {
  try {
    const {
      maxWidth = 1920, // Max width for high-res images
      maxHeight = 1920, // Max height for high-res images
      quality = 0.85, // 85% quality (good balance)
      format = ImageManipulator.SaveFormat.JPEG,
    } = options;

    // Get original image dimensions
    const { Image } = await import('react-native');
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => resolve({ width, height }),
        reject
      );
    });

    // Calculate new dimensions maintaining aspect ratio
    let newWidth = dimensions.width;
    let newHeight = dimensions.height;

    if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
      const aspectRatio = dimensions.width / dimensions.height;
      
      if (dimensions.width > dimensions.height) {
        newWidth = Math.min(dimensions.width, maxWidth);
        newHeight = newWidth / aspectRatio;
      } else {
        newHeight = Math.min(dimensions.height, maxHeight);
        newWidth = newHeight * aspectRatio;
      }
    }

    // Only resize if needed
    if (newWidth !== dimensions.width || newHeight !== dimensions.height) {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: newWidth, height: newHeight } }],
        {
          compress: quality,
          format,
        }
      );
      
      return manipulatedImage.uri;
    }

    // If no resize needed, just compress
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      {
        compress: quality,
        format,
      }
    );

    return manipulatedImage.uri;
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Return original URI if optimization fails
    return imageUri;
  }
}

/**
 * Generate thumbnail for image
 * Tạo thumbnail nhỏ để hiển thị trong lists/grids
 */
export async function generateImageThumbnail(
  imageUri: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): Promise<string> {
  try {
    const {
      width = 400, // Thumbnail width
      height = 400, // Thumbnail height
      quality = 0.75, // Lower quality for thumbnails
    } = options;

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width, height } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipulatedImage.uri;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return imageUri;
  }
}

