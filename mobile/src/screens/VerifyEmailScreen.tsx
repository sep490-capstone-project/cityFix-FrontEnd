import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar,
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
  const [inputFocused, setInputFocused] = useState(true);

  const inputRef = useRef<any>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, []);

  const triggerErrorShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleBtnPressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.96,
      speed: 35,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const handleBtnPressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      speed: 22,
      bounciness: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleVerify = async () => {
    Keyboard.dismiss();
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
      triggerErrorShake();
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyEmail(email, otp);
      setVerified(true);
      Animated.spring(successScale, {
        toValue: 1,
        speed: 16,
        bounciness: 12,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Mã xác thực không đúng hoặc đã hết hiệu lực. Vui lòng kiểm tra lại hộp thư.',
      );
      triggerErrorShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.topAccentBar} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.content}>
          {/* Top Navigation Row */}
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={goBack}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-back" size={20} color="#0f172a" />
            </TouchableOpacity>
            <View style={styles.stepBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#ea580c" />
              <Text style={styles.stepBadgeText}>Bảo mật 2 lớp</Text>
            </View>
          </View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
              },
            ]}
          >
            {/* Animated Icon Hero */}
            <View style={styles.iconOuterWrap}>
              <Animated.View
                style={[
                  styles.pulseRing,
                  verified && styles.pulseRingVerified,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.iconCircle,
                  verified && styles.iconCircleVerified,
                  verified ? { transform: [{ scale: successScale }] } : null,
                ]}
              >
                <Ionicons
                  name={verified ? 'checkmark-done-circle' : 'mail-unread-outline'}
                  size={42}
                  color={verified ? '#16a34a' : '#ea580c'}
                />
              </Animated.View>
            </View>

            <Text style={styles.title}>
              {verified ? 'XÁC THỰC THÀNH CÔNG!' : 'XÁC THỰC ĐỊA CHỈ EMAIL'}
            </Text>

            <Text style={styles.description}>
              {verified
                ? 'Tài khoản CityFix của bạn đã được kích hoạt thành công. Bạn có thể đăng nhập ngay bây giờ.'
                : 'Chúng tôi vừa gửi mã xác thực gồm 6 chữ số đến hộp thư:'}
            </Text>

            {!verified ? (
              <View style={styles.emailPill}>
                <Ionicons name="mail" size={14} color="#ea580c" />
                <Text style={styles.emailPillText}>{email || 'email@example.com'}</Text>
              </View>
            ) : null}

            {verified ? (
              <Animated.View style={{ width: '100%', marginTop: 24, transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonVerified]}
                  onPress={onVerified}
                  onPressIn={handleBtnPressIn}
                  onPressOut={handleBtnPressOut}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonText}>ĐẾN TRANG ĐĂNG NHẬP</Text>
                  <View style={styles.btnArrowCircle}>
                    <Ionicons name="arrow-forward" size={16} color="#16a34a" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <>
                {/* 6 Interactive OTP Digit Boxes */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => inputRef.current?.focus()}
                  style={styles.otpBoxesContainer}
                >
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = otp[index] || '';
                    const isCurrent = inputFocused && otp.length === index;
                    const isFilled = digit.length > 0;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpDigitBox,
                          isFilled && styles.otpDigitBoxFilled,
                          isCurrent && styles.otpDigitBoxFocused,
                          error ? styles.otpDigitBoxError : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.otpDigitText,
                            isFilled && styles.otpDigitTextFilled,
                          ]}
                        >
                          {digit}
                        </Text>
                        {isCurrent ? <View style={styles.cursorBar} /> : null}
                      </View>
                    );
                  })}

                  {/* Hidden Native Input for smooth typing & SMS/Email OTP Autofill */}
                  <TextInput
                    ref={inputRef}
                    style={styles.hiddenOtpInput}
                    value={otp}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onChangeText={(value) => {
                      const cleaned = value.replace(/\D/g, '').slice(0, 6);
                      setOtp(cleaned);
                      if (error) setError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    textContentType="oneTimeCode"
                    autoFocus
                  />
                </TouchableOpacity>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#dc2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : (
                  <Text style={styles.helperHint}>
                    💡 Kiểm tra thêm mục Thư rác (Spam) nếu bạn chưa thấy email.
                  </Text>
                )}

                <Animated.View style={{ width: '100%', marginTop: 20, transform: [{ scale: btnScale }] }}>
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleVerify}
                    onPressIn={handleBtnPressIn}
                    onPressOut={handleBtnPressOut}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.buttonText}>ĐANG KIỂM TRA MÃ...</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.buttonText}>XÁC THỰC MÃ OTP</Text>
                        <View style={styles.btnArrowCircle}>
                          <Ionicons name="checkmark" size={16} color="#ea580c" />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topAccentBar: {
    height: 4,
    backgroundColor: '#f97316',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  stepBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  iconOuterWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(249, 115, 22, 0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  pulseRingVerified: {
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  iconCircleVerified: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 10,
  },
  emailPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c2410c',
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    gap: 8,
    position: 'relative',
  },
  otpDigitBox: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigitBoxFilled: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  otpDigitBoxFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ea580c',
    borderWidth: 1.8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  otpDigitBoxError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  otpDigitTextFilled: {
    color: '#ea580c',
  },
  cursorBar: {
    position: 'absolute',
    bottom: 10,
    width: 16,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#ea580c',
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    width: '100%',
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: 12.5,
    fontWeight: '600',
  },
  helperHint: {
    marginTop: 14,
    fontSize: 11.5,
    color: '#94a3b8',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#f97316',
    paddingHorizontal: 18,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonVerified: {
    backgroundColor: '#16a34a',
    shadowColor: '#16a34a',
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.6,
  },
  btnArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
