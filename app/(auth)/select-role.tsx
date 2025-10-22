/**
 * SelectRoleScreen
 * Cho user chọn role: User (người tìm pet) hoặc Seller (người bán pet)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, Card, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

export default function SelectRoleScreen() {
  const { createProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'seller' | null>(null);

  const handleSelectRole = async (role: 'user' | 'seller') => {
    setSelectedRole(role);
    setLoading(true);

    try {
      await createProfile(role);
      // Sau khi tạo profile thành công, navigate tới filter screen
      router.replace('/(auth)/filter-pets');
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Welcome! 👋
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Tell us about yourself
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cards}>
          <Card
            style={[
              styles.card,
              selectedRole === 'user' && styles.selectedCard,
            ]}
            onPress={() => !loading && handleSelectRole('user')}
          >
            <Card.Content style={styles.cardContent}>
              <Text variant="displaySmall" style={styles.emoji}>
                🐕
              </Text>
              <Text variant="titleLarge" style={styles.roleTitle}>
                Pet Lover
              </Text>
              <Text variant="bodyMedium" style={styles.roleDescription}>
                I'm looking to adopt a pet
              </Text>
            </Card.Content>
          </Card>

          <Card
            style={[
              styles.card,
              selectedRole === 'seller' && styles.selectedCard,
            ]}
            onPress={() => !loading && handleSelectRole('seller')}
          >
            <Card.Content style={styles.cardContent}>
              <Text variant="displaySmall" style={styles.emoji}>
                🏪
              </Text>
              <Text variant="titleLarge" style={styles.roleTitle}>
                Pet Seller
              </Text>
              <Text variant="bodyMedium" style={styles.roleDescription}>
                I have pets to offer for adoption
              </Text>
            </Card.Content>
          </Card>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Setting up your profile...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#6200ee',
    backgroundColor: '#f0e6ff',
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emoji: {
    marginBottom: 12,
  },
  roleTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  roleDescription: {
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
});
