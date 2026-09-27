import { useState } from 'react';
import cityfixLogo from '../assets/cityfix-logo.png';
import registerBackground from '../assets/register-city-background.jpg';
import { USERS } from '../data';
import { login, decodeJwt, ApiError } from '../services';

interface Props {
  onLogin: (
    email: string,
    role: 'STAFF' | 'ADMIN',
    userId: string
  ) => void;
  onGoRegister: () => void;
}

export default function Login({ onLogin, onGoRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      const res = await login({ email, password });

      // Decode JWT token để lấy role hoặc userId nếu có
      const decoded = decodeJwt(res.accessToken);
      console.log('✅ Đăng nhập thành công:', { res, decoded });

      let role: 'STAFF' | 'ADMIN' = 'ADMIN';
      const rawRole = String(res.role || decoded?.role || decoded?.roles?.[0] || '').toUpperCase();

      if (rawRole.includes('STAFF')) {
        role = 'STAFF';
      } else if (rawRole.includes('ADMIN')) {
        role = 'ADMIN';
      } else if (email.endsWith('@tphcm.gov.vn') || email.endsWith('@evnhcmc.vn')) {
        role = 'STAFF';
      }

      const uid = decoded?.userId || decoded?.sub || decoded?.id || email;
      onLogin(email.trim(), role, uid);
    } catch (err: any) {
      console.warn('⚠️ Login API error:', err);

      // Cho phép đăng nhập tài khoản mock demo nếu backend chưa có tài khoản admin này
      const found = USERS.find((u) => u.email === email);
      if (email === 'admin@cityfix.gov.vn' && password === 'admin123') {
        onLogin(email, 'ADMIN', found?.userId ?? 'U006');
        return;
      } else if (
        (email.endsWith('@tphcm.gov.vn') || email.endsWith('@evnhcmc.vn')) &&
        password.length >= 6
      ) {
        onLogin(email, 'STAFF', found?.userId ?? 'U010');
        return;
      }

      const msg = err instanceof ApiError ? err.message : 'Đăng nhập không thành công. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center relative overflow-hidden">
      <img
        src={registerBackground}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />
      <div className="absolute inset-0 bg-white/35 pointer-events-none" />
      {/* Corner hazard accents */}
      <div className="absolute top-0 left-0 right-0 h-[3px] hazard-stripe-thin" />
      <div className="absolute bottom-0 left-0 right-0 h-[3px] hazard-stripe-thin" />

      <div className="relative z-10 w-full max-w-sm px-4 screen-enter">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={cityfixLogo} alt="CityFix" className="w-40 h-40 object-contain -mb-6" />

          <p className="text-[11px] text-gray-500 uppercase tracking-[0.2em] mt-0.5 font-bold">
            Staff / Admin Portal — Đăng nhập
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-2xl overflow-hidden card-depth shadow-sm">
          <div className="relative px-0 h-[2px]">
            <div className="absolute inset-0 hazard-stripe-thin" />
          </div>

          <form
            onSubmit={handleSubmit}
            className="px-6 py-6 space-y-4"
          >
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="admin@cityfix.gov.vn"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-800 placeholder-gray-400 outline-none focus:border-orange-400 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                Mật khẩu
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-800 placeholder-gray-400 outline-none focus:border-orange-400 transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-[12px] text-red-600">
                  {error}
                </p>
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative rounded-xl overflow-hidden px-4 py-3 active:scale-[0.97] transition-transform disabled:opacity-60 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />

              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  background:
                    'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)',
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

              <span className="relative text-white font-bold uppercase tracking-wide text-[13px]">
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </span>
            </button>
          </form>

          {/* Demo accounts */}
          <div className="px-6 pb-5 border-t border-gray-100 pt-4">
            <div className="bg-gray-50 rounded-xl px-3.5 py-3 space-y-1 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                Tài khoản thử nghiệm
              </p>

              <p className="font-mono-cf text-[11px] text-gray-500">
                huuvinh05926@gmail.com / password
              </p>

              <p className="font-mono-cf text-[11px] text-gray-500">
                admin@cityfix.gov.vn / admin123
              </p>
            </div>
          </div>
        </div>

        {/* Register link */}
        <p className="text-center text-[12px] text-gray-500 mt-5">
          Chưa có tài khoản?{' '}
          <button
            type="button"
            onClick={onGoRegister}
            className="text-orange-500 hover:text-orange-600 font-semibold transition-colors cursor-pointer"
          >
            Đăng ký ngay
          </button>
        </p>
      </div>
    </div>
  );
}
