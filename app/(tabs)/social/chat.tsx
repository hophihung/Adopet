import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'expo-router';
import { ChatScreen, ChatList } from '@/src/components';
import { Conversation, ChatService } from '@/src/features/chat';
import { colors } from '@/src/theme/colors';
import { Header } from '@/src/components/Header';


export default function ChatTabScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'community' | 'chat'>('chat');
  
  // Navigate between community and chat
  const handleTabChange = (tab: 'community' | 'chat') => {
    setActiveTab(tab);
    if (tab === 'community') {
      router.replace('/(tabs)/social/community');
    } else {
      router.replace('/(tabs)/social/chat');
    }
  };

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname?.includes('/community')) {
      setActiveTab('community');
    } else {
      setActiveTab('chat');
    }
  }, [pathname]);

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  if (selectedConversation) {
    return (
      <ChatScreen conversation={selectedConversation} onBack={handleBack} />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Tabs */}
      <View style={styles.headerContainer}>
        <Header showBack={true} title="Tin nhắn" />
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('community')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'community' && styles.tabTextActive]}>
              Cộng đồng
            </Text>
            {activeTab === 'community' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('chat')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
              Tin nhắn
            </Text>
            {activeTab === 'chat' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      <ChatList onConversationSelect={handleConversationSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 24,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
    minWidth: 80,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 17,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -20 }],
    width: 40,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
