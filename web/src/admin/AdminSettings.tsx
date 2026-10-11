import { useState, useEffect } from 'react';
import { CATEGORIES, DEPARTMENTS, ROUTING_RULES } from '../data';
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  AdminCategory,
  getAllSubCategories,
  getSubCategoriesByCategoryId,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  AdminSubCategory,
  SubCategoryPriority,
  getRoutingRules,
  getRoutingRulesByDepartment,
  getRoutingRuleById,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  RoutingRuleItem,
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  DepartmentItem,
  ApiError,
} from '../services';

export type SettingsTab = 'categories' | 'subcategories' | 'departments' | 'routing';

interface SettingsProps {
  initialTab?: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
}

export default function Settings({ initialTab = 'categories', onTabChange }: SettingsProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [categoryFilterForSub, setCategoryFilterForSub] = useState<string>('');

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  function handleTabClick(newTab: SettingsTab) {
    setTab(newTab);
    if (onTabChange) {
      onTabChange(newTab);
    }
  }

  function handleNavigateToSubCategories(categoryId: string) {
    setCategoryFilterForSub(categoryId);
    handleTabClick('subcategories');
  }

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-5 shadow-xs">
        {([
          { key: 'categories', label: 'Danh mục sự cố' },
          { key: 'subcategories', label: 'Danh mục con' },
          { key: 'departments', label: 'Cơ quan' },
          { key: 'routing', label: 'Quy tắc định tuyến' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabClick(t.key)}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all active:scale-[0.97] cursor-pointer ${
              tab === t.key
                ? 'bg-orange-500/15 text-orange-600 border border-orange-500/20 shadow-xs'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'categories' && <CategoryMgmt onGoToSubCategories={handleNavigateToSubCategories} />}
      {tab === 'subcategories' && (
        <SubCategoryMgmt
          initialCategoryId={categoryFilterForSub}
          onResetCategoryFilter={() => setCategoryFilterForSub('')}
        />
      )}
      {tab === 'departments' && <DepartmentMgmt />}
      {tab === 'routing' && <RoutingMgmt />}
    </div>
  );
}

// ── Category Management ───────────────────────────────────────────────────────
function CategoryMgmt({ onGoToSubCategories }: { onGoToSubCategories?: (categoryId: string) => void }) {
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [sel, setSel] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });
  const [actionError, setActionError] = useState('');

  // 1. Lấy danh sách danh mục (GET /api/v1/admin/categories)
  async function fetchCategories() {
    setLoading(true);
    setActionError('');
    try {
      const data = await getAdminCategories();
      if (data && data.length > 0) {
        setCats(data);
      } else {
        // Fallback mock nếu database rỗng
        setCats(
          CATEGORIES.map((c) => ({
            id: c.categoryId,
            categoryId: c.categoryId,
            name: c.name,
            description: c.description,
            isActive: c.isActive,
          }))
        );
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải danh mục từ API:', err);
      // Fallback hiển thị dữ liệu sẵn có
      setCats(
        CATEGORIES.map((c) => ({
          id: c.categoryId,
          categoryId: c.categoryId,
          name: c.name,
          description: c.description,
          isActive: c.isActive,
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  function openCreate() {
    setForm({ name: '', description: '', isActive: true });
    setSel(null);
    setActionError('');
    setModal('create');
  }

  function openEdit(c: AdminCategory) {
    setForm({
      name: c.name || '',
      description: c.description || '',
      isActive: c.isActive !== false,
    });
    setSel(c);
    setActionError('');
    setModal('edit');
  }

  // 2. Tạo mới & 3. Cập nhật danh mục (POST / PUT /api/v1/admin/categories)
  async function save() {
    if (!form.name.trim()) {
      setActionError('Vui lòng nhập tên danh mục');
      return;
    }

    setSaving(true);
    setActionError('');

    try {
      if (modal === 'create') {
        const created = await createAdminCategory({
          name: form.name,
          description: form.description,
        });

        setCats((prev) => [created, ...prev]);
      } else if (sel) {
        const targetId = sel.id || sel.categoryId || '';
        const updated = await updateAdminCategory(targetId, {
          name: form.name,
          description: form.description,
        });

        setCats((prev) =>
          prev.map((x) =>
            (x.id || x.categoryId) === targetId ? { ...x, ...updated, ...form } : x
          )
        );
      }
      setModal(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Không thể lưu danh mục. Vui lòng thử lại.';
      setActionError(msg);
    } finally {
      setSaving(false);
    }
  }

  // 4. Xóa danh mục (DELETE /api/v1/admin/categories/{id})
  async function del(c: AdminCategory) {
    const targetId = c.id || c.categoryId || '';
    if (!targetId) return;

    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${c.name}" không?`)) {
      return;
    }

    try {
      await deleteAdminCategory(targetId);
      setCats((cs) => cs.filter((x) => (x.id || x.categoryId) !== targetId));
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : 'Xóa danh mục thất bại.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-gray-500 font-medium">
            {cats.length} danh mục sự cố
          </p>
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
        </div>
        <CTA onClick={openCreate} label="+ Thêm danh mục mới" />
      </div>

      <Table headers={['ID', 'Tên danh mục', 'Mô tả', 'Danh mục con', 'Hành động']}>
        {cats.map((c) => {
          const catId = c.id || c.categoryId || '—';
          return (
            <tr key={catId} className="hover:bg-orange-50/50 transition-colors">
              <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400">
                {catId}
              </td>
              <td className="px-4 py-3 text-[13px] text-gray-800 font-semibold">
                {c.name}
              </td>
              <td className="px-4 py-3 text-[12px] text-gray-500 max-w-[280px] truncate">
                {c.description || '—'}
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onGoToSubCategories?.(catId)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Chuyển sang xem danh mục con của danh mục này"
                >
                  <span>📂</span>
                  <span>Xem danh mục con →</span>
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <SmBtn onClick={() => openEdit(c)}>Sửa</SmBtn>
                  <SmBtn onClick={() => del(c)} danger>
                    Xóa
                  </SmBtn>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>

      {modal && (
        <StandardModal
          title={modal === 'create' ? 'Tạo danh mục sự cố mới' : 'Chỉnh sửa danh mục sự cố'}
          onClose={() => setModal(null)}
          onSave={save}
          saveLabel="Lưu danh mục"
          saving={saving}
          error={actionError}
        >
          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Tên danh mục sự cố <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Ổ gà / Mặt đường"
              className={inpModal}
            />
          </div>

          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Mô tả chi tiết
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Mô tả phạm vi, phân loại của danh mục sự cố này..."
              className={inpModal}
            />
          </div>
        </StandardModal>
      )}
    </div>
  );
}

// ── SubCategory Management (6 APIs Integrated) ──────────────────────────────
function SubCategoryMgmt({
  initialCategoryId = '',
  onResetCategoryFilter,
}: {
  initialCategoryId?: string;
  onResetCategoryFilter?: () => void;
}) {
  const [subs, setSubs] = useState<AdminSubCategory[]>([]);
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [sel, setSel] = useState<AdminSubCategory | null>(null);

  // Filters
  const [selectedCatId, setSelectedCatId] = useState<string>(initialCategoryId);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionError, setActionError] = useState('');

  // Form
  const [form, setForm] = useState<{
    categoryId: string;
    name: string;
    description: string;
    sla: number;
    priority: string;
    isActive: boolean;
  }>({
    categoryId: '',
    name: '',
    description: '',
    sla: 24,
    priority: 'LOW',
    isActive: true,
  });

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCatId(initialCategoryId);
    }
  }, [initialCategoryId]);

  async function fetchData() {
    setLoading(true);
    setActionError('');
    try {
      const [subsData, catsData] = await Promise.all([
        getAllSubCategories().catch((e) => {
          console.warn('Lỗi khi tải sub-categories:', e);
          return [] as AdminSubCategory[];
        }),
        getAdminCategories().catch((e) => {
          console.warn('Lỗi khi tải categories:', e);
          return [] as AdminCategory[];
        }),
      ]);

      setSubs(subsData || []);
      setCats(catsData || []);
    } catch (err: any) {
      console.warn('Lỗi khi tải dữ liệu SubCategory:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const categoryMap = cats.reduce<Record<string, string>>((acc, c) => {
    const id = c.id || c.categoryId || '';
    if (id) acc[id] = c.name;
    return acc;
  }, {});

  function openCreate() {
    setForm({
      categoryId: selectedCatId || (cats[0]?.id || cats[0]?.categoryId || ''),
      name: '',
      description: '',
      sla: 24,
      priority: 'LOW',
      isActive: true,
    });
    setSel(null);
    setActionError('');
    setModal('create');
  }

  function openEdit(s: AdminSubCategory) {
    setForm({
      categoryId: s.categoryId || '',
      name: s.name || '',
      description: s.description || '',
      sla: s.sla ?? 24,
      priority: s.priority || 'LOW',
      isActive: (s.isActive ?? s.active) !== false,
    });
    setSel(s);
    setActionError('');
    setModal('edit');
  }

  async function save() {
    if (!form.categoryId) {
      setActionError('Vui lòng chọn danh mục chính');
      return;
    }
    if (!form.name.trim()) {
      setActionError('Vui lòng nhập tên danh mục con');
      return;
    }

    setSaving(true);
    setActionError('');

    try {
      if (modal === 'create') {
        const created = await createSubCategory({
          categoryId: form.categoryId,
          name: form.name.trim(),
          description: form.description.trim(),
          sla: Number(form.sla) || 0,
          priority: form.priority || 'LOW',
          isActive: form.isActive,
        });
        setSubs((prev) => [created, ...prev]);
      } else if (sel) {
        const targetId = sel.subCategoryId;
        const updated = await updateSubCategory(targetId, {
          categoryId: form.categoryId,
          name: form.name.trim(),
          description: form.description.trim(),
          sla: Number(form.sla) || 0,
          priority: form.priority || 'LOW',
          isActive: form.isActive,
        });
        setSubs((prev) =>
          prev.map((x) =>
            x.subCategoryId === targetId
              ? { ...x, ...updated, ...form, active: form.isActive }
              : x
          )
        );
      }
      setModal(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Không thể lưu danh mục con. Vui lòng thử lại.';
      setActionError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function del(s: AdminSubCategory) {
    if (!s.subCategoryId) return;
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục con "${s.name}" không?`)) {
      return;
    }

    try {
      await deleteSubCategory(s.subCategoryId);
      setSubs((prev) => prev.filter((x) => x.subCategoryId !== s.subCategoryId));
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : 'Xóa danh mục con thất bại.');
    }
  }

  // Filter list
  const filteredSubs = subs.filter((s) => {
    if (selectedCatId && s.categoryId !== selectedCatId) return false;
    if (
      priorityFilter !== 'ALL' &&
      (s.priority || 'LOW').toUpperCase() !== priorityFilter.toUpperCase()
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q);
      const matchCat = categoryMap[s.categoryId]?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-gray-200 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500">Danh mục:</span>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-[12px] text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="">-- Tất cả danh mục chính --</option>
              {cats.map((c) => {
                const cid = c.id || c.categoryId || '';
                return (
                  <option key={cid} value={cid}>
                    {c.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500">Ưu tiên:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-[12px] text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="LOW">Thấp (LOW)</option>
              <option value="MEDIUM">Trung bình (MEDIUM)</option>
              <option value="HIGH">Cao (HIGH)</option>
              <option value="URGENT">Khẩn cấp (URGENT)</option>
            </select>
          </div>

          {/* Search box */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên hoặc mô tả danh mục con..."
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-[12px] text-gray-700 outline-none focus:border-orange-500 w-56"
          />

          {(selectedCatId || priorityFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCatId('');
                setPriorityFilter('ALL');
                setSearchQuery('');
                if (onResetCategoryFilter) onResetCategoryFilter();
              }}
              className="text-[11px] text-gray-500 hover:text-gray-700 underline cursor-pointer ml-1"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[12px] text-gray-500 font-medium">
            {filteredSubs.length} / {subs.length} danh mục con
          </p>
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
          <CTA onClick={openCreate} label="+ Thêm danh mục con" />
        </div>
      </div>

      {/* SubCategory Table */}
      <Table headers={['ID', 'Tên danh mục con', 'Danh mục chính', 'SLA (Giờ)', 'Mức ưu tiên', 'Trạng thái', 'Hành động']}>
        {filteredSubs.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-[13px]">
              {loading ? 'Đang tải dữ liệu danh mục con...' : 'Không tìm thấy danh mục con nào phù hợp.'}
            </td>
          </tr>
        ) : (
          filteredSubs.map((s) => {
            const catName = categoryMap[s.categoryId] || s.categoryId || '—';
            const isActive = (s.isActive ?? s.active) !== false;
            const prio = (s.priority || 'LOW').toUpperCase();

            return (
              <tr key={s.subCategoryId} className="hover:bg-orange-50/50 transition-colors">
                <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400">
                  {s.subCategoryId}
                </td>
                <td className="px-4 py-3">
                  <div className="text-[13px] text-gray-800 font-semibold">{s.name}</div>
                  {s.description && (
                    <div className="text-[11px] text-gray-400 max-w-[280px] truncate" title={s.description}>
                      {s.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200">
                    {catName}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold">
                    {s.sla ?? 0}h
                  </span>
                </td>
                <td className="px-4 py-3">
                  {prio === 'URGENT' ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                      Khẩn cấp (URGENT)
                    </span>
                  ) : prio === 'HIGH' ? (
                    <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold">
                      Cao (HIGH)
                    </span>
                  ) : prio === 'MEDIUM' ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                      Trung bình (MEDIUM)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Thấp (LOW)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isActive ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                      Hoạt động
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-medium">
                      Tạm dừng
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <SmBtn onClick={() => openEdit(s)}>Sửa</SmBtn>
                    <SmBtn onClick={() => del(s)} danger>
                      Xóa
                    </SmBtn>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </Table>

      {/* Modal Create/Edit SubCategory */}
      {modal && (
        <StandardModal
          title={modal === 'create' ? 'Tạo danh mục con mới' : 'Chỉnh sửa danh mục con'}
          onClose={() => setModal(null)}
          onSave={save}
          saveLabel="Lưu danh mục con"
          saving={saving}
          error={actionError}
        >
          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Thuộc danh mục chính <span className="text-red-500">*</span>
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className={inpModal}
            >
              <option value="">-- Chọn danh mục chính --</option>
              {cats.map((c) => {
                const cid = c.id || c.categoryId || '';
                return (
                  <option key={cid} value={cid}>
                    {c.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Tên danh mục con <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Đèn đường không sáng, Hư hỏng nắp hố ga..."
              className={inpModal}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Thời gian SLA (giờ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.sla}
              onChange={(e) =>
                setForm((f) => ({ ...f, sla: Number(e.target.value) || 0 }))
              }
              placeholder="24"
              className={inpModal}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Mức độ ưu tiên
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className={inpModal}
            >
              <option value="LOW">Thấp (LOW)</option>
              <option value="MEDIUM">Trung bình (MEDIUM)</option>
              <option value="HIGH">Cao (HIGH)</option>
              <option value="URGENT">Khẩn cấp (URGENT)</option>
            </select>
          </div>

          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Mô tả chi tiết
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Mô tả cụ thể dạng sự cố thuộc danh mục con này..."
              className={inpModal}
            />
          </div>

          <div className="col-span-2 flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="subCatActive"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
            />
            <label htmlFor="subCatActive" className="text-[12px] text-gray-700 font-medium cursor-pointer">
              Đang hoạt động (Kích hoạt danh mục con này)
            </label>
          </div>
        </StandardModal>
      )}
    </div>
  );
}

// ── Department Management (5 APIs Integrated) ─────────────────────────────────
function DepartmentMgmt() {
  const [depts, setDepts] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [sel, setSel] = useState<DepartmentItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    level: 'CITY',
    contactEmail: '',
    phoneNumber: '',
    isActive: true,
  });
  const [actionError, setActionError] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');

  // API 3: GET /api/v1/departments
  async function fetchDepts() {
    setLoading(true);
    setActionError('');
    try {
      const activeOnlyParam = filterActive === 'active' ? true : undefined;
      const res = await getDepartments({
        activeOnly: activeOnlyParam,
        page: 0,
        size: 50,
      });

      if (Array.isArray(res)) {
        setDepts(res);
      } else if (res && Array.isArray(res.content)) {
        setDepts(res.content);
      } else {
        setDepts([]);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải danh sách cơ quan từ API:', err);
      // Fallback hiển thị dữ liệu mẫu
      setDepts(
        DEPARTMENTS.map((d) => ({
          departmentId: d.departmentId,
          name: d.name,
          level: d.level,
          contactEmail: d.contactEmail,
          phoneNumber: d.phoneNumber,
          isActive: true,
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDepts();
  }, [filterActive]);

  function openCreate() {
    setForm({
      name: '',
      level: 'CITY',
      contactEmail: '',
      phoneNumber: '',
      isActive: true,
    });
    setSel(null);
    setActionError('');
    setModal('create');
  }

  // API 4: GET /api/v1/departments/{id}
  async function openEdit(d: DepartmentItem) {
    const targetId = d.departmentId || '';
    setActionError('');
    setSel(d);
    setForm({
      name: d.name || '',
      level: d.level || 'CITY',
      contactEmail: d.contactEmail || '',
      phoneNumber: d.phoneNumber || '',
      isActive: d.isActive !== false,
    });
    setModal('edit');

    if (targetId) {
      try {
        const detail = await getDepartmentById(targetId);
        if (detail) {
          setForm({
            name: detail.name || d.name || '',
            level: detail.level || d.level || 'CITY',
            contactEmail: detail.contactEmail || d.contactEmail || '',
            phoneNumber: detail.phoneNumber || d.phoneNumber || '',
            isActive: detail.isActive !== false,
          });
        }
      } catch (err) {
        console.warn('Lỗi khi tải chi tiết cơ quan:', err);
      }
    }
  }

  // API 1 (PUT) & API 2 (POST)
  async function save() {
    if (!form.name.trim()) {
      setActionError('Vui lòng nhập tên cơ quan phụ trách');
      return;
    }
    if (!form.contactEmail.trim() || !form.contactEmail.includes('@')) {
      setActionError('Email liên hệ không hợp lệ');
      return;
    }
    if (!form.phoneNumber.trim()) {
      setActionError('Vui lòng nhập số điện thoại');
      return;
    }

    setSaving(true);
    setActionError('');

    try {
      if (modal === 'create') {
        // API 2: POST /api/v1/departments
        const created = await createDepartment({
          name: form.name,
          level: form.level,
          contactEmail: form.contactEmail,
          phoneNumber: form.phoneNumber,
        });

        setDepts((prev) => [created || { ...form, departmentId: `D${Date.now()}` }, ...prev]);
      } else if (sel) {
        // API 1: PUT /api/v1/departments/{id}
        const targetId = sel.departmentId;
        const updated = await updateDepartment(targetId, {
          name: form.name,
          level: form.level,
          contactEmail: form.contactEmail,
          phoneNumber: form.phoneNumber,
          isActive: form.isActive,
        });

        setDepts((prev) =>
          prev.map((x) =>
            x.departmentId === targetId ? { ...x, ...updated, ...form } : x
          )
        );
      }
      setModal(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Không thể lưu thông tin cơ quan. Vui lòng thử lại.';
      setActionError(msg);
    } finally {
      setSaving(false);
    }
  }

  // API 5: DELETE /api/v1/departments/{id} (Vô hiệu hóa cơ quan)
  async function del(d: DepartmentItem) {
    const targetId = d.departmentId;
    if (!targetId) return;

    if (!window.confirm(`Bạn có chắc muốn vô hiệu hóa cơ quan "${d.name}" không?`)) {
      return;
    }

    try {
      await deleteDepartment(targetId);
      // Cập nhật trạng thái isActive sang false
      setDepts((ds) =>
        ds.map((x) => (x.departmentId === targetId ? { ...x, isActive: false } : x))
      );
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : 'Vô hiệu hóa cơ quan thất bại.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-gray-500 font-medium">
            {depts.length} cơ quan phụ trách
          </p>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] text-gray-600 outline-none focus:border-orange-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Chỉ đang hoạt động</option>
          </select>
          <button
            onClick={fetchDepts}
            disabled={loading}
            className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
        </div>
        <CTA onClick={openCreate} label="+ Thêm cơ quan mới" />
      </div>

      <Table headers={['ID', 'Tên cơ quan', 'Cấp', 'Email liên hệ', 'Số điện thoại', 'Cán bộ', 'Trạng thái', 'Hành động']}>
        {depts.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-[13px]">
              {loading ? 'Đang tải danh sách cơ quan...' : 'Không có cơ quan nào.'}
            </td>
          </tr>
        ) : (
          depts.map((d) => (
            <tr key={d.departmentId} className="hover:bg-orange-50/50 transition-colors">
              <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400">
                {d.departmentId}
              </td>
              <td className="px-4 py-3 text-[13px] text-gray-800 font-semibold max-w-[200px] truncate">
                {d.name}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    d.level === 'CITY'
                      ? 'text-orange-600 bg-orange-50 border-orange-200'
                      : 'text-blue-600 bg-blue-50 border-blue-200'
                  }`}
                >
                  {d.level}
                </span>
              </td>
              <td className="px-4 py-3 font-mono-cf text-[11px] text-gray-500">
                {d.contactEmail}
              </td>
              <td className="px-4 py-3 font-mono-cf text-[11px] text-gray-500">
                {d.phoneNumber}
              </td>
              <td className="px-4 py-3 text-[11px] text-gray-600 font-medium">
                {d.officerCount ?? 0} cán bộ
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    d.isActive !== false
                      ? 'text-green-600 bg-green-50 border-green-200'
                      : 'text-red-500 bg-red-50 border-red-200'
                  }`}
                >
                  {d.isActive !== false ? 'Hoạt động' : 'Vô hiệu hóa'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <SmBtn onClick={() => openEdit(d)}>Sửa</SmBtn>
                  <SmBtn onClick={() => del(d)} danger>
                    Vô hiệu hóa
                  </SmBtn>
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>

      {modal && (
        <StandardModal
          title={modal === 'create' ? 'Tạo cơ quan phụ trách mới' : 'Chỉnh sửa cơ quan phụ trách'}
          onClose={() => setModal(null)}
          onSave={save}
          saveLabel="Lưu cơ quan"
          saving={saving}
          error={actionError}
        >
          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Tên cơ quan phụ trách <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Phòng Quản lý Đô thị Quận 1"
              className={inpModal}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Cấp quản lý <span className="text-red-500">*</span></label>
            <select
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
              className={inpModal}
            >
              <option value="CITY">Cấp Thành phố (CITY)</option>
              <option value="WARD">Cấp Phường/Quận (WARD)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Trạng thái
            </label>
            <select
              value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.value === 'ACTIVE' }))
              }
              className={inpModal}
            >
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Vô hiệu hóa (INACTIVE)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Email liên hệ <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              placeholder="contact@quanlydothi.gov.vn"
              className={inpModal}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Số điện thoại liên hệ <span className="text-red-500">*</span></label>
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              placeholder="028-3821-4567"
              className={inpModal}
            />
          </div>
        </StandardModal>
      )}
    </div>
  );
}

// ── Routing Rule Management (6 APIs Integrated) ─────────────────────────────────
function RoutingMgmt() {
  const [rules, setRules] = useState<RoutingRuleItem[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [sel, setSel] = useState<RoutingRuleItem | null>(null);
  const [form, setForm] = useState({
    categoryId: '',
    province: 'Tp Ho Chi Minh',
    ward: '',
    departmentId: '',
  });
  const [actionError, setActionError] = useState('');

  // Filter state
  const [filterDept, setFilterDept] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterWard, setFilterWard] = useState('');

  // Load categories & departments on init
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const cats = await getAdminCategories();
        if (cats && cats.length > 0) {
          setCategories(cats);
        } else {
          setCategories(CATEGORIES.map(c => ({ id: c.categoryId, categoryId: c.categoryId, name: c.name, description: c.description })));
        }
      } catch {
        setCategories(CATEGORIES.map(c => ({ id: c.categoryId, categoryId: c.categoryId, name: c.name, description: c.description })));
      }

      try {
        const deptsRes = await getDepartments({ page: 0, size: 100 });
        if (Array.isArray(deptsRes)) {
          setDepartments(deptsRes);
        } else if (deptsRes && Array.isArray(deptsRes.content)) {
          setDepartments(deptsRes.content);
        } else {
          setDepartments(DEPARTMENTS);
        }
      } catch {
        setDepartments(DEPARTMENTS);
      }
    }
    loadDropdowns();
  }, []);

  // Fetch Rules function
  async function fetchRules() {
    setLoading(true);
    setActionError('');
    try {
      if (filterDept && !filterCat && !filterProvince && !filterWard) {
        // API 3: GET /api/v1/routing-rules/department/{departmentId}
        const data = await getRoutingRulesByDepartment(filterDept);
        setRules(data || []);
      } else {
        // API 4: GET /api/v1/routing-rules
        const res = await getRoutingRules({
          departmentId: filterDept || undefined,
          categoryId: filterCat || undefined,
          province: filterProvince || undefined,
          ward: filterWard || undefined,
          page: 0,
          size: 50,
        });

        if (Array.isArray(res)) {
          setRules(res);
        } else if (res && Array.isArray(res.content)) {
          setRules(res.content);
        } else {
          setRules([]);
        }
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải quy tắc định tuyến từ API:', err);
      setRules(
        ROUTING_RULES.map((r) => ({
          ruleId: r.ruleId,
          id: r.ruleId,
          categoryId: r.categoryId,
          departmentId: r.departmentId,
          province: r.province,
          ward: r.ward,
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRules();
  }, [filterDept, filterCat, filterProvince, filterWard]);

  function openCreate() {
    const defaultCat = categories[0]?.id || categories[0]?.categoryId || 'CAT001';
    const defaultDept = departments[0]?.departmentId || 'D001';
    setForm({
      categoryId: defaultCat,
      province: 'Tp Ho Chi Minh',
      ward: '',
      departmentId: defaultDept,
    });
    setSel(null);
    setActionError('');
    setModal('create');
  }

  // API 5: Get rule detail when editing
  async function openEdit(r: RoutingRuleItem) {
    const ruleId = r.ruleId || r.id || '';
    setActionError('');
    setSel(r);
    setForm({
      categoryId: r.categoryId || '',
      province: r.province || 'Tp Ho Chi Minh',
      ward: r.ward || '',
      departmentId: r.departmentId || '',
    });
    setModal('edit');

    if (ruleId) {
      try {
        const detail = await getRoutingRuleById(ruleId);
        if (detail) {
          setForm({
            categoryId: detail.categoryId || r.categoryId || '',
            province: detail.province || r.province || '',
            ward: detail.ward || r.ward || '',
            departmentId: detail.departmentId || r.departmentId || '',
          });
        }
      } catch (err) {
        console.warn('Lỗi tải chi tiết rule:', err);
      }
    }
  }

  // API 1 (PUT) & API 2 (POST)
  async function save() {
    if (!form.categoryId) {
      setActionError('Vui lòng chọn loại sự cố / danh mục');
      return;
    }
    if (!form.departmentId) {
      setActionError('Vui lòng chọn cơ quan phụ trách');
      return;
    }
    if (!form.province.trim()) {
      setActionError('Vui lòng nhập Tỉnh / Thành phố');
      return;
    }
    if (!form.ward.trim()) {
      setActionError('Vui lòng nhập Phường / Xã');
      return;
    }

    setSaving(true);
    setActionError('');

    try {
      if (modal === 'create') {
        const created = await createRoutingRule({
          departmentId: form.departmentId,
          categoryId: form.categoryId,
          province: form.province,
          ward: form.ward,
        });
        setRules((prev) => [created || { ...form, ruleId: `RR${Date.now()}` }, ...prev]);
      } else if (sel) {
        const targetId = sel.ruleId || sel.id || '';
        const updated = await updateRoutingRule(targetId, {
          departmentId: form.departmentId,
          categoryId: form.categoryId,
          province: form.province,
          ward: form.ward,
        });

        setRules((prev) =>
          prev.map((x) =>
            (x.ruleId || x.id) === targetId ? { ...x, ...updated, ...form } : x
          )
        );
      }
      setModal(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Không thể lưu quy tắc. Vui lòng kiểm tra lại.';
      setActionError(msg);
    } finally {
      setSaving(false);
    }
  }

  // API 6: DELETE /api/v1/routing-rules/{id}
  async function del(r: RoutingRuleItem) {
    const targetId = r.ruleId || r.id || '';
    if (!targetId) return;

    if (!window.confirm('Bạn có chắc chắn muốn xóa quy tắc định tuyến này không?')) {
      return;
    }

    try {
      await deleteRoutingRule(targetId);
      setRules((prev) => prev.filter((x) => (x.ruleId || x.id) !== targetId));
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : 'Xóa quy tắc thất bại.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-orange-50/70 border border-orange-200 rounded-xl px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <p className="text-[12px] text-gray-700">
          Logic định tuyến: <strong>Danh mục + Tỉnh/TP + Phường/Xã</strong> → Phân công tự động → <strong>Cơ quan xử lý</strong>
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Filter Department */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:border-orange-500"
          >
            <option value="">-- Tất cả cơ quan --</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Filter Category */}
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:border-orange-500"
          >
            <option value="">-- Tất cả danh mục --</option>
            {categories.map((c) => (
              <option key={c.id || c.categoryId} value={c.id || c.categoryId}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Filter Ward */}
          <input
            value={filterWard}
            onChange={(e) => setFilterWard(e.target.value)}
            placeholder="Lọc theo phường/xã..."
            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:border-orange-500 w-44"
          />

          {(filterDept || filterCat || filterWard || filterProvince) && (
            <button
              onClick={() => {
                setFilterDept('');
                setFilterCat('');
                setFilterWard('');
                setFilterProvince('');
              }}
              className="text-[11px] text-gray-400 hover:text-gray-600 underline cursor-pointer px-1"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRules}
            disabled={loading}
            className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
          <CTA onClick={openCreate} label="+ Thêm quy tắc mới" />
        </div>
      </div>

      <Table headers={['ID', 'Danh mục sự cố', 'Tỉnh / Thành phố', 'Phường / Xã', 'Cơ quan chịu trách nhiệm', 'Hành động']}>
        {rules.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-[13px]">
              {loading ? 'Đang tải danh sách quy tắc...' : 'Không tìm thấy quy tắc định tuyến nào.'}
            </td>
          </tr>
        ) : (
          rules.map((r) => {
            const ruleId = r.ruleId || r.id || '—';
            const cat = categories.find((c) => (c.id || c.categoryId) === r.categoryId) || CATEGORIES.find(c => c.categoryId === r.categoryId);
            const dept = departments.find((d) => d.departmentId === r.departmentId);
            const catDisplay = r.categoryName || cat?.name || r.categoryId;
            const deptDisplay = r.departmentName || dept?.name || r.departmentId;

            return (
              <tr key={ruleId} className="hover:bg-orange-50/50 transition-colors">
                <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400">
                  {ruleId}
                </td>
                <td className="px-4 py-3 text-[12px] text-gray-800 font-medium max-w-[160px] truncate">
                  {catDisplay}
                </td>
                <td className="px-4 py-3 text-[12px] text-gray-600">
                  {r.province || '—'}
                </td>
                <td className="px-4 py-3 text-[12px] text-gray-600 max-w-[130px] truncate font-medium">
                  {r.ward || '—'}
                </td>
                <td className="px-4 py-3 text-[12px] text-orange-700 font-semibold max-w-[180px] truncate">
                  {deptDisplay}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <SmBtn onClick={() => openEdit(r)}>Sửa</SmBtn>
                    <SmBtn onClick={() => del(r)} danger>
                      Xóa
                    </SmBtn>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </Table>

      {modal && (
        <StandardModal
          title={modal === 'create' ? 'Tạo quy tắc định tuyến mới' : 'Chỉnh sửa quy tắc định tuyến'}
          onClose={() => setModal(null)}
          onSave={save}
          saveLabel="Lưu quy tắc"
          saving={saving}
          error={actionError}
        >
          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Danh mục sự cố <span className="text-red-500">*</span></label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className={inpModal}
            >
              <option value="">-- Chọn loại sự cố --</option>
              {categories.map((c) => {
                const id = c.id || c.categoryId || '';
                return (
                  <option key={id} value={id}>
                    {c.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Cơ quan xử lý <span className="text-red-500">*</span></label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
              className={inpModal}
            >
              <option value="">-- Chọn cơ quan chịu trách nhiệm --</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.name} ({d.level})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Tỉnh / Thành phố <span className="text-red-500">*</span></label>
            <input
              value={form.province}
              onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
              placeholder="VD: Tp Ho Chi Minh"
              className={inpModal}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              Phường / Xã <span className="text-red-500">*</span></label>
            <input
              value={form.ward}
              onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
              className={inpModal}
              placeholder="VD: Phường 6, Quận 3"
            />
          </div>
        </StandardModal>
      )}
    </div>
  );
}

// ── Shared Standard Modal Component (Đồng bộ form tạo tài khoản) ──────────────
const inpModal = "w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500 transition-colors";

function StandardModal({
  title,
  onClose,
  onSave,
  saveLabel = 'Lưu dữ liệu',
  saving,
  error,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto relative">
        {/* Modal Header */}
        <div className="relative px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-orange-500" />
          <h3 className="font-display text-[16px] font-bold text-gray-900 uppercase tracking-wide">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-[12px] text-red-600">{error}</p>
          </div>
        )}

        {/* Modal Content */}
        <div className="px-5 py-5 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto bg-white">
          {children}

          {/* Modal Footer */}
          <div className="col-span-2 flex gap-3 pt-3 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-[12px] font-semibold hover:text-gray-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="flex-1 relative rounded-xl overflow-hidden py-2.5 active:scale-[0.97] transition-transform disabled:opacity-60 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
              <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">
                {saving ? 'Đang lưu...' : saveLabel}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.16em] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function CTA({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="relative rounded-xl overflow-hidden px-4 py-2 active:scale-[0.97] transition-transform cursor-pointer">
      <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
      <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)' }} />
      <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">{label}</span>
    </button>
  );
}

function SmBtn({ onClick, children, danger, warn }: { onClick: () => void; children: React.ReactNode; danger?: boolean; warn?: boolean }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-all active:scale-[0.97] cursor-pointer
        ${danger ? 'border-red-500/30 text-red-600 hover:bg-red-50' :
          warn ? 'border-amber-500/30 text-amber-600 hover:bg-amber-50' :
          'border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400'}`}>
      {children}
    </button>
  );
}

