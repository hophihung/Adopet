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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <View style={styles.headerGradient}>
        <View style={styles.headerRow}>
          <View style={styles.headerTabsContainer}>
            <TouchableOpacity
              style={styles.headerTab}
              onPress={() => handleTabChange('community')}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerTabText, activeTab === 'community' && styles.headerTabTextActive]}>
                Cộng đồng
              </Text>
              {activeTab === 'community' && <View style={styles.headerTabIndicator} />}
            </TouchableOpacity>
            <View style={styles.headerTabDivider} />
            <TouchableOpacity
              style={styles.headerTab}
              onPress={() => handleTabChange('chat')}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerTabText, activeTab === 'chat' && styles.headerTabTextActive]}>
                Tin nhắn
              </Text>
              {activeTab === 'chat' && <View style={styles.headerTabIndicator} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Chat List */}
      <ChatList onConversationSelect={handleConversationSelect} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
  },
  headerTab: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
  },
  headerTabDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerTabIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    transform: [{ translateX: -15 }],
    width: 30,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
});
