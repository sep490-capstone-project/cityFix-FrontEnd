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
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { ApiError, resetPassword } from '../api';
import {
  FIREBASE_CONFIG,
  formatPhoneNumberE164,
  formatPhoneDisplay,
} from '../constants/firebaseConfig';

const WebViewComponent = WebView as any;

interface Props {
  goBack: () => void;
  onSuccess: () => void;
}

function buildResetFirebaseHtml(phoneE164: string): string {
  const configJson = JSON.stringify(FIREBASE_CONFIG);
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Khôi phục mật khẩu Firebase</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      padding: 8px;
    }
    #recaptcha-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 82px;
      width: 100%;
    }
    .status-text {
      font-size: 12px;
      color: #64748b;
      text-align: center;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div id="recaptcha-wrapper">
    <div id="recaptcha-container"></div>
  </div>
  <div id="status" class="status-text">Đang khởi tạo bảo mật reCAPTCHA...</div>

  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

    const postToRN = (data) => {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    };

    const statusEl = document.getElementById('status');
    const targetPhone = ${JSON.stringify(phoneE164)};

    try {
      const firebaseConfig = ${configJson};
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      auth.languageCode = 'vi';

      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: async (token) => {
          statusEl.innerText = 'Đã xác minh bảo mật! Đang gửi mã OTP...';
          postToRN({ type: 'RECAPTCHA_SOLVED', token });
          await window.triggerSendOtp(targetPhone);
        },
        'expired-callback': () => {
          statusEl.innerText = 'Mã bảo mật đã hết hạn. Vui lòng tích lại.';
          postToRN({ type: 'RECAPTCHA_EXPIRED' });
        }
      });

      window.recaptchaVerifier.render().then(() => {
        statusEl.innerText = 'Tích vào ô xác minh để nhận mã OTP khôi phục mật khẩu';
        postToRN({ type: 'RECAPTCHA_READY' });
      }).catch((err) => {
        statusEl.innerText = 'Lỗi tải reCAPTCHA: ' + (err.message || err);
        postToRN({ type: 'ERROR', message: err.message || 'Không thể tải reCAPTCHA', code: err.code });
      });

      window.triggerSendOtp = async (phoneToUse) => {
        try {
          postToRN({ type: 'SENDING_OTP' });
          const confirmationResult = await signInWithPhoneNumber(auth, phoneToUse || targetPhone, window.recaptchaVerifier);
          window.confirmationResult = confirmationResult;
          statusEl.innerText = 'Mã OTP đã gửi đến ' + (phoneToUse || targetPhone);
          postToRN({ type: 'OTP_SENT' });
        } catch (err) {
          statusEl.innerText = 'Lỗi gửi SMS: ' + (err.message || err.code || '');
          postToRN({
            type: 'ERROR',
            message: err.message || 'Không thể gửi tin nhắn OTP',
            code: err.code || 'unknown'
          });
        }
      };

      window.confirmOtpCode = async (otpCode) => {
        try {
          if (!window.confirmationResult) {
            postToRN({
              type: 'VERIFY_ERROR',
              message: 'Phiên xác thực chưa sẵn sàng. Vui lòng gửi lại mã OTP.'
            });
            return;
          }
          const result = await window.confirmationResult.confirm(String(otpCode).trim());
          const idToken = await result.user.getIdToken(true);
          postToRN({ type: 'FIREBASE_VERIFIED', idToken });
        } catch (err) {
          postToRN({
            type: 'VERIFY_ERROR',
            message: err.message || 'Mã OTP không chính xác hoặc đã hết hạn',
            code: err.code || 'invalid-code'
          });
        }
      };
    } catch (initErr) {
      postToRN({
        type: 'ERROR',
        message: initErr.message || 'Không thể khởi tạo Firebase Auth'
      });
    }
  </script>
</body>
</html>`;
}

function mapFirebaseError(code?: string, rawMessage?: string): string {
  if (!code && !rawMessage) return 'Đã xảy ra lỗi khi xác thực số điện thoại.';
  const c = (code || '').toLowerCase();
  if (c.includes('invalid-phone-number')) {
    return 'Số điện thoại không đúng định dạng hợp lệ (+84...).';
  }
  if (c.includes('too-many-requests') || c.includes('quota-exceeded')) {
    return 'Số điện thoại này đã yêu cầu mã OTP quá nhiều lần. Vui lòng thử lại sau ít phút.';
  }
  if (c.includes('invalid-verification-code')) {
    return 'Mã OTP bạn nhập không chính xác. Vui lòng kiểm tra lại tin nhắn SMS.';
  }
  if (c.includes('code-expired') || c.includes('session-expired')) {
    return 'Mã OTP đã hết hạn. Vui lòng bấm gửi lại mã mới.';
  }
  if (c.includes('captcha-check-failed')) {
    return 'Xác minh bảo mật reCAPTCHA không thành công. Vui lòng thử lại.';
  }
  return rawMessage || 'Xác thực không thành công. Vui lòng thử lại.';
}

export default function ResetPasswordScreen({ goBack, onSuccess }: Props) {
  const [step, setStep] = useState<'phone' | 'otp' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [firebaseIdToken, setFirebaseIdToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [webViewKey, setWebViewKey] = useState(1);

  const otpInputRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);
  const webConfirmationResultRef = useRef<any>(null);

  const isPhoneValid = /^0\d{9}$/.test(phone.replace(/\s/g, ''));
  const phoneE164 = formatPhoneNumberE164(phone);
  const phonePretty = formatPhoneDisplay(phone);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Web Platform direct Firebase Auth initialization when phone is valid
  useEffect(() => {
    if (Platform.OS !== 'web' || !isPhoneValid || step !== 'phone') return;
    let mounted = true;

    const initWebFirebase = async () => {
      try {
        const firebaseApp = await import('firebase/app');
        const firebaseAuth = await import('firebase/auth');
        const app =
          firebaseApp.getApps().length > 0
            ? firebaseApp.getApp()
            : firebaseApp.initializeApp(FIREBASE_CONFIG);
        const auth = firebaseAuth.getAuth(app);
        auth.languageCode = 'vi';

        setTimeout(() => {
          if (!mounted) return;
          const container = document.getElementById('reset-web-recaptcha-container');
          if (!container) return;
          container.innerHTML = '';

          const verifier = new firebaseAuth.RecaptchaVerifier(
            auth,
            'reset-web-recaptcha-container',
            {
              size: 'normal',
              callback: async () => {
                if (!mounted) return;
                setError('');
                setSendingOtp(true);
                try {
                  const confirmRes = await firebaseAuth.signInWithPhoneNumber(
                    auth,
                    phoneE164,
                    verifier
                  );
                  webConfirmationResultRef.current = confirmRes;
                  setSendingOtp(false);
                  setStep('otp');
                  setCountdown(60);
                  setTimeout(() => otpInputRef.current?.focus(), 200);
                } catch (err: any) {
                  setSendingOtp(false);
                  setError(mapFirebaseError(err?.code, err?.message));
                  triggerErrorShake();
                }
              },
            }
          );
          verifier.render();
        }, 300);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Không thể khởi tạo Firebase.');
        }
      }
    };

    initWebFirebase();
    return () => {
      mounted = false;
    };
  }, [isPhoneValid, phoneE164, step, webViewKey]);

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

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'RECAPTCHA_READY':
          setSendingOtp(false);
          break;
        case 'RECAPTCHA_SOLVED':
        case 'SENDING_OTP':
          setError('');
          setSendingOtp(true);
          break;
        case 'OTP_SENT':
          setSendingOtp(false);
          setError('');
          setStep('otp');
          setCountdown(60);
          setTimeout(() => otpInputRef.current?.focus(), 250);
          break;
        case 'FIREBASE_VERIFIED':
          setVerifyingOtp(false);
          if (data.idToken) {
            setFirebaseIdToken(data.idToken);
            setError('');
            setStep('password');
          }
          break;
        case 'VERIFY_ERROR':
          setVerifyingOtp(false);
          setError(mapFirebaseError(data.code, data.message));
          triggerErrorShake();
          break;
        case 'ERROR':
          setSendingOtp(false);
          setVerifyingOtp(false);
          setError(mapFirebaseError(data.code, data.message));
          triggerErrorShake();
          break;
      }
    } catch {
      // ignore
    }
  };

  const handleVerifyOtp = async (overrideOtp?: string) => {
    Keyboard.dismiss();
    const targetOtp = overrideOtp !== undefined ? overrideOtp : otp;
    const cleanOtp = targetOtp.replace(/\D/g, '').trim();

    if (cleanOtp.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP.');
      triggerErrorShake();
      return;
    }

    setVerifyingOtp(true);
    setError('');

    if (Platform.OS === 'web') {
      try {
        if (!webConfirmationResultRef.current) {
          setError('Phiên xác thực chưa sẵn sàng. Vui lòng gửi lại mã OTP.');
          setStep('phone');
          setVerifyingOtp(false);
          return;
        }
        const result = await webConfirmationResultRef.current.confirm(cleanOtp);
        const idToken = await result.user.getIdToken(true);
        setFirebaseIdToken(idToken);
        setVerifyingOtp(false);
        setStep('password');
      } catch (err: any) {
        setVerifyingOtp(false);
        setError(mapFirebaseError(err?.code, err?.message));
        triggerErrorShake();
      }
      return;
    }

    webViewRef.current?.injectJavaScript(
      `window.confirmOtpCode && window.confirmOtpCode(${JSON.stringify(cleanOtp)}); true;`
    );
  };

  const handleOtpChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setOtp(clean);
    if (error) setError('');
    if (clean.length === 6) {
      handleVerifyOtp(clean);
    }
  };

  const handleSubmitNewPassword = async () => {
    Keyboard.dismiss();
    setError('');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      triggerErrorShake();
      return;
    }
    if (confirmPw !== newPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      triggerErrorShake();
      return;
    }
    if (!firebaseIdToken) {
      setError('Thiếu mã xác thực Firebase. Vui lòng xác thực lại số điện thoại.');
      setStep('phone');
      return;
    }

    setSubmittingReset(true);
    try {
      await resetPassword(firebaseIdToken, newPassword);
      setDone(true);
      setTimeout(() => {
        onSuccess();
      }, 1100);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Không thể đặt lại mật khẩu. Vui lòng thử lại.'
      );
      triggerErrorShake();
    } finally {
      setSubmittingReset(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.ambientTopRight} pointerEvents="none" />
        <View style={styles.ambientBottomLeft} pointerEvents="none" />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={goBack}
                style={styles.backBtn}
                activeOpacity={0.75}
              >
                <Ionicons name="arrow-back" size={20} color="#0f172a" />
              </TouchableOpacity>

              <View style={styles.stepPill}>
                <View style={styles.stepDot} />
                <Text style={styles.stepPillText}>
                  {step === 'phone'
                    ? 'Bước 1/3 · Số điện thoại'
                    : step === 'otp'
                    ? 'Bước 2/3 · Mã OTP SMS'
                    : 'Bước 3/3 · Mật khẩu mới'}
                </Text>
              </View>

              <View style={{ width: 42 }} />
            </View>

            {/* Main Card */}
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { translateX: shakeAnim },
                  ],
                },
              ]}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={
                    done
                      ? 'checkmark-done'
                      : step === 'password'
                      ? 'key-outline'
                      : 'lock-open-outline'
                  }
                  size={28}
                  color="#ffffff"
                />
              </View>

              <Text style={styles.title}>Khôi phục mật khẩu</Text>
              <Text style={styles.subtitle}>
                {step === 'phone'
                  ? 'Nhập số điện thoại đã đăng ký tài khoản để nhận mã xác thực qua SMS.'
                  : step === 'otp'
                  ? `Nhập mã OTP 6 chữ số đã được gửi đến số ${phonePretty}`
                  : 'Thiết lập mật khẩu mới cho tài khoản của bạn.'}
              </Text>

              {/* BƯỚC 1: NHẬP SĐT */}
              {step === 'phone' ? (
                <View style={styles.sectionWrap}>
                  <Text style={styles.fieldLabel}>SỐ ĐIỆN THOẠI ĐĂNG KÝ *</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="call-outline" size={18} color="#ea580c" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="VD: 0901 234 567"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(v) => {
                        setPhone(v);
                        if (error) setError('');
                      }}
                    />
                    {isPhoneValid ? (
                      <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                    ) : null}
                  </View>
                  <Text style={styles.hintText}>
                    Nhập số điện thoại 10 số để hiển thị hộp xác minh bảo mật reCAPTCHA.
                  </Text>
                </View>
              ) : null}

              {/* WebView reCAPTCHA (Giữ kết nối ở cả bước 1 và bước 2) */}
              {isPhoneValid && step !== 'password' ? (
                <View
                  style={[
                    styles.recaptchaBox,
                    step === 'otp' && styles.recaptchaBoxHidden,
                  ]}
                >
                  <View style={styles.recaptchaHeader}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#ea580c" />
                    <Text style={styles.recaptchaHeaderText}>
                      Tích chọn xác minh để gửi mã OTP đến {phonePretty}
                    </Text>
                  </View>

                  {Platform.OS === 'web' ? (
                    <View style={styles.webRecaptchaMount}>
                      <View nativeID="reset-web-recaptcha-container" />
                    </View>
                  ) : (
                    <View style={styles.webViewWrapper}>
                      <WebViewComponent
                        key={`${webViewKey}-${phoneE164}`}
                        ref={webViewRef}
                        originWhitelist={['*']}
                        source={{
                          html: buildResetFirebaseHtml(phoneE164),
                          baseUrl: `https://${FIREBASE_CONFIG.authDomain}`,
                        }}
                        onMessage={handleWebViewMessage}
                        javaScriptEnabled
                        domStorageEnabled
                        thirdPartyCookiesEnabled
                        sharedCookiesEnabled
                        scrollEnabled={false}
                        style={styles.webView}
                      />
                    </View>
                  )}

                  {sendingOtp ? (
                    <View style={styles.sendingRow}>
                      <ActivityIndicator size="small" color="#f97316" />
                      <Text style={styles.sendingText}>
                        Đang gửi mã OTP qua SMS...
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* BƯỚC 2: NHẬP OTP */}
              {step === 'otp' ? (
                <View style={styles.sectionWrap}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => otpInputRef.current?.focus()}
                    style={styles.otpRow}
                  >
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                      const char = otp[idx] || '';
                      const isCurrent =
                        inputFocused &&
                        (otp.length === idx || (otp.length === 6 && idx === 5));
                      const isFilled = Boolean(char);

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.otpBox,
                            isFilled && styles.otpBoxFilled,
                            isCurrent && styles.otpBoxActive,
                            error ? styles.otpBoxError : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.otpChar,
                              isFilled && styles.otpCharFilled,
                            ]}
                          >
                            {char}
                          </Text>
                        </View>
                      );
                    })}

                    <TextInput
                      ref={otpInputRef}
                      style={styles.hiddenInput}
                      value={otp}
                      onChangeText={handleOtpChange}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      keyboardType="number-pad"
                      maxLength={6}
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      (otp.length < 6 || verifyingOtp) && styles.primaryBtnDisabled,
                    ]}
                    onPress={() => handleVerifyOtp()}
                    disabled={otp.length < 6 || verifyingOtp}
                    activeOpacity={0.9}
                  >
                    {verifyingOtp ? (
                      <View style={styles.btnContentRow}>
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text style={styles.primaryBtnText}>Đang kiểm tra OTP...</Text>
                      </View>
                    ) : (
                      <View style={styles.btnContentRow}>
                        <Text style={styles.primaryBtnText}>Xác nhận mã OTP</Text>
                        <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.resendRow}>
                    {countdown > 0 ? (
                      <Text style={styles.countdownText}>
                        Gửi lại mã sau <Text style={styles.countdownBold}>{countdown}s</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          setOtp('');
                          setError('');
                          setStep('phone');
                          setWebViewKey((k) => k + 1);
                        }}
                        style={styles.resendBtn}
                      >
                        <Ionicons name="refresh-outline" size={15} color="#ea580c" />
                        <Text style={styles.resendBtnText}>Gửi lại mã OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : null}

              {/* BƯỚC 3: ĐẶT MẬT KHẨU MỚI */}
              {step === 'password' ? (
                <View style={styles.sectionWrap}>
                  <Text style={styles.fieldLabel}>MẬT KHẨU MỚI *</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="lock-closed-outline" size={18} color="#ea580c" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Tối thiểu 6 ký tự"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showNewPw}
                      autoCapitalize="none"
                      value={newPassword}
                      onChangeText={(v) => {
                        setNewPassword(v);
                        if (error) setError('');
                      }}
                    />
                    <Pressable onPress={() => setShowNewPw(!showNewPw)}>
                      <Ionicons
                        name={showNewPw ? 'eye-off-outline' : 'eye-outline'}
                        size={19}
                        color="#94a3b8"
                      />
                    </Pressable>
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                    XÁC NHẬN MẬT KHẨU MỚI *
                  </Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#ea580c" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nhập lại mật khẩu mới"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPw}
                      autoCapitalize="none"
                      value={confirmPw}
                      onChangeText={(v) => {
                        setConfirmPw(v);
                        if (error) setError('');
                      }}
                    />
                    <Pressable onPress={() => setShowConfirmPw(!showConfirmPw)}>
                      <Ionicons
                        name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'}
                        size={19}
                        color="#94a3b8"
                      />
                    </Pressable>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      { marginTop: 20 },
                      (submittingReset || done) && styles.primaryBtnDisabled,
                    ]}
                    onPress={handleSubmitNewPassword}
                    disabled={submittingReset || done}
                    activeOpacity={0.9}
                  >
                    {submittingReset ? (
                      <View style={styles.btnContentRow}>
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text style={styles.primaryBtnText}>Đang cập nhật mật khẩu...</Text>
                      </View>
                    ) : (
                      <View style={styles.btnContentRow}>
                        <Ionicons name="checkmark-circle-outline" size={19} color="#ffffff" />
                        <Text style={styles.primaryBtnText}>Cập nhật mật khẩu mới</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Error Box */}
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#dc2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Success Box */}
              {done ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                  <Text style={styles.successText}>
                    Đặt lại mật khẩu thành công! Đang chuyển về màn hình đăng nhập...
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  flex: {
    flex: 1,
  },
  ambientTopRight: {
    position: 'absolute',
    top: -90,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(251, 146, 60, 0.16)',
  },
  ambientBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f97316',
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    shadowColor: '#9a3412',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  sectionWrap: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  hintText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 6,
  },
  recaptchaBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  recaptchaBoxHidden: {
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    padding: 0,
    marginTop: 0,
    borderWidth: 0,
  },
  recaptchaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  recaptchaHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  webViewWrapper: {
    width: '100%',
    height: 145,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webRecaptchaMount: {
    minHeight: 95,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  sendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ea580c',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
    marginBottom: 18,
    position: 'relative',
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    backgroundColor: '#fff7ed',
    borderColor: '#fb923c',
  },
  otpBoxActive: {
    borderColor: '#f97316',
    borderWidth: 2,
    backgroundColor: '#ffffff',
  },
  otpBoxError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  otpChar: {
    fontSize: 22,
    fontWeight: '800',
    color: '#94a3b8',
  },
  otpCharFilled: {
    color: '#0f172a',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.01,
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  resendRow: {
    marginTop: 14,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 12.5,
    color: '#64748b',
  },
  countdownBold: {
    fontWeight: '800',
    color: '#ea580c',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
  },
  resendBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#b91c1c',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  successText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803d',
  },
});

