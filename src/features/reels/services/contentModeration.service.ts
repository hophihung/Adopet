/**
 * Content Moderation Service
 * Sử dụng AI để nhận diện nội dung nhạy cảm và kiểm tra xem có phải pet không
 * 
 * Có thể tích hợp với:
 * - Google Cloud Vision API
 * - AWS Rekognition
 * - Azure Computer Vision
 * - OpenAI Vision API
 * - Custom ML model
 */

import { supabase } from '@/lib/supabase';

export interface ModerationResult {
  is_sensitive: boolean;
  is_pet_related: boolean;
  confidence_score: number;
  moderation_reason?: string;
}

export const ContentModerationService = {
  /**
   * Moderate video/image content
   * @param imageUrl URL của ảnh/video thumbnail để phân tích
   * @param videoUrl URL của video (optional, cho video analysis)
   */
  async moderateContent(
    imageUrl: string,
    videoUrl?: string
  ): Promise<ModerationResult> {
    try {
      // Option 1: Sử dụng Google Cloud Vision API
      // return await this.moderateWithGoogleVision(imageUrl);

      // Option 2: Sử dụng OpenAI Vision API
      // return await this.moderateWithOpenAI(imageUrl);

      // Option 3: Sử dụng Supabase Edge Function (recommended)
      return await this.moderateWithEdgeFunction(imageUrl, videoUrl);

      // Option 4: Fallback - basic validation
      // return this.basicValidation(imageUrl);
    } catch (error) {
      console.error('Content moderation error:', error);
      // Fallback: reject if error
      return {
        is_sensitive: true,
        is_pet_related: false,
        confidence_score: 0,
        moderation_reason: 'Lỗi khi phân tích nội dung',
      };
    }
  },

  /**
   * Moderate using Supabase Edge Function
   * Tạo edge function trong supabase/functions/moderate-content/
   */
  async moderateWithEdgeFunction(
    imageUrl: string,
    videoUrl?: string
  ): Promise<ModerationResult> {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        image_url: imageUrl,
        video_url: videoUrl,
      },
    });

    if (error) throw error;

    return {
      is_sensitive: data.is_sensitive || false,
      is_pet_related: data.is_pet_related || false,
      confidence_score: data.confidence_score || 0,
      moderation_reason: data.moderation_reason,
    };
  },

  /**
   * Moderate using Google Cloud Vision API
   * Cần setup Google Cloud credentials
   */
  async moderateWithGoogleVision(imageUrl: string): Promise<ModerationResult> {
    // TODO: Implement Google Vision API integration
    // This would use the SafeSearchDetection and LabelDetection features
    throw new Error('Google Vision API not implemented');
  },

  /**
   * Moderate using OpenAI Vision API
   * Cần OpenAI API key
   */
  async moderateWithOpenAI(imageUrl: string): Promise<ModerationResult> {
    // TODO: Implement OpenAI Vision API integration
    // This would use GPT-4 Vision to analyze content
    throw new Error('OpenAI Vision API not implemented');
  },

  /**
   * Basic validation (fallback)
   * Simple checks without AI
   */
  basicValidation(imageUrl: string): ModerationResult {
    // Basic checks: file extension, size, etc.
    // This is just a placeholder - real AI would be needed
    return {
      is_sensitive: false,
      is_pet_related: true, // Assume pet-related by default
      confidence_score: 50, // Low confidence for basic validation
      moderation_reason: 'Basic validation passed',
    };
  },

  /**
   * Apply moderation result to reel
   */
  async applyModerationResult(
    reelId: string,
    result: ModerationResult
  ): Promise<void> {
    const { error } = await supabase.rpc('moderate_reel_content', {
      reel_id_param: reelId,
      is_sensitive_param: result.is_sensitive,
      is_pet_related_param: result.is_pet_related,
      confidence_score_param: result.confidence_score,
      moderation_reason_param: result.moderation_reason,
    });

    if (error) throw error;
  },
};





