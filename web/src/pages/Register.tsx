import { useState } from 'react';
import cityfixLogo from '../assets/cityfix-logo.png';
import registerBackground from '../assets/register-city-background.jpg';
import { DEPARTMENTS } from '../data';

interface Props {
  onGoLogin: () => void;
  onRegisterSuccess: () => void;
}

export default function Register({ onGoLogin, onRegisterSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    province: 'TP.HCM', ward: '', address: '', role: 'STAFF', departmentId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Bắt buộc';
    if (!form.email.includes('@')) e.email = 'Email không hợp lệ';
    if (form.phone.length < 10) e.phone = 'Số điện thoại không hợp lệ';
    if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Mật khẩu không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Record<string, string> = {};
    if (!form.ward.trim()) e.ward = 'Bắt buộc';
    if (!form.address.trim()) e.address = 'Bắt buộc';
    if ((form.role === 'STAFF' || form.role === 'ADMIN') && !form.departmentId) e.departmentId = 'Bắt buộc';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() { if (validateStep1()) setStep(2); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    setTimeout(() => { onRegisterSuccess(); }, 1000);
  }

  const staffDepts = DEPARTMENTS.filter(d => d.level === 'CITY' || d.level === 'WARD');

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
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em] mt-0.5">Đăng ký tài khoản Staff / Admin</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0
                ${step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {s}
              </div>
              <span className={`text-[11px] font-semibold ${step >= s ? 'text-gray-700' : 'text-gray-400'}`}>
                {s === 1 ? 'Thông tin cơ bản' : 'Địa chỉ & Phân quyền'}
              </span>
              {s < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-orange-500/40' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-2xl overflow-hidden card-depth">
          <div className="h-[2px] hazard-stripe-thin" />

          {step === 1 && (
            <div className="px-6 py-6 space-y-4">
              <Field label="Họ và tên" error={errors.fullName}>
                <input value={form.fullName} onChange={e => set('fullName', e.target.value)}
                  placeholder="Nguyễn Văn A" className={inputCls(errors.fullName)} />
              </Field>
              <Field label="Email công vụ" error={errors.email}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="ten@tphcm.gov.vn" className={inputCls(errors.email)} />
              </Field>
              <Field label="Số điện thoại" error={errors.phone}>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="09xxxxxxxx" className={inputCls(errors.phone)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mật khẩu" error={errors.password}>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder="••••••••" className={inputCls(errors.password)} />
                </Field>
                <Field label="Xác nhận MK" error={errors.confirmPassword}>
                  <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                    placeholder="••••••••" className={inputCls(errors.confirmPassword)} />
                </Field>
              </div>
              <button onClick={handleNext}
                className="w-full relative rounded-xl overflow-hidden px-4 py-3 active:scale-[0.97] transition-transform mt-2">
                <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)' }} />
                <span className="relative text-white font-bold uppercase tracking-wide text-[13px]">Tiếp theo →</span>
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tỉnh / Thành phố" error="">
                  <input value={form.province} onChange={e => set('province', e.target.value)}
                    placeholder="TP.HCM" className={inputCls('')} />
                </Field>
                <Field label="Phường / Xã" error={errors.ward}>
                  <input value={form.ward} onChange={e => set('ward', e.target.value)}
                    placeholder="P.6, Q.3" className={inputCls(errors.ward)} />
                </Field>
              </div>
              <Field label="Địa chỉ" error={errors.address}>
                <input value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Số nhà, đường" className={inputCls(errors.address)} />
              </Field>
              <Field label="Vai trò" error="">
                <select value={form.role} onChange={e => set('role', e.target.value)} className={inputCls('')}>
                  <option value="STAFF">Staff — Nhân viên xử lý</option>
                  <option value="ADMIN">Admin — Quản trị viên</option>
                </select>
              </Field>
              {(form.role === 'STAFF' || form.role === 'ADMIN') && (
                <Field label="Cơ quan / Phòng ban" error={errors.departmentId}>
                  <select value={form.departmentId} onChange={e => set('departmentId', e.target.value)} className={inputCls(errors.departmentId)}>
                    <option value="">-- Chọn cơ quan --</option>
                    {staffDepts.map(d => (
                      <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                    ))}
                  </select>
                </Field>
              )}

              <div className="relative rounded-xl border border-orange-500/25 bg-orange-500/8 px-3.5 py-3">
                <p className="text-[11px] text-orange-400/80 leading-relaxed">
                  Tài khoản sẽ được xét duyệt bởi Admin trước khi kích hoạt. Vui lòng sử dụng email công vụ để được ưu tiên.
                </p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-600 hover:text-gray-800 text-[13px] font-semibold uppercase tracking-wide transition-colors active:scale-[0.97]">
                  ← Quay lại
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 relative rounded-xl overflow-hidden px-4 py-3 active:scale-[0.97] transition-transform disabled:opacity-60">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                  <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)' }} />
                  <span className="relative text-white font-bold uppercase tracking-wide text-[13px]">
                    {loading ? 'Đang xử lý...' : 'Đăng ký'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[12px] text-gray-500 mt-5">
          Đã có tài khoản?{' '}
          <button onClick={onGoLogin} className="text-orange-600 hover:text-orange-700 font-semibold transition-colors">
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
}

function inputCls(err: string) {
  return `w-full bg-gray-50 border ${err ? 'border-red-500/50' : 'border-gray-300'} rounded-xl px-3.5 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 outline-none focus:border-orange-500/50 transition-colors`;
}

function Field({ label, error, children }: { label: string; error: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
