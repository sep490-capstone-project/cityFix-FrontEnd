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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { ApiError, verifyPhoneFirebase, VerifyPhoneFirebaseData } from '../api';

const WebViewComponent = WebView as any;
import {
  FIREBASE_CONFIG,
  formatPhoneNumberE164,
  formatPhoneDisplay,
} from '../constants/firebaseConfig';

interface Props {
  phoneNumber: string;
  email?: string;
  goBack: () => void;
  onVerified: (tokens?: VerifyPhoneFirebaseData) => void;
}

/**
 * Tạo nội dung HTML nhúng Firebase Web SDK v10 để xử lý reCAPTCHA & Phone Auth
 * Dùng baseUrl từ FIREBASE_CONFIG.authDomain để khớp Authorized Domain trên Firebase Console
 */
function buildFirebasePhoneHtml(phoneE164: string): string {
  const configJson = JSON.stringify(FIREBASE_CONFIG);
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Xác thực SĐT Firebase</title>
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
        statusEl.innerText = 'Vui lòng tích vào ô xác minh bên trên để nhận mã OTP';
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
          statusEl.innerText = 'Mã OTP đã được gửi đến ' + (phoneToUse || targetPhone);
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
  if (c.includes('billing-not-enabled')) {
    return 'Dự án Firebase cần kích hoạt gói gửi SMS hoặc dùng số điện thoại thử nghiệm.';
  }
  return rawMessage || 'Xác thực không thành công. Vui lòng thử lại.';
}

export default function VerifyPhoneScreen({
  phoneNumber,
  goBack,
  onVerified,
}: Props) {
  const phoneE164 = formatPhoneNumberE164(phoneNumber);
  const phonePretty = formatPhoneDisplay(phoneNumber);

  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'recaptcha' | 'otp'>('recaptcha');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [webViewKey, setWebViewKey] = useState(1);

  const inputRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);
  const webConfirmationResultRef = useRef<any>(null);

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

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Web Platform direct Firebase Auth initialization
  useEffect(() => {
    if (Platform.OS !== 'web') return;
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
          const container = document.getElementById('web-recaptcha-container');
          if (!container) return;
          container.innerHTML = '';

          const verifier = new firebaseAuth.RecaptchaVerifier(
            auth,
            'web-recaptcha-container',
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
                  setTimeout(() => inputRef.current?.focus(), 200);
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
          setError(e?.message || 'Không thể khởi tạo Firebase trên trình duyệt.');
        }
      }
    };

    initWebFirebase();
    return () => {
      mounted = false;
    };
  }, [phoneE164, webViewKey]);

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

  // Xử lý sau khi nhận được firebaseIdToken từ Firebase -> Gửi xuống Backend CityFix
  const handleSubmitFirebaseIdToken = async (firebaseIdToken: string) => {
    setVerifying(true);
    setError('');
    try {
      const tokenData = await verifyPhoneFirebase(firebaseIdToken);
      setVerified(true);
      Animated.spring(successScale, {
        toValue: 1,
        speed: 18,
        bounciness: 14,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        onVerified(tokenData);
      }, 950);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Không thể xác thực với máy chủ CityFix. Vui lòng thử lại.'
      );
      triggerErrorShake();
    } finally {
      setVerifying(false);
    }
  };

  // Xử lý message gửi lên từ WebView Firebase
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
          setTimeout(() => inputRef.current?.focus(), 250);
          break;
        case 'FIREBASE_VERIFIED':
          if (data.idToken) {
            handleSubmitFirebaseIdToken(data.idToken);
          }
          break;
        case 'VERIFY_ERROR':
          setVerifying(false);
          setError(mapFirebaseError(data.code, data.message));
          triggerErrorShake();
          break;
        case 'ERROR':
          setSendingOtp(false);
          setVerifying(false);
          setError(mapFirebaseError(data.code, data.message));
          triggerErrorShake();
          break;
      }
    } catch {
      // ignore non-json message
    }
  };

  // Khi người dùng bấm Xác thực OTP
  const handleVerifyOtp = async (overrideOtp?: string) => {
    Keyboard.dismiss();
    const targetOtp = overrideOtp !== undefined ? overrideOtp : otp;
    const cleanOtp = targetOtp.replace(/\D/g, '').trim();

    if (cleanOtp.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP.');
      triggerErrorShake();
      return;
    }

    setVerifying(true);
    setError('');

    if (Platform.OS === 'web') {
      try {
        if (!webConfirmationResultRef.current) {
          setError('Phiên xác thực chưa sẵn sàng. Vui lòng giải lại reCAPTCHA.');
          setStep('recaptcha');
          setVerifying(false);
          return;
        }
        const result = await webConfirmationResultRef.current.confirm(cleanOtp);
        const idToken = await result.user.getIdToken(true);
        await handleSubmitFirebaseIdToken(idToken);
      } catch (err: any) {
        setVerifying(false);
        setError(mapFirebaseError(err?.code, err?.message));
        triggerErrorShake();
      }
      return;
    }

    // Gọi hàm confirmOtpCode bên trong WebView
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

  const handleResendOtp = () => {
    if (countdown > 0) return;
    setOtp('');
    setError('');
    setStep('recaptcha');
    setWebViewKey((k) => k + 1);
  };

  const isComplete = otp.length === 6;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />

        {/* Ambient Orange Background Orbs */}
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
                <Text style={styles.stepPillText}>Xác thực SĐT (SMS)</Text>
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
              {/* Animated Phone Shield Badge */}
              <View style={styles.badgeContainer}>
                <Animated.View
                  style={[
                    styles.pulseRingOuter,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <View style={styles.pulseRingInner}>
                  <Ionicons
                    name={verified ? 'checkmark-done' : 'phone-portrait-outline'}
                    size={30}
                    color="#ffffff"
                  />
                </View>
              </View>

              {/* Title & Description */}
              <Text style={styles.title}>Xác thực số điện thoại</Text>
              <Text style={styles.subtitle}>
                Mã xác thực OTP 6 chữ số sẽ được gửi qua tin nhắn SMS đến số điện thoại:
              </Text>

              {/* Phone Chip */}
              <View style={styles.phoneBadge}>
                <Ionicons name="call" size={15} color="#ea580c" />
                <Text style={styles.phoneBadgeText}>
                  {phonePretty || phoneNumber} ({phoneE164})
                </Text>
              </View>

              <TouchableOpacity
                onPress={goBack}
                style={styles.changePhoneBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color="#f97316" />
                <Text style={styles.changePhoneText}>Đổi số điện thoại khác</Text>
              </TouchableOpacity>

              {/* WebView reCAPTCHA Container (Hiển thị ở bước 1 để giải Captcha, ẩn đi ở bước 2 nhưng vẫn giữ kết nối xác nhận OTP) */}
              <View
                style={[
                  styles.recaptchaBox,
                  step === 'otp' && styles.recaptchaBoxHidden,
                ]}
              >
                <View style={styles.recaptchaHeader}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#ea580c" />
                  <Text style={styles.recaptchaHeaderText}>
                    Xác minh bảo mật reCAPTCHA để nhận mã SMS
                  </Text>
                </View>

                {Platform.OS === 'web' ? (
                  <View style={styles.webRecaptchaMount}>
                    <View nativeID="web-recaptcha-container" />
                  </View>
                ) : (
                  <View style={styles.webViewWrapper}>
                    <WebViewComponent
                      key={webViewKey}
                      ref={webViewRef}
                      originWhitelist={['*']}
                      source={{
                        html: buildFirebasePhoneHtml(phoneE164),
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
                      Đang gửi mã OTP qua SMS đến {phonePretty}...
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Bước 2: Nhập mã OTP 6 chữ số sau khi đã gửi SMS */}
              {step === 'otp' ? (
                <View style={styles.otpSection}>
                  <View style={styles.smsSentBanner}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.smsSentBannerText}>
                      Mã OTP đã được gửi qua SMS! Vui lòng nhập 6 chữ số bên dưới.
                    </Text>
                  </View>

                  <Text style={styles.otpSectionLabel}>NHẬP MÃ XÁC THỰC (6 SỐ)</Text>

                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => inputRef.current?.focus()}
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
                            verified && styles.otpBoxSuccess,
                          ]}
                        >
                          <Text
                            style={[
                              styles.otpChar,
                              isFilled && styles.otpCharFilled,
                              verified && styles.otpCharSuccess,
                            ]}
                          >
                            {char}
                          </Text>
                          {isCurrent && !isFilled ? (
                            <View style={styles.cursorIndicator} />
                          ) : null}
                        </View>
                      );
                    })}

                    <TextInput
                      ref={inputRef}
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

                  {/* Submit Button */}
                  <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
                    <TouchableOpacity
                      style={[
                        styles.verifyBtn,
                        (!isComplete || verifying || verified) && styles.verifyBtnDisabled,
                        verified && styles.verifyBtnSuccess,
                      ]}
                      onPress={() => handleVerifyOtp()}
                      onPressIn={handleBtnPressIn}
                      onPressOut={handleBtnPressOut}
                      disabled={!isComplete || verifying || verified}
                      activeOpacity={0.9}
                    >
                      {verifying ? (
                        <View style={styles.btnContentRow}>
                          <ActivityIndicator color="#ffffff" size="small" />
                          <Text style={styles.verifyBtnText}>Đang xác thực OTP...</Text>
                        </View>
                      ) : verified ? (
                        <View style={styles.btnContentRow}>
                          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                          <Text style={styles.verifyBtnText}>Hoàn tất kích hoạt</Text>
                        </View>
                      ) : (
                        <View style={styles.btnContentRow}>
                          <Text style={styles.verifyBtnText}>Xác nhận mã OTP</Text>
                          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Resend OTP Row */}
                  <View style={styles.resendRow}>
                    {countdown > 0 ? (
                      <Text style={styles.countdownText}>
                        Gửi lại mã OTP sau <Text style={styles.countdownBold}>{countdown}s</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity
                        onPress={handleResendOtp}
                        style={styles.resendBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="refresh-outline" size={15} color="#ea580c" />
                        <Text style={styles.resendBtnText}>Gửi lại mã OTP qua SMS</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : null}

              {/* Error Banner */}
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#dc2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Success Banner */}
              {verified ? (
                <Animated.View
                  style={[
                    styles.successBox,
                    { transform: [{ scale: successScale }] },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                  <Text style={styles.successText}>
                    Xác thực số điện thoại thành công! Đang đăng nhập...
                  </Text>
                </Animated.View>
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
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
  badgeContainer: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
  },
  pulseRingInner: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
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
    paddingHorizontal: 6,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  phoneBadgeText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#c2410c',
  },
  changePhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changePhoneText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#f97316',
  },
  recaptchaBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  recaptchaBoxHidden: {
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    padding: 0,
    marginBottom: 0,
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
  otpSection: {
    width: '100%',
    alignItems: 'center',
  },
  smsSentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
  },
  smsSentBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
    lineHeight: 17,
  },
  otpSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 10,
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
    height: 56,
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
  otpBoxSuccess: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  otpChar: {
    fontSize: 22,
    fontWeight: '800',
    color: '#94a3b8',
  },
  otpCharFilled: {
    color: '#0f172a',
  },
  otpCharSuccess: {
    color: '#15803d',
  },
  cursorIndicator: {
    position: 'absolute',
    bottom: 11,
    width: 16,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#f97316',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.01,
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
    marginTop: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#b91c1c',
    lineHeight: 17,
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
    marginTop: 10,
  },
  successText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803d',
  },
  verifyBtn: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 5,
  },
  verifyBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnSuccess: {
    backgroundColor: '#16a34a',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  resendRow: {
    marginTop: 16,
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
});
