/**
 * RegisterScreen
 * Màn hình đăng ký với Email/Password, Google, và Facebook
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { Button, TextInput, Text, ActivityIndicator, Card } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { PawPrint } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';

const { width } = Dimensions.get('window');

// Cần thiết cho OAuth trên mobile
WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { signUpWithEmail, signInWithGoogle, signInWithFacebook } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!fullName || !fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return;
    }

    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, fullName.trim());
      Alert.alert('Thành công', 'Tài khoản đã được tạo! Vui lòng kiểm tra email để xác thực.');
      router.push('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
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
      Alert.alert('Lỗi', error.message);
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
      Alert.alert('Lỗi', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
                <View style={styles.logoContainer}>
                  <Text style={styles.logo}><PawPrint size={50} color={'#FF6B6B'}/></Text>
                </View>
              </View>
            </View>

            {/* Email/Password Form */}
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Tạo tài khoản</Text>
                  <Text style={styles.formSubtitle}>
                    Tham gia cộng đồng yêu thú cưng
                  </Text>
                </View>

                <TextInput
                  label="Họ và tên"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  style={styles.input}
                  mode="outlined"
                  disabled={loading}
                  left={<TextInput.Icon icon="account" />}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />

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
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />
                <TextInput
                  label="Mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  mode="outlined"
                  disabled={loading}
                  left={<TextInput.Icon icon="lock" />}
                  right={<TextInput.Icon icon="eye" />}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />
                <TextInput
                  label="Xác nhận mật khẩu"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  style={styles.input}
                  mode="outlined"
                  disabled={loading}
                  left={<TextInput.Icon icon="lock-check" />}
                  right={<TextInput.Icon icon="eye" />}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />

                {loading ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loaderText}>🐾 Đang tạo tài khoản...</Text>
                  </View>
                ) : (
                  <>
                    <Button
                      mode="contained"
                      onPress={handleEmailAuth}
                      style={styles.button}
                      buttonColor={colors.primary}
                      contentStyle={styles.buttonContent}
                      icon="account-plus"
                    >
                      Tạo tài khoản
                    </Button>

                    <TouchableOpacity
                      onPress={() => router.push('/(auth)/login')}
                      style={styles.toggleButton}
                    >
                      <Text style={styles.toggleText}>
                        Đã có tài khoản?{' '}
                        <Text style={styles.toggleTextBold}>
                          Đăng nhập
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
                <Text style={styles.dividerText}>Đăng ký nhanh</Text>
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
                Mọi thú cưng đều xứng đáng có một ngôi nhà yêu thương
              </Text>
              <Text variant="bodySmall" style={styles.footerTerms}>
                Bằng cách tiếp tục, bạn đồng ý với{' '}
                <Text style={styles.footerLink}>Điều khoản</Text> và{' '}
                <Text style={styles.footerLink}>Chính sách bảo mật</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  content: {
    paddingTop: 60,
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    fontSize: 56,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    color: '#FF69B4',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Bold',
      android: 'sans-serif-medium',
    }),
  },
  subtitle: {
    color: '#8B4513',
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    padding: 24,
  },
  formHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  formSubtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    color: colors.primary,
    fontWeight: '700',
  },
  loaderContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: colors.primary,
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
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  dividerTextContainer: {
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  dividerText: {
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialButtonContent: {
    alignItems: 'center',
  },
  socialIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
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
    color: colors.text,
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
    color: colors.text,
    fontWeight: '600',
    marginBottom: 12,
  },
  footerTerms: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 11,
  },
  footerLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

