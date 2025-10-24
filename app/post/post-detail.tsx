import { PostCommentService } from '@/src/features/posts/services/PostComment.Service';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

/* ============================================================
   🧩 TypeScript Interfaces
   ============================================================ */

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: Profile | Profile[] | null;
}

/* ============================================================
   💬 Component
   ============================================================ */

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ postId: string }>();
  const postId = params.postId;
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  const fetchComments = async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const data = await PostCommentService.getByPostId(postId);
      setComments(data || []);
    } catch (error) {
      console.error('❌ Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddComment = async () => {
    if (!content.trim() || !postId || !currentUserId) return;
    try {
      await PostCommentService.create(postId, currentUserId, content);
      setContent('');
      fetchComments();
    } catch (error) {
      console.error('❌ Error adding comment:', error);
    }
  }

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const getProfileData = (profiles: Profile | Profile[] | null) => {
    if (!profiles) return { full_name: 'Ẩn danh', avatar_url: null };
    if (Array.isArray(profiles)) return profiles[0] || { full_name: 'Ẩn danh', avatar_url: null };
    return profiles;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5A75" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Comments</Text>
      
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const profile = getProfileData(item.profiles);
          return (
            <View style={styles.commentCard}>
              <Text style={styles.userName}>{profile.full_name || 'Ẩn danh'}</Text>
              <Text style={styles.commentText}>{item.content}</Text>
              <Text style={styles.timestamp}>
                {new Date(item.created_at).toLocaleString('vi-VN')}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Chưa có bình luận nào</Text>
        }
        contentContainerStyle={styles.listContent}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Viết bình luận..."
          value={content}
          onChangeText={setContent}
          style={styles.input}
          multiline
        />
        <Button title="Gửi" onPress={handleAddComment} disabled={!content.trim()} />
      </View>
    </View>
  );
}

/* ============================================================
   🎨 Styles
   ============================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF5A75',
    marginBottom: 16,
    paddingTop: 40,
  },
  listContent: {
    flexGrow: 1,
  },
  commentCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5A75',
  },
  userName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 14,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    minHeight: 60,
  },
});
