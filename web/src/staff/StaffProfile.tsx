import { useState, useEffect } from 'react';
import { User, getDept } from '../data';
import { getProfile, updateProfile, getDepartments, getDepartmentById, DepartmentItem, formatDepartmentLevel, UserProfile, ApiError } from '../services';

interface Props {
  currentUser: User;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export default function StaffProfile({ currentUser, onProfileUpdated }: Props) {
  const [profile, setProfile] = useState<UserProfile>({
    userId: currentUser.userId,
    email: currentUser.email,
    roleName: currentUser.role,
    departmentId: currentUser.departmentId,
    status: currentUser.status,
    fullName: currentUser.fullName,
    phoneNumber: currentUser.phoneNumber || '',
    address: currentUser.address || '',
    province: currentUser.province || '',
    ward: currentUser.ward || '',
  });

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    province: '',
    ward: '',
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Profile from GET /api/v1/profile
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [profileData, deptData] = await Promise.allSettled([
          getProfile(),
          getDepartments(),
        ]);

        let currentDeptId = currentUser.departmentId;

        if (profileData.status === 'fulfilled' && profileData.value && mounted) {
          const p = profileData.value;
          currentDeptId = p.departmentId || currentDeptId;
          setProfile(p);
        }

        let list: DepartmentItem[] = [];
        if (deptData.status === 'fulfilled' && deptData.value && mounted) {
          list = Array.isArray(deptData.value) ? deptData.value : (deptData.value as any).content || [];
          setDepartments(list);
        }

        // Nếu cơ quan là UUID và chưa có trong list, gọi API chi tiết
        if (currentDeptId && currentDeptId.length > 5 && !list.some((d) => d.departmentId === currentDeptId)) {
          try {
            const detail = await getDepartmentById(currentDeptId);
            if (detail && mounted) {
              setDepartments((prev) => [...prev, detail]);
            }
          } catch (e) {
            console.warn('Không thể tải chi tiết cơ quan:', e);
          }
        }
      } catch (e) {
        console.warn('Không thể tải dữ liệu profile:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  function startEdit() {
    setEditForm({
      fullName: profile.fullName || currentUser.fullName || '',
      phoneNumber: profile.phoneNumber || currentUser.phoneNumber || '',
      address: profile.address || currentUser.address || '',
      province: profile.province || currentUser.province || '',
      ward: profile.ward || currentUser.ward || '',
    });
    setFeedback(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setFeedback(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.fullName.trim()) {
      setFeedback({ type: 'error', message: 'Họ và tên không được để trống.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const updated = await updateProfile({
        fullName: editForm.fullName.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        address: editForm.address.trim(),
        province: editForm.province.trim(),
        ward: editForm.ward.trim(),
      });

      setProfile((prev) => ({
        ...prev,
        ...updated,
      }));
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Cập nhật thông tin thành công!' });
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Không thể cập nhật thông tin hồ sơ.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  }

  const dept =
    departments.find((d) => d.departmentId === (profile.departmentId || currentUser.departmentId)) ||
    getDept(profile.departmentId || currentUser.departmentId || '');

  const displayFullName = profile.fullName || currentUser.fullName || 'Nhân viên';
  const displayEmail = profile.email || currentUser.email || '—';
  const displayRole = profile.roleName || 'STAFF';
  const displayStatus = profile.status || currentUser.status || 'ACTIVE';

  const fields: { label: string; val?: string; mono?: boolean }[] = [
    { label: 'Mã nhân viên', val: profile.userId || currentUser.userId, mono: true },
    { label: 'Họ và tên', val: displayFullName },
    { label: 'Email', val: displayEmail, mono: true },
    { label: 'Điện thoại', val: profile.phoneNumber || currentUser.phoneNumber, mono: true },
    { label: 'Vai trò', val: displayRole.includes('STAFF') ? 'Nhân viên xử lý (STAFF)' : displayRole },
    { label: 'Cơ quan', val: dept?.name || profile.departmentId || currentUser.departmentId || '—' },
    { label: 'Trạng thái', val: displayStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động' },
    { label: 'Tỉnh / TP', val: profile.province || currentUser.province },
    { label: 'Phường / Xã', val: profile.ward || currentUser.ward },
    { label: 'Địa chỉ', val: profile.address || currentUser.address },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto screen-enter space-y-5">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-[13px] flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Avatar header */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
        <div className="relative h-[72px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-white" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              background:
                'repeating-linear-gradient(-45deg,#f97316,#f97316 8px,transparent 8px,transparent 16px)',
            }}
          />
        </div>
        <div className="px-6 pb-5 -mt-8 relative flex items-end justify-between gap-4">
          <div className="flex items-end gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-[#b94b00] flex items-center justify-center flex-shrink-0 glow-orange border-4 border-white shadow-md">
              <span className="font-display text-white font-extrabold text-2xl">
                {displayFullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="pb-1 min-w-0">
              <h2 className="font-display text-[22px] font-extrabold text-gray-900 uppercase tracking-tight leading-tight truncate">
                {displayFullName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-600 uppercase tracking-wide">
                  {displayRole}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    displayStatus === 'ACTIVE'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                      : 'border-gray-300 bg-gray-100 text-gray-500'
                  }`}
                >
                  {displayStatus === 'ACTIVE' ? 'Hoạt động' : 'Vô hiệu'}
                </span>
                {loading && <span className="text-[11px] text-gray-400 italic">Đang tải...</span>}
              </div>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:border-orange-300 text-[12px] font-bold transition-all active:scale-[0.97] cursor-pointer"
            >
              <EditIcon />
              <span>Chỉnh sửa</span>
            </button>
          )}
        </div>
      </div>

      {/* Edit Form OR View Details */}
      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5 opacity-70">
                <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-90" />
                <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-50" />
              </div>
              <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">
                Cập nhật thông tin cá nhân
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Họ và tên *
              </label>
              <input
                type="text"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                placeholder="Nhập họ và tên"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-800 font-mono-cf focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                placeholder="0901234567"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Tỉnh / Thành phố
                </label>
                <input
                  type="text"
                  value={editForm.province}
                  onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Tp Ho Chi Minh"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Phường / Xã
                </label>
                <input
                  type="text"
                  value={editForm.ward}
                  onChange={(e) => setEditForm({ ...editForm, ward: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Phường 6, Quận 3"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Địa chỉ
              </label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                placeholder="Số nhà, tên đường"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 text-[12px] font-bold shadow-sm transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Fields */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5 opacity-70">
                <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-90" />
                <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-50" />
              </div>
              <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">
                Thông tin cá nhân
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {fields.map((f) => (
              <div key={f.label} className="flex items-start justify-between px-5 py-3 gap-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] flex-shrink-0 mt-0.5 w-36">
                  {f.label}
                </p>
                <p className={`text-[13px] text-gray-800 text-right ${f.mono ? 'font-mono-cf' : ''}`}>
                  {f.val ?? '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department detail card */}
      {dept && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5 opacity-70">
                <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-90" />
                <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-50" />
              </div>
              <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">
                Cơ quan phụ trách
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: 'Mã cơ quan', val: dept.departmentId, mono: true },
              { label: 'Tên cơ quan', val: dept.name },
              { label: 'Cấp', val: formatDepartmentLevel(dept.level) },
              { label: 'Điện thoại', val: dept.phoneNumber, mono: true },
              { label: 'Email', val: dept.contactEmail, mono: true },
            ].map((f) => (
              <div key={f.label} className="flex items-start justify-between px-5 py-3 gap-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] flex-shrink-0 mt-0.5 w-36">
                  {f.label}
                </p>
                <p className={`text-[13px] text-gray-800 text-right ${f.mono ? 'font-mono-cf' : ''}`}>
                  {f.val ?? '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

