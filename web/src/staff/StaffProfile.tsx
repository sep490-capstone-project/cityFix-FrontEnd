import { User, getDept } from '../data';

interface Props {
  currentUser: User;
}

export default function StaffProfile({ currentUser }: Props) {
  const dept = getDept(currentUser.departmentId ?? '');

  const fields: { label: string; val?: string; mono?: boolean }[] = [
    { label: 'Mã nhân viên',    val: currentUser.userId,     mono: true },
    { label: 'Họ và tên',       val: currentUser.fullName },
    { label: 'Email',           val: currentUser.email,      mono: true },
    { label: 'Điện thoại',      val: currentUser.phoneNumber, mono: true },
    { label: 'Vai trò',         val: 'Nhân viên xử lý (STAFF)' },
    { label: 'Cơ quan',         val: dept?.name ?? currentUser.departmentId ?? '—' },
    { label: 'Trạng thái',      val: currentUser.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động' },
    { label: 'Tỉnh / TP',       val: currentUser.province },
    { label: 'Phường / Xã',     val: currentUser.ward },
    { label: 'Địa chỉ',        val: currentUser.address },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto screen-enter space-y-5">
      {/* Avatar header */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
        <div className="relative h-[72px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-white" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ background: 'repeating-linear-gradient(-45deg,#f97316,#f97316 8px,transparent 8px,transparent 16px)' }} />
        </div>
        <div className="px-6 pb-5 -mt-8 relative flex items-end gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-[#b94b00] flex items-center justify-center flex-shrink-0 glow-orange border-4 border-white">
            <span className="font-display text-gray-900 font-extrabold text-2xl">{currentUser.fullName.charAt(0)}</span>
          </div>
          <div className="pb-1">
            <h2 className="font-display text-[22px] font-extrabold text-gray-900 uppercase tracking-tight leading-tight">{currentUser.fullName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-400 uppercase tracking-wide">Staff</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${currentUser.status === 'ACTIVE' ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-gray-300 text-gray-500'}`}>
                {currentUser.status === 'ACTIVE' ? 'Hoạt động' : 'Vô hiệu'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
        <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5 opacity-70">
              <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-90" />
              <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-50" />
            </div>
            <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">Thông tin cá nhân</p>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {fields.map(f => (
            <div key={f.label} className="flex items-start justify-between px-5 py-3 gap-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] flex-shrink-0 mt-0.5 w-36">{f.label}</p>
              <p className={`text-[13px] text-gray-800 text-right ${f.mono ? 'font-mono-cf' : ''}`}>{f.val ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Department detail card */}
      {dept && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5 opacity-70">
                <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-90" />
                <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-50" />
              </div>
              <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">Cơ quan phụ trách</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: 'Mã cơ quan', val: dept.departmentId, mono: true },
              { label: 'Tên cơ quan', val: dept.name },
              { label: 'Cấp', val: dept.level },
              { label: 'Điện thoại', val: dept.phoneNumber, mono: true },
              { label: 'Email', val: dept.contactEmail, mono: true },
            ].map(f => (
              <div key={f.label} className="flex items-start justify-between px-5 py-3 gap-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] flex-shrink-0 mt-0.5 w-36">{f.label}</p>
                <p className={`text-[13px] text-gray-800 text-right ${f.mono ? 'font-mono-cf' : ''}`}>{f.val ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
