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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { ImagePlus, Send, X } from 'lucide-react-native';
import { RateLimitService, RateLimitError } from '@/src/features/security/services/rateLimit.service';

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  // 🖼 Chọn ảnh
  const pickImage = async () => {
    try {
      // Request permission to access media library
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImage(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('Image picker error:', err);
      Alert.alert(
        'Lỗi',
        'Không thể chọn ảnh: ' + (err.message || 'Đã có lỗi xảy ra')
      );
    }
  };

  // ☁️ Upload ảnh lên Supabase Storage (optimized)
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setLoading(true);

      // Optimize image before upload (resize to max 1920x1920, compress to 85%)
      const { optimizeImageForUpload } = await import('@/src/utils/storageOptimization');
      const optimizedUri = await optimizeImageForUpload(uri, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      // 📸 Đọc file dưới dạng base64
      const base64 = await FileSystem.readAsStringAsync(optimizedUri, {
        encoding: 'base64',
      });
      // Chuyển base64 thành ArrayBuffer
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const fileName = `${user?.id}-${Date.now()}.jpg`;

      // ☁️ Upload lên Supabase Storage
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true, // Changed to true to handle potential overwrites
        });

      if (error) {
        throw new Error('Upload failed: ' + error.message);
      }

      // 🔗 Lấy public URL
      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      if (!data?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return data.publicUrl;
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Lỗi upload ảnh', err.message || 'Không thể upload ảnh');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Đăng bài viết
  const handlePost = async () => {
    if (!content && !image) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung hoặc chọn ảnh.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    setLoading(true);

    try {
      await RateLimitService.enforce('create_post');
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
        if (!imageUrl) {
          // Dừng lại nếu upload ảnh thất bại
          return;
        }
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content,
        image_url: imageUrl,
        like_count: 0,
        comment_count: 0,
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error('Post creation failed: ' + error.message);
      }

      Alert.alert('Thành công', 'Bài viết đã được đăng.');
      setContent('');
      setImage(null);
      router.back();
    } catch (err: any) {
      console.error('Post error:', err);
      if (err instanceof RateLimitError) {
        Alert.alert('Giới hạn', err.message);
      } else {
        Alert.alert('Lỗi', err.message || 'Không thể đăng bài');
      }
    } finally {
      setLoading(false);
    }
  };

  const contentLength = content.trim().length;
  const isOverLimit = contentLength > 500;
  const canSubmit = Boolean(image || content.trim()) && !isOverLimit;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              loading && styles.headerButtonDisabled,
            ]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <X color="#fff" size={22} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Tạo bài viết</Text>

          <TouchableOpacity
            style={[
              styles.headerButton,
              !canSubmit && styles.headerButtonDisabled,
            ]}
            onPress={handlePost}
            disabled={loading || !canSubmit}
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
          <Text style={styles.sectionLabel}>Nội dung</Text>
          <TextInput
            style={styles.input}
            placeholder="Chia sẻ câu chuyện hoặc cảm xúc của bạn..."
            value={content}
            onChangeText={setContent}
            multiline
            placeholderTextColor="#999"
          />
          <Text
            style={[styles.helperText, isOverLimit && styles.helperTextError]}
          >
            {`${contentLength}/500 ký tự`}
          </Text>
          {isOverLimit && (
            <Text style={styles.limitError}>
              Nội dung không được vượt quá 500 ký tự.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionLabel}>Hình ảnh</Text>
            <Text style={styles.sectionHint}>Tùy chọn</Text>
          </View>

          {image ? (
            <View style={styles.previewWrapper}>
              <Image
                source={{ uri: image }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
                disabled={loading}
              >
                <X color="#fff" size={18} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={pickImage}
              disabled={loading}
            >
              <ImagePlus color="#FF6B6B" size={28} />
              <Text style={styles.imagePickerText}>Chọn ảnh từ thư viện</Text>
              <Text style={styles.imagePickerHint}>Dung lượng tối đa 5MB</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!canSubmit || loading) && styles.primaryButtonDisabled,
          ]}
          onPress={handlePost}
          disabled={loading || !canSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Đăng bài</Text>
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
  sectionHint: {
    fontSize: 13,
    color: '#9AA0A6',
    fontWeight: '500',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    minHeight: 140,
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
  helperTextError: {
    color: '#FF3B30',
  },
  previewWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 220,
  },
  removeImageButton: {
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
  imagePicker: {
    borderWidth: 2,
    borderColor: '#FFE0E0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F6',
  },
  imagePickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B6B',
    marginTop: 8,
  },
  imagePickerHint: {
    fontSize: 12,
    color: '#9AA0A6',
    marginTop: 4,
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
  limitError: {
    marginTop: 6,
    fontSize: 13,
    color: '#FF3B30',
  },
});
