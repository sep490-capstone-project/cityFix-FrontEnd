import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { message } from 'antd';
import { BuildingIcon } from '../components/Icons';
import { USERS, DEPARTMENTS as FALLBACK_DEPARTMENTS } from '../data';
import { downloadCsvFile } from '../utils/exportFile';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  AdminUser,
  getDepartments,
  DepartmentItem,
  formatDepartmentLevel,
  ApiError,
} from '../services';

type ModalMode = 'view' | 'create' | 'edit' | null;

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  ADMIN: {
    label: 'Quản trị viên',
    cls: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  MANAGER: {
    label: 'Quản lý',
    cls: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  STAFF: {
    label: 'Nhân viên',
    cls: 'text-slate-700 bg-slate-100 border-slate-200',
  },
  RESIDENT: {
    label: 'Cư dân',
    cls: 'text-gray-600 bg-gray-50 border-gray-200',
  },
  CITIZEN: {
    label: 'Cư dân',
    cls: 'text-gray-600 bg-gray-50 border-gray-200',
  },
  USER: {
    label: 'Cư dân',
    cls: 'text-gray-600 bg-gray-50 border-gray-200',
  },
};

function extractUserRole(u: any): 'ADMIN' | 'MANAGER' | 'STAFF' | 'RESIDENT' {
  if (!u) return 'RESIDENT';
  let raw = '';
  if (typeof u.role === 'string' && u.role.trim()) {
    raw = u.role.trim();
  } else if (typeof u.roleName === 'string' && u.roleName.trim()) {
    raw = u.roleName.trim();
  } else if (u.role && typeof u.role === 'object') {
    raw = u.role.name || u.role.roleName || u.role.code || '';
  } else if (Array.isArray(u.roles) && u.roles.length > 0) {
    const firstRole = u.roles[0];
    raw = typeof firstRole === 'string' ? firstRole : (firstRole?.name || firstRole?.roleName || firstRole?.code || '');
  }

  const upper = raw.toUpperCase();
  if (upper.includes('ADMIN')) return 'ADMIN';
  if (upper.includes('MANAGER')) return 'MANAGER';
  if (upper.includes('STAFF')) return 'STAFF';
  return 'RESIDENT';
}

function extractUserDepartmentIds(u: any): string[] {
  if (!u) return [];
  if (Array.isArray(u.departmentIds) && u.departmentIds.length > 0) {
    return u.departmentIds
      .map((d: any) => (typeof d === 'string' ? d : d?.departmentId || d?.id || ''))
      .filter(Boolean);
  }
  if (Array.isArray(u.departments) && u.departments.length > 0) {
    return u.departments
      .map((d: any) => (typeof d === 'string' ? d : d?.departmentId || d?.id || ''))
      .filter(Boolean);
  }
  if (u.departmentId && typeof u.departmentId === 'string' && u.departmentId.trim()) {
    return [u.departmentId.trim()];
  }
  return [];
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
  departmentIds: [] as string[],
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
  const [deptSearch, setDeptSearch] = useState('');
  const [roleF, setRoleF] = useState<string>('all');
  const [formError, setFormError] = useState('');

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

  function toggleDept(deptId: string) {
    setForm((f) => {
      const exists = f.departmentIds.includes(deptId);
      const nextList = exists
        ? f.departmentIds.filter((id) => id !== deptId)
        : [...f.departmentIds, deptId];
      return {
        ...f,
        departmentIds: nextList,
        departmentId: nextList.length === 1 ? nextList[0] : (nextList[0] || ''),
      };
    });
    setFormError('');
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, departmentIds: [] });
    setDeptSearch('');
    setSelected(null);
    setFormError('');
    setModal('create');
  }

  function openEdit(u: AdminUser) {
    const userRole = extractUserRole(u).toUpperCase();
    const deptIds = extractUserDepartmentIds(u);
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
      departmentId: deptIds[0] || u.departmentId || '',
      departmentIds: deptIds,
    });
    setDeptSearch('');
    setSelected(u);
    setFormError('');
    setModal('edit');
  }

  function openView(u: AdminUser) {
    setSelected(u);
    setModal('view');
  }

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
      const selectedDeptIds = form.role === 'MANAGER'
        ? form.departmentIds.filter(Boolean)
        : (form.departmentId ? [form.departmentId] : []);

      const payloadDepartmentId = selectedDeptIds.length === 1 ? selectedDeptIds[0] : undefined;
      const payloadDepartmentIds = selectedDeptIds.length > 1 ? selectedDeptIds : undefined;

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
          role: form.role,
          departmentId: payloadDepartmentId,
          departmentIds: payloadDepartmentIds,
          status: form.status,
        });

        setUsers((prev) => [
          {
            ...created,
            role: form.role,
            departmentId: payloadDepartmentId,
            departmentIds: selectedDeptIds,
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
          role: form.role,
          departmentId: payloadDepartmentId,
          departmentIds: payloadDepartmentIds,
          status: form.status,
        });

        setUsers((prev) =>
          prev.map((x) =>
            (x.id || x.userId) === targetId
              ? {
                  ...x,
                  ...updated,
                  ...form,
                  departmentId: payloadDepartmentId,
                  departmentIds: selectedDeptIds,
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

  async function toggleBlock(u: AdminUser) {
    const targetId = u.id || u.userId || '';
    if (!targetId) return;

    const nextStatus = u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      const userDeptIds = extractUserDepartmentIds(u);
      await updateAdminUser(targetId, {
        fullName: u.fullName,
        phoneNumber: u.phoneNumber || u.phone || '',
        province: u.province || '',
        ward: u.ward || '',
        address: u.address || '',
        status: nextStatus,
        roleId: u.roleId,
        role: extractUserRole(u),
        departmentId: userDeptIds.length === 1 ? userDeptIds[0] : undefined,
        departmentIds: userDeptIds.length > 1 ? userDeptIds : undefined,
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

  function handleExportUsers() {
    if (filtered.length === 0) {
      message.warning('Không có dữ liệu người dùng để xuất file.');
      return;
    }

    const headers = [
      'Họ và tên',
      'Email',
      'Số điện thoại',
      'Vai trò',
      'Cơ quan phụ trách',
      'Tỉnh/Thành phố',
      'Phường/Xã',
      'Địa chỉ',
      'Trạng thái',
      'Ngày tạo',
    ];

    const rows = filtered.map((u) => {
      const deptIds = extractUserDepartmentIds(u);
      const userDeptNames = deptIds
        .map((id) => departments.find((d) => d.departmentId === id)?.name)
        .filter(Boolean)
        .join('; ');
      const roleKey = extractUserRole(u).toUpperCase();
      const roleLabel = ROLE_MAP[roleKey]?.label || roleKey;

      return [
        u.fullName || '',
        u.email || '',
        u.phoneNumber || u.phone || '',
        roleLabel,
        userDeptNames || '—',
        u.province || '',
        u.ward || '',
        u.address || '',
        u.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa',
        u.createdAt || '',
      ];
    });

    downloadCsvFile('CityFix_Danh_Sach_Nguoi_Dung', headers, rows);
    message.success(`Đã xuất ${filtered.length} người dùng ra file CSV!`);
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* 1. Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-extrabold text-gray-900 tracking-tight">
              Quản lý Tài khoản & Phân quyền Hệ thống
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Quản lý danh sách Quản trị viên, Quản lý cơ quan, Cán bộ kỹ thuật và Cư dân trên hệ thống CityFix
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <span className="font-mono-cf text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl">
              {filtered.length} người dùng
            </span>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang tải...' : '↻ Làm mới'}
            </button>

            <button
              onClick={handleExportUsers}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Xuất CSV
            </button>

            <button
              onClick={openCreate}
              className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              + Tạo tài khoản
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:w-72">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
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
              placeholder="Tìm theo tên, email, SĐT..."
              className="bg-transparent text-xs text-gray-800 placeholder-gray-400 outline-none flex-1 font-medium"
            />
          </div>

          <select
            value={roleF}
            onChange={(e) => setRoleF(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 font-semibold outline-none cursor-pointer focus:border-orange-500"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="MANAGER">Quản lý cơ quan</option>
            <option value="STAFF">Nhân viên kỹ thuật</option>
            <option value="RESIDENT">Cư dân</option>
          </select>
        </div>
      </div>

      {/* 2. Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                {[
                  'Họ tên',
                  'Email',
                  'SĐT',
                  'Vai trò',
                  'Cơ quan phụ trách',
                  'Trạng thái',
                  'Ngày tạo',
                  'Thao tác',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => {
                const uid = u.id || u.userId || u.email;
                const deptIds = extractUserDepartmentIds(u);
                const userDeptNames = deptIds
                  .map((id) => departments.find((d) => d.departmentId === id)?.name)
                  .filter(Boolean);

                const roleKey = extractUserRole(u).toUpperCase();
                const roleBadge = ROLE_MAP[roleKey] || {
                  label: roleKey,
                  cls: 'text-gray-600 bg-gray-50 border-gray-200',
                };

                return (
                  <tr
                    key={uid}
                    className="hover:bg-orange-50/40 transition-colors cursor-pointer"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('td:last-child')) {
                        setSelected(u);
                        setModal('view');
                      }
                    }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          {(u.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs text-gray-900 font-bold">
                          {u.fullName || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono-cf text-xs text-gray-600">
                      {u.email}
                    </td>
                    <td className="px-4 py-3.5 font-mono-cf text-xs text-gray-600">
                      {u.phoneNumber || u.phone || '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex whitespace-nowrap text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${roleBadge.cls}`}
                      >
                        {roleBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600 max-w-[180px]">
                      {userDeptNames.length === 0 ? (
                        '—'
                      ) : userDeptNames.length === 1 ? (
                        <span className="truncate block" title={userDeptNames[0]}>
                          {userDeptNames[0]}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold cursor-help"
                          title={userDeptNames.join(', ')}
                        >
                          <BuildingIcon className="w-3 h-3 text-orange-600" />
                          <span>{userDeptNames.length} cơ quan</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1.5 ${
                          u.status === 'ACTIVE'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-red-700 bg-red-50 border-red-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        {u.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono-cf text-[11px] text-gray-400">
                      {u.createdAt || '—'}
                    </td>
                    <td className="px-4 py-3.5">
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

      {/* Modal Popup (Fixed Viewport Center via Portal) */}
      {modal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden shadow-2xl relative">
              {/* Modal Header */}
              <div className="relative px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 flex-shrink-0">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-orange-500" />
                <h3 className="font-display text-base font-bold text-gray-900 tracking-tight">
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
                <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex-shrink-0">
                  <p className="text-xs text-red-600">{formError}</p>
                </div>
              )}

              {/* View Mode */}
              {modal === 'view' && selected ? (() => {
                const selDeptIds = extractUserDepartmentIds(selected);
                const selDeptList = selDeptIds
                  .map((id) => departments.find((d) => d.departmentId === id))
                  .filter(Boolean) as DepartmentItem[];

                return (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="divide-y divide-gray-100 flex-1 overflow-y-auto bg-white">
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
                      ].map((r) => (
                        <div
                          key={r.label}
                          className="flex items-center gap-4 px-5 py-3"
                        >
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">
                            {r.label}
                          </p>
                          <p
                            className={`text-xs text-gray-800 font-semibold ${
                              r.mono ? 'font-mono-cf' : ''
                            }`}
                          >
                            {r.val || '—'}
                          </p>
                        </div>
                      ))}

                      {/* Cơ quan phụ trách */}
                      <div className="flex items-start gap-4 px-5 py-3">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-32 flex-shrink-0 pt-1">
                          {selDeptList.length > 1 ? `Cơ quan (${selDeptList.length})` : 'Cơ quan'}
                        </p>
                        <div className="flex-1">
                          {selDeptList.length === 0 ? (
                            <p className="text-xs text-gray-500">—</p>
                          ) : selDeptList.length === 1 ? (
                            <p className="text-xs text-gray-800 font-semibold">
                              {selDeptList[0].name}{' '}
                              {selDeptList[0].level ? `(${formatDepartmentLevel(selDeptList[0].level)})` : ''}
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {selDeptList.map((d) => (
                                <span
                                  key={d.departmentId}
                                  className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-semibold"
                                >
                                  {d.name} {d.level ? `(${formatDepartmentLevel(d.level)})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 px-5 py-3">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">
                          Trạng thái
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1.5 ${
                            selected.status === 'ACTIVE'
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-red-700 bg-red-50 border-red-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selected.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {selected.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 px-5 py-3">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">
                          Ngày tạo
                        </p>
                        <p className="text-xs text-gray-800 font-medium font-mono-cf">
                          {selected.createdAt || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setModal(null)}
                        className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                );
              })() : (
                /* Create / Edit Mode */
                <div className="px-5 py-5 grid grid-cols-2 gap-3 flex-1 overflow-y-auto bg-white">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.fullName}
                      onChange={(e) => setField('fullName', e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      disabled={modal === 'edit'}
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      placeholder="user@cityfix.vn"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      {modal === 'create' ? 'Mật khẩu *' : 'Mật khẩu mới (tùy chọn)'}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      placeholder={modal === 'create' ? '••••••••' : 'Để trống nếu không đổi'}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Số điện thoại
                    </label>
                    <input
                      value={form.phoneNumber}
                      onChange={(e) => setField('phoneNumber', e.target.value)}
                      placeholder="0901234567"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Tỉnh / Thành phố
                    </label>
                    <input
                      value={form.province}
                      onChange={(e) => setField('province', e.target.value)}
                      placeholder="Tp Ho Chi Minh"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Phường / Xã
                    </label>
                    <input
                      value={form.ward}
                      onChange={(e) => setField('ward', e.target.value)}
                      placeholder="Phường 6 hoặc Phường Bến Nghé"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Địa chỉ
                    </label>
                    <input
                      value={form.address}
                      onChange={(e) => setField('address', e.target.value)}
                      placeholder="Số nhà, đường"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setForm((prev) => {
                          let nextDeptIds = [...prev.departmentIds];
                          let nextDeptId = prev.departmentId;

                          if (newRole === 'MANAGER' && nextDeptIds.length === 0 && nextDeptId) {
                            nextDeptIds = [nextDeptId];
                          } else if (newRole !== 'MANAGER' && nextDeptIds.length > 0 && !nextDeptId) {
                            nextDeptId = nextDeptIds[0];
                          }

                          return {
                            ...prev,
                            role: newRole,
                            departmentId: nextDeptId,
                            departmentIds: nextDeptIds,
                          };
                        });
                        setFormError('');
                      }}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="ADMIN">Quản trị viên</option>
                      <option value="MANAGER">Quản lý (Manager)</option>
                      <option value="STAFF">Nhân viên</option>
                      <option value="RESIDENT">Cư dân</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setField('status', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                      <option value="BLOCKED">Bị khóa (BLOCKED)</option>
                    </select>
                  </div>

                  {form.role === 'MANAGER' ? (
                    <div className="space-y-2 col-span-2 bg-orange-50/40 border border-orange-200/80 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Cơ quan quản lý ({form.departmentIds.length} đã chọn)
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          {form.departmentIds.length === 1 && (
                            <span className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md font-semibold">
                              1 cơ quan (gửi departmentId)
                            </span>
                          )}
                          {form.departmentIds.length > 1 && (
                            <span className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md font-semibold">
                              {form.departmentIds.length} cơ quan (gửi departmentIds)
                            </span>
                          )}
                          {form.departmentIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setField('departmentIds', [])}
                              className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer underline"
                            >
                              Bỏ chọn tất cả
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-500">
                        Vai trò Quản lý có thể phụ trách một hoặc nhiều cơ quan. Nếu chọn 1 cơ quan hệ thống gửi <code className="text-orange-600 bg-orange-100/50 px-1 py-0.5 rounded font-mono text-[10px]">departmentId</code>, nếu chọn nhiều cơ quan hệ thống gửi <code className="text-orange-600 bg-orange-100/50 px-1 py-0.5 rounded font-mono text-[10px]">departmentIds</code>.
                      </p>

                      {/* Filter search */}
                      <input
                        type="text"
                        placeholder="Tìm cơ quan..."
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-orange-500 transition-colors"
                      />

                      {/* Scrollable Checkbox list */}
                      <div className="max-h-44 overflow-y-auto space-y-1 bg-white border border-gray-200 rounded-xl p-2 scrollbar-thin">
                        {departments
                          .filter((d) =>
                            !deptSearch.trim() ||
                            (d.name || '').toLowerCase().includes(deptSearch.toLowerCase().trim())
                          )
                          .map((d) => {
                            const isChecked = form.departmentIds.includes(d.departmentId);
                            return (
                              <label
                                key={d.departmentId}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs transition-all select-none ${
                                  isChecked
                                    ? 'bg-orange-50 border border-orange-300 text-orange-950 font-semibold shadow-2xs'
                                    : 'hover:bg-gray-50 border border-transparent text-gray-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleDept(d.departmentId)}
                                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300 cursor-pointer"
                                />
                                <span className="flex-1 truncate">{d.name}</span>
                                {d.level && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-normal">
                                    {formatDepartmentLevel(d.level)}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        {departments.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-2">
                            Không có cơ quan nào
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Cơ quan / Phòng ban
                      </label>
                      <select
                        value={form.departmentId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((f) => ({
                            ...f,
                            departmentId: val,
                            departmentIds: val ? [val] : [],
                          }));
                        }}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="">— Không có —</option>
                        {departments.map((d) => (
                          <option key={d.departmentId} value={d.departmentId}>
                            {d.name} {d.level ? `(${formatDepartmentLevel(d.level)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="col-span-2 flex gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-xs font-semibold hover:text-gray-800 transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={saveUser}
                      className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
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
      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-gray-200 text-gray-700 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50'
      }`}
    >
      {label}
    </button>
  );
}
