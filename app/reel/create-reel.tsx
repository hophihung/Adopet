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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, X, Send, AlertCircle } from 'lucide-react-native';
import { ReelService } from '@/src/features/reels/services/reel.service';
import { ContentModerationService } from '@/src/features/reels/services/contentModeration.service';

export default function CreateReelScreen() {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [moderating, setModerating] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  // Pick video from library
  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện video');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // Max 60 seconds
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        setVideoUri(asset.uri);
        
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

  // Upload video to Supabase Storage
  const uploadVideo = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Convert base64 to ArrayBuffer
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const fileName = `reels/${user?.id}-${Date.now()}.mp4`;

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

      return data.publicUrl;
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Lỗi upload video', err.message || 'Không thể upload video');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Upload thumbnail
  const uploadThumbnail = async (uri: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const fileName = `reels/thumbnails/${user?.id}-${Date.now()}.jpg`;

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
    if (!videoUri) {
      Alert.alert('Thông báo', 'Vui lòng chọn video.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    setLoading(true);

    try {
      // Upload video
      const videoUrl = await uploadVideo(videoUri);
      if (!videoUrl) {
        return;
      }

      // Upload thumbnail
      let thumbnailUrl = null;
      if (thumbnailUri) {
        thumbnailUrl = await uploadThumbnail(thumbnailUri);
      }

      // Moderate content
      const canPost = await moderateContent(thumbnailUrl || videoUrl, videoUrl);
      if (!canPost) {
        // Delete uploaded video if moderation fails
        // TODO: Implement cleanup
        return;
      }

      // Create reel
      const reel = await ReelService.create({
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || undefined,
        caption: caption.trim() || undefined,
        duration: 60, // TODO: Get actual duration from video
      });

      // Apply moderation result
      const moderationResult = await ContentModerationService.moderateContent(
        thumbnailUrl || videoUrl,
        videoUrl
      );
      await ContentModerationService.applyModerationResult(reel.id, moderationResult);

      Alert.alert('Thành công', 'Reel đã được đăng tải và đang được kiểm duyệt.');
      setCaption('');
      setVideoUri(null);
      setThumbnailUri(null);
      router.back();
    } catch (err: any) {
      console.error('Post error:', err);
      Alert.alert('Lỗi', err.message || 'Không thể đăng reel');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(videoUri) && !loading && !uploading && !moderating;

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
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Video</Text>
          {videoUri ? (
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
                Tối đa 60 giây • Tối đa 100MB
              </Text>
            </TouchableOpacity>
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Đăng Reel</Text>
          )}
        </TouchableOpacity>
      </View>
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





