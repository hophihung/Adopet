/**
 * Content Moderation Service
 * Phát hiện ảnh/video nhạy cảm hoặc không phải pet
 * 
 * Sử dụng:
 * - Google Cloud Vision API (SafeSearch)
 * - Hoặc Clarifai Moderation API
 * - Hoặc custom model
 */

interface ModerationResult {
  isSafe: boolean;
  isPet: boolean;
  confidence: number;
  reasons: string[];
  details?: {
    adult?: number;
    violence?: number;
    racy?: number;
    medical?: number;
    spoof?: number;
    petConfidence?: number;
  };
}

interface ModerationOptions {
  apiKey?: string;
  useGoogleVision?: boolean;
  useClarifai?: boolean;
  threshold?: number; // 0-1, độ chắc chắn tối thiểu
}

class ContentModerationService {
  private apiKey: string | null = null;
  private useGoogleVision: boolean = true;
  private useClarifai: boolean = false;
  private threshold: number = 0.7;

  constructor(options?: ModerationOptions) {
    this.apiKey = options?.apiKey || process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || null;
    this.useGoogleVision = options?.useGoogleVision ?? true;
    this.useClarifai = options?.useClarifai ?? false;
    this.threshold = options?.threshold ?? 0.7;
  }

  /**
   * Moderate image - kiểm tra ảnh có nhạy cảm hoặc không phải pet
   */
  async moderateImage(imageUri: string): Promise<ModerationResult> {
    try {
      // Convert image to base64
      const base64Image = await this.imageToBase64(imageUri);

      if (this.useGoogleVision && this.apiKey) {
        return await this.moderateWithGoogleVision(base64Image);
      } else if (this.useClarifai) {
        return await this.moderateWithClarifai(base64Image);
      } else {
        // Fallback: Basic heuristic check
        return await this.basicModeration(imageUri);
      }
    } catch (error) {
      console.error('Content moderation error:', error);
      // Return safe result if moderation fails (fail open)
      return {
        isSafe: true,
        isPet: true,
        confidence: 0.5,
        reasons: ['Moderation service unavailable'],
      };
    }
  }

  /**
   * Moderate video - kiểm tra video có nhạy cảm hoặc không phải pet
   * Note: Video moderation thường cần extract frames và check từng frame
   */
  async moderateVideo(videoUri: string): Promise<ModerationResult> {
    try {
      // For now, check thumbnail/first frame
      // In production, you might want to extract multiple frames
      const thumbnail = await this.extractVideoThumbnail(videoUri);
      if (thumbnail) {
        return await this.moderateImage(thumbnail);
      }

      // Fallback
      return {
        isSafe: true,
        isPet: true,
        confidence: 0.5,
        reasons: ['Video moderation not fully implemented'],
      };
    } catch (error) {
      console.error('Video moderation error:', error);
      return {
        isSafe: true,
        isPet: true,
        confidence: 0.5,
        reasons: ['Video moderation service unavailable'],
      };
    }
  }

  /**
   * Google Cloud Vision API - SafeSearch Detection
   */
  private async moderateWithGoogleVision(base64Image: string): Promise<ModerationResult> {
    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Image,
                },
                features: [
                  {
                    type: 'SAFE_SEARCH_DETECTION',
                    maxResults: 1,
                  },
                  {
                    type: 'LABEL_DETECTION',
                    maxResults: 10,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.responses?.[0];

      if (!result) {
        throw new Error('No response from Google Vision API');
      }

      // Check SafeSearch
      const safeSearch = result.safeSearchAnnotation || {};
      const adult = this.getLikelihoodScore(safeSearch.adult);
      const violence = this.getLikelihoodScore(safeSearch.violence);
      const racy = this.getLikelihoodScore(safeSearch.racy);
      const medical = this.getLikelihoodScore(safeSearch.medical);
      const spoof = this.getLikelihoodScore(safeSearch.spoof);

      // Check if it's a pet
      const labels = result.labelAnnotations || [];
      const petLabels = labels.filter((label: any) =>
        ['dog', 'cat', 'pet', 'animal', 'puppy', 'kitten', 'bird', 'rabbit', 'hamster'].some(
          (petWord) => label.description?.toLowerCase().includes(petWord)
        )
      );
      const petConfidence = petLabels.length > 0 
        ? Math.max(...petLabels.map((l: any) => l.score || 0))
        : 0;

      const isSafe = adult < 0.5 && violence < 0.5 && racy < 0.5;
      const isPet = petConfidence >= this.threshold;

      const reasons: string[] = [];
      if (!isSafe) {
        if (adult >= 0.5) reasons.push('Nội dung người lớn');
        if (violence >= 0.5) reasons.push('Nội dung bạo lực');
        if (racy >= 0.5) reasons.push('Nội dung gợi cảm');
        if (medical >= 0.5) reasons.push('Nội dung y tế');
        if (spoof >= 0.5) reasons.push('Nội dung giả mạo');
      }
      if (!isPet) {
        reasons.push('Không phải ảnh pet');
      }

      return {
        isSafe,
        isPet,
        confidence: Math.max(petConfidence, isSafe ? 1 : 0),
        reasons,
        details: {
          adult,
          violence,
          racy,
          medical,
          spoof,
          petConfidence,
        },
      };
    } catch (error) {
      console.error('Google Vision API error:', error);
      throw error;
    }
  }

  /**
   * Clarifai Moderation API
   */
  private async moderateWithClarifai(base64Image: string): Promise<ModerationResult> {
    // TODO: Implement Clarifai API
    // This is a placeholder
    return {
      isSafe: true,
      isPet: true,
      confidence: 0.5,
      reasons: ['Clarifai not implemented'],
    };
  }

  /**
   * Basic heuristic moderation (fallback)
   */
  private async basicModeration(imageUri: string): Promise<ModerationResult> {
    // Simple check - in production, you might use a local ML model
    return {
      isSafe: true,
      isPet: true,
      confidence: 0.5,
      reasons: ['Basic moderation - no API key provided'],
    };
  }

  /**
   * Convert image to base64
   */
  private async imageToBase64(imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data:image/...;base64, prefix
          const base64Data = base64.split(',')[1] || base64;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  }

  /**
   * Extract thumbnail from video (placeholder)
   */
  private async extractVideoThumbnail(videoUri: string): Promise<string | null> {
    // TODO: Implement video thumbnail extraction
    // In React Native, you might use expo-av or react-native-video
    return null;
  }

  /**
   * Convert Google Vision likelihood to score (0-1)
   */
  private getLikelihoodScore(likelihood: string): number {
    const scores: Record<string, number> = {
      UNKNOWN: 0,
      VERY_UNLIKELY: 0.1,
      UNLIKELY: 0.3,
      POSSIBLE: 0.5,
      LIKELY: 0.7,
      VERY_LIKELY: 0.9,
    };
    return scores[likelihood] || 0;
  }
}

// Export singleton instance
export const contentModerationService = new ContentModerationService();

// Export class for custom instances
export default ContentModerationService;

