import { useState, useEffect } from 'react';
import { USERS, DEPARTMENTS as FALLBACK_DEPARTMENTS } from '../data';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  AdminUser,
  getDepartments,
  DepartmentItem,
  ApiError,
} from '../services';

type ModalMode = 'view' | 'create' | 'edit' | null;

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  ADMIN: {
    label: 'Admin',
    cls: 'text-orange-600 bg-orange-50 border-orange-200',
  },
  STAFF: {
    label: 'Staff',
    cls: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  DISPATCHER: {
    label: 'Dispatcher',
    cls: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  CITIZEN: {
    label: 'Citizen / Cư dân',
    cls: 'text-gray-600 bg-gray-50 border-gray-200',
  },
  RESIDENT: {
    label: 'Resident / Cư dân',
    cls: 'text-gray-600 bg-gray-50 border-gray-200',
  },
  USER: {
    label: 'User',
    cls: 'text-gray-600 bg-gray-50 border-gray-200',
  },
};

function extractUserRole(u: any): string {
  if (!u) return 'CITIZEN';
  if (typeof u.role === 'string' && u.role.trim()) {
    return u.role.trim();
  }
  if (typeof u.roleName === 'string' && u.roleName.trim()) {
    return u.roleName.trim();
  }
  if (u.role && typeof u.role === 'object') {
    return u.role.name || u.role.roleName || u.role.code || 'CITIZEN';
  }
  if (Array.isArray(u.roles) && u.roles.length > 0) {
    const firstRole = u.roles[0];
    if (typeof firstRole === 'string') return firstRole;
    if (typeof firstRole === 'object' && firstRole) return firstRole.name || firstRole.roleName || firstRole.code || 'CITIZEN';
  }
  if (u.isDispatcher) {
    return 'DISPATCHER';
  }
  return 'CITIZEN';
}

const EMPTY_FORM = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
  province: 'Tp Ho Chi Minh',
  ward: '',
  address: '',
  role: 'STAFF',
  roleId: '',
  status: 'ACTIVE',
  departmentId: '',
  isDispatcher: false,
};

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState<string>('all');
  const [formError, setFormError] = useState('');

  // 1. Tải danh sách người dùng (GET /api/v1/admin/users) & Cơ quan (GET /api/v1/departments)
  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      if (data && data.length > 0) {
        setUsers(data);
      } else {
        setUsers(
          USERS.map((u) => ({
            id: u.userId,
            userId: u.userId,
            email: u.email,
            fullName: u.fullName,
            phoneNumber: u.phoneNumber,
            province: u.province,
            ward: u.ward,
            address: u.address,
            role: u.role,
            status: u.status,
            departmentId: u.departmentId,
            createdAt: u.createdAt,
          }))
        );
      }
    } catch (err) {
      console.warn('Lỗi khi tải users từ API:', err);
      setUsers(
        USERS.map((u) => ({
          id: u.userId,
          userId: u.userId,
          email: u.email,
          fullName: u.fullName,
          phoneNumber: u.phoneNumber,
          province: u.province,
          ward: u.ward,
          address: u.address,
          role: u.role,
          status: u.status,
          departmentId: u.departmentId,
          createdAt: u.createdAt,
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepartmentsList() {
    try {
      const res = await getDepartments({ page: 0, size: 100 });
      let list: DepartmentItem[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray((res as any).content)) {
        list = (res as any).content;
      }

      if (list.length > 0) {
        setDepartments(list);
      } else {
        setDepartments(FALLBACK_DEPARTMENTS as any);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách cơ quan:', err);
      setDepartments(FALLBACK_DEPARTMENTS as any);
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchDepartmentsList();
  }, []);

  const filtered = users.filter((u) => {
    const userRole = extractUserRole(u).toUpperCase();
    if (roleF !== 'all') {
      if (roleF === 'CITIZEN' || roleF === 'RESIDENT') {
        if (userRole !== 'CITIZEN' && userRole !== 'RESIDENT' && userRole !== 'USER') return false;
      } else if (userRole !== roleF) {
        return false;
      }
    }
    if (search) {
      const q = search.toLowerCase();
      const name = (u.fullName || '').toLowerCase();
      const mail = (u.email || '').toLowerCase();
      const phone = u.phoneNumber || u.phone || '';
      if (!name.includes(q) && !mail.includes(q) && !phone.includes(q)) {
        return false;
      }
    }
    return true;
  });

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setSelected(null);
    setFormError('');
    setModal('create');
  }

  function openEdit(u: AdminUser) {
    const userRole = extractUserRole(u).toUpperCase();
    setForm({
      fullName: u.fullName || '',
      email: u.email || '',
      password: '',
      phoneNumber: u.phoneNumber || u.phone || '',
      province: u.province || 'Tp Ho Chi Minh',
      ward: u.ward || '',
      address: u.address || '',
      role: userRole,
      roleId: u.roleId || '',
      status: u.status || 'ACTIVE',
      departmentId: u.departmentId || '',
      isDispatcher: Boolean(u.isDispatcher || userRole === 'DISPATCHER'),
    });
    setSelected(u);
    setFormError('');
    setModal('edit');
  }

  function openView(u: AdminUser) {
    setSelected(u);
    setModal('view');
  }

  // 2. Tạo mới & 3. Cập nhật người dùng (POST / PUT /api/v1/admin/users)
  async function saveUser() {
    if (!form.fullName.trim()) {
      setFormError('Vui lòng nhập họ và tên');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setFormError('Email không hợp lệ');
      return;
    }
    if (modal === 'create' && (!form.password || form.password.length < 6)) {
      setFormError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (modal === 'create') {
        const created = await createAdminUser({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phoneNumber: form.phoneNumber,
          province: form.province,
          ward: form.ward,
          address: form.address,
          roleId: form.roleId || undefined,
          departmentId: form.departmentId || undefined,
          status: form.status,
          isDispatcher: form.isDispatcher,
        });

        setUsers((prev) => [
          {
            ...created,
            role: form.role,
            createdAt: new Date().toLocaleDateString('vi-VN'),
          },
          ...prev,
        ]);
      } else if (modal === 'edit' && selected) {
        const targetId = selected.id || selected.userId || '';
        const updated = await updateAdminUser(targetId, {
          email: form.email,
          fullName: form.fullName,
          phoneNumber: form.phoneNumber,
          province: form.province,
          ward: form.ward,
          address: form.address,
          roleId: form.roleId || undefined,
          departmentId: form.departmentId || undefined,
          status: form.status,
          isDispatcher: form.isDispatcher,
        });

        setUsers((prev) =>
          prev.map((x) =>
            (x.id || x.userId) === targetId
              ? {
                  ...x,
                  ...updated,
                  ...form,
                  updatedAt: new Date().toLocaleDateString('vi-VN'),
                }
              : x
          )
        );
      }
      setModal(null);
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Không thể lưu người dùng. Vui lòng thử lại.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  // Khóa / Mở khóa trạng thái (PUT /api/v1/admin/users/{id})
  async function toggleBlock(u: AdminUser) {
    const targetId = u.id || u.userId || '';
    if (!targetId) return;

    const nextStatus = u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await updateAdminUser(targetId, {
        fullName: u.fullName,
        phoneNumber: u.phoneNumber || u.phone || '',
        province: u.province || '',
        ward: u.ward || '',
        address: u.address || '',
        status: nextStatus,
        roleId: u.roleId,
        departmentId: u.departmentId,
        isDispatcher: u.isDispatcher,
      });

      setUsers((prev) =>
        prev.map((x) =>
          (x.id || x.userId) === targetId ? { ...x, status: nextStatus } : x
        )
      );
    } catch (err: any) {
      alert(
        err instanceof ApiError
          ? err.message
          : 'Không thể cập nhật trạng thái người dùng.'
      );
    }
  }

  // 4. Xóa người dùng (DELETE /api/v1/admin/users/{id})
  async function handleDelete(u: AdminUser) {
    const targetId = u.id || u.userId || '';
    if (!targetId) return;

    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa tài khoản "${u.fullName || u.email}" không?`
      )
    ) {
      return;
    }

    try {
      await deleteAdminUser(targetId);
      setUsers((prev) =>
        prev.filter((x) => (x.id || x.userId) !== targetId)
      );
    } catch (err: any) {
      alert(
        err instanceof ApiError ? err.message : 'Xóa người dùng thất bại.'
      );
    }
  }

  function setField(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
    setFormError('');
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2 w-56">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#52525b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên, email, SĐT..."
            className="bg-transparent text-[12px] text-gray-700 placeholder-zinc-700 outline-none flex-1"
          />
        </div>
        <select
          value={roleF}
          onChange={(e) => setRoleF(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none cursor-pointer"
        >
          <option value="all">Mọi vai trò</option>
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
          <option value="RESIDENT">Resident / Citizen</option>
        </select>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="text-[12px] text-orange-600 hover:text-orange-700 font-semibold cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : '↻ Làm mới'}
        </button>

        <div className="flex-1" />
        <span className="font-mono-cf text-[11px] text-gray-400">
          {filtered.length} người dùng
        </span>
        <button
          onClick={openCreate}
          className="relative rounded-xl overflow-hidden px-4 py-2 active:scale-[0.97] transition-transform cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              background:
                'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)',
            }}
          />
          <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">
            + Tạo tài khoản
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75">
                {[
                  'Họ tên',
                  'Email',
                  'SĐT',
                  'Vai trò',
                  'Cơ quan',
                  'Trạng thái',
                  'Ngày tạo',
                  'Hành động',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[9px] font-bold text-gray-500 uppercase tracking-[0.18em] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => {
                const uid = u.id || u.userId || u.email;
                const dept = departments.find(
                  (d) => d.departmentId === u.departmentId
                );
                const roleKey = extractUserRole(u).toUpperCase();
                const roleBadge = ROLE_MAP[roleKey] || {
                  label: roleKey,
                  cls: 'text-gray-600 bg-gray-50 border-gray-200',
                };

                return (
                  <tr
                    key={uid}
                    className="hover:bg-orange-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 font-bold text-[11px]">
                          {(u.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <p className="text-[13px] text-gray-900 font-semibold">
                          {u.fullName || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono-cf text-[11px] text-gray-600">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 font-mono-cf text-[11px] text-gray-600">
                      {u.phoneNumber || u.phone || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${roleBadge.cls}`}
                      >
                        {roleBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[140px] truncate">
                      {dept?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1
                        ${
                          u.status === 'ACTIVE'
                            ? 'text-green-600 bg-green-50 border-green-200'
                            : 'text-red-600 bg-red-50 border-red-200'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        {u.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400">
                      {u.createdAt || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ActionBtn onClick={() => openView(u)} label="Xem" />
                        <ActionBtn onClick={() => openEdit(u)} label="Sửa" />
                        <ActionBtn
                          onClick={() => toggleBlock(u)}
                          label={u.status === 'ACTIVE' ? 'Khóa' : 'Mở'}
                          danger={u.status === 'ACTIVE'}
                        />
                        <ActionBtn
                          onClick={() => handleDelete(u)}
                          label="Xóa"
                          danger
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Popup (Fixed Viewport Center with Dark Backdrop) */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto relative">
            {/* Modal Header */}
            <div className="relative px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-orange-500" />
              <h3 className="font-display text-[16px] font-bold text-gray-900 uppercase tracking-wide">
                {modal === 'create'
                  ? 'Tạo tài khoản mới'
                  : modal === 'edit'
                  ? 'Chỉnh sửa tài khoản'
                  : 'Thông tin người dùng'}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-[12px] text-red-600">{formError}</p>
              </div>
            )}

            {/* View Mode */}
            {modal === 'view' && selected ? (
              <div>
                <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto bg-white">
                  {[
                    { label: 'Họ và tên', val: selected.fullName },
                    { label: 'Email', val: selected.email, mono: true },
                    {
                      label: 'Số điện thoại',
                      val: selected.phoneNumber || selected.phone || '—',
                      mono: true,
                    },
                    { label: 'Tỉnh / Thành phố', val: selected.province || '—' },
                    { label: 'Phường / Xã', val: selected.ward || '—' },
                    { label: 'Địa chỉ', val: selected.address || '—' },
                    {
                      label: 'Vai trò',
                      val:
                        ROLE_MAP[extractUserRole(selected).toUpperCase()]
                          ?.label || extractUserRole(selected),
                    },
                    {
                      label: 'Cơ quan',
                      val:
                        departments.find(
                          (d) => d.departmentId === selected.departmentId
                        )?.name ?? '—',
                    },
                    {
                      label: 'Trạng thái',
                      val:
                        selected.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa',
                    },
                    {
                      label: 'Ngày tạo',
                      val: selected.createdAt || '—',
                      mono: true,
                    },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">
                        {r.label}
                      </p>
                      <p
                        className={`text-[13px] text-gray-800 font-medium ${
                          r.mono ? 'font-mono-cf text-[12px]' : ''
                        }`}
                      >
                        {r.val || '—'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-[12px] font-semibold transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              /* Create / Edit Mode */
              <div className="px-5 py-5 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto bg-white">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    Họ và tên <span className="text-red-500">*</span></label>
                  <input
                    value={form.fullName}
                    onChange={(e) => setField('fullName', e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    disabled={modal === 'edit'}
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="user@cityfix.vn"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 transition-colors disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    {modal === 'create' ? 'Mật khẩu *' : 'Mật khẩu mới (tùy chọn)'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder={modal === 'create' ? '••••••••' : 'Để trống nếu không đổi'}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    Số điện thoại
                  </label>
                  <input
                    value={form.phoneNumber}
                    onChange={(e) => setField('phoneNumber', e.target.value)}
                    placeholder="0901234567"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    Tỉnh / Thành phố
                  </label>
                  <input
                    value={form.province}
                    onChange={(e) => setField('province', e.target.value)}
                    placeholder="Tp Ho Chi Minh"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    Phường / Xã
                  </label>
                  <input
                    value={form.ward}
                    onChange={(e) => setField('ward', e.target.value)}
                    placeholder="Phường 6, Quận 3"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    Địa chỉ
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="Số nhà, đường"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    Vai trò
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => {
                      const val = e.target.value;
                      setField('role', val);
                      if (val === 'DISPATCHER') {
                        setField('isDispatcher', true);
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="ADMIN">Admin — Quản trị viên</option>
                    <option value="STAFF">Staff — Nhân viên tiếp nhận</option>
                    <option value="DISPATCHER">Dispatcher — Điều phối viên</option>
                    <option value="CITIZEN">Citizen — Người dân</option>
                    <option value="RESIDENT">Resident — Cư dân</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    Cơ quan / Phòng ban
                  </label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setField('departmentId', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">— Không có —</option>
                    {departments.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>
                        {d.name} ({d.level || 'Cơ quan'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                    Trạng thái
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="BLOCKED">Bị khóa (BLOCKED)</option>
                  </select>
                </div>

                <div className="col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isDispatcher"
                    checked={form.isDispatcher}
                    onChange={(e) => setField('isDispatcher', e.target.checked)}
                    className="rounded text-orange-500 focus:ring-orange-400"
                  />
                  <label
                    htmlFor="isDispatcher"
                    className="text-[12px] text-gray-700 cursor-pointer"
                  >
                    Quyền điều phối viên (Dispatcher)
                  </label>
                </div>

                <div className="col-span-2 flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-[12px] font-semibold hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveUser}
                    className="flex-1 relative rounded-xl overflow-hidden py-2.5 active:scale-[0.97] transition-transform disabled:opacity-60 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                    <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">
                      {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
                    </span>
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

function ActionBtn({
  onClick,
  label,
  danger,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-all active:scale-[0.97] cursor-pointer
        ${
          danger
            ? 'border-red-500/30 text-red-500 hover:bg-red-50'
            : 'border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 hover:bg-gray-50'
        }`}
    >
      {label}
    </button>
  );
}

