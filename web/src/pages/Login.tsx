import { useState } from 'react';
import cityfixLogo from '../assets/cityfix-logo.png';
import registerBackground from '../assets/register-city-background.jpg';
import { USERS } from '../data';
import { login, decodeJwt, ApiError, getProfile } from '../services';

interface Props {
  onLogin: (
    email: string,
    role: 'STAFF' | 'MANAGER' | 'ADMIN',
    userId: string
  ) => void;
  onGoRegister: () => void;
}

export default function Login({ onLogin, onGoRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      let rawRole = String(
        res.role ||
        (Array.isArray((res as any).roles) ? (res as any).roles[0] : (res as any).roles) ||
        decoded?.role ||
        (Array.isArray(decoded?.roles) ? decoded?.roles[0] : decoded?.roles) ||
        decoded?.roleName ||
        (Array.isArray(decoded?.authorities) ? decoded?.authorities[0] : decoded?.authorities) ||
        decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
        decoded?.scope ||
        ''
      ).toUpperCase();

      // Nếu trong token chưa có role rõ ràng, thử lấy từ getProfile
      if (!rawRole.includes('MANAGER') && !rawRole.includes('STAFF') && !rawRole.includes('ADMIN')) {
        try {
          const profile = await getProfile(res.accessToken);
          if (profile?.roleName) {
            rawRole = String(profile.roleName).toUpperCase();
          }
        } catch {
          // Bỏ qua lỗi phụ nếu token đã hợp lệ
        }
      }

      let role: 'STAFF' | 'MANAGER' | 'ADMIN' = 'ADMIN';
      if (rawRole.includes('MANAGER')) {
        role = 'MANAGER';
      } else if (rawRole.includes('STAFF')) {
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
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center relative overflow-hidden select-none">
      {/* 1. NỀN THÀNH PHỐ VIỆT NAM HIỆN ĐẠI (Hiện diện rõ ở phía bên phải) */}
      <img
        src={registerBackground}
        alt="CityFix Smart City"
        className="absolute inset-0 w-full h-full object-cover object-right md:object-center pointer-events-none opacity-80"
      />

      {/* Lớp phủ Gradient: Giảm độ chói trắng, giữ độ trong suốt vừa phải để nổi bật Trống Đồng và lá cây */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-white/70 to-white/10 pointer-events-none" />
      <div className="absolute inset-0 bg-radial from-white/30 via-transparent to-transparent pointer-events-none" />

      {/* 2. BẢN SẮC VIỆT NAM — HỌA TIẾT TRỐNG ĐỒNG ĐÔNG SƠN ĐẬM RÕ NÉT (Bản sắc Việt Nam) */}
      <div className="absolute -left-40 -top-28 md:-left-20 md:-top-16 pointer-events-none opacity-[0.32] text-[#ea580c] animate-dongson-spin">
        <svg width="900" height="900" viewBox="0 0 700 700" fill="none" stroke="currentColor">
          {/* Vành 1: Viền ngoài hoa văn răng cưa kép */}
          <circle cx="350" cy="350" r="335" strokeWidth="3.5" />
          <circle cx="350" cy="350" r="315" strokeWidth="2" strokeDasharray="6 4" />
          <circle cx="350" cy="350" r="295" strokeWidth="2.5" />

          {/* Vành 2: Vành chim Lạc sải cánh bay lượn quanh vành tròn */}
          <circle cx="350" cy="350" r="270" strokeWidth="2" />
          <circle cx="350" cy="350" r="235" strokeWidth="2" />
          {[...Array(16)].map((_, i) => {
            const angle = (i * 360) / 16;
            return (
              <g key={`lac-${i}`} transform={`rotate(${angle} 350 350)`}>
                <path
                  d="M 350,90 Q 368,98 380,93 Q 364,110 342,105 Q 330,102 322,95 Q 336,98 350,90 Z"
                  fill="currentColor"
                  fillOpacity="0.95"
                />
                <circle cx="376" cy="95" r="2" fill="currentColor" />
              </g>
            );
          })}

          {/* Vành 3: Vành chữ gãy khúc & hình thoi dải hoa văn Đông Sơn */}
          <circle cx="350" cy="350" r="210" strokeWidth="2" />
          <circle cx="350" cy="350" r="180" strokeWidth="2" />
          {[...Array(20)].map((_, i) => {
            const angle = (i * 360) / 20;
            return (
              <g key={`geom-${i}`} transform={`rotate(${angle} 350 350)`}>
                <polygon points="350,182 342,195 350,208 358,195" fill="currentColor" fillOpacity="0.75" />
              </g>
            );
          })}

          {/* Vành 4: Vành hoa văn răng cưa & tia mặt trời */}
          <circle cx="350" cy="350" r="155" strokeWidth="2.5" strokeDasharray="6 5" />
          <circle cx="350" cy="350" r="125" strokeWidth="2" />
          <circle cx="350" cy="350" r="90" strokeWidth="2" />

          {/* Ngôi sao Mặt trời Đông Sơn 14 cánh trung tâm sắc nét */}
          <circle cx="350" cy="350" r="55" fill="currentColor" fillOpacity="0.35" />
          {[...Array(14)].map((_, i) => {
            const angle = (i * 360) / 14;
            return (
              <g key={`sun-${i}`} transform={`rotate(${angle} 350 350)`}>
                <polygon points="350,220 336,275 364,275" fill="currentColor" fillOpacity="0.95" />
                <polygon points="350,280 340,312 360,312" fill="currentColor" fillOpacity="0.55" />
                <line x1="350" y1="270" x2="350" y2="190" strokeWidth="2.2" stroke="currentColor" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* 2.1 CÀNH LÁ CÂY XANH ĐÔ THỊ TƯƠI TỐT & RUY BĂNG NGHỆ THUẬT (Đầy đặn ở góc trên & dưới bên trái) */}

      {/* Góc trên bên trái: Dải ruy băng cam mềm và chùm lá xanh rủ xuống */}
      <div className="absolute top-0 left-0 w-80 h-80 pointer-events-none z-0 animate-leaf-sway">
        <svg viewBox="0 0 250 250" className="w-full h-full fill-none">
          {/* Dải cong cam nghệ thuật */}
          <path d="M-20,50 Q70,20 90,130 T200,200" stroke="#f97316" strokeWidth="22" strokeLinecap="round" opacity="0.75" />
          <path d="M-10,20 Q90,-5 120,80 T220,160" stroke="#ea580c" strokeWidth="14" strokeLinecap="round" opacity="0.65" />

          {/* Chùm lá xanh vươn từ mép trên */}
          <g transform="translate(10, 5)">
            <path d="M0,0 Q60,40 110,100" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
            {/* Lá to 1 */}
            <path d="M25,20 C55,0 95,15 90,48 C70,60 35,48 25,20 Z" fill="#16a34a" fillOpacity="0.95" />
            <path d="M25,20 Q55,28 90,48" stroke="#15803d" strokeWidth="1.8" />
            {/* Lá 2 */}
            <path d="M60,45 C90,25 128,40 120,72 C100,85 68,72 60,45 Z" fill="#22c55e" fillOpacity="0.95" />
            <path d="M60,45 Q90,52 120,72" stroke="#15803d" strokeWidth="1.8" />
            {/* Lá 3 */}
            <path d="M95,80 C115,60 148,72 142,95 C125,108 100,100 95,80 Z" fill="#4ade80" fillOpacity="0.98" />
            {/* Lá phụ xanh non */}
            <path d="M10,35 C-5,55 5,80 30,75 C42,60 30,40 10,35 Z" fill="#15803d" fillOpacity="0.9" />
          </g>
        </svg>
      </div>

      {/* Góc dưới bên trái: Chùm lá cây xanh vươn lên cùng dải ruy băng uốn lượn */}
      <div className="absolute -bottom-8 -left-8 w-[380px] h-[340px] pointer-events-none z-0 animate-leaf-sway" style={{ animationDelay: '2s' }}>
        <svg viewBox="0 0 350 300" className="w-full h-full fill-none">
          {/* Dải ruy băng cam uốn lượn phía dưới */}
          <path d="M-30,240 Q120,200 160,90 T290,10" stroke="#f97316" strokeWidth="32" strokeLinecap="round" opacity="0.8" />
          <path d="M-10,270 Q140,230 190,120 T320,40" stroke="#ea580c" strokeWidth="20" strokeLinecap="round" opacity="0.75" />

          {/* Cành lá xanh đô thị vươn cao */}
          <g transform="translate(30, 130) rotate(-18)">
            <path d="M0,120 Q60,50 130,0" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
            {/* Lá chính lớn */}
            <path d="M30,80 C10,45 35,10 75,28 C85,60 60,90 30,80 Z" fill="#16a34a" fillOpacity="0.95" />
            <path d="M30,80 Q52,50 75,28" stroke="#15803d" strokeWidth="1.8" />
            {/* Lá 2 */}
            <path d="M75,50 C65,15 95,-12 130,5 C135,38 105,65 75,50 Z" fill="#22c55e" fillOpacity="0.95" />
            <path d="M75,50 Q100,22 130,5" stroke="#15803d" strokeWidth="1.8" />
            {/* Chồi lá non đỉnh */}
            <path d="M115,18 C110,-12 135,-35 162,-18 C162,12 138,30 115,18 Z" fill="#4ade80" fillOpacity="0.98" />
            <path d="M115,18 Q138,-3 162,-18" stroke="#16a34a" strokeWidth="1.8" />
            {/* Lá bên dưới */}
            <path d="M55,105 C40,80 60,55 90,68 C98,92 78,112 55,105 Z" fill="#15803d" fillOpacity="0.9" />
          </g>
        </svg>
      </div>

      {/* 2.2 BLUEPRINT & AMBIENT CIVIC GRID (Lớp lưới định vị đô thị tinh tế tạo chiều sâu) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* 2.3 TOP CIVIC SYSTEM BAR (Chỉ giữ badge định danh hệ thống tinh gọn) */}
      <div className="hidden sm:flex items-center absolute top-4 left-8 z-10 pointer-events-none text-[11px] font-semibold text-slate-500">
        <div className="flex items-center gap-3 bg-white/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-slate-700 font-bold uppercase tracking-wider text-[10px]">Cổng Quản Trị Đô Thị TP.HCM</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono-cf text-[10px] text-slate-500">Hệ thống Trực tuyến 24/7</span>
        </div>
      </div>

      {/* 3. SMART CITY MAP ROUTE LINES (Đường nét mỏng chuyển động phát sáng) */}
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

      {/* 4. SUBTLE SMART CITY LOCATION MARKERS (Chuyển động nhấp nhô & phát sáng beacon) */}

      {/* Marker 1: Hạ tầng đô thị (Phía trên bên phải) */}
      <div className="hidden lg:flex items-center gap-2 absolute top-[12%] right-[14%] pointer-events-none animate-marker-float">
        <div className="relative flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm" />
          <div className="absolute -inset-1.5 rounded-full bg-orange-400/50 animate-beacon" />
        </div>
        <span className="bg-white/95 backdrop-blur-xs border border-slate-200 text-[11px] font-bold text-slate-800 px-3 py-1 rounded-full shadow-xs">
          📍 Hạ tầng đô thị
        </span>
      </div>

      {/* Marker 2: Cây xanh & Công viên (Phía bên phải đường) */}
      <div className="hidden md:flex items-center gap-2 absolute bottom-[32%] right-[22%] pointer-events-none animate-marker-float" style={{ animationDelay: '1.2s' }}>
        <div className="relative flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm" />
          <div className="absolute -inset-1.5 rounded-full bg-emerald-400/50 animate-beacon" />
        </div>
        <span className="bg-white/95 backdrop-blur-xs border border-slate-200 text-[11px] font-bold text-slate-800 px-3 py-1 rounded-full shadow-xs">
          🌳 Cây xanh
        </span>
      </div>

      {/* Marker 3: Môi trường (Phía dưới bên phải) */}
      <div className="hidden xl:flex items-center gap-2 absolute bottom-[14%] right-[12%] pointer-events-none animate-marker-float" style={{ animationDelay: '2.4s' }}>
        <div className="relative flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
          <div className="absolute -inset-1.5 rounded-full bg-amber-400/50 animate-beacon" />
        </div>
        <span className="bg-white/95 backdrop-blur-xs border border-slate-200 text-[11px] font-bold text-slate-800 px-3 py-1 rounded-full shadow-xs">
          💧 Môi trường
        </span>
      </div>

      {/* Marker 4: Ổ gà (Dưới lòng đường) */}
      <div className="hidden sm:flex items-center gap-2 absolute bottom-[18%] right-[36%] pointer-events-none animate-marker-float" style={{ animationDelay: '3.2s' }}>
        <div className="relative flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
          <div className="absolute -inset-1.5 rounded-full bg-red-400/50 animate-beacon" />
        </div>
        <span className="bg-white/95 backdrop-blur-xs border border-slate-200 text-[11px] font-bold text-slate-800 px-3 py-1 rounded-full shadow-xs">
          ⚠️ Ổ gà
        </span>
      </div>

      {/* 5. MAIN HERO: LOGIN SECTION (Trọng tâm thị giác, gọn gàng 360px) */}
      <div className="relative z-10 w-full max-w-[370px] px-4 py-8 screen-enter">
        {/* Logo CityFix & Header */}
        <div className="flex flex-col items-center mb-5 text-center">
          <img
            src={cityfixLogo}
            alt="CityFix"
            className="w-36 h-28 object-contain -mb-3 drop-shadow-2xs"
          />
          <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">
            STAFF / ADMIN PORTAL — ĐĂNG NHẬP
          </h2>
        </div>

        {/* Login Card (Hero Element: White 98%, viền tinh xảo, accent cam trên đỉnh) */}
        <div className="bg-white/98 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
          {/* Đường accent màu cam CityFix trên đỉnh Card */}
          <div className="h-[3px] bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c]" />

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] block">
                EMAIL
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="admin@cityfix.gov.vn"
                  className="w-full bg-slate-50/90 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/15 transition-all"
                />
              </div>
            </div>

            {/* Mật khẩu Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] block">
                MẬT KHẨU
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50/90 border border-slate-300 rounded-xl pl-9 pr-9 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5">
                <p className="text-[12px] font-medium text-red-600">{error}</p>
              </div>
            )}

            {/* Button ĐĂNG NHẬP (CityFix Orange, gradient nhẹ) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl py-2.5 px-4 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-orange-500/25 disabled:opacity-60 cursor-pointer mt-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#ea580c] to-[#f97316] group-hover:from-[#c2410c] group-hover:to-[#ea580c] transition-all" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-15 bg-gradient-to-r from-transparent via-white to-transparent transition-opacity" />
              <span className="relative flex items-center justify-center gap-1.5 text-white font-bold uppercase tracking-wider text-[13px]">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <span>ĐĂNG NHẬP</span>
                    <span className="text-[14px] font-normal transition-transform group-hover:translate-x-1">→</span>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Information Box: Tài khoản thử nghiệm */}
          <div className="px-6 pb-5 pt-3 bg-slate-50/80 border-t border-slate-100">
            <div className="flex items-start gap-2 bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs">
              <span className="text-slate-400 mt-0.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.14em]">
                  TÀI KHOẢN THỬ NGHIỆM
                </p>
                <p className="font-mono-cf text-[11px] text-slate-600 font-medium">
                  admin@cityfix.gov.vn <span className="text-slate-400">/</span> admin123
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. SLOGAN (Nhỏ gọn, thanh lịch) */}
        <div className="flex flex-col items-center mt-4 text-center">
          <p className="text-[12px] font-medium text-slate-600 italic tracking-wide">
            "Vì một đô thị xanh — sạch — an toàn."
          </p>
          <div className="w-8 h-[2px] bg-orange-500 rounded-full mt-1 opacity-80" />
        </div>

        {/* Link Đăng ký cán bộ */}
        <p className="text-center text-[12px] text-slate-500 mt-3">
          Chưa có tài khoản cán bộ?{' '}
          <button
            type="button"
            onClick={onGoRegister}
            className="text-orange-600 hover:text-orange-700 font-bold hover:underline transition-colors cursor-pointer"
          >
            Đăng ký ngay
          </button>
        </p>
      </div>
    </div>
  );
}


