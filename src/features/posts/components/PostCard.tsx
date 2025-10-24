import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';

export function PostCard({ post }: any) {
  return (
    <View className="bg-white m-3 rounded-2xl shadow p-3">
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          className="w-full h-56 rounded-2xl mb-3"
          resizeMode="cover"
        />
      )}
      <Text className="text-lg font-semibold mb-1">{post.profiles?.full_name}</Text>
      <Text className="text-gray-700 mb-3">{post.caption}</Text>

      <View className="flex-row justify-between">
        <TouchableOpacity className="flex-row items-center gap-1">
          <Heart size={20} color="red" />
          <Text>{post.likes_count ?? 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center gap-1">
          <MessageCircle size={20} color="gray" />
          <Text>{post.comment_count ?? 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
