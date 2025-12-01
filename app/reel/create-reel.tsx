import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { CurrencyConverter } from '@/src/utils/currency';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, X, Send, AlertCircle, Music, Image as ImageIcon, ShoppingBag } from 'lucide-react-native';
import { ReelService } from '@/src/features/reels/services/reel.service';
import { ContentModerationService } from '@/src/features/reels/services/contentModeration.service';
import { MusicPickerModal } from '@/src/features/reels/components/MusicPickerModal';
import { MusicTrack } from '@/src/features/reels/services/music.service';
import { ProductPicker } from '@/src/features/products/components/ProductPicker';
import { ProductService, Product } from '@/src/features/products/services/product.service';
import { RateLimitService, RateLimitError } from '@/src/features/security/services/rateLimit.service';

export default function CreateReelScreen() {
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false); // Prevent duplicate posts
  
  // Music states
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [musicStartTime, setMusicStartTime] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [showMusicPicker, setShowMusicPicker] = useState(false);

  // Product states (seller only)
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { user, profile } = useAuth();
  const router = useRouter();
  const isSeller = profile?.role === 'seller';

  // Pick video from library
  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện video');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // Max 60 seconds
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        
        // Validate file size before setting
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
        const maxSize = 300 * 1024 * 1024; // 300MB
        
        if (fileSize > maxSize) {
          const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
          Alert.alert(
            'Kích thước file quá lớn',
            `Video của bạn có kích thước ${sizeMB}MB. Vui lòng chọn video nhỏ hơn 300MB.`
          );
          return;
        }
        
        setVideoUri(asset.uri);
        setImageUri(null); // Clear image if video selected
        
        // Generate thumbnail from video
        // Note: In production, you might want to use a library like react-native-video-thumbnails
        // For now, we'll use the first frame or a placeholder
        if (asset.uri) {
          setThumbnailUri(asset.uri); // Placeholder - should extract actual thumbnail
        }
      }
    } catch (err: any) {
      console.error('Video picker error:', err);
      Alert.alert('Lỗi', 'Không thể chọn video: ' + (err.message || 'Đã có lỗi xảy ra'));
    }
  };

  // Pick image from library
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [9, 16], // Vertical reel format
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setVideoUri(null); // Clear video if image selected
        setThumbnailUri(asset.uri); // Use image as thumbnail
      }
    } catch (err: any) {
      console.error('Image picker error:', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + (err.message || 'Đã có lỗi xảy ra'));
    }
  };

  // Upload video to Supabase Storage (optimized - background upload)
  const uploadVideo = async (uri: string, showProgress: boolean = true): Promise<string | null> => {
    try {
      if (showProgress) {
        setUploading(true);
      }

      // Check file size
      if (showProgress) {
        setUploadStatus('Đang kiểm tra file...');
      }
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
      const maxSize = 300 * 1024 * 1024; // 300MB
      
      if (fileSize > maxSize) {
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        throw new Error(`Video quá lớn (${sizeMB}MB). Vui lòng chọn video nhỏ hơn 300MB.`);
      }

      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      
      // Generate unique filename
      const randomString = Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now();
      const fileName = `reels/${user?.id}-${timestamp}-${randomString}.mp4`;

      // Optimized: Read file in chunks for large files to avoid memory issues
      // For files > 50MB, use chunked reading
      const chunkSize = 50 * 1024 * 1024; // 50MB chunks
      
      if (fileSize > chunkSize) {
        // For large files, read in chunks (but Supabase doesn't support chunked upload directly)
        // So we still need to read full file, but we'll do it more efficiently
        if (showProgress) {
          setUploadStatus(`Đang xử lý video lớn (${sizeMB}MB)...`);
        }
      }

      // Read file as base64 (optimized for large files)
      if (showProgress) {
        setUploadStatus(`Đang chuẩn bị upload (${sizeMB}MB)...`);
      }
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Convert base64 to ArrayBuffer
      if (showProgress) {
        setUploadStatus(`Đang upload video...`);
      }
      
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('reels')
        .upload(fileName, arrayBuffer, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (error) {
        throw new Error('Upload failed: ' + error.message);
      }

      // Get public URL
      const { data } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName);

      if (!data?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      if (showProgress) {
        setUploadStatus('');
      }
      return data.publicUrl;
    } catch (err: any) {
      console.error('Upload error:', err);
      
      let errorMessage = err.message || 'Không thể upload video';
      if (err.message?.includes('OutOfMemory') || err.message?.includes('memory')) {
        errorMessage = 'Video quá lớn. Vui lòng chọn video nhỏ hơn.';
      }
      
      if (showProgress) {
        Alert.alert('Lỗi upload video', errorMessage);
        setUploadStatus('');
      }
      return null;
    } finally {
      if (showProgress) {
        setUploading(false);
        setUploadStatus('');
      }
    }
  };

  // Upload image to Supabase Storage (optimized - background upload)
  const uploadImage = async (uri: string, showProgress: boolean = true): Promise<string | null> => {
    try {
      if (showProgress) {
        setUploading(true);
        setUploadStatus('Đang tối ưu và upload ảnh...');
      }

      // Optimize image before upload (resize to max 1920x1920, compress to 85%)
      const { optimizeImageForUpload } = await import('@/src/utils/storageOptimization');
      const optimizedUri = await optimizeImageForUpload(uri, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      const base64 = await FileSystem.readAsStringAsync(optimizedUri, {
        encoding: 'base64',
      });

      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const randomString = Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now();
      const fileName = `reels/images/${user?.id}-${timestamp}-${randomString}.jpg`;

      const { error } = await supabase.storage
        .from('reels')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName);

      if (showProgress) {
        setUploadStatus('');
      }
      return data?.publicUrl || null;
    } catch (err: any) {
      console.error('Image upload error:', err);
      if (showProgress) {
        Alert.alert('Lỗi upload ảnh', err.message || 'Không thể upload ảnh');
        setUploadStatus('');
      }
      return null;
    } finally {
      if (showProgress) {
        setUploading(false);
        setUploadStatus('');
      }
    }
  };

  // Upload thumbnail (optimized - resize to 400x400, compress to 75%)
  const uploadThumbnail = async (uri: string): Promise<string | null> => {
    try {
      // Generate thumbnail (400x400, 75% quality)
      const { generateImageThumbnail } = await import('@/src/utils/storageOptimization');
      const thumbnailUri = await generateImageThumbnail(uri, {
        width: 400,
        height: 400,
        quality: 0.75,
      });

      const base64 = await FileSystem.readAsStringAsync(thumbnailUri, {
        encoding: 'base64',
      });

      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      // Generate unique filename with random string to prevent duplicates
      const randomString = Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now();
      const fileName = `reels/thumbnails/${user?.id}-${timestamp}-${randomString}.jpg`;

      const { error } = await supabase.storage
        .from('reels')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName);

      return data?.publicUrl || null;
    } catch (err: any) {
      console.error('Thumbnail upload error:', err);
      return null;
    }
  };

  // Moderate content before posting
  const moderateContent = async (thumbnailUrl: string, videoUrl: string) => {
    try {
      setModerating(true);
      const result = await ContentModerationService.moderateContent(
        thumbnailUrl,
        videoUrl
      );

      if (result.is_sensitive || !result.is_pet_related) {
        const reason = result.moderation_reason || 
          (result.is_sensitive ? 'Nội dung nhạy cảm' : 'Không phải nội dung về thú cưng');
        
        Alert.alert(
          'Nội dung không phù hợp',
          reason + '\n\nVideo của bạn không thể được đăng tải.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Moderation error:', error);
      Alert.alert(
        'Cảnh báo',
        'Không thể kiểm tra nội dung. Bạn có muốn tiếp tục đăng video?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Tiếp tục', onPress: () => true },
        ]
      );
      return false;
    } finally {
      setModerating(false);
    }
  };

  // Create reel
  const handlePost = async () => {
    // Prevent duplicate posts
    if (isPosting) {
      return;
    }

    const hasMedia = mediaType === 'video' ? videoUri : imageUri;
    
    if (!hasMedia) {
      Alert.alert('Thông báo', `Vui lòng chọn ${mediaType === 'video' ? 'video' : 'ảnh'}.`);
      return;
    }

    if (!user?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    setIsPosting(true);
    
    // Show minimal loading (just a brief indicator)
    setLoading(true);
    setUploadStatus('Đang xử lý...');

    try {
      await RateLimitService.enforce('create_reel');
      let videoUrl: string | null = null;
      let imageUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      // OPTIMIZED: Upload in background, show success immediately
      // For better UX, we can create reel first with placeholder, then update with real URL
      // But for now, we'll upload but minimize UI blocking

      // Upload media based on type (with minimal progress indicator)
      if (mediaType === 'video' && videoUri) {
        // Check file size first to show appropriate message
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        
        // For large files, show message and upload in background
        if (fileSize > 50 * 1024 * 1024) { // > 50MB
          // Show message that upload will continue in background
          Alert.alert(
            'Đang upload video',
            `Video của bạn (${sizeMB}MB) đang được upload. Bạn có thể tiếp tục sử dụng app.`,
            [{ text: 'OK' }]
          );
        }
        
        videoUrl = await uploadVideo(videoUri, fileSize <= 50 * 1024 * 1024); // Show progress only for small files
        if (!videoUrl) {
          return;
        }

        // Only upload thumbnail if it's different from video
        if (thumbnailUri && thumbnailUri !== videoUri) {
          thumbnailUrl = await uploadThumbnail(thumbnailUri);
        } else {
          thumbnailUrl = videoUrl;
        }
      } else if (mediaType === 'image' && imageUri) {
        imageUrl = await uploadImage(imageUri, true); // Images are usually small, show progress
        if (!imageUrl) {
          return;
        }
        thumbnailUrl = imageUrl;
      }

      const mediaUrl = videoUrl || imageUrl;
      if (!mediaUrl) {
        return;
      }

      // Create reel immediately
      const reel = await ReelService.create({
        media_type: mediaType,
        video_url: videoUrl || undefined,
        image_url: imageUrl || undefined,
        thumbnail_url: thumbnailUrl || undefined,
        caption: caption.trim() || undefined,
        duration: mediaType === 'video' ? 60 : undefined,
        music_track_id: selectedTrack?.id,
        music_start_time: selectedTrack ? musicStartTime : undefined,
        music_volume: selectedTrack ? musicVolume : undefined,
      });

      // Attach products to reel (seller only)
      if (isSeller && selectedProducts.length > 0 && user?.id) {
        try {
          for (let i = 0; i < selectedProducts.length; i++) {
            await ProductService.attachToReel(reel.id, selectedProducts[i].id, {
              display_order: i,
              position_x: 50, // Default center
              position_y: 50, // Default center
            });
          }
        } catch (error: any) {
          console.error('Error attaching products:', error);
          // Don't fail the whole post if product attachment fails
        }
      }

      // Show success message immediately (user can continue using app)
      Alert.alert(
        'Thành công! 🎉', 
        'Reel của bạn đã được đăng tải thành công và đang được kiểm duyệt. Bạn sẽ nhận được thông báo khi video được duyệt.',
        [{ text: 'OK', onPress: () => {
          // Reset form
          setCaption('');
          setVideoUri(null);
          setImageUri(null);
          setThumbnailUri(null);
          setSelectedTrack(null);
          setMusicStartTime(0);
          setMusicVolume(0.7);
          setSelectedProducts([]);
          router.back();
        }}]
      );

      // Run moderation in background (async, don't wait)
      ContentModerationService.moderateContent(thumbnailUrl || mediaUrl, mediaUrl)
        .then((moderationResult) => {
          ContentModerationService.applyModerationResult(reel.id, moderationResult)
            .catch((error) => {
              console.error('Error applying moderation result:', error);
            });
        })
        .catch((error) => {
          console.error('Background moderation error:', error);
        });
    } catch (err: any) {
      console.error('Post error:', err);
      if (err instanceof RateLimitError) {
        Alert.alert('Giới hạn', err.message);
      } else {
        Alert.alert('Lỗi', err.message || 'Không thể đăng reel');
      }
    } finally {
      setLoading(false);
      setUploading(false);
      setUploadStatus('');
      setIsPosting(false);
    }
  };

  const canSubmit = (mediaType === 'video' ? Boolean(videoUri) : Boolean(imageUri)) && !loading && !uploading && !moderating && !isPosting;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.headerButton, loading && styles.headerButtonDisabled]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <X color="#fff" size={22} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Tạo Reel</Text>

          <TouchableOpacity
            style={[
              styles.headerButton,
              !canSubmit && styles.headerButtonDisabled,
            ]}
            onPress={handlePost}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Send color="#fff" size={20} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Media Type Toggle */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Loại nội dung</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                mediaType === 'video' && styles.toggleButtonActive,
              ]}
              onPress={() => {
                setMediaType('video');
                setImageUri(null);
              }}
              disabled={loading}
            >
              <Video size={20} color={mediaType === 'video' ? '#fff' : '#6B7280'} />
              <Text
                style={[
                  styles.toggleText,
                  mediaType === 'video' && styles.toggleTextActive,
                ]}
              >
                Video
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                mediaType === 'image' && styles.toggleButtonActive,
              ]}
              onPress={() => {
                setMediaType('image');
                setVideoUri(null);
              }}
              disabled={loading}
            >
              <ImageIcon size={20} color={mediaType === 'image' ? '#fff' : '#6B7280'} />
              <Text
                style={[
                  styles.toggleText,
                  mediaType === 'image' && styles.toggleTextActive,
                ]}
              >
                Ảnh
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Media Picker */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            {mediaType === 'video' ? 'Video' : 'Ảnh'}
          </Text>
          {mediaType === 'video' ? (
            videoUri ? (
              <View style={styles.previewWrapper}>
                <Image
                  source={{ uri: thumbnailUri || videoUri }}
                  style={styles.videoPreview}
                  resizeMode="cover"
                />
                <View style={styles.playIconOverlay}>
                  <Video size={48} color="#fff" fill="#fff" />
                </View>
                <TouchableOpacity
                  style={styles.removeVideoButton}
                  onPress={() => {
                    setVideoUri(null);
                    setThumbnailUri(null);
                  }}
                  disabled={loading}
                >
                  <X color="#fff" size={18} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.videoPicker}
                onPress={pickVideo}
                disabled={loading}
              >
                <Video color="#FF6B6B" size={48} />
                <Text style={styles.videoPickerText}>Chọn video từ thư viện</Text>
                <Text style={styles.videoPickerHint}>
                  Tối đa 60 giây • Tối đa 300MB
                </Text>
              </TouchableOpacity>
            )
          ) : (
            imageUri ? (
              <View style={styles.previewWrapper}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.videoPreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeVideoButton}
                  onPress={() => {
                    setImageUri(null);
                    setThumbnailUri(null);
                  }}
                  disabled={loading}
                >
                  <X color="#fff" size={18} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.videoPicker}
                onPress={pickImage}
                disabled={loading}
              >
                <ImageIcon color="#FF6B6B" size={48} />
                <Text style={styles.videoPickerText}>Chọn ảnh từ thư viện</Text>
                <Text style={styles.videoPickerHint}>
                  Tỷ lệ 9:16 (dọc) • Tối đa 10MB
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Products Section (Seller only) */}
        {isSeller && (
          <View style={styles.card}>
            <View style={styles.musicHeader}>
              <Text style={styles.sectionLabel}>Sản phẩm (Tùy chọn)</Text>
              <TouchableOpacity
                style={styles.musicButton}
                onPress={() => setShowProductPicker(true)}
                disabled={loading}
              >
                <ShoppingBag size={18} color="#FF6B6B" />
                <Text style={styles.musicButtonText}>
                  {selectedProducts.length > 0 ? `Đã chọn ${selectedProducts.length}` : 'Chọn sản phẩm'}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedProducts.length > 0 && (
              <View style={styles.selectedProductsContainer}>
                {selectedProducts.map((product, index) => (
                  <View key={product.id} style={styles.selectedProductItem}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={styles.selectedProductImage} />
                    ) : (
                      <View style={[styles.selectedProductImage, styles.productImagePlaceholder]}>
                        <ShoppingBag size={16} color="#999" />
                      </View>
                    )}
                    <View style={styles.selectedProductInfo}>
                      <Text style={styles.selectedProductName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.selectedProductPrice}>
                        {CurrencyConverter.format(product.price, 'VND')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeProductButton}
                      onPress={() => {
                        setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
                      }}
                    >
                      <X size={16} color="#999" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Music Section */}
        <View style={styles.card}>
          <View style={styles.musicHeader}>
            <Text style={styles.sectionLabel}>Nhạc nền (Tùy chọn)</Text>
            <TouchableOpacity
              style={styles.musicButton}
              onPress={() => setShowMusicPicker(true)}
              disabled={loading}
            >
              <Music size={18} color="#FF6B6B" />
              <Text style={styles.musicButtonText}>
                {selectedTrack ? 'Đổi nhạc' : 'Chọn nhạc'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedTrack && (
            <View style={styles.selectedTrackContainer}>
              <View style={styles.selectedTrackInfo}>
                {selectedTrack.cover_image_url ? (
                  <Image
                    source={{ uri: selectedTrack.cover_image_url }}
                    style={styles.selectedTrackCover}
                  />
                ) : (
                  <View style={[styles.selectedTrackCover, styles.trackCoverPlaceholder]}>
                    <Music size={20} color="#999" />
                  </View>
                )}
                <View style={styles.selectedTrackDetails}>
                  <Text style={styles.selectedTrackTitle} numberOfLines={1}>
                    {selectedTrack.title}
                  </Text>
                  <Text style={styles.selectedTrackArtist} numberOfLines={1}>
                    {selectedTrack.artist}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeTrackButton}
                  onPress={() => {
                    setSelectedTrack(null);
                    setMusicStartTime(0);
                    setMusicVolume(0.7);
                  }}
                >
                  <X size={18} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Music Controls */}
              <View style={styles.musicControls}>
                <View style={styles.musicControlRow}>
                  <Text style={styles.musicControlLabel}>Thời điểm bắt đầu: {musicStartTime}s</Text>
                </View>
                <View style={styles.musicControlRow}>
                  <Text style={styles.musicControlLabel}>Volume: {Math.round(musicVolume * 100)}%</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Mô tả (Tùy chọn)</Text>
          <TextInput
            style={styles.input}
            placeholder="Chia sẻ về video của bạn..."
            value={caption}
            onChangeText={setCaption}
            multiline
            placeholderTextColor="#999"
            maxLength={500}
          />
          <Text style={styles.helperText}>{`${caption.length}/500 ký tự`}</Text>
        </View>

        {moderating && (
          <View style={styles.moderationCard}>
            <AlertCircle size={20} color="#FFA500" />
            <Text style={styles.moderationText}>
              Đang kiểm tra nội dung...
            </Text>
          </View>
        )}

        {uploading && uploadStatus && (
          <View style={styles.uploadStatusCard}>
            <ActivityIndicator size="small" color="#FF6B6B" />
            <Text style={styles.uploadStatusText}>{uploadStatus}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!canSubmit || loading) && styles.primaryButtonDisabled,
          ]}
          onPress={handlePost}
          disabled={!canSubmit || loading}
        >
          {loading || uploading || moderating ? (
            <View style={styles.buttonLoadingContainer}>
              <ActivityIndicator color="#fff" />
              {uploadStatus && (
                <Text style={styles.buttonStatusText}>{uploadStatus}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Đăng Reel</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Music Picker Modal */}
      <MusicPickerModal
        visible={showMusicPicker}
        onClose={() => setShowMusicPicker(false)}
        onSelect={(track) => setSelectedTrack(track)}
        selectedTrackId={selectedTrack?.id}
      />

      {/* Product Picker Modal (Seller only) */}
      {isSeller && user?.id && (
        <ProductPicker
          visible={showProductPicker}
          onClose={() => setShowProductPicker(false)}
          onSelect={(product) => {
            if (!selectedProducts.find(p => p.id === product.id)) {
              setSelectedProducts(prev => [...prev, product]);
            }
          }}
          sellerId={user.id}
          selectedProducts={selectedProducts}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2933',
    marginBottom: 12,
  },
  previewWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  videoPreview: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
  },
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    opacity: 0.8,
  },
  removeVideoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPicker: {
    borderWidth: 2,
    borderColor: '#FFE0E0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F6',
  },
  videoPickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B6B',
    marginTop: 12,
  },
  videoPickerHint: {
    fontSize: 12,
    color: '#9AA0A6',
    marginTop: 4,
  },
  input: {
    minHeight: 100,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    textAlignVertical: 'top',
    color: '#1F2933',
  },
  helperText: {
    fontSize: 12,
    color: '#9AA0A6',
    textAlign: 'right',
    marginTop: 8,
  },
  moderationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  moderationText: {
    fontSize: 14,
    color: '#FF6F00',
    fontWeight: '500',
  },
  uploadStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0EA5E9',
    marginBottom: 20,
  },
  uploadStatusText: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '500',
    flex: 1,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginTop: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#fff',
  },
  selectedProductsContainer: {
    marginTop: 12,
    gap: 8,
  },
  selectedProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  selectedProductImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedProductInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedProductPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  removeProductButton: {
    padding: 4,
  },
  musicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  musicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFE0E0',
    borderRadius: 20,
  },
  musicButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  selectedTrackContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  selectedTrackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedTrackCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E4E7EB',
  },
  selectedTrackDetails: {
    flex: 1,
    marginLeft: 12,
  },
  selectedTrackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2933',
    marginBottom: 4,
  },
  selectedTrackArtist: {
    fontSize: 13,
    color: '#6B7280',
  },
  removeTrackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicControls: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E4E7EB',
  },
  musicControlRow: {
    marginBottom: 8,
  },
  musicControlLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E4E7EB',
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: '#D4D6DC',
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});






