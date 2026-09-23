import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, login } from '../api';

export interface AuthUser {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  ward: string;
}

interface Props {
  navigate?: (screen: string) => void;
  onLogin?: (user: AuthUser, token: string) => void;
}

export default function LoginScreen({ navigate, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);

// Lưu access token để các API khác sử dụng
await AsyncStorage.setItem(
  'accessToken',
  result.accessToken
);

console.log(
  '✅ Access token saved:',
  result.accessToken
);

onLogin?.(
  {
    userId: email.trim(),
    fullName: email.trim().split('@')[0],
    phone: '',
    email: email.trim(),
    ward: '',
  },
  result.accessToken,
);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Đăng nhập không thành công. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Decorative Stripe Bar */}
        <View style={styles.topAccentBar} />

        {/* Hero Logo Banner Section */}
        <View style={styles.heroSection}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Official CityFix Logo Image */}
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandSubtitle}>Nền tảng báo cáo hạ tầng đô thị</Text>
        </View>

        {/* Form Container Card */}
        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <View style={styles.orangeIndicator} />
            <Text style={styles.formTitle}>ĐĂNG NHẬP</Text>
          </View>
          <Text style={styles.formSubtitle}>
            Chào mừng trở lại! Nhập thông tin tài khoản của bạn.
          </Text>

          {/* Error Alert */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email Input Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
              />
            </View>
          </View>

          {/* Password Input Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>MẬT KHẨU</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPw}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPw(!showPw)}
                style={styles.eyeIconBtn}
              >
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Action Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.btnContent}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.btnText}>ĐANG ĐĂNG NHẬP...</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>ĐĂNG NHẬP</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigate?.('register')}>
              <Text style={styles.registerLink}>Đăng ký ngay →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Decorative Pattern Strip */}
        <View style={styles.bottomDecorBar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  topAccentBar: {
    height: 4,
    backgroundColor: '#f97316',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(249, 115, 22, 0.04)',
  },
  logoWrapper: {
    width: 180,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -4,
    fontWeight: '500',
  },
  formCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    gap: 16,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orangeIndicator: {
    width: 4,
    height: 18,
    backgroundColor: '#f97316',
    borderRadius: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: -8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    flex: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    color: '#0f172a',
    fontSize: 15,
    paddingLeft: 42,
    paddingRight: 16,
    paddingVertical: 14,
  },
  eyeIconBtn: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    flex: 1,
  },
  boldDark: {
    color: '#0f172a',
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  registerText: {
    fontSize: 13,
    color: '#64748b',
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  bottomDecorBar: {
    height: 3,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 40,
    marginTop: 24,
    borderRadius: 2,
  },
});
