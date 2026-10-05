const MONTHLY = [
  { month: 'T4', total: 89,  done: 71 },
  { month: 'T5', total: 104, done: 88 },
  { month: 'T6', total: 97,  done: 79 },
  { month: 'T7', total: 118, done: 93 },
  { month: 'T8', total: 131, done: 101 },
  { month: 'T9', total: 127, done: 61 },
];

const DISTRICTS = [
  { name: 'Quận 1',        count: 28 },
  { name: 'Quận 3',        count: 41 },
  { name: 'Phú Nhuận',     count: 19 },
  { name: 'Bình Thạnh',    count: 34 },
  { name: 'Quận 10',       count: 15 },
  { name: 'Tân Bình',      count: 22 },
];

const max = Math.max(...MONTHLY.map(m => m.total));
const distMax = Math.max(...DISTRICTS.map(d => d.count));

export default function Analytics() {
  return (
    <div className="p-6 space-y-5 screen-enter">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng tháng này', val: '127', sub: '+19% so tháng trước', color: 'text-orange-400' },
          { label: 'Tỷ lệ hoàn thành', val: '81%', sub: 'Mục tiêu: 85%', color: 'text-green-400' },
          { label: 'Thời gian TB', val: '18h', sub: 'Từ tiếp nhận → xử lý', color: 'text-orange-400' },
          { label: 'Mức hài lòng', val: '4.2', sub: '/5.0 từ người dùng', color: 'text-orange-400' },
        ].map((s, i) => (
          <div key={i} className="relative bg-white border border-gray-200 rounded-2xl px-4 py-4 overflow-hidden card-depth">
            <div className="absolute top-0 right-0 w-14 h-1.5 overflow-hidden rounded-bl-lg">
              <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(-45deg,#f97316,#f97316 3px,transparent 3px,transparent 6px)' }} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em] mb-2">{s.label}</p>
            <span className={`font-display text-[44px] font-extrabold leading-none block ${s.color}`}>{s.val}</span>
            <p className="text-[11px] text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar chart: Monthly */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
            <p className="font-display text-[14px] font-bold text-gray-900 uppercase tracking-[0.12em]">Xu hướng theo tháng</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Tổng Hồ sơ báo cáo vs hoàn thành</p>
          </div>
          <div className="px-5 py-5">
            <div className="flex items-end gap-4 h-40">
              {MONTHLY.map(m => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end gap-0.5 h-32">
                    <div
                      className="flex-1 rounded-t-md bg-orange-500/20 border border-orange-500/20 transition-all"
                      style={{ height: `${(m.total / max) * 100}%` }}
                    />
                    <div
                      className="flex-1 rounded-t-md bg-gradient-to-t from-orange-700 to-orange-400 transition-all"
                      style={{ height: `${(m.done / max) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{m.month}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-5 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/20" />
                <span className="text-[11px] text-gray-500">Tổng Hồ sơ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gradient-to-t from-orange-700 to-orange-400" />
                <span className="text-[11px] text-gray-500">Hoàn thành</span>
              </div>
            </div>
          </div>
        </div>

        {/* Districts */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
            <p className="font-display text-[14px] font-bold text-gray-900 uppercase tracking-[0.12em]">Phân bố theo quận</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Số lượng Hồ sơ tháng 9/2026</p>
          </div>
          <div className="px-5 py-4 space-y-3.5">
            {DISTRICTS.map(d => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[12px] text-gray-700">{d.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-[16px] font-bold text-orange-400">{d.count}</p>
                    <p className="text-[10px] text-gray-400">Hồ sơ</p>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-700 to-orange-400 transition-all"
                    style={{ width: `${(d.count / distMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
        <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
          <p className="font-display text-[14px] font-bold text-gray-900 uppercase tracking-[0.12em]">Phân tích trạng thái Hồ sơ</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
          {[
            { label: 'Đã tiếp nhận', count: 23, pct: 18, cls: 'text-gray-700', bar: 'bg-zinc-500' },
            { label: 'Đang xử lý',   count: 43, pct: 34, cls: 'text-orange-400', bar: 'bg-orange-500' },
            { label: 'Hoàn thành',   count: 51, pct: 40, cls: 'text-green-400', bar: 'bg-green-500' },
            { label: 'Từ chối',      count: 10, pct: 8,  cls: 'text-red-400', bar: 'bg-red-500' },
          ].map(s => (
            <div key={s.label} className="px-5 py-5">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] mb-3">{s.label}</p>
              <span className={`font-display text-[40px] font-extrabold leading-none block ${s.cls}`}>{s.count}</span>
              <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${s.pct * 2.5}%` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">{s.pct}% tổng</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

