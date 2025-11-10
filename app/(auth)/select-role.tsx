/**
 * SelectRoleScreen
 * Cho user chọn role: User (người tìm pet) hoặc Seller (người bán pet)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
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
      const createdRole = await createProfile(role);
      console.log('🔵 Created role:', createdRole);
      
      // Nếu là seller, redirect đến subscription page
      if (createdRole === 'seller') {
        console.log('🔵 Redirecting seller to subscription page');
        router.replace('/(auth)/subscription');
      } else {
        console.log('🔵 Redirecting user to filter screen');
        // Nếu là user, redirect đến filter screen
        router.replace('/(auth)/filter-pets');
      }
    } catch (error: any) {
      console.error('🔴 Error creating profile:', error);
      Alert.alert('Error', error.message);
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFE5B4', '#FFDAB9', '#FFB6C1']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeEmoji}>🎉</Text>
            <Text variant="headlineMedium" style={styles.title}>
              Welcome to PawsHome!
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Let's get to know you better
            </Text>
          </View>

        {/* Role Cards */}
        <View style={styles.cards}>
          <TouchableOpacity
            onPress={() => !loading && handleSelectRole('user')}
            disabled={loading}
            activeOpacity={0.9}
          >
            <View style={selectedRole === 'user' ? styles.selectedCardWrapper : null}>
              <Card
                style={[
                  styles.card,
                  selectedRole === 'user' ? styles.selectedCard : null,
                ]}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.emojiContainer}>
                    <Text style={styles.emoji}>🥰</Text>
                  </View>
                  <Text variant="titleLarge" style={styles.roleTitle}>
                    Pet Lover
                  </Text>
                  <Text variant="bodyMedium" style={styles.roleDescription}>
                    I want to adopt and care for a pet 🐶🐱
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Most Popular</Text>
                  </View>
                </Card.Content>
              </Card>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => !loading && handleSelectRole('seller')}
            disabled={loading}
            activeOpacity={0.9}
          >
            <View style={selectedRole === 'seller' ? styles.selectedCardWrapper : null}>
              <Card
                style={[
                  styles.card,
                  selectedRole === 'seller' ? styles.selectedCard : null,
                ]}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.emojiContainer}>
                    <Text style={styles.emoji}>🏡</Text>
                  </View>
                  <Text variant="titleLarge" style={styles.roleTitle}>
                    Pet Care Provider
                  </Text>
                  <Text variant="bodyMedium" style={styles.roleDescription}>
                    I help pets find loving homes ✨
                  </Text>
                </Card.Content>
              </Card>
            </View>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF69B4" />
            <Text style={styles.loadingText}>🐾 Setting up your profile...</Text>
          </View>
        )}
      </View>
    </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#8B4513',
    textAlign: 'center',
  },
  subtitle: {
    color: '#8B4513',
    textAlign: 'center',
    fontWeight: '500',
  },
  cards: {
    gap: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    borderWidth: 3,
    borderColor: '#FFE4E1',
  },
  selectedCardWrapper: {
    transform: [{ scale: 1.02 }],
  },
  selectedCard: {
    borderColor: '#FF69B4',
    backgroundColor: '#FFF0F5',
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 48,
  },
  roleTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#8B4513',
  },
  roleDescription: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  badge: {
    marginTop: 12,
    backgroundColor: '#FF69B4',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    elevation: 4,
  },
  loadingText: {
    marginTop: 16,
    color: '#FF69B4',
    fontSize: 16,
    fontWeight: '600',
  },
});
