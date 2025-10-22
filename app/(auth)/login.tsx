/**
 * LoginScreen
 * Màn hình đăng nhập với Email/Password, Google, và Facebook
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { Button, TextInput, Text, ActivityIndicator, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get('window');

// Cần thiết cho OAuth trên mobile
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithFacebook } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        Alert.alert('Success', 'Account created! Please check your email to verify.');
      } else {
        await signInWithEmail(email, password);
        // Navigation được xử lý tự động bởi auth state change
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // OAuth sẽ mở browser, khi quay lại app sẽ tự động navigate
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    try {
      await signInWithFacebook();
      // OAuth sẽ mở browser, khi quay lại app sẽ tự động navigate
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header with cute pets */}
            <View style={styles.header}>
              <View style={styles.petsContainer}>
                <Text style={styles.petEmoji}>🐶</Text>
                <View style={styles.logoContainer}>
                  <Text style={styles.logo}>❤️</Text>
                </View>
                <Text style={styles.petEmoji}>🐱</Text>
              </View>
              <Text variant="headlineMedium" style={styles.title}>
                Welcome to PawsHome
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Give a pet a loving home 🏡
              </Text>
            </View>

          {/* Email/Password Form */}
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>
                  {isSignUp ? '🎉 Create Account' : '👋 Sign In'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {isSignUp ? 'Join our pet-loving community' : 'Welcome back, pet lover!'}
                </Text>
              </View>

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                mode="outlined"
                disabled={loading}
                left={<TextInput.Icon icon="email" />}
                outlineColor="#FFB6C1"
                activeOutlineColor="#FF69B4"
              />
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                mode="outlined"
                disabled={loading}
                left={<TextInput.Icon icon="lock" />}
                right={<TextInput.Icon icon="eye" />}
                outlineColor="#FFB6C1"
                activeOutlineColor="#FF69B4"
              />

              {loading ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#FF69B4" />
                  <Text style={styles.loaderText}>🐾 Finding your way...</Text>
                </View>
              ) : (
                <>
                  <Button
                    mode="contained"
                    onPress={handleEmailAuth}
                    style={styles.button}
                    buttonColor="#FF69B4"
                    contentStyle={styles.buttonContent}
                    icon={isSignUp ? 'account-plus' : 'paw'}
                  >
                    {isSignUp ? 'Start My Journey' : 'Continue'}
                  </Button>

                  <TouchableOpacity
                    onPress={() => setIsSignUp(!isSignUp)}
                    style={styles.toggleButton}
                  >
                    <Text style={styles.toggleText}>
                      {isSignUp ? 'Already part of our family? ' : "New here? "}
                      <Text style={styles.toggleTextBold}>
                        {isSignUp ? 'Sign In' : 'Join Us'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Card.Content>
          </Card>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerTextContainer}>
              <Text style={styles.dividerText}>Quick Login</Text>
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={styles.socialButton}
              activeOpacity={0.8}
            >
              <View style={styles.socialButtonContent}>
                <View style={styles.socialIconContainer}>
                  <Text style={styles.socialIcon}>🐾</Text>
                </View>
                <Text style={styles.socialButtonText}>Google</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFacebookSignIn}
              disabled={loading}
              style={styles.socialButton}
              activeOpacity={0.8}
            >
              <View style={styles.socialButtonContent}>
                <View style={styles.socialIconContainer}>
                  <Text style={styles.socialIcon}>🐱</Text>
                </View>
                <Text style={styles.socialButtonText}>Facebook</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerPets}>🐶 🐱 🐹 🐰 🐦</Text>
            <Text variant="bodySmall" style={styles.footer}>
              Every pet deserves a loving home
            </Text>
            <Text variant="bodySmall" style={styles.footerTerms}>
              By continuing, you agree to our{' '}
              <Text style={styles.footerLink}>Terms</Text> and{' '}
              <Text style={styles.footerLink}>Privacy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  petsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 16,
  },
  petEmoji: {
    fontSize: 40,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FF69B4',
  },
  logo: {
    fontSize: 36,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: '#8B4513',
  },
  subtitle: {
    color: '#8B4513',
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFE4E1',
  },
  cardContent: {
    padding: 24,
  },
  formHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
    elevation: 4,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  toggleButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleText: {
    color: '#666',
    fontSize: 14,
  },
  toggleTextBold: {
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  loaderContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#FFE4E1',
    borderRadius: 1,
  },
  dividerTextContainer: {
    paddingHorizontal: 16,
    backgroundColor: '#FFE5B4',
  },
  dividerText: {
    color: '#8B4513',
    fontSize: 13,
    fontWeight: '600',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  socialButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFE4E1',
  },
  socialButtonContent: {
    alignItems: 'center',
  },
  socialIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  socialIcon: {
    fontSize: 22,
  },
  socialButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B4513',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerPets: {
    fontSize: 24,
    marginBottom: 8,
  },
  footer: {
    textAlign: 'center',
    color: '#8B4513',
    fontWeight: '600',
    marginBottom: 12,
  },
  footerTerms: {
    textAlign: 'center',
    color: '#8B4513',
    opacity: 0.7,
    fontSize: 11,
  },
  footerLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
