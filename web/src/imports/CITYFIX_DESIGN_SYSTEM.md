# CityFix Design System — Web Admin / Staff
> Trích xuất từ bản mobile CityFix. Dùng làm nền tảng cho portal web role Staff & Admin.
> Stack giả định: React + Vite + Tailwind CSS v4 (hoặc v3 với config)

---

## 1. BRAND IDENTITY

**Tên:** CityFix — Hệ thống báo cáo hạ tầng đô thị  
**Tagline:** Cùng xây dựng thành phố tốt hơn  
**Tone:** Chuyên nghiệp, khẩn trương, đáng tin cậy — không playful  
**Ngôn ngữ UI:** Tiếng Việt (primary), có thể bổ sung EN toggle

---

## 2. COLOR TOKENS

### Màu nền (Backgrounds)
```css
--bg-base:       #0f0f0f;   /* trang chủ, nền toàn màn hình */
--bg-card:       #141414;   /* card, panel, sidebar */
--bg-card-inner: #1c1c1c;   /* nested card, input bg */
--bg-elevated:   #1a1a1a;   /* dropdown, tooltip, popover */
--bg-overlay:    rgba(15,15,15,0.85); /* modal backdrop */
```

### Accent — Orange (Primary Brand)
```css
--accent:          #f97316;   /* orange-500 — CTA, active state, highlight */
--accent-dark:     #c2410c;   /* orange-700 — gradient start */
--accent-dim:      rgba(249,115,22,0.12);  /* hover bg, badge bg */
--accent-border:   rgba(249,115,22,0.25);  /* border trên accent elements */
--accent-glow:     rgba(249,115,22,0.35);  /* box-shadow glow */
```

### Gradient CTA (dùng cho mọi primary button)
```css
--gradient-cta: linear-gradient(to right, #c2410c, #f97316);
```

### Status Colors
```css
/* Đang xử lý / Processing */
--status-processing-text:   #fb923c;   /* orange-400 */
--status-processing-bg:     rgba(249,115,22,0.12);
--status-processing-border: rgba(249,115,22,0.20);

/* Đã tiếp nhận / Received */
--status-received-text:   #d4d4d8;    /* zinc-300 */
--status-received-bg:     rgba(63,63,70,0.40);
--status-received-border: rgba(82,82,91,0.30);

/* Hoàn thành / Done */
--status-done-text:   #4ade80;        /* green-400 */
--status-done-bg:     rgba(74,222,128,0.12);
--status-done-border: rgba(74,222,128,0.20);

/* Từ chối / Rejected */
--status-rejected-text:   #f87171;    /* red-400 */
--status-rejected-bg:     rgba(239,68,68,0.12);
--status-rejected-border: rgba(239,68,68,0.20);

/* Khẩn cấp / Critical */
--status-critical-text:   #fca5a5;   /* red-300 */
--status-critical-bg:     rgba(127,29,29,0.25);
--status-critical-border: rgba(239,68,68,0.30);
```

### Severity Colors
```css
--sev-critical: #fca5a5;   /* red-300  — text */
--sev-high:     #f87171;   /* red-400  */
--sev-medium:   #fb923c;   /* orange-400 */
--sev-low:      #a1a1aa;   /* zinc-400 */
```

### Text
```css
--text-primary:   #ffffff;
--text-secondary: #a1a1aa;   /* zinc-400 */
--text-muted:     #71717a;   /* zinc-500 */
--text-faint:     #52525b;   /* zinc-600 */
--text-ghost:     #3f3f46;   /* zinc-700 */
```

### Border
```css
--border-default: rgba(39,39,42,0.60);  /* zinc-800/60 */
--border-subtle:  rgba(39,39,42,0.40);  /* zinc-800/40 */
--border-strong:  #3f3f46;              /* zinc-700 */
```

---

## 3. TYPOGRAPHY

### Font Stack
```css
/* Display / Heading — dùng cho số liệu lớn, tiêu đề dashboard, ID Hồ sơ */
font-family: 'Barlow Condensed', sans-serif;
/* weights: 500, 600, 700, 800 */

/* Body / UI — dùng cho mọi text đọc được */
font-family: 'Noto Sans', sans-serif;
/* weights: 400, 500, 600, 700 */

/* Mono — dùng cho ID, timestamp, code, badge kỹ thuật */
font-family: 'JetBrains Mono', monospace;   /* hoặc 'Courier Prime' */
```

### Google Fonts Import (paste vào CSS entrypoint)
```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Noto+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

### Scale (dùng với Tailwind hoặc CSS vars)
```
Hero stat:        48–64px  Barlow Condensed 800  uppercase  tracking-tight
Dashboard title:  28–36px  Barlow Condensed 700  uppercase  tracking-tight
Section heading:  18–22px  Barlow Condensed 700  uppercase  tracking-wide
Card title:       14–16px  Noto Sans 600
Body:             13–14px  Noto Sans 400/500
Label/Caption:    10–12px  Noto Sans 600  uppercase  tracking-[0.18em]
Badge/Tag:        9–10px   Noto Sans 700  uppercase  tracking-[0.15em]
Mono ID:          10–12px  JetBrains Mono 500  tracking-wider
```

### Typography Rules
- Tiêu đề section luôn **UPPERCASE** với Barlow Condensed
- Label nhỏ (section header kiểu "THÔNG TIN CHUNG") dùng `text-[9px] font-bold text-zinc-600 uppercase tracking-[0.18em]`
- ID Hồ sơ (CF-xxxx) dùng mono: `font-mono text-zinc-600 tracking-wider`
- Không dùng italic trừ AI-generated text (hiện italic + màu orange/muted)

---

## 4. SPACING & LAYOUT

### Web Admin Layout Grid
```
Sidebar width:      240–280px (collapsed: 64px icon-only)
Header height:      56–64px
Content padding:    24–32px
Card gap:           16px (1rem)
Section gap:        24px (1.5rem)
Inner card padding: 16–20px
```

### Component Spacing
```
Card border-radius:      16px (rounded-2xl)
Button border-radius:    12px (rounded-xl)
Badge border-radius:     8px  (rounded-lg)
Input border-radius:     10px (rounded-xl)
Pill/chip radius:        999px (rounded-full)
```

---

## 5. COMPONENT PATTERNS

### 5.1 Hazard Stripe (brand accent divider)
Dùng ở top của sidebar, header, section break quan trọng.
```css
/* CSS */
.hazard-stripe {
  background: repeating-linear-gradient(
    -45deg,
    #f97316, #f97316 5px,
    #1a1a1a 5px, #1a1a1a 10px
  );
  height: 4px;
}

/* Mỏng hơn cho web */
.hazard-stripe-thin {
  background: repeating-linear-gradient(
    -45deg,
    #f97316, #f97316 3px,
    #1a1a1a 3px, #1a1a1a 6px
  );
  height: 2px;
}
```

### 5.2 Primary CTA Button
```tsx
// Tailwind JSX pattern
<button className="relative rounded-xl overflow-hidden px-6 py-3 active:scale-[0.97] transition-transform">
  <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
  {/* hazard overlay */}
  <div className="absolute inset-0 opacity-[0.06]"
    style={{ background: "repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)" }} />
  {/* shine */}
  <div className="absolute inset-0 bg-gradient-to-b from-white/12 to-transparent" />
  <span className="relative text-white font-bold uppercase tracking-wide">Label</span>
</button>
```

### 5.3 Card Container
```tsx
<div className="bg-[#141414] border border-zinc-800/60 rounded-2xl overflow-hidden">
  {/* Section header */}
  <div className="px-5 pt-3 pb-2.5 border-b border-zinc-800/60 flex items-center justify-between">
    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.18em]">Tiêu đề section</p>
    <button className="text-[10px] text-orange-400">Action</button>
  </div>
  {/* Content */}
  <div className="divide-y divide-zinc-800/40">
    {/* rows */}
  </div>
</div>
```

### 5.4 Status Badge
```tsx
const STATUS_MAP = {
  processing: { label: "Đang xử lý",   cls: "text-orange-400 bg-orange-500/12 border-orange-500/20" },
  received:   { label: "Đã tiếp nhận", cls: "text-zinc-300   bg-zinc-700/40    border-zinc-600/30"   },
  done:       { label: "Hoàn thành",   cls: "text-green-400  bg-green-500/12   border-green-500/20"  },
  rejected:   { label: "Từ chối",      cls: "text-red-400    bg-red-500/12     border-red-500/20"    },
};

<span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1.5 ${STATUS_MAP[key].cls}`}>
  <div className="w-1.5 h-1.5 rounded-full bg-current" />
  {STATUS_MAP[key].label}
</span>
```

### 5.5 Severity Badge
```tsx
const SEV_MAP = {
  CRITICAL: { label: "Nghiêm trọng", cls: "text-red-300   bg-red-700/20     border-red-700/30"    },
  HIGH:     { label: "Cao",          cls: "text-red-400   bg-red-500/12     border-red-500/25"    },
  MEDIUM:   { label: "Trung bình",   cls: "text-orange-400 bg-orange-500/12 border-orange-500/20" },
  LOW:      { label: "Thấp",         cls: "text-zinc-400  bg-zinc-700/30    border-zinc-600/30"   },
};
```

### 5.6 Section Label (heading pattern)
```tsx
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {/* Orange stripe accent */}
      <div className="flex flex-col gap-0.5 w-3 h-3 opacity-70">
        <div className="h-0.5 rounded-full bg-orange-500 opacity-90" />
        <div className="h-0.5 rounded-full bg-orange-500 opacity-50" />
      </div>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        className="text-[13px] font-700 text-white uppercase tracking-[0.18em]">
        {children}
      </span>
    </div>
  );
}
```

### 5.7 Stat Tile (dashboard KPI card)
```tsx
<div className="relative bg-[#141414] border border-zinc-800/70 rounded-2xl px-4 py-4 overflow-hidden">
  {/* Corner hazard accent */}
  <div className="absolute top-0 right-0 w-12 h-1.5 overflow-hidden rounded-bl-lg">
    <div style={{ width: "100%", height: "100%",
      background: "repeating-linear-gradient(-45deg,#f97316,#f97316 3px,transparent 3px,transparent 6px)" }} />
  </div>
  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.18em] mb-2">Nhãn</p>
  <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
    className="text-[42px] font-800 text-orange-400 leading-none block">
    127
  </span>
  <p className="text-[11px] text-zinc-600 mt-1">Phụ đề / đơn vị</p>
  <p className="text-[9px] font-bold text-orange-500/50 tracking-wide mt-0.5">↑12% tuần này</p>
</div>
```

### 5.8 Table Row (data table)
```tsx
/* Header row */
<div className="grid grid-cols-[2rem_1fr_1fr_1fr_120px_100px] gap-3 px-4 py-2.5 border-b border-zinc-800/60">
  {["#", "Loại sự cố", "Địa điểm", "Thời gian", "Cơ quan", "Trạng thái"].map(h => (
    <p key={h} className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.18em]">{h}</p>
  ))}
</div>

/* Data row */
<div className="grid grid-cols-[2rem_1fr_1fr_1fr_120px_100px] gap-3 px-4 py-3.5
  border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer">
  <p className="text-[10px] font-mono text-zinc-700">01</p>
  <p className="text-[13px] text-zinc-200 font-medium truncate">Ổ gà / Mặt đường</p>
  ...
</div>
```

### 5.9 Input Field
```tsx
<div className="space-y-1.5">
  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
    Nhãn
  </label>
  <input
    className="w-full bg-[#1c1c1c] border border-zinc-700/70 rounded-xl px-3.5 py-2.5
      text-[13px] text-white placeholder-zinc-700 outline-none
      focus:border-orange-500/50 transition-colors"
    placeholder="Placeholder..."
  />
</div>
```

### 5.10 Alert / Warning Banner
```tsx
/* Emergency / Critical */
<div className="relative rounded-xl overflow-hidden border border-red-500/30">
  <div className="absolute inset-0 bg-gradient-to-r from-red-950/80 to-[#141414]" />
  <div className="absolute inset-0 opacity-[0.035]"
    style={{ background: "repeating-linear-gradient(-45deg,#ef4444,#ef4444 8px,transparent 8px,transparent 16px)" }} />
  <div className="relative flex items-start gap-3 px-4 py-3.5">
    {/* icon + content */}
  </div>
</div>

/* Info */
<div className="relative rounded-xl border border-orange-500/25 bg-orange-500/8 px-4 py-3">
  {/* content */}
</div>
```

### 5.11 Progress Bar
```tsx
<div>
  <div className="flex items-center justify-between mb-1.5">
    <p className="text-[12px] text-zinc-400">Label</p>
    <p className="text-[11px] font-bold text-orange-400">72%</p>
  </div>
  <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
    <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
      style={{ width: "72%" }} />
  </div>
</div>
```

### 5.12 Timeline
```tsx
{steps.map((step, i) => (
  <div key={step.key} className="flex gap-3">
    <div className="flex flex-col items-center">
      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center
        ${step.done ? "bg-orange-500 border-orange-400" : "bg-zinc-800 border-zinc-700"}`}>
        {step.done
          ? <svg ...checkmark />
          : <div className="w-2 h-2 rounded-full bg-zinc-700" />}
      </div>
      {i < steps.length - 1 && (
        <div className={`w-0.5 h-8 mt-1 ${step.done ? "bg-orange-500/40" : "bg-zinc-800"}`} />
      )}
    </div>
    <div className="flex-1 pb-6">
      <p className={`text-[13px] font-semibold
        ${step.active ? "text-orange-400" : step.done ? "text-white" : "text-zinc-600"}`}>
        {step.label}
      </p>
      <p className="text-[11px] text-zinc-500 mt-0.5">{step.desc}</p>
      {step.active && (
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[10px] text-orange-500 font-medium">Đang tiến hành</span>
        </div>
      )}
    </div>
  </div>
))}
```

---

## 6. CSS UTILITIES (paste vào global CSS)

```css
/* === FONTS === */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Noto+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
@import 'tailwindcss';  /* hoặc @tailwind base; directives nếu dùng v3 */

/* === BASE === */
html, body, #root {
  height: 100%;
  font-family: 'Noto Sans', sans-serif;
  background: #0f0f0f;
  color: #fff;
}

/* === FONT WEIGHT HELPERS === */
.font-600 { font-weight: 600; }
.font-700 { font-weight: 700; }
.font-800 { font-weight: 800; }

/* === SCROLLBAR === */
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: #1c1c1c; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }

/* === HAZARD PATTERNS === */
.hazard-stripe {
  background: repeating-linear-gradient(-45deg, #f97316, #f97316 5px, #1a1a1a 5px, #1a1a1a 10px);
}
.hazard-stripe-thin {
  background: repeating-linear-gradient(-45deg, #f97316, #f97316 3px, #1a1a1a 3px, #1a1a1a 6px);
}
.hazard-stripe-subtle {
  background: repeating-linear-gradient(-45deg, #f97316, #f97316 4px, transparent 4px, transparent 8px);
  opacity: 0.15;
}

/* === GRID PATTERNS === */
.blueprint-grid {
  background-image:
    linear-gradient(rgba(249,115,22,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(249,115,22,0.06) 1px, transparent 1px);
  background-size: 24px 24px;
}
.dot-grid {
  background-image: radial-gradient(circle, rgba(249,115,22,0.09) 1px, transparent 1px);
  background-size: 18px 18px;
}

/* === EFFECTS === */
.glow-orange {
  box-shadow: 0 0 20px rgba(249,115,22,0.35), 0 0 40px rgba(249,115,22,0.12);
}
.glow-red {
  box-shadow: 0 0 20px rgba(239,68,68,0.35), 0 0 40px rgba(239,68,68,0.12);
}
.card-depth {
  box-shadow: 0 2px 16px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.03) inset;
}
.glass {
  background: rgba(255,255,255,0.035);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* === CONFIDENCE / PROGRESS BAR === */
.confidence-bar {
  background: linear-gradient(90deg, #9a3412 0%, #f97316 55%, #fb923c 100%);
}

/* === ANIMATIONS === */
@keyframes screen-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes float-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ping-slow {
  0%   { transform: scale(1);   opacity: 0.7; }
  70%  { transform: scale(1.9); opacity: 0;   }
  100% { transform: scale(1.9); opacity: 0;   }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pulse-ring {
  0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
  70%  { transform: scale(1);    box-shadow: 0 0 0 8px rgba(249,115,22,0);  }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249,115,22,0);   }
}

.screen-enter      { animation: screen-enter 0.28s ease-out both; }
.animate-float     { animation: float-up 0.32s ease-out both; }
.animate-ping-slow { animation: ping-slow 2s ease-in-out infinite; }
.animate-fadeIn    { animation: fadeIn 0.2s ease-out both; }
.shimmer {
  background: linear-gradient(90deg, #1c1c1c 25%, #242424 50%, #1c1c1c 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
```

---

## 7. TAILWIND v4 THEME (thêm vào index.css)

```css
@theme {
  /* Colors */
  --color-bg-base:    #0f0f0f;
  --color-bg-card:    #141414;
  --color-bg-inner:   #1c1c1c;
  --color-accent:     #f97316;
  --color-accent-dark:#c2410c;

  /* Border radius */
  --radius-card:   16px;
  --radius-btn:    12px;
  --radius-badge:  8px;
  --radius-input:  10px;

  /* Font */
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body:    'Noto Sans', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
}
```

---

## 8. WEB ADMIN LAYOUT BLUEPRINT

### Sidebar
```tsx
<aside className="w-64 h-screen bg-[#141414] border-r border-zinc-800/60 flex flex-col flex-shrink-0">
  {/* Logo */}
  <div className="relative px-5 py-4 border-b border-zinc-800/60">
    <div className="absolute top-0 left-0 right-0 h-[3px] hazard-stripe-thin" />
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-[#b94b00] flex items-center justify-center">
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          className="text-white font-800 text-sm">CF</span>
      </div>
      <div>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          className="text-[18px] font-800 text-white uppercase tracking-tight">CityFix</span>
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Admin Portal</p>
      </div>
    </div>
  </div>

  {/* Nav items */}
  <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
    {NAV_ITEMS.map(item => (
      <button key={item.label}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors
          ${active ? "bg-orange-500/12 border border-orange-500/20 text-orange-400"
                   : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"}`}>
        {/* icon */}
        <span className="text-[13px] font-semibold">{item.label}</span>
      </button>
    ))}
  </nav>

  {/* User + logout */}
  <div className="px-4 py-4 border-t border-zinc-800/60">
    {/* avatar + name + logout */}
  </div>
</aside>
```

### Header
```tsx
<header className="h-14 bg-[#141414] border-b border-zinc-800/60 flex items-center px-6 gap-4 flex-shrink-0">
  <div className="flex-1">
    <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      className="text-[22px] font-800 text-white uppercase tracking-tight">
      Tên trang
    </h1>
  </div>
  {/* search, notifications, avatar */}
</header>
```

### Main Layout
```tsx
<div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
  <Sidebar />
  <div className="flex-1 flex flex-col min-w-0">
    <Header />
    <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
      {/* content */}
    </main>
  </div>
</div>
```

---

## 9. DATA MODELS (copy từ mobile)

```typescript
// Ticket
interface Ticket {
  id: string;                  // "CF-2853"
  category: string;            // "Ổ gà / Hư hỏng mặt đường"
  categoryKey: string;         // "cat-001"
  address: string;
  status: string;              // display label
  statusKey: "processing" | "received" | "done" | "rejected";
  time: string;                // relative "2 giờ trước"
  submittedAt: string;         // "10/09/2026 09:41"
  imageUrl: string;
  description: string;
  agency: string;              // "Phòng Hạ tầng Đô thị Q.5"
  deadline: string;            // "72 giờ"
  upvotes: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  locationMethod: "AUTO_GPS" | "MANUAL_ENTRY";
}

// User (Citizen)
interface AuthUser {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  ward: string;
}

// Staff / Admin (cần bổ sung cho web)
interface StaffUser {
  staffId: string;
  fullName: string;
  email: string;
  role: "staff" | "admin" | "supervisor";
  agency: string;
  department: string;
  permissions: string[];
}

// AI Analysis
interface AIAnalysis {
  analysisId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dangerLevel: "SAFE" | "CAUTION" | "DANGEROUS" | "CRITICAL";
  confidenceScore: number;     // 0–100
  description: string;
  categoryId: string;
  isAcceptedByHuman: boolean;
}

// Categories
const CATEGORIES = [
  { categoryId: "cat-001", name: "Ổ gà / Hư hỏng mặt đường" },
  { categoryId: "cat-002", name: "Đèn đường hỏng" },
  { categoryId: "cat-003", name: "Rác thải / Vệ sinh" },
  { categoryId: "cat-004", name: "Cây đổ / Cây nguy hiểm" },
  { categoryId: "cat-005", name: "Ngập úng / Thoát nước" },
  { categoryId: "cat-006", name: "Vỉa hè hư hỏng" },
  { categoryId: "cat-007", name: "Biển báo hỏng" },
  { categoryId: "cat-008", name: "Khác" },
];
```

---

## 10. WEB ADMIN — PAGES & FEATURES CẦN XÂY DỰNG

### Role: Staff
| Trang | Mô tả |
|---|---|
| Dashboard | KPI stats, bản đồ nhiệt khu vực, danh sách Hồ sơ được giao, activity feed |
| Danh sách Hồ sơ | Table filter (status/severity/category/date), search, sort, pagination |
| Chi tiết Hồ sơ | Full info + ảnh, timeline, ghi chú nội bộ, cập nhật trạng thái |
| Xử lý Hồ sơ | Upload ảnh bằng chứng, ghi chú kết quả, chuyển sang Done |
| Cảnh báo khẩn cấp | Xem danh sách vùng nguy hiểm đang hoạt động |

### Role: Admin
| Trang | Mô tả |
|---|---|
| Dashboard | Toàn cục: stats theo quận, hiệu suất theo cơ quan, trending issues |
| Quản lý Hồ sơ | Tất cả Hồ sơ, phân công staff, bulk actions, export CSV |
| Quản lý người dùng | Danh sách citizen + staff, CRUD, phân quyền |
| Quản lý cơ quan | Danh sách agency, staff assignment, SLA config |
| Analytics | Biểu đồ xu hướng (recharts), heatmap theo thời gian |
| Cài đặt hệ thống | Categories, thông số AI, notification config |
| Emergency control | Phát/hủy cảnh báo khẩn cấp, bán kính ảnh hưởng |

---

## 11. ICON STYLE GUIDE

Dùng **SVG inline** (không dùng icon font). Stroke-based, không fill.

```tsx
// Standard icon props
<svg
  width="16" height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"          // 1.8 (thin) / 2 (normal) / 2.5 (bold)
  strokeLinecap="round"
  strokeLinejoin="round"
/>

// Sizes:
// Sidebar nav:  20×20
// Card action:  16×16
// Badge:        12×12
// Inline text:  14×14
```

---

## 12. IMAGERY STYLE

- Dùng **Unsplash** cho mock images: `https://images.unsplash.com/photo-{id}?w={w}&h={h}&fit=crop&auto=format`
- Map preview: `photo-1477959858617-67f85cf4f1df` (city aerial)
- Luôn filter ảnh: `filter: brightness(0.25) saturate(0.4)` khi dùng làm nền
- Luôn có `bg-zinc-900` fallback khi ảnh chưa load

---

## 13. VIẾT CODE — NGUYÊN TẮC

```
1. Mọi heading/label lớn → Barlow Condensed, UPPERCASE
2. Mọi ID Hồ sơ → font-mono + text-zinc-600
3. Không dùng màu sắc đa dạng (rainbow) — chỉ orange + zinc + red/green cho status
4. Card luôn có border border-zinc-800/60, background #141414
5. Mọi scroll container → thêm class scrollbar-hide hoặc scrollbar-thin
6. Mọi interactive element → active:scale-[0.97] + transition-transform
7. Hazard stripe ở top bar quan trọng (sidebar header, modal header)
8. Section header label: text-[9px] font-bold text-zinc-600 uppercase tracking-[0.18em]
9. Primary CTA luôn dùng gradient from-[#c2410c] to-[#f97316]
10. Toast/alert → bottom-right với screen-enter animation
```

---

*Script này trích xuất 100% từ bản mobile CityFix. Paste toàn bộ vào `DESIGN_SYSTEM.md` của workspace mới.*

