import { useState, useEffect } from 'react';
import cityfixLogo from '../assets/cityfix-logo.png';
import registerBackground from '../assets/register-city-background.jpg';
import { DEPARTMENTS } from '../data';
import { register, verifyEmail, resendOtp, ApiError } from '../services';

interface Props {
  initialEmail?: string;
  initialStep?: number;
  onGoLogin: () => void;
  onRegisterSuccess: () => void;
}

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
    province: 'Tp Ho Chi Minh',
    ward: '',
    address: '',
    role: 'STAFF',
    departmentId: '',
  });

  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const [serverError, setServerError] = useState('');

  // Countdown timer for Resend OTP button
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
    setServerError('');
  }

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Bắt buộc nhập họ tên';
    if (!form.email.includes('@')) e.email = 'Email không hợp lệ';
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Số điện thoại tối thiểu 10 số';
    if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Mật khẩu không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Record<string, string> = {};
    if (!form.province.trim()) e.province = 'Bắt buộc';
    if (!form.ward.trim()) e.ward = 'Bắt buộc';
    if (!form.address.trim()) e.address = 'Bắt buộc';
    if ((form.role === 'STAFF' || form.role === 'ADMIN') && !form.departmentId) {
      e.departmentId = 'Bắt buộc chọn cơ quan';
    }
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

    try {
      await register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phoneNumber: form.phone,
        province: form.province,
        ward: form.ward,
        address: form.address,
      });

      // Đăng ký thành công -> Chuyển sang bước 3 nhập mã OTP xác thực
      setStep(3);
      setResendTimer(60);
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

  // 2. Submit OTP Verification (POST /api/v1/auth/verify-email)
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) {
      setServerError('Vui lòng nhập mã OTP.');
      return;
    }

    setLoading(true);
    setServerError('');

    try {
      await verifyEmail({
        email: form.email,
        otp: otp.trim(),
      });

      onRegisterSuccess();
    } catch (err: any) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : 'Mã OTP không đúng hoặc đã hết hạn.'
      );
    } finally {
      setLoading(false);
    }
  }

  // 3. Resend OTP (POST /api/v1/auth/resend-otp)
  async function handleResendOtp() {
    if (resendTimer > 0 || resendLoading) return;

    setResendLoading(true);
    setServerError('');
    setResendMessage('');

    try {
      await resendOtp({
        email: form.email,
      });
      setResendMessage('Mã OTP mới đã được gửi vào email của bạn!');
      setResendTimer(60);
    } catch (err: any) {
      setServerError(
        err instanceof ApiError ? err.message : 'Không thể gửi lại OTP. Vui lòng thử lại.'
      );
    } finally {
      setResendLoading(false);
    }
  }

  const staffDepts = DEPARTMENTS.filter(
    (d) => d.level === 'CITY' || d.level === 'WARD'
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center relative py-8 overflow-hidden">
      <img
        src={registerBackground}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />
      <div className="absolute inset-0 bg-white/35 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[3px] hazard-stripe-thin" />

      <div className="relative z-10 w-full max-w-md px-4 screen-enter">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={cityfixLogo} alt="CityFix" className="w-36 h-36 object-contain -mb-5" />
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">
            Đăng ký tài khoản Staff / Admin
          </p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-colors
                ${step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}
              >
                {s}
              </div>
              <span
                className={`text-[10px] font-semibold truncate ${
                  step >= s ? 'text-gray-800' : 'text-gray-400'
                }`}
              >
                {s === 1 ? 'Thông tin' : s === 2 ? 'Địa chỉ' : 'Xác thực'}
              </span>
              {s < 3 && (
                <div
                  className={`flex-1 h-px ${
                    step > s ? 'bg-orange-500/60' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-2xl overflow-hidden card-depth shadow-sm">
          <div className="h-[2px] hazard-stripe-thin" />

          {/* Server Error Alert */}
          {serverError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-[12px] text-red-600">{serverError}</p>
            </div>
          )}

          {/* Resend success notice */}
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
              <Field label="Email công vụ" error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="example@gmail.com"
                  className={inputCls(errors.email)}
                />
              </Field>
              <Field label="Số điện thoại" error={errors.phone}>
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

          {/* STEP 2: Address & Organization */}
          {step === 2 && (
            <form onSubmit={handleSubmitRegister} className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tỉnh / Thành phố" error={errors.province}>
                  <input
                    value={form.province}
                    onChange={(e) => set('province', e.target.value)}
                    placeholder="Tp Ho Chi Minh"
                    className={inputCls(errors.province)}
                  />
                </Field>
                <Field label="Phường / Xã" error={errors.ward}>
                  <input
                    value={form.ward}
                    onChange={(e) => set('ward', e.target.value)}
                    placeholder="Phường 6, Quận 3"
                    className={inputCls(errors.ward)}
                  />
                </Field>
              </div>
              <Field label="Địa chỉ" error={errors.address}>
                <input
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Số nhà, tên đường"
                  className={inputCls(errors.address)}
                />
              </Field>
              <Field label="Vai trò đăng ký" error="">
                <select
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  className={inputCls('')}
                >
                  <option value="STAFF">Staff — Nhân viên xử lý</option>
                  <option value="ADMIN">Admin — Quản trị viên</option>
                </select>
              </Field>
              {(form.role === 'STAFF' || form.role === 'ADMIN') && (
                <Field label="Cơ quan / Phòng ban" error={errors.departmentId}>
                  <select
                    value={form.departmentId}
                    onChange={(e) => set('departmentId', e.target.value)}
                    className={inputCls(errors.departmentId)}
                  >
                    <option value="">-- Chọn cơ quan --</option>
                    {staffDepts.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <div className="relative rounded-xl border border-orange-500/25 bg-orange-500/8 px-3.5 py-3">
                <p className="text-[11px] text-orange-600 leading-relaxed">
                  Hệ thống sẽ gửi mã xác thực OTP qua email sau khi hoàn tất bước này.
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

          {/* STEP 3: Verify OTP (POST /api/v1/auth/verify-email & resend-otp) */}
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
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-bold text-gray-900">Xác thực Email</h3>
                <p className="text-[12px] text-gray-500">
                  Mã OTP 6 số đã được gửi tới email:
                </p>
                <p className="text-[13px] font-semibold text-orange-600">{form.email}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block text-center">
                  Nhập mã OTP (6 chữ số)
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
                  {loading ? 'Đang xác thực...' : 'Xác thực tài khoản'}
                </span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  disabled={resendTimer > 0 || resendLoading}
                  onClick={handleResendOtp}
                  className="text-[12px] text-orange-600 hover:text-orange-700 font-semibold disabled:text-gray-400 transition-colors cursor-pointer"
                >
                  {resendLoading
                    ? 'Đang gửi lại...'
                    : resendTimer > 0
                    ? `Gửi lại mã OTP sau (${resendTimer}s)`
                    : 'Chưa nhận được mã? Gửi lại OTP'}
                </button>
              </div>
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
