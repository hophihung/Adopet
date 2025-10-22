/**
 * LoginScreen
 * Màn hình đăng nhập với Email/Password, Google, và Facebook
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Button, TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="displaySmall" style={styles.title}>
              🐾 Pet Adoption
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Find your perfect companion
            </Text>
          </View>

          {/* Email/Password Form */}
          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              mode="outlined"
              disabled={loading}
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
              disabled={loading}
            />

            {loading ? (
              <ActivityIndicator size="large" style={styles.loader} />
            ) : (
              <>
                <Button
                  mode="contained"
                  onPress={handleEmailAuth}
                  style={styles.button}
                >
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Button>

                <Button
                  mode="text"
                  onPress={() => setIsSignUp(!isSignUp)}
                  style={styles.toggleButton}
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Button>
              </>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtons}>
            <Button
              mode="outlined"
              onPress={handleGoogleSignIn}
              icon="google"
              style={styles.socialButton}
              disabled={loading}
            >
              Continue with Google
            </Button>

            <Button
              mode="outlined"
              onPress={handleFacebookSignIn}
              icon="facebook"
              style={styles.socialButton}
              disabled={loading}
            >
              Continue with Facebook
            </Button>
          </View>

          {/* Footer */}
          <Text variant="bodySmall" style={styles.footer}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
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
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  toggleButton: {
    marginTop: 8,
  },
  loader: {
    marginVertical: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    paddingVertical: 6,
  },
  footer: {
    marginTop: 32,
    textAlign: 'center',
    color: '#999',
  },
});
