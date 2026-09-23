import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, verifyEmail } from '../api';

interface Props {
  email: string;
  goBack: () => void;
  onVerified: () => void;
}

export default function VerifyEmailScreen({ email, goBack, onVerified }: Props) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyEmail(email, otp);
      setVerified(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xác thực không thành công. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topAccentBar} />
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} disabled={loading}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Ionicons name={verified ? 'checkmark-circle' : 'mail-outline'} size={44} color="#ea580c" />
        </View>
        <Text style={styles.title}>{verified ? 'XÁC THỰC THÀNH CÔNG' : 'XÁC THỰC EMAIL'}</Text>
        <Text style={styles.description}>
          {verified
            ? 'Email của bạn đã được xác thực. Bây giờ bạn có thể đăng nhập.'
            : `Nhập mã OTP đã được gửi đến\n${email}`}
        </Text>

        {verified ? (
          <TouchableOpacity style={styles.button} onPress={onVerified}>
            <Text style={styles.buttonText}>ĐẾN TRANG ĐĂNG NHẬP</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={(value) => {
                setOtp(value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#94a3b8"
              textContentType="oneTimeCode"
              autoFocus
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>XÁC THỰC EMAIL</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topAccentBar: { height: 4, backgroundColor: '#f97316' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 28 },
  backButton: { alignSelf: 'flex-start', width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginTop: 52 },
  title: { marginTop: 24, color: '#0f172a', fontSize: 21, fontWeight: '800', letterSpacing: 0.5 },
  description: { marginTop: 12, color: '#64748b', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  otpInput: { width: '100%', maxWidth: 340, marginTop: 32, backgroundColor: '#fff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 14, paddingVertical: 15, color: '#0f172a', fontSize: 26, fontWeight: '700', letterSpacing: 11, textAlign: 'center' },
  error: { width: '100%', maxWidth: 340, marginTop: 12, color: '#dc2626', fontSize: 13, textAlign: 'center' },
  button: { width: '100%', maxWidth: 340, marginTop: 24, alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 14, backgroundColor: '#f97316' },
  buttonDisabled: { backgroundColor: '#cbd5e1' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.6 },
});
