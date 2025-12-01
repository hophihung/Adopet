import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Mail, Lock, Sparkles } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { modernTheme } from '@/src/theme/modernTheme';

const { width, height } = Dimensions.get('window');

export default function ModernLoginScreen() {
  const { signInWithEmail, signInWithGoogle, signInWithFacebook } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Oops! 🐾', 'Vui lòng nhập email và mật khẩu nhé!');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      Alert.alert('Ối! 😿', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithFacebook();
      }
    } catch (error: any) {
      Alert.alert('Ối! 😿', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#FFE66D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Floating pets decoration */}
          <View style={styles.decorationContainer}>
            <Animated.Text style={[styles.floatingEmoji, { top: 60, left: 30 }]}>
              🐶
            </Animated.Text>
            <Animated.Text style={[styles.floatingEmoji, { top: 100, right: 40 }]}>
              🐱
            </Animated.Text>
            <Animated.Text style={[styles.floatingEmoji, { top: 180, left: 50 }]}>
              🐹
            </Animated.Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#FFF0F0']}
                style={styles.logoGradient}
              >
                <Heart size={48} color="#FF6B6B" fill="#FF6B6B" />
              </LinearGradient>
            </View>
            
            <Text style={styles.title}>Chào mừng trở lại!</Text>
            <Text style={styles.subtitle}>
              Hàng ngàn bé cưng đang chờ bạn 🐾
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <View style={styles.cardInner}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'email' && styles.inputWrapperFocused
                ]}>
                  <Mail size={20} color={focusedInput === 'email' ? '#FF6B6B' : '#9CA3AF'} />
                  <input
                    type="email"
                    placeholder="Email của bạn"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    style={styles.input as any}
                    disabled={loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'password' && styles.inputWrapperFocused
                ]}>
                  <Lock size={20} color={focusedInput === 'password' ? '#FF6B6B' : '#9CA3AF'} />
                  <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    style={styles.input as any}
                    disabled={loading}
                  />
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleEmailAuth}
                disabled={loading}
                activeOpacity={0.8}
                style={styles.loginButton}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <Text style={styles.loginButtonText}>Đang đăng nhập... 🐾</Text>
                  ) : (
                    <>
                      <Sparkles size={20} color="#FFFFFF" />
                      <Text style={styles.loginButtonText}>Đăng nhập</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>hoặc</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Buttons */}
              <View style={styles.socialContainer}>
                <TouchableOpacity
                  onPress={() => handleSocialLogin('google')}
                  disabled={loading}
                  style={styles.socialButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.socialIcon}>🐾</Text>
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSocialLogin('facebook')}
                  disabled={loading}
                  style={styles.socialButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.socialIcon}>🐱</Text>
                  <Text style={styles.socialText}>Facebook</Text>
                </TouchableOpacity>
              </View>

              {/* Register Link */}
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                style={styles.registerLink}
              >
                <Text style={styles.registerText}>
                  Chưa có tài khoản?{' '}
                  <Text style={styles.registerTextBold}>Đăng ký ngay!</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerEmojis}>🐶 🐱 🐹 🐰 🐦</Text>
            <Text style={styles.footerText}>
              Mỗi bé cưng đều xứng đáng có một mái ấm
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
  },
  decorationContainer: {
    position: 'absolute',
    width: '100%',
    height: height * 0.4,
  },
  floatingEmoji: {
    position: 'absolute',
    fontSize: 32,
    opacity: 0.3,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
    marginTop: 20,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    marginHorizontal: 24,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  cardInner: {
    padding: 28,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF6B6B',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1A1A1A',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  socialIcon: {
    fontSize: 24,
  },
  socialText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerText: {
    fontSize: 15,
    color: '#6B7280',
  },
  registerTextBold: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  footerEmojis: {
    fontSize: 28,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600',
  },
});
