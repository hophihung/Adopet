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
  TextInput,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

const { width, height } = Dimensions.get('window');

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { signUpWithEmail, signInWithGoogle, signInWithFacebook } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleEmailAuth = async () => {
    if (!fullName || !fullName.trim()) {
      Alert.alert('Hmm...', 'Bạn quên nhập tên rồi');
      return;
    }

    if (!email || !password) {
      Alert.alert('Hmm...', 'Bạn quên nhập email hoặc mật khẩu rồi');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ối', 'Mật khẩu cần ít nhất 6 ký tự nhé');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Ối', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, fullName.trim());
      Alert.alert('Tuyệt vời!', 'Tài khoản đã được tạo. Kiểm tra email để xác thực nhé!');
      router.push('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Ối', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithFacebook();
    } catch (error: any) {
      Alert.alert('Ối', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF5F5', '#FFFBF0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🐾</Text>
            </View>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Tham gia cộng đồng yêu thú cưng</Text>
          </View>

          {/* Register Card */}
          <View style={styles.card}>
            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFocusedInput('fullName')}
                onBlur={() => setFocusedInput(null)}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#A0A0A0"
                autoCapitalize="words"
                editable={!loading}
                style={[
                  styles.input,
                  focusedInput === 'fullName' && styles.inputFocused,
                ]}
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                placeholder="your@email.com"
                placeholderTextColor="#A0A0A0"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
                style={[
                  styles.input,
                  focusedInput === 'email' && styles.inputFocused,
                ]}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                placeholder="••••••••"
                placeholderTextColor="#A0A0A0"
                secureTextEntry
                editable={!loading}
                style={[
                  styles.input,
                  focusedInput === 'password' && styles.inputFocused,
                ]}
              />
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedInput('confirmPassword')}
                onBlur={() => setFocusedInput(null)}
                placeholder="••••••••"
                placeholderTextColor="#A0A0A0"
                secureTextEntry
                editable={!loading}
                style={[
                  styles.input,
                  focusedInput === 'confirmPassword' && styles.inputFocused,
                ]}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleEmailAuth}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc đăng ký với</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                onPress={() => handleSocialLogin('google')}
                disabled={loading}
                style={styles.socialButton}
                activeOpacity={0.85}
              >
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSocialLogin('facebook')}
                disabled={loading}
                style={styles.socialButton}
                activeOpacity={0.85}
              >
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Link */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>
              Đã có tài khoản? <Text style={styles.loginTextBold}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            Bằng cách đăng ký, bạn đồng ý với{'\n'}
            <Text style={styles.termsLink}>Điều khoản</Text> và{' '}
            <Text style={styles.termsLink}>Chính sách bảo mật</Text>
          </Text>
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
    paddingTop: height * 0.08,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  inputFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FF6B6B',
  },
  registerButton: {
    marginTop: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
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
    marginHorizontal: 12,
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  socialText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  loginText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
  loginTextBold: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  terms: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
