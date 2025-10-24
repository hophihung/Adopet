import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
// @ts-ignore
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images','videos'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // ☁️ Upload ảnh lên Supabase Storage
  const uploadImage = async (uri: string) => {
  try {
    // 📸 Đọc file dưới dạng base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    
    // Chuyển base64 thành ArrayBuffer
    const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const fileName = `${user?.id}-${Date.now()}.jpg`;

    // ☁️ Upload lên Supabase Storage
    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    // 🔗 Lấy public URL
    const { data: urlData  } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('Upload error:', err);
    Alert.alert('Lỗi upload ảnh', err.message);
    return null;
  }
};

  // 🚀 Đăng bài viết
  const handlePost = async () => {
    if (!content && !image) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung hoặc chọn ảnh.');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const { error } = await supabase.from('posts').insert([
        {
          user_id: user?.id,
          content,
          image_url: imageUrl,
          like_count: 0,
          comment_count: 0,
        },
      ]);

      if (error) throw error;

      Alert.alert('Thành công', 'Bài viết đã được đăng.');
      setContent('');
      setImage(null);
      router.back(); // quay lại trang community
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
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
      />

      {image && (
        <Image source={{ uri: image }} style={styles.imagePreview} />
      )}

      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Chọn ảnh</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#2196f3' }]}
        onPress={handlePost}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng bài</Text>}
      </TouchableOpacity>
    </View>
  );
};

// 🎨 Style
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
