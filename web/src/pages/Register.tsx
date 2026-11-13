import { useState, useEffect, useMemo, useRef } from 'react';
import cityfixLogo from '../assets/cityfix-logo.png';
import registerBackground from '../assets/register-city-background.jpg';
import { register, verifyPhoneFirebase, ApiError } from '../services';
import {
  VN_PROVINCES_2025,
  Province2025,
  getWardsForProvince2025,
  findProvince2025ByName,
  formatProvinceName,
  formatWardName,
  formatStandardAddress,
  removeVietnameseTones,
} from '../constants/vnProvinces2025';
import {
  loadFirebaseSdk,
  formatPhoneNumberE164,
  formatPhoneDisplay,
  mapFirebaseError,
} from '../constants/firebaseConfig';

interface Props {
  initialEmail?: string;
  initialStep?: number;
  onGoLogin: () => void;
  onRegisterSuccess: () => void;
}

const QUICK_PROVINCE_CODES = [79, 1, 48, 92, 31, 46];

export default function Register({
  initialEmail = '',
  initialStep = 1,
  onGoLogin,
  onRegisterSuccess,
}: Props) {
  const [step, setStep] = useState(initialStep);
  const [form, setForm] = useState({
    fullName: '',
    email: initialEmail,
    phone: '',
    password: '',
    confirmPassword: '',
    province: 'TP. Hồ Chí Minh',
    ward: '',
    address: '',
  });

  // Picker modal state for 2025 Merged Provinces & Wards (giống Mobile)
  const [pickerMode, setPickerMode] = useState<'province' | 'ward' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [availableWards, setAvailableWards] = useState<string[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  // Step 3: Firebase Phone Verification states
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const [serverError, setServerError] = useState('');

  const confirmationResultRef = useRef<any>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  const selectedProvinceObj = useMemo<Province2025 | undefined>(
    () => findProvince2025ByName(form.province),
    [form.province]
  );

  const quickProvinces = useMemo(
    () =>
      QUICK_PROVINCE_CODES.map((code) =>
        VN_PROVINCES_2025.find((p) => p.code === code)
      ).filter(Boolean) as Province2025[],
    []
  );

  // Load merged wards whenever selectedProvinceObj changes
  useEffect(() => {
    let active = true;
    if (!selectedProvinceObj) {
      setAvailableWards([]);
      return;
    }
    setAvailableWards(selectedProvinceObj.defaultWards);
    setLoadingWards(true);
    getWardsForProvince2025(selectedProvinceObj)
      .then((wards) => {
        if (active) setAvailableWards(wards);
      })
      .finally(() => {
        if (active) setLoadingWards(false);
      });
    return () => {
      active = false;
    };
  }, [selectedProvinceObj]);

  const filteredProvinces = useMemo(() => {
    const q = removeVietnameseTones(pickerSearch.trim());
    if (!q) return VN_PROVINCES_2025;
    return VN_PROVINCES_2025.filter(
      (p) =>
        removeVietnameseTones(p.name).includes(q) ||
        (p.mergedFrom && removeVietnameseTones(p.mergedFrom).includes(q))
    );
  }, [pickerSearch]);

  const filteredWards = useMemo(() => {
    const q = removeVietnameseTones(pickerSearch.trim());
    if (!q) return availableWards;
    return availableWards.filter((w) => removeVietnameseTones(w).includes(q));
  }, [availableWards, pickerSearch]);

  // Countdown timer for Resend OTP button
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Cleanup reCAPTCHA when leaving step 3
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Auto-init reCAPTCHA when entering Step 3
  useEffect(() => {
    if (step === 3 && !otpSent) {
      const timer = setTimeout(() => {
        initRecaptchaAndPrompt();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [step]);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
    setServerError('');
  }

  function handleSelectProvince(prov: Province2025, autoOpenWard = false) {
    const formatted = formatProvinceName(prov.name);
    const isDifferent = formatted !== form.province;
    setForm((f) => ({
      ...f,
      province: formatted,
      ward: isDifferent ? '' : f.ward,
    }));
    setErrors((e) => ({ ...e, province: '' }));
    setPickerSearch('');
    if (autoOpenWard) {
      setPickerMode('ward');
    } else {
      setPickerMode(null);
    }
  }

  function handleSelectWard(w: string) {
    const formatted = formatWardName(w);
    setForm((f) => ({ ...f, ward: formatted }));
    setErrors((e) => ({ ...e, ward: '' }));
    setPickerSearch('');
    setPickerMode(null);
  }

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Bắt buộc nhập họ tên';
    if (!form.email.includes('@')) e.email = 'Email không hợp lệ';
    if (form.phone.replace(/\D/g, '').length < 10)
      e.phone = 'Số điện thoại tối thiểu 10 số';
    if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Mật khẩu không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Record<string, string> = {};
    if (!form.province.trim()) e.province = 'Vui lòng chọn Tỉnh / Thành phố';
    if (!form.ward.trim()) e.ward = 'Vui lòng chọn Phường / Xã';
    if (!form.address.trim()) e.address = 'Vui lòng nhập số nhà, tên đường';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validateStep1()) setStep(2);
  }

  // 1. Submit Registration (POST /api/v1/auth/register)
  async function handleSubmitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setServerError('');

    const normalizedProvince = formatProvinceName(form.province.trim());
    const normalizedWard = formatWardName(form.ward.trim());
    const normalizedStreet = formatStandardAddress(form.address.trim());
    const fullAddress = [normalizedStreet, normalizedWard, normalizedProvince]
      .filter(Boolean)
      .join(', ');

    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phoneNumber: form.phone.replace(/\s/g, ''),
        province: normalizedProvince,
        ward: normalizedWard,
        address: fullAddress,
      });

      // Đăng ký thành công -> Chuyển sang bước 3 xác thực SĐT bằng Firebase OTP
      setOtp('');
      setOtpSent(false);
      setResendMessage('');
      setStep(3);
    } catch (err: any) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setLoading(false);
    }
  }

  // 2. Initialize Firebase reCAPTCHA & Send SMS OTP
  async function initRecaptchaAndPrompt() {
    setServerError('');
    setResendMessage('');

    try {
      const { firebaseAuth, auth } = await loadFirebaseSdk();
      const container = document.getElementById('web-register-recaptcha');
      if (!container) return;

      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
      container.innerHTML = '';

      recaptchaVerifierRef.current = new firebaseAuth.RecaptchaVerifier(
        auth,
        'web-register-recaptcha',
        {
          size: 'normal',
          callback: () => {
            sendFirebaseSmsOtp();
          },
          'expired-callback': () => {
            setServerError(
              'Phiên xác minh reCAPTCHA đã hết hạn. Vui lòng tích lại vào ô xác minh.'
            );
          },
        }
      );

      await recaptchaVerifierRef.current.render();
    } catch (err: any) {
      setServerError(
        mapFirebaseError(err?.code, err?.message) ||
          'Không thể khởi tạo khung xác thực bảo mật Firebase.'
      );
    }
  }

  async function sendFirebaseSmsOtp() {
    if (sendingSms) return;
    setSendingSms(true);
    setServerError('');
    setResendMessage('');

    try {
      const { firebaseAuth, auth } = await loadFirebaseSdk();
      const phoneE164 = formatPhoneNumberE164(form.phone);

      if (!recaptchaVerifierRef.current) {
        await initRecaptchaAndPrompt();
      }

      const confirmationResult = await firebaseAuth.signInWithPhoneNumber(
        auth,
        phoneE164,
        recaptchaVerifierRef.current
      );

      confirmationResultRef.current = confirmationResult;
      setOtpSent(true);
      setResendTimer(60);
      setResendMessage(
        `Mã OTP 6 chữ số đã được gửi qua SMS tới ${formatPhoneDisplay(form.phone)}.`
      );
    } catch (err: any) {
      setServerError(mapFirebaseError(err?.code, err?.message));
    } finally {
      setSendingSms(false);
    }
  }

  // 3. Submit OTP Verification -> Firebase confirm -> POST /api/v1/auth/verify-phone-firebase
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.trim().length < 6) {
      setServerError('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }
    if (!confirmationResultRef.current) {
      setServerError(
        'Vui lòng hoàn thành xác minh bảo mật reCAPTCHA để nhận mã OTP trước.'
      );
      return;
    }

    setLoading(true);
    setServerError('');

    try {
      const credential = await confirmationResultRef.current.confirm(otp.trim());
      const firebaseIdToken = await credential.user.getIdToken(true);

      await verifyPhoneFirebase(firebaseIdToken);
      onRegisterSuccess();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError(mapFirebaseError(err?.code, err?.message));
      }
    } finally {
      setLoading(false);
    }
  }

  // 4. Resend SMS OTP via Firebase
  async function handleResendOtp() {
    if (resendTimer > 0 || sendingSms) return;
    setOtpSent(false);
    setOtp('');
    setTimeout(() => {
      initRecaptchaAndPrompt();
    }, 100);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center relative py-10 overflow-hidden select-none">
      {/* 1. NỀN THÀNH PHỐ VIỆT NAM HIỆN ĐẠI */}
      <img
        src={registerBackground}
        alt="CityFix Smart City"
        className="absolute inset-0 w-full h-full object-cover object-right md:object-center pointer-events-none opacity-80"
      />

      {/* Lớp phủ Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-white/75 to-white/15 pointer-events-none" />
      <div className="absolute inset-0 bg-radial from-white/30 via-transparent to-transparent pointer-events-none" />

      {/* 2. BẢN SẮC VIỆT NAM — HỌA TIẾT TRỐNG ĐỒNG ĐÔNG SƠN */}
      <div className="absolute -left-40 -top-28 md:-left-20 md:-top-16 pointer-events-none opacity-[0.30] text-[#ea580c] animate-dongson-spin">
        <svg width="900" height="900" viewBox="0 0 700 700" fill="none" stroke="currentColor">
          <circle cx="350" cy="350" r="335" strokeWidth="3.5" />
          <circle cx="350" cy="350" r="315" strokeWidth="2" strokeDasharray="6 4" />
          <circle cx="350" cy="350" r="295" strokeWidth="2.5" />

          <circle cx="350" cy="350" r="270" strokeWidth="2" />
          <circle cx="350" cy="350" r="235" strokeWidth="2" />
          {[...Array(16)].map((_, i) => {
            const angle = (i * 360) / 16;
            return (
              <g key={`lac-reg-${i}`} transform={`rotate(${angle} 350 350)`}>
                <path
                  d="M 350,90 Q 368,98 380,93 Q 364,110 342,105 Q 330,102 322,95 Q 336,98 350,90 Z"
                  fill="currentColor"
                  fillOpacity="0.95"
                />
                <circle cx="376" cy="95" r="2" fill="currentColor" />
              </g>
            );
          })}

          <circle cx="350" cy="350" r="210" strokeWidth="2" />
          <circle cx="350" cy="350" r="180" strokeWidth="2" />
          {[...Array(20)].map((_, i) => {
            const angle = (i * 360) / 20;
            return (
              <g key={`geom-reg-${i}`} transform={`rotate(${angle} 350 350)`}>
                <polygon points="350,182 342,195 350,208 358,195" fill="currentColor" fillOpacity="0.75" />
              </g>
            );
          })}

          <circle cx="350" cy="350" r="155" strokeWidth="2.5" strokeDasharray="6 5" />
          <circle cx="350" cy="350" r="125" strokeWidth="2" />
          <circle cx="350" cy="350" r="90" strokeWidth="2" />

          <circle cx="350" cy="350" r="55" fill="currentColor" fillOpacity="0.35" />
          {[...Array(14)].map((_, i) => {
            const angle = (i * 360) / 14;
            return (
              <g key={`sun-reg-${i}`} transform={`rotate(${angle} 350 350)`}>
                <polygon points="350,220 336,275 364,275" fill="currentColor" fillOpacity="0.95" />
                <polygon points="350,280 340,312 360,312" fill="currentColor" fillOpacity="0.55" />
                <line x1="350" y1="270" x2="350" y2="190" strokeWidth="2.2" stroke="currentColor" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* 2.1 CÀNH LÁ CÂY XANH ĐÔ THỊ & RUY BĂNG NGHỆ THUẬT */}
      <div className="absolute top-0 left-0 w-80 h-80 pointer-events-none z-0 animate-leaf-sway">
        <svg viewBox="0 0 250 250" className="w-full h-full fill-none">
          <path d="M-20,50 Q70,20 90,130 T200,200" stroke="#f97316" strokeWidth="22" strokeLinecap="round" opacity="0.75" />
          <path d="M-10,20 Q90,-5 120,80 T220,160" stroke="#ea580c" strokeWidth="14" strokeLinecap="round" opacity="0.65" />
          <g transform="translate(10, 5)">
            <path d="M0,0 Q60,40 110,100" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M25,20 C55,0 95,15 90,48 C70,60 35,48 25,20 Z" fill="#16a34a" fillOpacity="0.95" />
            <path d="M25,20 Q55,28 90,48" stroke="#15803d" strokeWidth="1.8" />
            <path d="M60,45 C90,25 128,40 120,72 C100,85 68,72 60,45 Z" fill="#22c55e" fillOpacity="0.95" />
            <path d="M60,45 Q90,52 120,72" stroke="#15803d" strokeWidth="1.8" />
          </g>
        </svg>
      </div>

      {/* Góc dưới bên trái */}
      <div className="absolute -bottom-8 -left-8 w-[380px] h-[340px] pointer-events-none z-0 animate-leaf-sway" style={{ animationDelay: '2s' }}>
        <svg viewBox="0 0 350 300" className="w-full h-full fill-none">
          <path d="M-30,240 Q120,200 160,90 T290,10" stroke="#f97316" strokeWidth="32" strokeLinecap="round" opacity="0.8" />
          <path d="M-10,270 Q140,230 190,120 T320,40" stroke="#ea580c" strokeWidth="20" strokeLinecap="round" opacity="0.75" />
          <g transform="translate(30, 130) rotate(-18)">
            <path d="M0,120 Q60,50 130,0" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M30,80 C10,45 35,10 75,28 C85,60 60,90 30,80 Z" fill="#16a34a" fillOpacity="0.95" />
            <path d="M75,50 C65,15 95,-12 130,5 C135,38 105,65 75,50 Z" fill="#22c55e" fillOpacity="0.95" />
          </g>
        </svg>
      </div>

      {/* 2.2 BLUEPRINT GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* 2.3 TOP CIVIC BAR */}
      <div className="hidden sm:flex items-center absolute top-4 left-8 z-10 pointer-events-none text-[11px] font-semibold text-slate-500">
        <div className="flex items-center gap-3 bg-white/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-slate-700 font-bold uppercase tracking-wider text-[10px]">Cổng Quản Trị Đô Thị TP.HCM</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono-cf text-[10px] text-slate-500">Đăng ký Tài khoản Hệ thống</span>
        </div>
      </div>

      {/* 3. SMART CITY MAP ROUTE LINES */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-55" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 120 700 C 450 650, 700 750, 1100 600 C 1450 480, 1700 520, 2000 450"
          fill="none"
          stroke="#f97316"
          strokeWidth="1.8"
          className="animate-route-dash"
        />
        <path
          d="M 600 200 C 850 180, 1150 350, 1500 380 C 1750 400, 1950 320, 2150 260"
          fill="none"
          stroke="#ea580c"
          strokeWidth="1.5"
          strokeOpacity="0.75"
          className="animate-route-dash"
        />
      </svg>

      {/* 4. MAIN HERO: REGISTER CARD */}
      <div className="relative z-10 w-full max-w-lg px-4 screen-enter">
        {/* Logo */}
        <div className="flex flex-col items-center mb-4 text-center">
          <img src={cityfixLogo} alt="CityFix" className="w-36 h-28 object-contain -mb-3 drop-shadow-2xs" />
          <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">
            ĐĂNG KÝ TÀI KHOẢN CITYFIX
          </h2>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center gap-2 mb-4 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all
                ${step >= s ? 'bg-orange-500 text-white shadow-xs' : 'bg-slate-200 text-slate-400'}`}
              >
                {s}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                  step >= s ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {s === 1 ? 'Thông tin' : s === 2 ? 'Địa bàn' : 'Xác thực SĐT'}
              </span>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 ${
                    step > s ? 'bg-orange-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card Frame */}
        <div className="bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-2xl overflow-hidden shadow-xl">
          <div className="h-[3px] bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c]" />

          {/* Server Error Alert */}
          {serverError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-[12px] text-red-600">{serverError}</p>
            </div>
          )}

          {/* Resend / SMS sent notice */}
          {resendMessage && (
            <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-[12px] text-green-700">{resendMessage}</p>
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="px-6 py-6 space-y-4">
              <Field label="Họ và tên" error={errors.fullName}>
                <input
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={inputCls(errors.fullName)}
                />
              </Field>
              <Field label="Địa chỉ Email" error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="example@gmail.com"
                  className={inputCls(errors.email)}
                />
              </Field>
              <Field label="Số điện thoại (nhận mã OTP SMS)" error={errors.phone}>
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="0901234567"
                  className={inputCls(errors.phone)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mật khẩu" error={errors.password}>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="••••••••"
                    className={inputCls(errors.password)}
                  />
                </Field>
                <Field label="Xác nhận MK" error={errors.confirmPassword}>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className={inputCls(errors.confirmPassword)}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="w-full relative rounded-xl overflow-hidden px-4 py-3 active:scale-[0.97] transition-transform mt-2 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    background:
                      'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)',
                  }}
                />
                <span className="relative text-white font-bold uppercase tracking-wide text-[13px]">
                  Tiếp theo →
                </span>
              </button>
            </div>
          )}

          {/* STEP 2: Khu vực cư trú / Địa bàn (Giống Mobile: Chọn Tỉnh/TP & Phường/Xã từ danh sách, bỏ Vai trò & Cơ quan) */}
          {step === 2 && (
            <form onSubmit={handleSubmitRegister} className="px-6 py-6 space-y-4">
              {/* TỈNH / THÀNH PHỐ SELECTOR (Mở danh sách chọn giống Mobile) */}
              <Field label="Tỉnh / Thành phố *" error={errors.province}>
                <button
                  type="button"
                  onClick={() => {
                    setPickerSearch('');
                    setPickerMode('province');
                  }}
                  className={`w-full flex items-center justify-between bg-gray-50 border ${
                    errors.province
                      ? 'border-red-500/60'
                      : pickerMode === 'province'
                      ? 'border-orange-500 ring-2 ring-orange-500/15 bg-white'
                      : 'border-gray-300 hover:border-orange-400'
                  } rounded-xl px-3.5 py-2.5 text-left transition-all cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        form.province
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18" />
                        <path d="M5 21V7l8-4v18" />
                        <path d="M19 21V11l-6-4" />
                      </svg>
                    </span>
                    <span
                      className={`text-[13px] truncate ${
                        form.province ? 'font-semibold text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {form.province || 'Bấm để chọn Tỉnh / Thành phố'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {form.province ? (
                      <span className="text-emerald-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                        Chọn
                      </span>
                    )}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </button>
              </Field>

              {/* PHƯỜNG / XÃ (SAU SÁP NHẬP) SELECTOR */}
              <Field label="Phường / Xã (Sau sáp nhập) *" error={errors.ward}>
                <button
                  type="button"
                  onClick={() => {
                    setPickerSearch('');
                    if (!form.province.trim()) {
                      setErrors((prev) => ({
                        ...prev,
                        province: 'Vui lòng chọn Tỉnh / Thành phố trước khi chọn Phường / Xã.',
                      }));
                      setPickerMode('province');
                      return;
                    }
                    setPickerMode('ward');
                  }}
                  className={`w-full flex items-center justify-between bg-gray-50 border ${
                    errors.ward
                      ? 'border-red-500/60'
                      : pickerMode === 'ward'
                      ? 'border-orange-500 ring-2 ring-orange-500/15 bg-white'
                      : 'border-gray-300 hover:border-orange-400'
                  } rounded-xl px-3.5 py-2.5 text-left transition-all cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        form.ward
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                        <line x1="8" y1="2" x2="8" y2="18" />
                        <line x1="16" y1="6" x2="16" y2="22" />
                      </svg>
                    </span>
                    <span
                      className={`text-[13px] truncate ${
                        form.ward ? 'font-semibold text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {form.ward
                        ? form.ward
                        : form.province
                        ? loadingWards
                          ? 'Đang tải danh sách Phường / Xã...'
                          : `Chọn Phường / Xã thuộc ${form.province}...`
                        : 'Vui lòng chọn Tỉnh / Thành phố ở trên trước'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {form.ward ? (
                      <span className="text-emerald-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                        Danh sách
                      </span>
                    )}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </button>
              </Field>

              {/* ĐỊA CHỈ CỤ THỂ */}
              <Field label="Địa chỉ cụ thể (Số nhà, tên đường) *" error={errors.address}>
                <input
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="VD: 123 Nguyễn Huệ"
                  className={inputCls(errors.address)}
                />
              </Field>

              {/* Xem trước địa chỉ chuẩn hóa */}
              {(form.address.trim() || form.ward || form.province) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-2.5 flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">📍</span>
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-700">Địa chỉ ghi nhận: </span>
                    {[
                      formatStandardAddress(form.address.trim()),
                      form.ward ? formatWardName(form.ward) : '',
                      form.province ? formatProvinceName(form.province) : '',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
              )}

              <div className="relative rounded-xl border border-orange-500/25 bg-orange-500/8 px-3.5 py-3">
                <p className="text-[11px] text-orange-600 leading-relaxed">
                  Hệ thống sẽ gửi mã xác thực OTP 6 chữ số qua tin nhắn SMS (Firebase) tới số điện thoại{' '}
                  <span className="font-bold">{formatPhoneDisplay(form.phone) || form.phone}</span> sau khi hoàn tất bước này.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-600 hover:text-gray-800 text-[13px] font-semibold uppercase tracking-wide transition-colors active:scale-[0.97] cursor-pointer"
                >
                  ← Quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 relative rounded-xl overflow-hidden px-4 py-3 active:scale-[0.97] transition-transform disabled:opacity-60 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                  <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                      background:
                        'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)',
                    }}
                  />
                  <span className="relative text-white font-bold uppercase tracking-wide text-[13px]">
                    {loading ? 'Đang gửi đăng ký...' : 'Đăng ký ngay'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Verify Phone via Firebase SMS OTP (POST /api/v1/auth/verify-phone-firebase) */}
          {step === 3 && (
            <form onSubmit={handleVerifyOtp} className="px-6 py-6 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto text-orange-600 mb-2">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-bold text-gray-900">
                  Xác thực Số điện thoại
                </h3>
                <p className="text-[12px] text-gray-500">
                  Mã OTP 6 chữ số được gửi qua SMS tới số điện thoại:
                </p>
                <p className="text-[14px] font-bold text-orange-600">
                  {formatPhoneDisplay(form.phone)} ({formatPhoneNumberE164(form.phone)})
                </p>
              </div>

              {/* Bước xác minh reCAPTCHA trước khi gửi SMS */}
              {!otpSent && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-center">
                  <p className="text-[12px] font-semibold text-slate-700">
                    Vui lòng xác nhận bảo mật reCAPTCHA bên dưới để nhận mã OTP qua SMS:
                  </p>
                  <div
                    id="web-register-recaptcha"
                    className="flex items-center justify-center min-h-[78px]"
                  />
                  {sendingSms && (
                    <p className="text-[12px] text-orange-600 font-semibold animate-pulse">
                      Đang gửi mã OTP qua tin nhắn SMS...
                    </p>
                  )}
                </div>
              )}

              {/* Ô nhập 6 chữ số OTP sau khi đã gửi SMS */}
              {otpSent && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block text-center">
                      Nhập mã OTP SMS (6 chữ số)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setServerError('');
                      }}
                      placeholder="123456"
                      className="w-full text-center text-[22px] tracking-[0.35em] font-mono font-bold bg-gray-50 border border-gray-300 rounded-xl py-3 text-gray-900 outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full relative rounded-xl overflow-hidden px-4 py-3 active:scale-[0.97] transition-transform disabled:opacity-50 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                    <span className="relative text-white font-bold uppercase tracking-wide text-[13px]">
                      {loading ? 'Đang xác thực...' : 'Xác thực số điện thoại'}
                    </span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={resendTimer > 0 || sendingSms}
                      onClick={handleResendOtp}
                      className="text-[12px] text-orange-600 hover:text-orange-700 font-semibold disabled:text-gray-400 transition-colors cursor-pointer"
                    >
                      {sendingSms
                        ? 'Đang gửi lại...'
                        : resendTimer > 0
                        ? `Gửi lại mã OTP sau (${resendTimer}s)`
                        : 'Chưa nhận được mã? Gửi lại OTP SMS'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-[12px] text-gray-500 mt-5">
          Đã có tài khoản?{' '}
          <button
            type="button"
            onClick={onGoLogin}
            className="text-orange-600 hover:text-orange-700 font-semibold transition-colors cursor-pointer"
          >
            Đăng nhập
          </button>
        </p>
      </div>

      {/* MODAL DANH SÁCH CHỌN TỈNH / THÀNH PHỐ & PHƯỜNG / XÃ (Giống Mobile) */}
      {pickerMode && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPickerMode(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900">
                  {pickerMode === 'province'
                    ? 'Chọn Tỉnh / Thành phố (34 đơn vị)'
                    : `Chọn Phường / Xã (${form.province})`}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {pickerMode === 'province'
                    ? 'Đơn vị hành chính chuẩn hóa có tiền tố TP. / Tỉnh'
                    : `Danh sách ${availableWards.length} Phường / Xã chuẩn hóa (P.)`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerMode(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300/70 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thanh tìm kiếm nhanh */}
            <div className="p-3.5 border-b border-slate-100 bg-white">
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400">🔍</span>
                <input
                  type="text"
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={
                    pickerMode === 'province'
                      ? 'Tìm nhanh Tỉnh / Thành phố (VD: Hồ Chí Minh, Hà Nội...)'
                      : 'Tìm nhanh Phường / Xã (VD: Sài Gòn, Bến Thành, Đức Nhuận...)'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white"
                />
                {pickerSearch && (
                  <button
                    type="button"
                    onClick={() => setPickerSearch('')}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Thành phố lớn chọn nhanh */}
              {pickerMode === 'province' && !pickerSearch.trim() && (
                <div className="mt-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Đô thị trung ương phổ biến
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickProvinces.map((qp) => {
                      const isSelected = form.province === qp.name;
                      return (
                        <button
                          key={qp.code}
                          type="button"
                          onClick={() => handleSelectProvince(qp, true)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                              : 'bg-orange-50/70 text-orange-700 border-orange-200 hover:bg-orange-100'
                          }`}
                        >
                          {qp.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Danh sách cuộn */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {pickerMode === 'province' ? (
                filteredProvinces.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    Không tìm thấy Tỉnh / Thành phố phù hợp.
                  </div>
                ) : (
                  filteredProvinces.map((prov) => {
                    const isSelected = form.province === prov.name;
                    return (
                      <button
                        key={prov.code}
                        type="button"
                        onClick={() => handleSelectProvince(prov, true)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50 text-orange-700 font-bold'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[13px] truncate">{prov.name}</div>
                          {prov.mergedFrom && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              Sáp nhập: {prov.mergedFrom}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <span className="text-orange-600 font-bold text-sm flex-shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })
                )
              ) : loadingWards ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Đang tải danh sách Phường / Xã...
                </div>
              ) : filteredWards.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Không tìm thấy Phường / Xã phù hợp với từ khóa "{pickerSearch}".
                </div>
              ) : (
                filteredWards.map((w) => {
                  const formattedW = formatWardName(w);
                  const isSelected = form.ward === formattedW || form.ward === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleSelectWard(w)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 text-orange-700 font-bold'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="text-[13px]">{formattedW}</span>
                      {isSelected && (
                        <span className="text-orange-600 font-bold text-sm">✓</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function inputCls(err?: string) {
  return `w-full bg-gray-50 border ${
    err ? 'border-red-500/50' : 'border-gray-300'
  } rounded-xl px-3.5 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 outline-none focus:border-orange-500/50 transition-colors`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
