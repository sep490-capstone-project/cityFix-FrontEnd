import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthUser } from './LoginScreen';

interface Props {
  navigate: (screen: string) => void;
  goBack: () => void;
  onLogin: (user: AuthUser, token: string) => void;
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'password' | 'phone' | 'email';
  hint?: string;
  error?: string;
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  hint,
  error,
}: FieldProps) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            error ? styles.inputError : null,
            isPassword ? { paddingRight: 44 } : null,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={isPassword && !showPw}
          keyboardType={
            type === 'phone'
              ? 'phone-pad'
              : type === 'email'
              ? 'email-address'
              : 'default'
          }
          autoCapitalize={type === 'email' || isPassword ? 'none' : 'words'}
          value={value}
          onChangeText={onChange}
        />
        {isPassword ? (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPw(!showPw)}
          >
            <Ionicons
              name={showPw ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

export default function RegisterScreen({ navigate, goBack, onLogin }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [ward, setWard] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Vui lòng nhập họ tên.';
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, '')))
      e.phone = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0).';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Email không hợp lệ.';
    if (!ward.trim()) e.ward = 'Vui lòng nhập phường/quận.';
    if (password.length < 8) e.password = 'Mật khẩu tối thiểu 8 ký tự.';
    if (confirmPw !== password) e.confirmPw = 'Mật khẩu xác nhận không khớp.';
    return e;
  };

  const handleRegister = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    setTimeout(() => {
      const newUser: AuthUser = {
        userId: `user-${Date.now()}`,
        fullName: fullName.trim(),
        phone: phone.replace(/\s/g, ''),
        email: email.trim(),
        ward: ward.trim(),
      };
      const token = `mock_token_${Date.now()}`;
      onLogin(newUser, token);
    }, 1500);
  };

  const getPasswordStrength = () => {
    const len = password.length;
    if (len === 0) return { score: 0, text: '', color: '#e2e8f0' };
    if (len < 6) return { score: 1, text: 'Yếu', color: '#ef4444' };
    if (len < 8) return { score: 2, text: 'Trung bình', color: '#f97316' };
    if (len < 12) return { score: 3, text: 'Tốt', color: '#facc15' };
    return { score: 4, text: 'Mạnh', color: '#22c55e' };
  };

  const strength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topAccentBar} />

      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Đăng ký tài khoản</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Main Register Form Card */}
        <View style={styles.formCard}>
          {/* Header Title */}
          <View style={styles.headerBlock}>
            <View style={styles.brandRow}>
              <View style={styles.orangeIndicator} />
              <Text style={styles.brandTag}>CITYFIX</Text>
            </View>
            <Text style={styles.mainTitle}>TẠO TÀI KHOẢN</Text>
            <Text style={styles.subTitle}>
              Điền thông tin để bắt đầu báo cáo sự cố hạ tầng đô thị.
            </Text>
          </View>

          {/* Form Fields */}
          <Field
            label="HỌ VÀ TÊN *"
            placeholder="Nguyễn Văn An"
            value={fullName}
            onChange={(v) => {
              setFullName(v);
              setErrors((prev) => ({ ...prev, fullName: '' }));
            }}
            error={errors.fullName}
          />

          <Field
            label="SỐ ĐIỆN THOẠI *"
            placeholder="0901 234 567"
            type="phone"
            value={phone}
            onChange={(v) => {
              setPhone(v);
              setErrors((prev) => ({ ...prev, phone: '' }));
            }}
            error={errors.phone}
            hint="Dùng để đăng nhập và nhận thông báo sự cố."
          />

          <Field
            label="EMAIL"
            placeholder="example@gmail.com"
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              setErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={errors.email}
            hint="Không bắt buộc."
          />

          <Field
            label="PHƯỜNG / QUẬN / THÀNH PHỐ *"
            placeholder="Phường 2, Quận 5, TP.HCM"
            value={ward}
            onChange={(v) => {
              setWard(v);
              setErrors((prev) => ({ ...prev, ward: '' }));
            }}
            error={errors.ward}
          />

          <View style={styles.divider} />

          <Field
            label="MẬT KHẤU *"
            placeholder="Tối thiểu 8 ký tự"
            type="password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setErrors((prev) => ({ ...prev, password: '' }));
            }}
            error={errors.password}
          />

          {/* Password Strength Meter */}
          {password.length > 0 ? (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.strengthSegment,
                      {
                        backgroundColor:
                          idx <= strength.score ? strength.color : '#e2e8f0',
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthText, { color: strength.color }]}>
                Độ mạnh: {strength.text}
              </Text>
            </View>
          ) : null}

          <Field
            label="XÁC NHẬN MẬT KHẤU *"
            placeholder="Nhập lại mật khẩu"
            type="password"
            value={confirmPw}
            onChange={(v) => {
              setConfirmPw(v);
              setErrors((prev) => ({ ...prev, confirmPw: '' }));
            }}
            error={errors.confirmPw}
          />

          {/* Terms Policy Notice */}
          <Text style={styles.termsText}>
            Bằng cách đăng ký, bạn đồng ý với{' '}
            <Text style={styles.termsLink}>Điều khoản sử dụng</Text> và{' '}
            <Text style={styles.termsLink}>Chính sách bảo mật</Text> của CityFix.
          </Text>

          {/* Register CTA Button */}
          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.btnContent}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.btnText}>ĐANG TẠO TÀI KHOẢN...</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>ĐĂNG KÝ & ĐĂNG NHẬP</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={goBack}>
              <Text style={styles.loginLink}>Đăng nhập →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topAccentBar: {
    height: 3,
    backgroundColor: '#f97316',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  formCard: {
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
  headerBlock: {
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orangeIndicator: {
    width: 4,
    height: 12,
    backgroundColor: '#f97316',
    borderRadius: 2,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  fieldContainer: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    color: '#0f172a',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#dc2626',
  },
  hintText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  strengthContainer: {
    marginTop: -8,
    gap: 4,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 10,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  termsLink: {
    color: '#ea580c',
    fontWeight: '700',
  },
  registerBtn: {
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
  registerBtnDisabled: {
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
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  loginText: {
    fontSize: 13,
    color: '#64748b',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
});
