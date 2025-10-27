import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct enum usage
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImage(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('Image picker error:', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + (err.message || 'Đã có lỗi xảy ra'));
    }
  };

  // ☁️ Upload ảnh lên Supabase Storage
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setLoading(true);
      
      // 📸 Đọc file dưới dạng base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
      // Chuyển base64 thành ArrayBuffer
      const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
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
      Alert.alert('Lỗi', err.message || 'Không thể đăng bài');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tạo bài viết mới</Text>

      <TextInput
        style={styles.input}
        placeholder="Bạn đang nghĩ gì..."
        value={content}
        onChangeText={setContent}
        multiline
        placeholderTextColor="#999"
      />

      {image && (
        <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="contain" />
      )}

      <TouchableOpacity style={styles.button} onPress={pickImage} disabled={loading}>
        <Text style={styles.buttonText}>Chọn ảnh</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: loading ? '#ccc' : '#2196f3' }]}
        onPress={handlePost}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Đăng bài</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});