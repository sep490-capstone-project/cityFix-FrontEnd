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
  Severity,
  DangerLevel,
} from '../data';
import {
  getManagerInitiatedTickets,
  reviewManagerTicket,
  rejectManagerTicket,
  getSuggestedDepartments,
  updateStepDeadline,
  updateStepOrderIndex,
  updateTicketStepDeadlines,
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

type TabType = 'review' | 'reject' | 'steps';

export default function ManagerDispatch({ onOpenTicket }: Props) {
  // 1. Danh sách vé chờ duyệt
  const [tickets, setTickets] = useState<ManagerTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [subCategories, setSubCategories] = useState<AdminSubCategory[]>([]);

  // 2. Vé đang chọn thao tác
  const [selectedTicket, setSelectedTicket] = useState<ManagerTicketItem | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 3. Form Duyệt & Định tuyến
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

  // Load danh mục, phòng ban, và danh sách vé chờ duyệt (GET /api/v1/manager/tickets/initiated)
  async function fetchInitialData() {
    setLoading(true);
    try {
      const [ticketsRes, catsRes, deptsRes, subCatsRes] = await Promise.allSettled([
        getManagerInitiatedTickets({ page: 0, size: 50 }),
        getAdminCategories(),
        getDepartments({ page: 0, size: 100 }),
        getAllSubCategories(),
      ]);

      if (ticketsRes.status === 'fulfilled' && ticketsRes.value?.content) {
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

      if (catsRes.status === 'fulfilled' && catsRes.value) {
        setCategories(catsRes.value);
      }
      if (deptsRes.status === 'fulfilled' && deptsRes.value) {
        const list = Array.isArray(deptsRes.value) ? deptsRes.value : (deptsRes.value as any).content || [];
        setDepartments(list);
      }
      if (subCatsRes.status === 'fulfilled' && subCatsRes.value) {
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

  // Khi chọn một vé, tải gợi ý phòng ban theo GET /api/v1/manager/tickets/{id}/suggested-departments
  async function selectTicketForAction(ticket: ManagerTicketItem) {
    setSelectedTicket(ticket);
    setActiveTab('review');
    setFeedback(null);
    setReviewCatId(ticket.categoryId || categories[0]?.id || categories[0]?.categoryId || 'CAT001');
    setTargetDeptId(departments[0]?.departmentId || 'D002');
    setSelectedDeptIds([departments[0]?.departmentId || 'D002']);
    setIsLifeThreatening(Boolean(ticket.isLifeThreatening));
    setReviewNote('');
    setRejectReason('');
    setRejectCatId(ticket.categoryId || '');
    setRejectDeptId('');
    setSteps(ticket.steps || []);

    // Khởi tạo routes từ subCategories nếu có
    if (ticket.subCategories && ticket.subCategories.length > 0) {
      setRoutes(
        ticket.subCategories.map((sc) => ({
          subCategoryId: sc.id || sc.subCategoryId || '',
          departmentId: departments[0]?.departmentId || 'D002',
        }))
      );
    } else {
      setRoutes([]);
    }

    // Tải gợi ý phòng ban
    await loadSuggestedDepartments(ticket.id || ticket.ticketId || '', ticket.categoryId);
  }

  async function loadSuggestedDepartments(ticketId: string, catId?: string) {
    if (!ticketId) return;
    setLoadingSuggestions(true);
    try {
      const suggestions = await getSuggestedDepartments(ticketId, catId);
      if (suggestions && suggestions.length > 0) {
        setSuggestedDepts(suggestions);
        // Tự động gán phòng ban gợi ý đầu tiên nếu có
        if (suggestions[0]?.departmentId) {
          setTargetDeptId(suggestions[0].departmentId);
          setSelectedDeptIds([suggestions[0].departmentId]);
        }
      } else {
        // Fallback rule gợi ý nếu backend chưa trả
        const rule = ROUTING_RULES.find((r) => r.categoryId === catId);
        if (rule) {
          const dept = FALLBACK_DEPARTMENTS.find((d) => d.departmentId === rule.departmentId);
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

  // Thay đổi danh mục sự cố -> tải lại gợi ý phòng ban
  async function handleCategoryChange(newCatId: string) {
    setReviewCatId(newCatId);
    if (selectedTicket) {
      await loadSuggestedDepartments(selectedTicket.id || selectedTicket.ticketId || '', newCatId);
    }
  }

  // 4. Gọi API duyệt vé và định tuyến: PUT /api/v1/manager/tickets/{id}/review
  async function handleReviewSubmit() {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';

    setSubmitting(true);
    setFeedback(null);

    try {
      await reviewManagerTicket(ticketId, {
        categoryId: reviewCatId,
        targetDepartmentId: targetDeptId,
        routes: routes.length > 0 ? routes : undefined,
        departmentIds: selectedDeptIds.length > 0 ? selectedDeptIds : [targetDeptId],
        isLifeThreatening,
        reviewNote: reviewNote.trim() || undefined,
      });

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
        message: `Đã duyệt và định tuyến hồ sơ ${ticketId} thành công đến: ${deptName}`,
      });

      // Cập nhật lại danh sách vé
      setTickets((prev) => prev.filter((t) => (t.id || t.ticketId) !== ticketId));
      setSelectedTicket(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Duyệt và định tuyến vé thất bại. Vui lòng thử lại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // 3. Gọi API từ chối vé: PUT /api/v1/manager/tickets/{id}/reject
  async function handleRejectSubmit() {
    if (!selectedTicket) return;
    if (!rejectReason.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập lý do từ chối hồ sơ' });
      return;
    }

    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';
    setSubmitting(true);
    setFeedback(null);

    try {
      await rejectManagerTicket(ticketId, {
        suggestedCategoryId: rejectCatId || undefined,
        suggestedDepartmentId: rejectDeptId || undefined,
        reason: rejectReason.trim(),
      });

      setFeedback({
        type: 'success',
        message: `Đã từ chối tiếp nhận hồ sơ ${ticketId}.`,
      });

      setTickets((prev) => prev.filter((t) => (t.id || t.ticketId) !== ticketId));
      setSelectedTicket(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Từ chối vé thất bại. Vui lòng thử lại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // 1 & 5. Cập nhật deadline cho bước
  async function handleUpdateStepDeadline(stepId: string, deadlineStr: string) {
    if (!selectedTicket || !stepId) return;
    try {
      await updateStepDeadline(stepId, { deadline: deadlineStr });
      setSteps((prev) =>
        prev.map((s) => ((s.stepId || s.id) === stepId ? { ...s, deadline: deadlineStr } : s))
      );
      setEditingStepDeadline(null);
      setFeedback({ type: 'success', message: 'Đã cập nhật deadline cho bước xử lý.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Cập nhật deadline thất bại.' });
    }
  }

  // 2 & 6. Đổi thứ tự bước (Reorder)
  async function handleMoveStep(index: number, direction: 'up' | 'down') {
    if (!selectedTicket || steps.length < 2) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    // Cập nhật lại orderIndex
    const reordered = newSteps.map((s, idx) => ({ ...s, orderIndex: idx }));
    setSteps(reordered);

    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';
    const stepOrders = reordered.map((s, idx) => ({
      ticketStepId: s.stepId || s.id || '',
      orderIndex: idx,
    }));

    try {
      await reorderTicketSteps(ticketId, { stepOrders });
      setFeedback({ type: 'success', message: 'Đã lưu thứ tự các bước xử lý.' });
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-[20px] font-bold text-gray-900 uppercase tracking-wide">
            Điều phối & Xét duyệt Hồ sơ
          </h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Phê duyệt, phân loại danh mục, gán cơ quan tiếp nhận và định tuyến đa phòng ban
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-gray-500">Chờ điều phối:</span>
          <span className="font-display text-[26px] font-bold text-amber-500 bg-amber-50 px-3.5 py-1 rounded-xl border border-amber-200">
            {tickets.length}
          </span>
          <button
            onClick={fetchInitialData}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
            title="Tải lại danh sách"
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

      {/* Thông báo kết quả routing */}
      {routingResult && (
        <div className="relative rounded-2xl overflow-hidden border border-green-300 bg-green-50/90 shadow-sm">
          <div className="relative flex items-start gap-3 px-5 py-4">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              className="flex-shrink-0 mt-0.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-green-800">
                Hồ sơ <span className="font-mono-cf text-green-900">{routingResult.ticketId}</span> đã được duyệt và định tuyến thành công!
              </p>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap text-[12px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Cơ quan tiếp nhận:</span>
                  <span className="font-bold text-green-700">{routingResult.deptName}</span>
                </div>
                {routingResult.note && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Ghi chú:</span>
                    <span className="italic text-gray-700">"{routingResult.note}"</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setRoutingResult(null)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Alert Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
        <div className="flex items-center gap-3">
          <span className="text-amber-600 text-lg">⚠</span>
          <p className="text-[12px] text-amber-900 font-medium leading-relaxed">
            Danh sách bao gồm các hồ sơ <strong>khởi tạo (INITIATED)</strong> hoặc cần xét duyệt thủ công. Quản lý có thể xem phòng ban gợi ý từ hệ thống AI/Rule, tùy chỉnh tuyến xử lý và giao việc trực tiếp cho các cơ quan liên quan.
          </p>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-2xl p-3 shadow-xs">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-64">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã, danh mục, địa chỉ..."
            className="bg-transparent text-[12px] text-gray-800 placeholder-gray-400 outline-none flex-1"
          />
        </div>

        <select
          value={sevFilter}
          onChange={(e) => setSevFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none cursor-pointer"
        >
          <option value="all">Mọi mức độ nghiêm trọng</option>
          {Object.entries(SEV_MAP).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <select
          value={dangerFilter}
          onChange={(e) => setDangerFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none cursor-pointer"
        >
          <option value="all">Mọi mức độ nguy hiểm</option>
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
              <tr className="border-b border-gray-200 bg-gray-50/70">
                {['MÃ HỒ SƠ', 'DANH MỤC', 'ĐỊA CHỈ', 'MỨC ĐỘ', 'NGUY HIỂM', 'ĐE DỌA TM', 'NGÀY TẠO', 'THAO TÁC'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    {loading ? 'Đang tải dữ liệu hồ sơ...' : 'Không có hồ sơ nào cần điều phối vào lúc này.'}
                  </td>
                </tr>
              )}
              {filteredTickets.map((t) => {
                const ticketId = t.id || t.ticketId || '';
                return (
                  <tr key={ticketId} className="hover:bg-orange-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono-cf text-[11px] font-bold text-gray-700">
                      <div className="flex items-center gap-1.5">
                        {t.isLifeThreatening && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                        {ticketId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-800 font-medium max-w-[160px] truncate">
                      {t.categoryName || 'Chưa phân loại'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-600 max-w-[200px] truncate">
                      {t.address || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sevInfo(t.severity || 'LOW').cls}`}>
                        {sevInfo(t.severity || 'LOW').label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${dangerInfo(t.dangerLevel || 'SAFE').cls}`}>
                        {dangerInfo(t.dangerLevel || 'SAFE').label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold ${t.isLifeThreatening ? 'text-red-500' : 'text-gray-400'}`}>
                        {t.isLifeThreatening ? 'Có ⚠' : 'Không'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">
                      {t.createdAt || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => selectTicketForAction(t)}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] uppercase tracking-wide transition-all shadow-xs active:scale-[0.97] cursor-pointer"
                        >
                          Điều phối
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenTicket(ticketId)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:text-gray-900 text-[11px] font-semibold transition-colors cursor-pointer"
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

      {/* Modal / Panel Điều phối chi tiết vé đang chọn */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto relative max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-cf text-[13px] font-bold text-orange-600">
                    {selectedTicket.id || selectedTicket.ticketId}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border text-amber-600 bg-amber-50 border-amber-200">
                    Chờ Quản lý xét duyệt
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 mt-0.5 truncate max-w-md">
                  {selectedTicket.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thông báo feedback */}
            {feedback && (
              <div
                className={`mx-6 mt-4 p-3 rounded-xl border text-[12px] flex items-center justify-between ${
                  feedback.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <span>{feedback.message}</span>
                <button onClick={() => setFeedback(null)} className="cursor-pointer font-bold ml-2">
                  ✕
                </button>
              </div>
            )}

            {/* Tabs Điều phối */}
            <div className="px-6 pt-3 border-b border-gray-200 flex gap-4 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('review')}
                className={`pb-2.5 text-[13px] font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'review'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                1. Duyệt vé & Định tuyến (Review API)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reject')}
                className={`pb-2.5 text-[13px] font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'reject'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                2. Từ chối vé (Reject API)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('steps')}
                className={`pb-2.5 text-[13px] font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'steps'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                3. Các bước & Deadline ({steps.length})
              </button>
            </div>

            {/* Tab 1: DUYỆT VÉ VÀ ĐỊNH TUYẾN */}
            {activeTab === 'review' && (
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Phòng ban gợi ý từ API */}
                <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚡</span> Phòng ban gợi ý tự động (Routing Rules API)
                    </p>
                    {loadingSuggestions && <span className="text-[10px] text-orange-500">Đang tìm gợi ý...</span>}
                  </div>
                  {suggestedDepts.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {suggestedDepts.map((d) => (
                        <button
                          key={d.departmentId}
                          type="button"
                          onClick={() => {
                            setTargetDeptId(d.departmentId);
                            if (!selectedDeptIds.includes(d.departmentId)) {
                              setSelectedDeptIds((prev) => [...prev, d.departmentId]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            targetDeptId === d.departmentId
                              ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                          }`}
                        >
                          <span>{d.name}</span>
                          {d.level && <span className="opacity-75 text-[9px]">({d.level})</span>}
                          {targetDeptId === d.departmentId && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic">Chưa có gợi ý khớp quy tắc, vui lòng chọn phòng ban bên dưới.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Danh mục */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Danh mục sự cố (categoryId) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reviewCatId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id || c.categoryId} value={c.id || c.categoryId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phòng ban đích chính */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Phòng ban tiếp nhận chính (targetDepartmentId) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={targetDeptId}
                      onChange={(e) => setTargetDeptId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500"
                    >
                      {departments.map((d) => (
                        <option key={d.departmentId} value={d.departmentId}>
                          {d.name} {d.level ? `(${d.level})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Chọn nhiều phòng ban cùng phối hợp (departmentIds) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Phòng ban phối hợp (departmentIds)
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-xl max-h-28 overflow-y-auto">
                    {departments.map((d) => {
                      const isSelected = selectedDeptIds.includes(d.departmentId);
                      return (
                        <button
                          key={d.departmentId}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (selectedDeptIds.length > 1) {
                                setSelectedDeptIds((prev) => prev.filter((id) => id !== d.departmentId));
                              }
                            } else {
                              setSelectedDeptIds((prev) => [...prev, d.departmentId]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {d.name} {isSelected ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Đe dọa tính mạng */}
                <div className="flex items-center gap-2 p-3 bg-red-50/60 border border-red-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="isLifeThreateningCheck"
                    checked={isLifeThreatening}
                    onChange={(e) => setIsLifeThreatening(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-400 cursor-pointer"
                  />
                  <label htmlFor="isLifeThreateningCheck" className="text-[12px] font-bold text-red-700 cursor-pointer">
                    Đánh dấu tình huống khẩn cấp / Đe dọa tính mạng (isLifeThreatening = true)
                  </label>
                </div>

                {/* Ghi chú duyệt */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Ghi chú duyệt hồ sơ (reviewNote)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Ví dụ: Đã xác minh thực tế, yêu cầu cơ quan xử lý khẩn trương..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-[12px] text-gray-900 outline-none focus:border-orange-500"
                  />
                </div>

                {/* Nút submit Duyệt */}
                <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-[12px] font-semibold hover:bg-gray-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleReviewSubmit}
                    className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-[12px] uppercase tracking-wider transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? 'Đang duyệt & định tuyến...' : 'Xác nhận Duyệt & Định tuyến (PUT /review)'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: TỪ CHỐI VÉ */}
            {activeTab === 'reject' && (
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-700 font-medium">
                  Hồ sơ sẽ chuyển sang trạng thái <strong>REJECTED</strong>. Vui lòng nêu rõ lý do từ chối để phản hồi cho người dân.
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Lý do từ chối (reason) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do chi tiết từ chối..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-[12px] text-gray-900 outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Danh mục gợi ý lại (suggestedCategoryId - tùy chọn)
                    </label>
                    <select
                      value={rejectCatId}
                      onChange={(e) => setRejectCatId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none"
                    >
                      <option value="">— Không có —</option>
                      {categories.map((c) => (
                        <option key={c.id || c.categoryId} value={c.id || c.categoryId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Phòng ban chuyển tiếp gợi ý (suggestedDepartmentId - tùy chọn)
                    </label>
                    <select
                      value={rejectDeptId}
                      onChange={(e) => setRejectDeptId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none"
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

                <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-[12px] font-semibold hover:bg-gray-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleRejectSubmit}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[12px] uppercase tracking-wider transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? 'Đang từ chối...' : 'Xác nhận Từ chối vé (PUT /reject)'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: QUẢN LÝ CÁC BƯỚC XỬ LÝ & DEADLINE */}
            {activeTab === 'steps' && (
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-gray-500">
                    Sắp xếp thứ tự thực hiện (Reorder API) và cập nhật thời hạn hoàn thành (Deadline API)
                  </p>
                </div>

                {steps.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-xl text-gray-400 text-[13px]">
                    Hồ sơ này chưa có các bước xử lý (ticket_step) được khởi tạo.
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
                          {/* Thứ tự & Reorder buttons */}
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveStep(idx, 'up')}
                              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer text-xs"
                              title="Di chuyển lên"
                            >
                              ▲
                            </button>
                            <span className="font-mono-cf text-[11px] font-bold text-gray-500 w-5 text-center">
                              {idx + 1}
                            </span>
                            <button
                              type="button"
                              disabled={idx === steps.length - 1}
                              onClick={() => handleMoveStep(idx, 'down')}
                              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer text-xs"
                              title="Di chuyển xuống"
                            >
                              ▼
                            </button>
                          </div>

                          {/* Thông tin bước */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-800 truncate">{st.stepName || `Bước ${idx + 1}`}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Người thực hiện: <span className="font-semibold text-gray-700">{st.assigneeName || 'Chưa giao'}</span> · Trạng thái: {st.status || 'OPEN'}
                            </p>
                          </div>

                          {/* Deadline & Edit */}
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
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStepDeadline(null)}
                                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-mono-cf text-[11px] text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                                  {st.deadline ? st.deadline.replace('T', ' ') : 'Chưa có hạn'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingStepDeadline({
                                      stepId,
                                      deadline: st.deadline ? st.deadline.slice(0, 16) : '2026-10-15T18:00',
                                    })
                                  }
                                  className="px-2 py-1 text-[10px] font-semibold border border-gray-300 bg-white hover:bg-gray-50 rounded-lg cursor-pointer"
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

                <div className="pt-2 flex justify-end border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-[12px] font-semibold cursor-pointer"
                  >
                    Đóng
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
