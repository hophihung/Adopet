import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function SelectRoleScreen() {
  const { createProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'seller' | null>(null);

  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert('Lỗi', 'Vui lòng chọn vai trò của bạn');
      return;
    }

    setLoading(true);
    try {
      await createProfile(selectedRole);
      router.replace('/filter-pet');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Chào mừng! 👋</Text>
        <Text style={styles.subtitle}>Bạn là ai?</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'user' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('user')}
            disabled={loading}
          >
            <Text style={styles.roleIcon}>🐶</Text>
            <Text style={styles.roleTitle}>Người tìm thú cưng</Text>
            <Text style={styles.roleDescription}>
              Tôi đang tìm kiếm một người bạn bốn chân để nhận nuôi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'seller' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('seller')}
            disabled={loading}
          >
            <Text style={styles.roleIcon}>🏪</Text>
            <Text style={styles.roleTitle}>Người cung cấp</Text>
            <Text style={styles.roleDescription}>
              Tôi có thú cưng cần tìm chủ nhân mới
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={loading || !selectedRole}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Tiếp tục</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  roleCardSelected: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF6B6B',
  },
  roleIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
