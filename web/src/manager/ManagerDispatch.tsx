import { useState, useEffect } from 'react';
import {
  TICKETS,
  SEV_MAP,
  DANGER_MAP,
  CATEGORIES as FALLBACK_CATEGORIES,
  DEPARTMENTS as FALLBACK_DEPARTMENTS,
  ROUTING_RULES,
  sevInfo,
  dangerInfo,
} from '../data';
import {
  getManagerInitiatedTickets,
  reviewManagerTicket,
  rejectManagerTicket,
  getSuggestedDepartments,
  updateStepDeadline,
  reorderTicketSteps,
  ManagerTicketItem,
  SuggestedDepartment,
  TicketStep,
  getAdminCategories,
  AdminCategory,
  getDepartments,
  DepartmentItem,
  getAllSubCategories,
  AdminSubCategory,
  ApiError,
} from '../services';

interface Props {
  onOpenTicket: (id: string) => void;
}

type ModalView = 'dispatch' | 'reject' | 'steps';

export default function ManagerDispatch({ onOpenTicket }: Props) {
  // 1. Danh sách vé chờ điều phối
  const [tickets, setTickets] = useState<ManagerTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [, setSubCategories] = useState<AdminSubCategory[]>([]);

  // 2. Vé đang chọn thao tác
  const [selectedTicket, setSelectedTicket] = useState<ManagerTicketItem | null>(null);
  const [modalView, setModalView] = useState<ModalView>('dispatch');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 3. Form Duyệt & Điều phối
  const [reviewCatId, setReviewCatId] = useState('');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [routes, setRoutes] = useState<Array<{ subCategoryId: string; departmentId: string }>>([]);
  const [isLifeThreatening, setIsLifeThreatening] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [suggestedDepts, setSuggestedDepts] = useState<SuggestedDepartment[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // 4. Form Từ chối
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCatId, setRejectCatId] = useState('');
  const [rejectDeptId, setRejectDeptId] = useState('');

  // 5. Steps management
  const [steps, setSteps] = useState<TicketStep[]>([]);
  const [editingStepDeadline, setEditingStepDeadline] = useState<{ stepId: string; deadline: string } | null>(null);

  // 6. Kết quả routing sau khi duyệt thành công
  const [routingResult, setRoutingResult] = useState<{
    ticketId: string;
    deptName: string;
    note?: string;
  } | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState<string>('all');
  const [dangerFilter, setDangerFilter] = useState<string>('all');

  // Load danh mục, phòng ban, và danh sách vé chờ duyệt
  async function fetchInitialData() {
    setLoading(true);
    try {
      const [ticketsRes, catsRes, deptsRes, subCatsRes] = await Promise.allSettled([
        getManagerInitiatedTickets({ page: 0, size: 50 }),
        getAdminCategories(),
        getDepartments({ page: 0, size: 100 }),
        getAllSubCategories(),
      ]);

      // 1. Tickets
      if (ticketsRes.status === 'fulfilled' && ticketsRes.value?.content && ticketsRes.value.content.length > 0) {
        setTickets(ticketsRes.value.content);
      } else {
        // Fallback sang dữ liệu mẫu nếu backend rỗng hoặc đang phát triển
        setTickets(
          TICKETS.filter((t) => t.needsManualReview || t.status === 'INITIATED' || t.status === 'PENDING_REVIEW').map((t) => ({
            id: t.ticketId,
            ticketId: t.ticketId,
            description: t.description,
            categoryId: t.categoryId,
            categoryName: FALLBACK_CATEGORIES.find((c) => c.categoryId === t.categoryId)?.name || 'Hạ tầng đô thị',
            severity: t.severity,
            dangerLevel: t.dangerLevel,
            address: `${t.address}, ${t.ward}, ${t.province}`,
            status: t.status,
            latitude: t.location?.lat,
            longitude: t.location?.lng,
            isLifeThreatening: t.isLifeThreatening,
            createdAt: t.createdAt,
            steps: [
              {
                id: `step-${t.ticketId}-1`,
                stepId: `step-${t.ticketId}-1`,
                stepName: 'Tiếp nhận & khảo sát hiện trường',
                assigneeName: 'Trần Minh Quân',
                status: 'OPEN',
                orderIndex: 0,
                deadline: '2026-10-15T18:00:00',
              },
              {
                id: `step-${t.ticketId}-2`,
                stepId: `step-${t.ticketId}-2`,
                stepName: 'Điều động phương tiện & vật tư',
                assigneeName: 'Nguyễn Văn Đội',
                status: 'OPEN',
                orderIndex: 1,
                deadline: '2026-10-16T12:00:00',
              },
            ],
          }))
        );
      }

      // 2. Categories: ưu tiên từ API hoặc trích xuất từ tickets/subCategories
      let loadedCats: AdminCategory[] = [];
      if (catsRes.status === 'fulfilled' && catsRes.value) {
        const val = catsRes.value as any;
        const list = Array.isArray(val)
          ? val
          : Array.isArray(val.content)
          ? val.content
          : Array.isArray(val.data)
          ? val.data
          : [];
        if (list.length > 0) {
          loadedCats = list;
        }
      }

      // Nếu API categories không khả dụng, gom các category thực tế từ tickets và subCategories
      if (loadedCats.length === 0) {
        const catMap = new Map<string, string>();
        if (ticketsRes.status === 'fulfilled' && ticketsRes.value?.content) {
          ticketsRes.value.content.forEach((t) => {
            if (t.categoryId && isValidUuid(t.categoryId) && t.categoryName) {
              catMap.set(t.categoryId, t.categoryName);
            }
          });
        }
        if (subCatsRes.status === 'fulfilled' && Array.isArray(subCatsRes.value)) {
          subCatsRes.value.forEach((sc: any) => {
            if (sc.categoryId && isValidUuid(sc.categoryId) && sc.categoryName) {
              catMap.set(sc.categoryId, sc.categoryName);
            }
          });
        }

        if (catMap.size > 0) {
          loadedCats = Array.from(catMap.entries()).map(([id, name]) => ({
            id,
            categoryId: id,
            name,
            description: '',
            isActive: true,
          }));
        } else {
          loadedCats = FALLBACK_CATEGORIES.map((c) => ({
            id: c.categoryId,
            categoryId: c.categoryId,
            name: c.name,
            description: c.description,
            isActive: c.isActive,
          }));
        }
      }
      setCategories(loadedCats);

      // 3. Departments: trích xuất từ các cấu trúc response có thể có
      let loadedDepts: DepartmentItem[] = [];
      console.log('🏢 KẾT QUẢ FETCH DEPTS RAW:', deptsRes);
      if (deptsRes.status === 'fulfilled' && deptsRes.value) {
        const val = deptsRes.value as any;
        console.log('🏢 GIÁ TRỊ DEPTS VALUE:', val);
        const list = Array.isArray(val)
          ? val
          : Array.isArray(val.content)
          ? val.content
          : Array.isArray(val.data)
          ? val.data
          : Array.isArray(val.data?.content)
          ? val.data?.content
          : [];
        if (list.length > 0) {
          loadedDepts = list.filter((d: any) => d && d.departmentId);
          console.log('🏢 DANH SÁCH DEPTS ĐÃ TRÍCH XUẤT:', loadedDepts);
        }
      }
      if (loadedDepts.length === 0) {
        console.warn('⚠ Không lấy được phòng ban thật từ API, đang dùng dữ liệu dự phòng!');
        loadedDepts = FALLBACK_DEPARTMENTS.map((d) => ({
          departmentId: d.departmentId,
          name: d.name,
          level: d.level,
          contactEmail: d.contactEmail,
          phoneNumber: d.phoneNumber,
          isActive: true,
        }));
      }
      setDepartments(loadedDepts);

      // 4. Subcategories
      if (subCatsRes.status === 'fulfilled' && Array.isArray(subCatsRes.value)) {
        setSubCategories(subCatsRes.value);
      }
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu trang điều phối:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Khi chọn một vé để điều phối
  async function selectTicketForAction(ticket: ManagerTicketItem) {
    setSelectedTicket(ticket);
    setModalView('dispatch');
    setFeedback(null);

    // Đảm bảo category của vé có mặt trong danh sách options
    let currentCatId = ticket.categoryId || '';
    if (currentCatId) {
      setCategories((prev) => {
        const exists = prev.some((c) => (c.id || c.categoryId) === currentCatId);
        if (!exists && ticket.categoryName) {
          return [
            {
              id: currentCatId,
              categoryId: currentCatId,
              name: ticket.categoryName,
              description: '',
              isActive: true,
            },
            ...prev,
          ];
        }
        return prev;
      });
    } else {
      currentCatId = categories[0]?.id || categories[0]?.categoryId || 'CAT001';
    }

    const defaultDept = departments[0]?.departmentId || 'D002';

    setReviewCatId(currentCatId);
    setTargetDeptId(defaultDept);
    setSelectedDeptIds([defaultDept]);
    setIsLifeThreatening(Boolean(ticket.isLifeThreatening));
    setReviewNote('');
    setRejectReason('');
    setRejectCatId(currentCatId);
    setRejectDeptId('');
    setSteps(ticket.steps || []);

    // Khởi tạo routes từ subCategories nếu có
    if (ticket.subCategories && ticket.subCategories.length > 0) {
      setRoutes(
        ticket.subCategories.map((sc) => ({
          subCategoryId: sc.id || sc.subCategoryId || '',
          departmentId: defaultDept,
        }))
      );
    } else {
      setRoutes([]);
    }

    // Tải gợi ý phòng ban tự động
    await loadSuggestedDepartments(ticket.id || ticket.ticketId || '', currentCatId);
  }

  async function loadSuggestedDepartments(ticketId: string, catId?: string) {
    if (!ticketId) return;
    setLoadingSuggestions(true);
    try {
      const suggestions = await getSuggestedDepartments(ticketId, catId);
      if (suggestions && suggestions.length > 0) {
        setSuggestedDepts(suggestions);
        if (suggestions[0]?.departmentId) {
          setTargetDeptId(suggestions[0].departmentId);
          setSelectedDeptIds([suggestions[0].departmentId]);
        }
      } else {
        // Fallback quy tắc gợi ý theo danh mục
        const rule = ROUTING_RULES.find((r) => r.categoryId === catId);
        if (rule) {
          const dept =
            departments.find((d) => d.departmentId === rule.departmentId) ||
            FALLBACK_DEPARTMENTS.find((d) => d.departmentId === rule.departmentId);
          if (dept) {
            setSuggestedDepts([
              {
                departmentId: dept.departmentId,
                name: dept.name,
                level: dept.level,
                contactEmail: dept.contactEmail,
                phoneNumber: dept.phoneNumber,
                isActive: true,
              },
            ]);
            setTargetDeptId(dept.departmentId);
            setSelectedDeptIds([dept.departmentId]);
          }
        } else {
          setSuggestedDepts([]);
        }
      }
    } catch (e) {
      console.warn('Lỗi khi tải phòng ban gợi ý:', e);
      setSuggestedDepts([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

// Helper kiểm tra chuỗi UUID chuẩn 36 ký tự
function isValidUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim());
}

  // Thay đổi danh mục sự cố -> tải lại gợi ý phòng ban
  async function handleCategoryChange(newCatId: string) {
    setReviewCatId(newCatId);
    if (selectedTicket) {
      await loadSuggestedDepartments(selectedTicket.id || selectedTicket.ticketId || '', newCatId);
    }
  }

  // 1. Phê duyệt & Điều phối hồ sơ
  async function handleReviewSubmit() {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';

    // Lọc ra các ID cơ quan là UUID hợp lệ
    const validDeptIds: string[] = [];
    if (isValidUuid(targetDeptId)) {
      validDeptIds.push(targetDeptId);
    }
    for (const id of selectedDeptIds) {
      if (isValidUuid(id) && !validDeptIds.includes(id)) {
        validDeptIds.push(id);
      }
    }

    if (validDeptIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Vui lòng chọn Cơ quan tiếp nhận có mã định danh hợp lệ từ danh sách hệ thống.',
      });
      return;
    }

    // Chuẩn bị payload đúng chuẩn ReviewTicketRequest của Backend:
    // { departmentIds: UUID[], categoryId?: UUID, isLifeThreatening?: boolean, reviewNote?: string }
    const payload: {
      departmentIds: string[];
      categoryId?: string;
      isLifeThreatening?: boolean;
      reviewNote?: string;
    } = {
      departmentIds: validDeptIds,
      isLifeThreatening: Boolean(isLifeThreatening),
    };

    // Chỉ gửi categoryId nếu là UUID hợp lệ (không gửi chuỗi rỗng "" hoặc "CAT001")
    if (isValidUuid(reviewCatId)) {
      payload.categoryId = reviewCatId;
    } else if (isValidUuid(selectedTicket.categoryId)) {
      payload.categoryId = selectedTicket.categoryId;
    }

    if (reviewNote && reviewNote.trim()) {
      payload.reviewNote = reviewNote.trim();
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await reviewManagerTicket(ticketId, payload);

      const deptName =
        departments.find((d) => d.departmentId === targetDeptId)?.name ||
        suggestedDepts.find((d) => d.departmentId === targetDeptId)?.name ||
        FALLBACK_DEPARTMENTS.find((d) => d.departmentId === targetDeptId)?.name ||
        targetDeptId;

      setRoutingResult({
        ticketId,
        deptName,
        note: reviewNote,
      });

      setFeedback({
        type: 'success',
        message: `Đã phê duyệt và điều phối hồ sơ đến đơn vị: ${deptName}`,
      });

      // Cập nhật lại danh sách vé
      setTickets((prev) => prev.filter((t) => (t.id || t.ticketId) !== ticketId));
      setSelectedTicket(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Điều phối hồ sơ thất bại. Vui lòng thử lại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // 2. Từ chối hồ sơ
  async function handleRejectSubmit() {
    if (!selectedTicket) return;
    if (!rejectReason.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập lý do từ chối tiếp nhận hồ sơ.' });
      return;
    }

    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload: {
        reason: string;
        suggestedCategoryId?: string;
        suggestedDepartmentId?: string;
      } = {
        reason: rejectReason.trim(),
      };

      // Chỉ gửi suggestedCategoryId nếu là UUID hợp lệ
      if (isValidUuid(rejectCatId)) {
        payload.suggestedCategoryId = rejectCatId;
      }
      // Chỉ gửi suggestedDepartmentId nếu là UUID hợp lệ
      if (isValidUuid(rejectDeptId)) {
        payload.suggestedDepartmentId = rejectDeptId;
      }

      await rejectManagerTicket(ticketId, payload);

      setFeedback({
        type: 'success',
        message: `Đã từ chối tiếp nhận hồ sơ #${ticketId.slice(0, 8)}.`,
      });

      setTickets((prev) => prev.filter((t) => (t.id || t.ticketId) !== ticketId));
      setSelectedTicket(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Từ chối hồ sơ thất bại. Vui lòng thử lại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // 3. Cập nhật deadline cho bước
  async function handleUpdateStepDeadline(stepId: string, deadlineStr: string) {
    if (!selectedTicket || !stepId) return;
    try {
      await updateStepDeadline(stepId, { deadline: deadlineStr });
      setSteps((prev) =>
        prev.map((s) => ((s.stepId || s.id) === stepId ? { ...s, deadline: deadlineStr } : s))
      );
      setEditingStepDeadline(null);
      setFeedback({ type: 'success', message: 'Đã cập nhật thời hạn hoàn thành cho bước xử lý.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Cập nhật thời hạn thất bại.' });
    }
  }

  // 4. Đổi thứ tự bước xử lý
  async function handleMoveStep(index: number, direction: 'up' | 'down') {
    if (!selectedTicket || steps.length < 2) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    const reordered = newSteps.map((s, idx) => ({ ...s, orderIndex: idx }));
    setSteps(reordered);

    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';
    const stepOrders = reordered.map((s, idx) => ({
      ticketStepId: s.stepId || s.id || '',
      orderIndex: idx,
    }));

    try {
      await reorderTicketSteps(ticketId, { stepOrders });
      setFeedback({ type: 'success', message: 'Đã cập nhật thứ tự các bước xử lý.' });
    } catch (err: any) {
      console.warn('Lỗi lưu thứ tự bước:', err);
    }
  }

  // Lọc vé
  const filteredTickets = tickets.filter((t) => {
    if (sevFilter !== 'all' && t.severity !== sevFilter) return false;
    if (dangerFilter !== 'all' && t.dangerLevel !== dangerFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const id = (t.id || t.ticketId || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const addr = (t.address || '').toLowerCase();
      const cat = (t.categoryName || '').toLowerCase();
      if (!id.includes(q) && !desc.includes(q) && !addr.includes(q) && !cat.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-5 screen-enter">
      {/* Header Trang */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-[22px] font-extrabold text-gray-900 tracking-tight">
            ĐIỀU PHỐI & PHÂN CÔNG HỒ SƠ
          </h2>
          <p className="text-[13px] text-gray-500 mt-1">
            Xem xét phản ánh từ người dân, kiểm tra tính xác thực và điều động cơ quan chức năng tiếp nhận xử lý
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-orange-50/80 border border-orange-200 px-4 py-2 rounded-2xl">
            <span className="text-[12px] font-bold text-orange-800">Chờ điều phối:</span>
            <span className="font-display text-[20px] font-black text-orange-600">
              {tickets.length}
            </span>
          </div>
          <button
            onClick={fetchInitialData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Làm mới danh sách"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thông báo kết quả routing thành công */}
      {routingResult && (
        <div className="relative rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">
              ✓
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-emerald-900">
                Đã điều phối thành công hồ sơ <span className="font-mono-cf font-extrabold text-emerald-950">#{routingResult.ticketId.slice(0, 8)}</span>
              </p>
              <div className="flex items-center gap-4 mt-1 flex-wrap text-[12px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600">Đơn vị chủ trì:</span>
                  <span className="font-bold text-emerald-800">{routingResult.deptName}</span>
                </div>
                {routingResult.note && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">Ý kiến chỉ đạo:</span>
                    <span className="italic text-gray-800">"{routingResult.note}"</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setRoutingResult(null)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 w-72">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã, nội dung, địa chỉ..."
            className="bg-transparent text-[12px] text-gray-800 placeholder-gray-400 outline-none flex-1 font-medium"
          />
        </div>

        <select
          value={sevFilter}
          onChange={(e) => setSevFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 font-medium outline-none cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <option value="all">Tất cả mức độ nghiêm trọng</option>
          {Object.entries(SEV_MAP).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <select
          value={dangerFilter}
          onChange={(e) => setDangerFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 font-medium outline-none cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <option value="all">Tất cả mức độ nguy hiểm</option>
          {Object.entries(DANGER_MAP).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bảng hồ sơ chờ duyệt */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[850px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                {['MÃ HỒ SƠ', 'DANH MỤC', 'ĐỊA CHỈ HIỆN TRƯỜNG', 'MỨC ĐỘ', 'NGUY HIỂM', 'KHẨN CẤP', 'THỜI GIAN TIẾP NHẬN', 'THAO TÁC'].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-orange-600 font-medium">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                        </svg>
                        Đang đồng bộ danh sách hồ sơ...
                      </div>
                    ) : (
                      'Hiện không có hồ sơ nào cần điều phối.'
                    )}
                  </td>
                </tr>
              )}
              {filteredTickets.map((t) => {
                const ticketId = t.id || t.ticketId || '';
                return (
                  <tr key={ticketId} className="hover:bg-orange-50/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono-cf text-[12px] font-bold text-gray-700">
                      <div className="flex items-center gap-2">
                        {t.isLifeThreatening && (
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" title="Sự cố khẩn cấp" />
                        )}
                        <span className="text-gray-900">#{ticketId.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-gray-900 font-semibold max-w-[170px] truncate">
                      {t.categoryName || 'Chưa phân loại'}
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-gray-600 max-w-[220px] truncate">
                      {t.address || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${sevInfo(t.severity || 'LOW').cls}`}>
                        {sevInfo(t.severity || 'LOW').label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${dangerInfo(t.dangerLevel || 'SAFE').cls}`}>
                        {dangerInfo(t.dangerLevel || 'SAFE').label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {t.isLifeThreatening ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                          ⚠ Khẩn cấp
                        </span>
                      ) : (
                        <span className="text-[12px] text-gray-400 font-medium">Bình thường</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono-cf text-[11px] text-gray-400 whitespace-nowrap">
                      {t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectTicketForAction(t)}
                          className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] uppercase tracking-wide transition-all shadow-xs active:scale-[0.97] cursor-pointer"
                        >
                          Điều phối
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenTicket(ticketId)}
                          className="px-3 py-1.5 rounded-xl border border-gray-300 hover:border-gray-400 text-gray-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL ĐIỀU PHỐI & PHÂN CÔNG CHUYÊN NGHIỆP
         ========================================================================= */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl my-auto relative max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/90 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-cf text-[14px] font-extrabold text-gray-900">
                      Hồ sơ #{((selectedTicket.id || selectedTicket.ticketId) || '').slice(0, 8)}
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border text-amber-700 bg-amber-50 border-amber-200">
                      Chờ Quản lý điều phối
                    </span>
                    {selectedTicket.isLifeThreatening && (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border text-red-700 bg-red-50 border-red-200">
                        Ưu tiên khẩn cấp
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    {selectedTicket.address || 'Chưa xác định địa chỉ hiện trường'}
                  </p>
                </div>
              </div>

              {/* View Switcher / Close */}
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-200/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setModalView('dispatch')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      modalView === 'dispatch'
                        ? 'bg-white text-orange-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Phân công & Tiếp nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalView('steps')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      modalView === 'steps'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quy trình xử lý ({steps.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Thông báo feedback */}
            {feedback && (
              <div
                className={`mx-6 mt-4 p-3.5 rounded-2xl border text-[12px] flex items-center justify-between ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <span className="font-semibold">{feedback.message}</span>
                <button onClick={() => setFeedback(null)} className="cursor-pointer font-bold ml-2">
                  ✕
                </button>
              </div>
            )}

            {/* Modal Body - 2 Cột Chuyên Nghiệp */}
            <div className="overflow-y-auto flex-1 p-6">
              
              {/* CHẾ ĐỘ 1: PHÂN CÔNG & ĐIỀU PHỐI CHÍNH */}
              {modalView === 'dispatch' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* CỘT TRÁI (5/12): THÔNG TIN HIỆN TRƯỜNG & PHẢN ÁNH */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3.5">
                      <h4 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                        Thông tin phản ánh từ người dân
                      </h4>

                      {/* Ảnh hiện trường */}
                      {selectedTicket.imageUrl ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video group">
                          <img
                            src={selectedTicket.imageUrl}
                            alt="Hiện trường sự cố"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-gray-400 text-[11px]">
                          Không có ảnh đính kèm
                        </div>
                      )}

                      {/* Mô tả sự cố */}
                      <div>
                        <span className="text-[11px] font-bold text-gray-400 block mb-1">Mô tả sự cố:</span>
                        <p className="text-[12px] text-gray-800 leading-relaxed bg-white border border-gray-200 rounded-xl p-3 font-medium">
                          {selectedTicket.description || 'Không có mô tả chi tiết'}
                        </p>
                      </div>

                      {/* Địa chỉ hiện trường */}
                      <div>
                        <span className="text-[11px] font-bold text-gray-400 block mb-1">Địa điểm:</span>
                        <div className="flex items-start gap-1.5 text-[12px] text-gray-700 bg-white border border-gray-200 rounded-xl p-3">
                          <span className="text-orange-500 flex-shrink-0 mt-0.5">📍</span>
                          <span>{selectedTicket.address || '—'}</span>
                        </div>
                      </div>

                      {/* Đánh giá mức độ */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-white border border-gray-200 rounded-xl p-2.5">
                          <span className="text-[10px] font-bold text-gray-400 block mb-1">Nghiêm trọng</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border inline-block ${sevInfo(selectedTicket.severity || 'LOW').cls}`}>
                            {sevInfo(selectedTicket.severity || 'LOW').label}
                          </span>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-2.5">
                          <span className="text-[10px] font-bold text-gray-400 block mb-1">Mức độ nguy hiểm</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border inline-block ${dangerInfo(selectedTicket.dangerLevel || 'SAFE').cls}`}>
                            {dangerInfo(selectedTicket.dangerLevel || 'SAFE').label}
                          </span>
                        </div>
                      </div>

                      {/* Danh mục con (SubCategories) nếu có */}
                      {selectedTicket.subCategories && selectedTicket.subCategories.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 block mb-1">Phân loại chi tiết:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedTicket.subCategories.map((sc, i) => (
                              <span
                                key={sc.id || sc.subCategoryId || i}
                                className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-800"
                              >
                                {sc.name || sc.subCategoryName || 'Danh mục con'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CỘT PHẢI (7/12): BIỂU MẪU ĐIỀU PHỐI VÀ CHỈ ĐẠO */}
                  <div className="md:col-span-7 space-y-4">
                    
                    {/* Gợi ý tự động từ hệ thống */}
                    <div className="bg-gradient-to-br from-orange-50/80 to-amber-50/80 border border-orange-200 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-extrabold text-orange-900 flex items-center gap-1.5">
                          <span>✨</span> Gợi ý đơn vị xử lý phù hợp
                        </span>
                        {loadingSuggestions && (
                          <span className="text-[11px] text-orange-600 font-semibold animate-pulse">
                            Đang rà soát quy chuẩn...
                          </span>
                        )}
                      </div>

                      {suggestedDepts.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {suggestedDepts.map((d) => {
                            const isChosen = targetDeptId === d.departmentId;
                            return (
                              <button
                                key={d.departmentId}
                                type="button"
                                onClick={() => {
                                  setTargetDeptId(d.departmentId);
                                  if (!selectedDeptIds.includes(d.departmentId)) {
                                    setSelectedDeptIds((prev) => [...prev, d.departmentId]);
                                  }
                                }}
                                className={`px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                  isChosen
                                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                                    : 'bg-white text-gray-800 border border-gray-200 hover:border-orange-400'
                                }`}
                              >
                                <span>{d.name}</span>
                                {d.level && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isChosen ? 'bg-orange-700/60' : 'bg-gray-100 text-gray-600'}`}>
                                    {d.level === 'CITY' ? 'Thành phố' : 'Quận/Huyện'}
                                  </span>
                                )}
                                {isChosen && <span>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[12px] text-gray-500 italic">
                          Chưa có gợi ý khớp quy tắc tự động. Vui lòng chọn cơ quan phụ trách bên dưới.
                        </p>
                      )}
                    </div>

                    {/* Lựa chọn Danh mục & Đơn vị chủ trì */}
                    <div className="space-y-3.5">
                      {/* Chọn danh mục */}
                      <div>
                        <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wide block mb-1.5">
                          Lĩnh vực / Danh mục sự cố <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={reviewCatId}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        >
                          {categories.map((c) => (
                            <option key={c.id || c.categoryId} value={c.id || c.categoryId}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Đơn vị chủ trì */}
                      <div>
                        <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wide block mb-1.5">
                          Cơ quan / Đơn vị chủ trì tiếp nhận <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={targetDeptId}
                          onChange={(e) => setTargetDeptId(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        >
                          {departments.map((d) => (
                            <option key={d.departmentId} value={d.departmentId}>
                              {d.name} {d.level ? `(${d.level === 'CITY' ? 'Cấp Thành phố' : 'Cấp Quận/Phường'})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Đơn vị phối hợp */}
                      <div>
                        <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wide block mb-1.5">
                          Đơn vị phối hợp hỗ trợ (nếu có)
                        </label>
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 border border-gray-200 rounded-xl max-h-32 overflow-y-auto">
                          {departments.map((d) => {
                            const isSelected = selectedDeptIds.includes(d.departmentId);
                            const isPrimary = targetDeptId === d.departmentId;
                            return (
                              <button
                                key={d.departmentId}
                                type="button"
                                onClick={() => {
                                  if (isPrimary) return;
                                  if (isSelected) {
                                    setSelectedDeptIds((prev) => prev.filter((id) => id !== d.departmentId));
                                  } else {
                                    setSelectedDeptIds((prev) => [...prev, d.departmentId]);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                  isPrimary
                                    ? 'bg-orange-100 text-orange-800 border-orange-300 opacity-90'
                                    : isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                }`}
                              >
                                {d.name} {isPrimary ? '(Chủ trì)' : isSelected ? '✓' : '+'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Đánh dấu tình huống khẩn cấp */}
                      <div className="flex items-center gap-2.5 p-3.5 bg-red-50/70 border border-red-200 rounded-2xl">
                        <input
                          type="checkbox"
                          id="isLifeThreateningCheck"
                          checked={isLifeThreatening}
                          onChange={(e) => setIsLifeThreatening(e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-400 cursor-pointer accent-red-600"
                        />
                        <label htmlFor="isLifeThreateningCheck" className="text-[12px] font-bold text-red-800 cursor-pointer">
                          Xác nhận sự cố khẩn cấp (Cần bố trí lực lượng xử lý ngay lập tức)
                        </label>
                      </div>

                      {/* Ý kiến chỉ đạo */}
                      <div>
                        <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wide block mb-1.5">
                          Ý kiến chỉ đạo & Lưu ý điều phối
                        </label>
                        <textarea
                          rows={2}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Ví dụ: Đã xác minh qua camera hiện trường, yêu cầu đơn vị điều xe chuyên dụng xử lý trước 17h..."
                          className="w-full bg-white border border-gray-300 rounded-xl p-3 text-[12px] font-medium text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CHẾ ĐỘ 2: TỪ CHỐI TIẾP NHẬN HỒ SƠ */}
              {modalView === 'reject' && (
                <div className="max-w-2xl mx-auto space-y-4 py-2">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-[13px] text-red-800 font-medium leading-relaxed">
                    Hồ sơ sẽ chuyển sang trạng thái <strong>TỪ CHỐI (REJECTED)</strong>. Hệ thống sẽ gửi thông báo kèm lý do từ chối cụ thể đến ứng dụng của người dân.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wide block">
                      Lý do từ chối tiếp nhận <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Nêu rõ lý do (ví dụ: Hình ảnh không rõ ràng, sự cố không thuộc phạm vi xử lý của cơ quan công cộng, trùng lặp hồ sơ...)"
                      className="w-full bg-white border border-gray-300 rounded-xl p-3 text-[12px] text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wide block mb-1.5">
                        Kiến nghị danh mục đúng (nếu có)
                      </label>
                      <select
                        value={rejectCatId}
                        onChange={(e) => setRejectCatId(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none"
                      >
                        <option value="">— Không có —</option>
                        {categories.map((c) => (
                          <option key={c.id || c.categoryId} value={c.id || c.categoryId}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wide block mb-1.5">
                        Kiến nghị chuyển tiếp cơ quan khác
                      </label>
                      <select
                        value={rejectDeptId}
                        onChange={(e) => setRejectDeptId(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none"
                      >
                        <option value="">— Không có —</option>
                        {departments.map((d) => (
                          <option key={d.departmentId} value={d.departmentId}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* CHẾ ĐỘ 3: QUY TRÌNH XỬ LÝ (STEPS) */}
              {modalView === 'steps' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[13px] font-bold text-gray-900">
                        Quy trình các bước thực hiện
                      </h4>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        Theo dõi tiến độ, phân bổ thứ tự và thiết lập hạn chót hoàn thành cho từng bước
                      </p>
                    </div>
                  </div>

                  {steps.length === 0 ? (
                    <div className="p-12 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-gray-500 text-[13px] space-y-1">
                      <p className="font-bold text-gray-700">Chưa phát sinh các bước xử lý chi tiết</p>
                      <p className="text-[12px] text-gray-400">
                        Hệ thống sẽ tự động khởi tạo quy trình chuẩn dựa theo danh mục ngay sau khi bạn phê duyệt điều phối.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {steps.map((st, idx) => {
                        const stepId = st.stepId || st.id || `step-${idx}`;
                        const isEditingDeadline = editingStepDeadline?.stepId === stepId;
                        return (
                          <div
                            key={stepId}
                            className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveStep(idx, 'up')}
                                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer text-xs"
                                title="Đưa lên trên"
                              >
                                ▲
                              </button>
                              <span className="font-mono-cf text-[12px] font-bold text-gray-600 w-5 text-center">
                                {idx + 1}
                              </span>
                              <button
                                type="button"
                                disabled={idx === steps.length - 1}
                                onClick={() => handleMoveStep(idx, 'down')}
                                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer text-xs"
                                title="Hạ xuống dưới"
                              >
                                ▼
                              </button>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-gray-900 truncate">
                                {st.stepName || `Bước ${idx + 1}`}
                              </p>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Cán bộ phụ trách: <span className="font-semibold text-gray-700">{st.assigneeName || 'Chưa phân công'}</span> · Trạng thái: {st.status || 'Chờ thực hiện'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {isEditingDeadline ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="datetime-local"
                                    value={editingStepDeadline.deadline}
                                    onChange={(e) =>
                                      setEditingStepDeadline({
                                        ...editingStepDeadline,
                                        deadline: e.target.value,
                                      })
                                    }
                                    className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-[11px] outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStepDeadline(stepId, editingStepDeadline.deadline)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingStepDeadline(null)}
                                    className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[11px] font-bold cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono-cf text-[11px] text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                                    {st.deadline ? st.deadline.replace('T', ' ') : 'Chưa có hạn chót'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingStepDeadline({
                                        stepId,
                                        deadline: st.deadline ? st.deadline.slice(0, 16) : '2026-10-15T18:00',
                                      })
                                    }
                                    className="px-2.5 py-1 text-[11px] font-semibold border border-gray-300 bg-white hover:bg-gray-50 rounded-lg cursor-pointer"
                                  >
                                    Đổi hạn
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Hành Động */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/90 flex items-center justify-between flex-shrink-0">
              {modalView === 'dispatch' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModalView('reject')}
                    className="px-4 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-[12px] font-bold transition-colors cursor-pointer"
                  >
                    ✕ Từ chối tiếp nhận
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(null)}
                      className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-[12px] font-bold transition-colors cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleReviewSubmit}
                      className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[12px] uppercase tracking-wider transition-all shadow-md shadow-orange-600/20 disabled:opacity-60 cursor-pointer active:scale-95"
                    >
                      {submitting ? 'Đang điều phối...' : '✓ Phê duyệt & Điều phối hồ sơ'}
                    </button>
                  </div>
                </>
              ) : modalView === 'reject' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModalView('dispatch')}
                    className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-[12px] font-bold transition-colors cursor-pointer"
                  >
                    ← Quay lại điều phối
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleRejectSubmit}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-[12px] uppercase tracking-wider transition-all shadow-md shadow-red-600/20 disabled:opacity-60 cursor-pointer active:scale-95"
                  >
                    {submitting ? 'Đang từ chối...' : 'Xác nhận từ chối hồ sơ'}
                  </button>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalView('dispatch')}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[12px] font-bold cursor-pointer"
                  >
                    Quay lại điều phối
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
