import { useState } from 'react';
import { USERS, DEPARTMENTS, User, Role } from '../data';

type ModalMode = 'view' | 'create' | 'edit' | null;

const ROLE_MAP: Record<Role, { label: string; cls: string }> = {
  ADMIN:    { label: 'Admin',    cls: 'text-orange-400 bg-orange-500/12 border-orange-500/20' },
  STAFF:    { label: 'Staff',    cls: 'text-blue-400   bg-blue-500/12   border-blue-500/20'   },
  RESIDENT: { label: 'Resident', cls: 'text-gray-600   bg-zinc-700/30   border-gray-300'   },
};

const EMPTY_FORM: Omit<User, 'userId' | 'createdAt' | 'updatedAt'> = {
  fullName: '', email: '', phoneNumber: '', province: 'TP.HCM', ward: '', address: '',
  role: 'STAFF', status: 'ACTIVE', departmentId: '',
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>(USERS);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState<Role | 'all'>('all');

  const filtered = users.filter(u => {
    if (roleF !== 'all' && u.role !== roleF) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.fullName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.phoneNumber.includes(q)) return false;
    }
    return true;
  });

  function openCreate() { setForm({ ...EMPTY_FORM }); setSelected(null); setModal('create'); }
  function openEdit(u: User) { setForm({ fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber, province: u.province, ward: u.ward, address: u.address, role: u.role, status: u.status, departmentId: u.departmentId ?? '' }); setSelected(u); setModal('edit'); }
  function openView(u: User) { setSelected(u); setModal('view'); }

  function saveUser() {
    if (modal === 'create') {
      const newUser: User = { ...form, userId: `U${Date.now()}`, createdAt: new Date().toLocaleDateString('vi-VN'), updatedAt: new Date().toLocaleDateString('vi-VN') };
      setUsers(u => [...u, newUser]);
    } else if (modal === 'edit' && selected) {
      setUsers(u => u.map(x => x.userId === selected.userId ? { ...x, ...form, updatedAt: new Date().toLocaleDateString('vi-VN') } : x));
    }
    setModal(null);
  }

  function toggleBlock(u: User) {
    setUsers(us => us.map(x => x.userId === u.userId ? { ...x, status: x.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' } : x));
  }

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="p-6 space-y-5 screen-enter">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2 w-56">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, email, SĐT..."
            className="bg-transparent text-[12px] text-gray-700 placeholder-zinc-700 outline-none flex-1" />
        </div>
        <select value={roleF} onChange={e => setRoleF(e.target.value as Role | 'all')}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none">
          <option value="all">Mọi vai trò</option>
          {Object.entries(ROLE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex-1" />
        <span className="font-mono-cf text-[11px] text-gray-400">{filtered.length} người dùng</span>
        <button onClick={openCreate}
          className="relative rounded-xl overflow-hidden px-4 py-2 active:scale-[0.97] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
          <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)' }} />
          <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">+ Tạo tài khoản</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200">
                {['Họ tên', 'Email', 'SĐT', 'Vai trò', 'Cơ quan', 'Trạng thái', 'Ngày tạo', 'Hành động'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => {
                const dept = DEPARTMENTS.find(d => d.departmentId === u.departmentId);
                return (
                  <tr key={u.userId} className="hover:bg-orange-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="font-display text-[11px] font-bold text-gray-600">{u.fullName.charAt(0)}</span>
                        </div>
                        <p className="text-[13px] text-gray-800 font-semibold">{u.fullName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono-cf text-[11px] text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 font-mono-cf text-[11px] text-gray-600">{u.phoneNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${ROLE_MAP[u.role].cls}`}>{ROLE_MAP[u.role].label}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[140px] truncate">{dept?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1
                        ${u.status === 'ACTIVE' ? 'text-green-400 bg-green-500/12 border-green-500/20' : 'text-red-400 bg-red-500/12 border-red-500/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-green-400' : 'bg-red-400'}`} />
                        {u.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400">{u.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ActionBtn onClick={() => openView(u)} label="Xem" />
                        <ActionBtn onClick={() => openEdit(u)} label="Sửa" />
                        <ActionBtn onClick={() => toggleBlock(u)} label={u.status === 'ACTIVE' ? 'Khóa' : 'Mở'} danger={u.status === 'ACTIVE'} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-gray-100/85 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden card-depth screen-enter">
            <div className="relative px-5 pt-4 pb-3 border-b border-gray-200 flex items-center justify-between">
              <div className="absolute top-0 left-0 right-0 h-[2px] hazard-stripe-thin" />
              <p className="font-display text-[16px] font-bold text-gray-900 uppercase tracking-wide mt-1">
                {modal === 'create' ? 'Tạo tài khoản mới' : modal === 'edit' ? 'Chỉnh sửa tài khoản' : 'Thông tin người dùng'}
              </p>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {modal === 'view' && selected ? (
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Họ tên', val: selected.fullName },
                  { label: 'Email', val: selected.email, mono: true },
                  { label: 'SĐT', val: selected.phoneNumber, mono: true },
                  { label: 'Tỉnh/TP', val: selected.province },
                  { label: 'Phường', val: selected.ward },
                  { label: 'Địa chỉ', val: selected.address },
                  { label: 'Vai trò', val: ROLE_MAP[selected.role].label },
                  { label: 'Cơ quan', val: DEPARTMENTS.find(d => d.departmentId === selected.departmentId)?.name ?? '—' },
                  { label: 'Ngày tạo', val: selected.createdAt, mono: true },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 px-5 py-2.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] w-28 flex-shrink-0">{r.label}</p>
                    <p className={`text-[13px] text-gray-700 ${r.mono ? 'font-mono-cf text-[11px]' : ''}`}>{r.val}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-5 grid grid-cols-2 gap-3">
                {[
                  { key: 'fullName', label: 'Họ và tên', col: 2 },
                  { key: 'email', label: 'Email' },
                  { key: 'phoneNumber', label: 'Số điện thoại' },
                  { key: 'province', label: 'Tỉnh/TP' },
                  { key: 'ward', label: 'Phường/Xã' },
                  { key: 'address', label: 'Địa chỉ', col: 2 },
                ].map(f => (
                  <div key={f.key} className={`space-y-1.5 ${f.col === 2 ? 'col-span-2' : ''}`}>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50 transition-colors" />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Vai trò</label>
                  <select value={form.role} onChange={e => set('role', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50">
                    {Object.entries(ROLE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Cơ quan</label>
                  <select value={form.departmentId} onChange={e => set('departmentId', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50">
                    <option value="">— Không có —</option>
                    {DEPARTMENTS.map(d => <option key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex gap-3 pt-2">
                  <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-[12px] font-semibold hover:text-gray-800 transition-colors">Hủy</button>
                  <button onClick={saveUser} className="flex-1 relative rounded-xl overflow-hidden py-2.5 active:scale-[0.97] transition-transform">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                    <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">Lưu</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-all active:scale-[0.97]
        ${danger ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400'}`}>
      {label}
    </button>
  );
}
