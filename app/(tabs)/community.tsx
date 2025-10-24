import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Heart, MessageCircle, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ============================================================
   🧩 1. Kiểu dữ liệu
   ============================================================ */
interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
}

interface Post {
    id: string;
    user_id: string;
    content: string;
    image_url: string | null;
    like_count: number;
    comment_count: number;
    created_at: string;
    profiles: Profile | Profile[] | null;
}

interface LikePayload {
    id: string;
    post_id: string;
    user_id: string;
    created_at: string;
}

interface CommentPayload {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
}

/* ============================================================
   💬 2. Component chính
   ============================================================ */

const CommunityScreen: React.FC = () => {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [likePostMap, setLikePostMap] = useState<Map<string, string>>(new Map());

    // 🔄 Lấy posts
    const fetchPosts = async (): Promise<void> => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('posts')
                .select(`
          id,
          user_id,
          content,
          image_url,
          like_count,
          comment_count,
          created_at,
          profiles ( id, full_name, avatar_url )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPosts((data as Post[]) || []);
        } catch (err) {
            console.error('❌ Lỗi tải bài viết:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // 🔄 Update like count cho post
    const updatePostLikeCount = async (postId: string): Promise<void> => {
        const { count, error } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (!error && count !== null) {
            setPosts((prev) =>
                prev.map((p) => (p.id === postId ? { ...p, like_count: count } : p))
            );
        }
    };

    // 🔄 Update comment count cho post
    const updatePostCommentCount = async (postId: string): Promise<void> => {
        const { count, error } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (!error && count !== null) {
            setPosts((prev) =>
                prev.map((p) => (p.id === postId ? { ...p, comment_count: count } : p))
            );
        }
    };

    // ❤️ Like/unlike bài viết
    const handleLike = async (postId: string): Promise<void> => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: existingLike } = await supabase
                .from('post_likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (existingLike) {
                await supabase.from('post_likes').delete().eq('id', existingLike.id);
            } else {
                await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
            }
            // Realtime subscription sẽ update UI
        } catch (err) {
            console.error('❌ Error toggling like:', err);
        }
    };

    useEffect(() => {
        fetchPosts();

        // 🟢 Realtime posts
        const postsChannel = supabase
            .channel('public:posts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'posts' },
                (payload) => {
                    console.log('✅ New post:', payload.new);
                    void fetchPosts();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'posts' },
                (payload) => {
                    const updatedPost = payload.new as Post;
                    setPosts((prev) =>
                        prev.map((p) => (p.id === updatedPost.id ? { ...p, ...updatedPost } : p))
                    );
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'posts' },
                (payload) => {
                    const deletedPost = payload.old as { id: string };
                    setPosts((prev) => prev.filter((p) => p.id !== deletedPost.id));
                }
            )
            .subscribe();

        // 💬 Realtime comments
        const commentsChannel = supabase
            .channel('public:post_comments')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'post_comments' },
                (payload) => {
                    const obj = (payload.new ?? payload.old) as CommentPayload | null;
                    const postId = obj?.post_id;
                    if (postId) void updatePostCommentCount(postId);
                }
            )
            .subscribe();

        // ❤️ Realtime likes
        const likesChannel = supabase
            .channel('public:post_likes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'post_likes' },
                (payload) => {
                    const newLike = payload.new as Partial<LikePayload>;
                    if (!newLike?.id || !newLike?.post_id) return;

                    setLikePostMap((prev) => new Map(prev).set(newLike.id||'', newLike.post_id!));
                    void updatePostLikeCount(newLike.post_id);
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'post_likes' },
                (payload) => {
                    const oldLike = payload.old as Partial<LikePayload>;
                    if (!oldLike?.id) return;

                    setLikePostMap((prev) => {
                        const postId = prev.get(oldLike.id||'');
                        if (!postId) return prev;
                        void updatePostLikeCount(postId);
                        const newMap = new Map(prev);
                        newMap.delete(oldLike.id||'');
                        return newMap;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(postsChannel);
            supabase.removeChannel(commentsChannel);
            supabase.removeChannel(likesChannel);
        };
    }, []);

    const getProfile = (profiles: Profile | Profile[] | null): Profile | null => {
        if (!profiles) return null;
        return Array.isArray(profiles) ? profiles[0] : profiles;
    };

    const renderItem = ({ item }: { item: Post }): React.ReactElement => {
        const profile = getProfile(item.profiles);
        
        return (
            <View style={styles.card}>
                <View style={styles.userRow}>
                    <Image
                        source={{
                            uri: profile?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
                        }}
                        style={styles.avatar}
                    />
                    <Text style={styles.username}>
                        {profile?.full_name || 'Ẩn danh'}
                    </Text>
                </View>

                {item.image_url && <Image source={{ uri: item.image_url }} style={styles.image} />}
                <Text style={styles.caption}>{item.content}</Text>

                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => void handleLike(item.id)}
                    >
                        <Heart color="#FF6B6B" size={22} />
                        <Text style={styles.count}>{item.like_count}</Text>
                    </TouchableOpacity>

                    <View style={styles.actionBtn}>
                        <MessageCircle color="gray" size={22} />
                        <Text style={styles.count}>{item.comment_count}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.header}>Community</Text>
                <TouchableOpacity 
                    style={styles.fab} 
                    onPress={() => router.push('/post/create-post')}
                >
                    <Plus color="#fff" size={16} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#FF5A75" style={{ marginTop: 40 }} />
            ) : (
                <FlatList<Post>
                    data={posts}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => void fetchPosts()} />
                    }
                    renderItem={renderItem}
                />
            )}
        </View>
    );
};


/* ============================================================
   🎨 StyleSheet
   ============================================================ */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        paddingTop: 40,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    header: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FF5A75',
    },
    card: {
        backgroundColor: '#fafafa',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        padding: 10,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    username: {
        fontWeight: '600',
        fontSize: 16,
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginBottom: 8,
    },
    caption: {
        fontSize: 14,
        color: '#444',
        marginBottom: 6,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    count: {
        marginLeft: 4,
        fontSize: 14,
        color: '#333',
    },
    fab: {
        position: 'absolute',
        bottom: 6,
        right: 20,
        backgroundColor: '#FF6B6B',
        width: 36,
        height: 36,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
});

export default CommunityScreen;
