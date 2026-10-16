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
  getManagerDepartments,
  getStepsBySubCategory,
  DepartmentStaffUser,
  ReviewStepItemPayload,
  ReviewTicketPayload,
  getAdminSteps,
  AdminStep,
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
  const [allSubCategories, setAllSubCategories] = useState<AdminSubCategory[]>([]);
  const [, setSubCategories] = useState<AdminSubCategory[]>([]);
  const [allSystemSteps, setAllSystemSteps] = useState<AdminStep[]>([]);

  // Danh sách cán bộ lấy từ GET /api/v1/manager/tickets/departments
  const [staffList, setStaffList] = useState<DepartmentStaffUser[]>([]);

  // 2. Vé đang chọn thao tác
  const [selectedTicket, setSelectedTicket] = useState<ManagerTicketItem | null>(null);
  const [modalView, setModalView] = useState<ModalView>('dispatch');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 3. Form Duyệt & Điều phối theo chuẩn BE mới
  const [reviewCatId, setReviewCatId] = useState('');
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>([]);
  const [reviewSteps, setReviewSteps] = useState<ReviewStepItemPayload[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
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

  // Load danh mục, phòng ban, cán bộ, và danh sách vé chờ duyệt
  async function fetchInitialData() {
    setLoading(true);
    try {
      const [ticketsRes, catsRes, deptsRes, subCatsRes, managerDeptsRes, stepsRes] = await Promise.allSettled([
        getManagerInitiatedTickets({ page: 0, size: 50 }),
        getAdminCategories(),
        getDepartments({ page: 0, size: 100 }),
        getAllSubCategories(),
        getManagerDepartments(),
        getAdminSteps(),
      ]);

      // 1. Tickets (hỗ trợ cả Array trực tiếp và cấu trúc phân trang PageManagerTickets)
      if (ticketsRes.status === 'fulfilled' && ticketsRes.value) {
        const val = ticketsRes.value as any;
        const list = Array.isArray(val)
          ? val
          : Array.isArray(val.content)
            ? val.content
            : Array.isArray(val.data)
              ? val.data
              : [];
        if (list.length > 0) {
          setTickets(list);
        } else {
          setTickets(getFallbackInitiatedTickets());
        }
      } else {
        setTickets(getFallbackInitiatedTickets());
      }

      // 2. Categories
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
      if (loadedCats.length === 0) {
        loadedCats = FALLBACK_CATEGORIES.map((c) => ({
          id: c.categoryId,
          categoryId: c.categoryId,
          name: c.name,
          description: c.description,
          isActive: c.isActive,
        }));
      }
      setCategories(loadedCats);

      // 3. Departments
      let loadedDepts: DepartmentItem[] = [];
      if (deptsRes.status === 'fulfilled' && deptsRes.value) {
        const val = deptsRes.value as any;
        const list = Array.isArray(val)
          ? val
          : Array.isArray(val.content)
            ? val.content
            : Array.isArray(val.data)
              ? val.data
              : [];
        if (list.length > 0) {
          loadedDepts = list.filter((d: any) => d && d.departmentId);
        }
      }
      if (loadedDepts.length === 0) {
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
        setAllSubCategories(subCatsRes.value);
        setSubCategories(subCatsRes.value);
      }

      // 5. Cán bộ nhân sự từ GET /api/v1/manager/tickets/departments
      let loadedStaff: DepartmentStaffUser[] = [];
      if (managerDeptsRes.status === 'fulfilled' && managerDeptsRes.value) {
        const val: any = managerDeptsRes.value;
        const deptsList = Array.isArray(val)
          ? val
          : Array.isArray(val.data)
            ? val.data
            : Array.isArray(val.content)
              ? val.content
              : [];
        deptsList.forEach((dept: any) => {
          const rawUsers =
            dept.users ||
            dept.staffs ||
            dept.officers ||
            dept.members ||
            dept.employees ||
            [];
          rawUsers.forEach((u: any) => {
            const uid = u.userId || u.id;
            if (uid) {
              loadedStaff.push({
                userId: uid,
                fullName: u.fullName || u.name || 'Cán bộ',
                email: u.email || '',
                phoneNumber: u.phoneNumber || u.phone || '',
                role: u.role || 'STAFF',
                departmentId: dept.departmentId || dept.id,
                departmentName: dept.name,
              });
            }
          });
        });
      }
      if (loadedStaff.length > 0) {
        setStaffList(loadedStaff);
      }

      // 6. Quy trình tất cả các bước (Steps) trong hệ thống
      if (stepsRes.status === 'fulfilled' && stepsRes.value) {
        const val: any = stepsRes.value;
        const stepsList = Array.isArray(val)
          ? val
          : Array.isArray(val.data)
            ? val.data
            : Array.isArray(val.content)
              ? val.content
              : [];
        setAllSystemSteps(stepsList);
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

  // Helper tải các bước của SubCategory cho modal Review
  async function loadStepsForReview(subCatId: string, ticket?: ManagerTicketItem) {
    setLoadingSteps(true);
    try {
      let stepsFromApi: any[] = [];
      if (subCatId && isValidUuid(subCatId)) {
        stepsFromApi = await getStepsBySubCategory(subCatId);
      }

      // Nếu API subcategory chưa có bước, thử lọc từ allSystemSteps
      if (stepsFromApi.length === 0 && subCatId) {
        stepsFromApi = allSystemSteps.filter((st) => st.subCategoryId === subCatId);
      }

      // Nếu vẫn chưa có và hệ thống có các bước quy trình, lấy gợi ý từ allSystemSteps
      if (stepsFromApi.length === 0 && allSystemSteps.length > 0) {
        stepsFromApi = allSystemSteps.slice(0, 2);
      }

      if (stepsFromApi && stepsFromApi.length > 0) {
        const formatted: ReviewStepItemPayload[] = stepsFromApi.map((st, idx) => ({
          stepId: st.stepId,
          stepName: st.stepName,
          duration: st.duration || 24,
          orderIndex: idx + 1,
          assigneeId: staffList[idx % Math.max(staffList.length, 1)]?.userId || '',
          notes: st.description || st.stepName || (idx === 0 ? 'Tiến hành khảo sát hiện trường trong 24h' : 'Tiến hành xử lý khắc phục'),
        }));
        setReviewSteps(formatted);
      } else if (ticket?.steps && ticket.steps.length > 0) {
        setReviewSteps(
          ticket.steps.map((st, idx) => ({
            stepId: st.stepId || st.id || '',
            stepName: st.stepName || `Bước ${idx + 1}`,
            duration: 24,
            orderIndex: idx + 1,
            assigneeId: st.assigneeId || staffList[idx % Math.max(staffList.length, 1)]?.userId || '',
            notes: st.notes || 'Tiến hành xử lý hiện trường',
          }))
        );
      } else {
        // Để trống để yêu cầu chọn bước hợp lệ thay vì gửi mã giả gây 400 Bad Request
        setReviewSteps([]);
      }
    } catch (err) {
      console.warn('Lỗi khi tải các bước cho review:', err);
    } finally {
      setLoadingSteps(false);
    }
  }

  // Khi chọn một vé để điều phối / duyệt
  async function selectTicketForAction(ticket: ManagerTicketItem) {
    setSelectedTicket(ticket);
    setModalView('dispatch');
    setFeedback(null);

    // 1. Danh mục sự cố
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
    setReviewNote('Đã tiếp nhận và giao các cán bộ phụ trách xử lý khẩn cấp');
    setRejectReason('');
    setRejectCatId(currentCatId);
    setRejectDeptId('');
    setSteps(ticket.steps || []);

    // 2. Trích xuất SubCategory ID từ vé
    const foundSubCatIds: string[] = [];
    if (ticket.subCategoryId) foundSubCatIds.push(ticket.subCategoryId);
    if ((ticket as any).subCategory?.subCategoryId) foundSubCatIds.push((ticket as any).subCategory.subCategoryId);
    if ((ticket as any).subCategory?.id) foundSubCatIds.push((ticket as any).subCategory.id);
    if (Array.isArray(ticket.subCategories)) {
      ticket.subCategories.forEach((sc: any) => {
        const id = sc.subCategoryId || sc.id;
        if (id && !foundSubCatIds.includes(id)) foundSubCatIds.push(id);
      });
    }

    if (foundSubCatIds.length === 0 && allSubCategories.length > 0) {
      // Gợi ý subcategory đầu tiên nếu vé chưa có
      foundSubCatIds.push(allSubCategories[0].subCategoryId);
    }
    setSelectedSubCategoryIds(foundSubCatIds);

    // 3. Tải quy trình các bước của SubCategory
    const primarySubCat = foundSubCatIds[0] || '';
    await loadStepsForReview(primarySubCat, ticket);

    // 4. Tải gợi ý phòng ban tự động
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

  // Thay đổi danh mục sự cố
  async function handleCategoryChange(newCatId: string) {
    setReviewCatId(newCatId);
    if (selectedTicket) {
      await loadSuggestedDepartments(selectedTicket.id || selectedTicket.ticketId || '', newCatId);
    }
  }

  // Thao tác chỉnh sửa các bước trong Modal Duyệt vé
  function handleAddReviewStep() {
    const nextIndex = reviewSteps.length + 1;
    const candidate = allSystemSteps[nextIndex % Math.max(allSystemSteps.length, 1)] || allSystemSteps[0];
    setReviewSteps((prev) => [
      ...prev,
      {
        stepId: candidate?.stepId || '',
        stepName: candidate?.stepName || `Bước ${nextIndex}: Xử lý sự cố`,
        duration: candidate?.duration || 24,
        orderIndex: nextIndex,
        assigneeId: staffList[0]?.userId || '',
        notes: candidate?.description || 'Tiến hành xử lý theo quy trình',
      },
    ]);
  }

  function handleRemoveReviewStep(index: number) {
    setReviewSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, idx) => ({ ...s, orderIndex: idx + 1 }))
    );
  }

  function handleMoveReviewStep(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= reviewSteps.length) return;
    const newSteps = [...reviewSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    setReviewSteps(newSteps.map((s, idx) => ({ ...s, orderIndex: idx + 1 })));
  }

  function handleReviewStepFieldChange(
    index: number,
    field: keyof ReviewStepItemPayload,
    value: any
  ) {
    setReviewSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  // 1. Phê duyệt & Điều phối hồ sơ theo API PUT /api/v1/manager/tickets/{id}/review
  async function handleReviewSubmit() {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';

    // 1. Kiểm tra danh mục con
    const validSubCatIds: string[] = selectedSubCategoryIds.filter((id) => isValidUuid(id));
    if (validSubCatIds.length === 0) {
      const found = allSubCategories.find((s) => isValidUuid(s.subCategoryId));
      if (found) {
        validSubCatIds.push(found.subCategoryId);
      } else {
        setFeedback({
          type: 'error',
          message: 'Vui lòng chọn một Danh mục sự cố (SubCategory) hợp lệ từ hệ thống.',
        });
        return;
      }
    }

    // 2. Kiểm tra các bước xử lý
    if (reviewSteps.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Vui lòng thiết lập ít nhất 1 bước xử lý hợp lệ (stepId) cho hồ sơ.',
      });
      return;
    }

    for (let i = 0; i < reviewSteps.length; i++) {
      const st = reviewSteps[i];
      if (!st.stepId || !isValidUuid(st.stepId)) {
        setFeedback({
          type: 'error',
          message: `Bước ${i + 1} (${st.stepName || ''}) chưa có mã stepId hợp lệ (phải là UUID từ hệ thống các bước). Vui lòng chọn bước xử lý chuẩn.`,
        });
        return;
      }
      if (!st.assigneeId || !isValidUuid(st.assigneeId)) {
        setFeedback({
          type: 'error',
          message: `Vui lòng chỉ định Cán bộ phụ trách (assigneeId) hợp lệ cho Bước ${i + 1} (${st.stepName || 'Xử lý'}).`,
        });
        return;
      }
    }

    // Chuẩn bị payload chuẩn theo mô tả backend:
    // {
    //   "isLifeThreatening": false,
    //   "reviewNote": "Đã tiếp nhận và giao các cán bộ phụ trách xử lý khẩn cấp",
    //   "subCategoryIds": [ "<subCategoryId>" ],
    //   "steps": [
    //     { "stepId": "...", "assigneeId": "...", "orderIndex": 1, "notes": "..." }
    //   ]
    // }
    const payload: ReviewTicketPayload = {
      isLifeThreatening: Boolean(isLifeThreatening),
      reviewNote: reviewNote.trim() || 'Đã tiếp nhận và giao các cán bộ phụ trách xử lý khẩn cấp',
      subCategoryIds: validSubCatIds,
      steps: reviewSteps.map((s, idx) => ({
        stepId: s.stepId.trim(),
        assigneeId: s.assigneeId.trim(),
        orderIndex: idx + 1,
        notes: (s.notes?.trim() || s.stepName || 'Tiến hành xử lý theo quy trình'),
      })),
    };

    setSubmitting(true);
    setFeedback(null);

    try {
      await reviewManagerTicket(ticketId, payload);

      setFeedback({
        type: 'success',
        message: `Đã phê duyệt thành công! Hồ sơ đã được giao cho ${reviewSteps.length} bước xử lý.`,
      });

      // Cập nhật lại danh sách vé chờ duyệt
      setTickets((prev) => prev.filter((t) => (t.id || t.ticketId) !== ticketId));
      setTimeout(() => {
        setSelectedTicket(null);
      }, 1200);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : (err?.message || 'Duyệt hồ sơ thất bại. Vui lòng thử lại.');
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
    <div className="p-6 space-y-5">
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm overflow-hidden">
  <div className="bg-white border border-slate-200 rounded-2xl w-[calc(100vw-2rem)] max-w-7xl h-[calc(100dvh-2rem)] shadow-2xl flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-orange-500/20 flex-shrink-0">
                  ⚡
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono-cf text-[14px] font-extrabold text-gray-900">
                      Hồ sơ 
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border text-amber-700 bg-amber-50 border-amber-200">
                      Chờ Quản lý điều phối
                    </span>
                    {isLifeThreatening && (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border text-red-700 bg-red-50 border-red-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                        Ưu tiên khẩn cấp
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-500 mt-0.5 truncate max-w-xl">
                    📍 {selectedTicket.address || 'Chưa xác định địa chỉ hiện trường'}
                  </p>
                </div>
              </div>

              {/* View Switcher / Close */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setModalView('dispatch')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${modalView === 'dispatch'
                        ? 'bg-white text-orange-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    ⚡ Phân công & Tiếp nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalView('reject')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${modalView === 'reject'
                        ? 'bg-white text-red-600 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    ✕ Từ chối
                  </button>
                  {steps.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalView('steps')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${modalView === 'steps'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Tiến độ ({steps.length})
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer text-base"
                  title="Đóng modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Thông báo feedback */}
            {feedback && (
              <div
                className={`mx-6 mt-4 p-3.5 rounded-2xl border text-[12px] flex items-center justify-between flex-shrink-0 ${feedback.type === 'success'
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
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">

              {/* CHẾ ĐỘ 1: PHÂN CÔNG & ĐIỀU PHỐI CHÍNH */}
              {modalView === 'dispatch' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                  {/* CỘT TRÁI (5/12): THÔNG TIN HIỆN TRƯỜNG & PHẢN ÁNH */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4.5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span>📸</span> Thông tin phản ánh từ người dân
                        </h4>
                        <span className="text-[11px] font-mono font-semibold text-slate-400">
                          {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleDateString('vi-VN') : 'Mới tiếp nhận'}
                        </span>
                      </div>

                      {/* Ảnh hiện trường */}
                      {selectedTicket.imageUrl ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video group shadow-xs">
                          <img
                            src={selectedTicket.imageUrl}
                            alt="Hiện trường sự cố"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 text-[12px] bg-white">
                          Không có ảnh đính kèm hiện trường
                        </div>
                      )}

                      {/* Mô tả sự cố */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">Mô tả phản ánh:</span>
                        <p className="text-[12px] text-slate-800 leading-relaxed bg-white border border-slate-200 rounded-xl p-3 font-medium shadow-2xs">
                          {selectedTicket.description || 'Không có mô tả chi tiết'}
                        </p>
                      </div>

                      {/* Địa chỉ hiện trường */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">Địa điểm:</span>
                        <div className="flex items-start gap-2 text-[12px] text-slate-700 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                          <span className="text-orange-500 flex-shrink-0 mt-0.5">📍</span>
                          <span className="font-medium">{selectedTicket.address || '—'}</span>
                        </div>
                      </div>

                      {/* Đánh giá mức độ */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Mức nghiêm trọng</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border inline-block ${sevInfo(selectedTicket.severity || 'LOW').cls}`}>
                            {sevInfo(selectedTicket.severity || 'LOW').label}
                          </span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Mức độ nguy hiểm</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border inline-block ${dangerInfo(selectedTicket.dangerLevel || 'SAFE').cls}`}>
                            {dangerInfo(selectedTicket.dangerLevel || 'SAFE').label}
                          </span>
                        </div>
                      </div>

                      {/* Danh mục ban đầu từ phản ánh */}
                      {selectedTicket.subCategories && selectedTicket.subCategories.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Phân loại ghi nhận ban đầu:</span>
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

                  {/* CỘT PHẢI (7/12): BIỂU MẪU ĐIỀU PHỐI VÀ PHÂN CÔNG QUY TRÌNH BƯỚC */}
                  <div className="lg:col-span-7 space-y-4">

                    {/* 1. Lựa chọn Phân loại / SubCategory */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="text-orange-500">🏷️</span> Phân loại sự cố (SubCategory) <span className="text-red-500">*</span>
                        </label>
                        {loadingSteps && (
                          <span className="text-[11px] text-orange-600 font-semibold animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping" />
                            Đang nạp quy trình các bước...
                          </span>
                        )}
                      </div>

                      {/* Dropdown chọn SubCategory gọn gàng, liền mạch giao diện */}
                      <div className="relative">
                        <select
                          value={selectedSubCategoryIds[0] || ''}
                          onChange={(e) => {
                            const scId = e.target.value;
                            if (scId) {
                              setSelectedSubCategoryIds([scId]);
                              loadStepsForReview(scId, selectedTicket);
                            }
                          }}
                          className="w-full bg-slate-50 hover:bg-slate-50/80 border border-slate-300 focus:border-orange-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-[12px] font-bold text-slate-800 outline-none transition-all cursor-pointer appearance-none pr-10 shadow-2xs"
                        >
                          <option value="">-- Chọn danh mục xử lý sự cố chuẩn --</option>
                          {allSubCategories.map((sc) => (
                            <option key={sc.subCategoryId} value={sc.subCategoryId}>
                              {sc.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                          ▼
                        </div>
                      </div>

                      {/* Hiển thị SubCategory đang chọn & mã gửi BE */}
                      {selectedSubCategoryIds.length > 0 && (
                        <div className="flex items-center justify-between text-[11px] bg-orange-50/60 border border-orange-200/80 rounded-xl px-3 py-2 text-orange-900">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-orange-600">✓ Đang chọn:</span>
                            <span>
                              {allSubCategories.find((s) => s.subCategoryId === selectedSubCategoryIds[0])?.name || selectedSubCategoryIds[0]}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md font-semibold">
                            {selectedSubCategoryIds[0].slice(0, 12)}...
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. Đánh dấu tình huống khẩn cấp (isLifeThreatening) - Toggle Card liền mạch */}
                    <div
                      onClick={() => setIsLifeThreatening(!isLifeThreatening)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${isLifeThreatening
                          ? 'bg-red-50/90 border-red-300 ring-1 ring-red-300'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${isLifeThreatening ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
                          }`}>
                          🚨
                        </div>
                        <div>
                          <span className={`text-[12px] font-bold block ${isLifeThreatening ? 'text-red-900' : 'text-slate-800'}`}>
                            Xác nhận tình huống khẩn cấp (isLifeThreatening)
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Ưu tiên phân công khẩn cấp, điều động lực lượng xử lý trong thời gian ngắn nhất
                          </span>
                        </div>
                      </div>

                      <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${isLifeThreatening ? 'bg-red-600' : 'bg-slate-200'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isLifeThreatening ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* 3. Ý kiến chỉ đạo / Ghi chú phê duyệt (reviewNote) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 shadow-xs">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                        Ý kiến chỉ đạo & Ghi chú phê duyệt (reviewNote)
                      </label>
                      <textarea
                        rows={2}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Ví dụ: Đã tiếp nhận và giao các cán bộ phụ trách xử lý khẩn cấp..."
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 text-[12px] font-medium text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
                      />
                    </div>

                    {/* 4. Quy trình thực hiện & Phân công cán bộ (steps & assigneeId) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[12px] font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                            <span>📋</span> Quy trình xử lý & Phân công cán bộ ({reviewSteps.length} bước)
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Hạn chót tự động tính theo công thức: <code className="font-mono text-orange-600 font-bold bg-orange-50 px-1 py-0.5 rounded">now + duration</code>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddReviewStep}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-[11px] font-extrabold text-orange-700 transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                        >
                          <span>+</span> Thêm bước
                        </button>
                      </div>

                      {/* Danh sách các bước */}
                      {reviewSteps.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                          Chưa có bước xử lý nào. Hãy bấm "+ Thêm bước" để thiết lập quy trình.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {reviewSteps.map((st, idx) => {
                            return (
                              <div
                                key={st.stepId || idx}
                                className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 space-y-3 shadow-2xs hover:border-orange-300 transition-all"
                              >
                                {/* Header của từng bước */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-xs">
                                      {idx + 1}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900">
                                      {st.stepName || `Bước ${idx + 1}`}
                                    </span>
                                    {st.duration && (
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                        ⏱️ {st.duration} giờ
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveReviewStep(idx, 'up')}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer text-xs"
                                      title="Đưa lên trước"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === reviewSteps.length - 1}
                                      onClick={() => handleMoveReviewStep(idx, 'down')}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer text-xs"
                                      title="Hạ xuống sau"
                                    >
                                      ▼
                                    </button>
                                    {reviewSteps.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveReviewStep(idx)}
                                        className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer text-xs ml-1"
                                        title="Xóa bước này"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Lựa chọn bước từ danh sách quy trình chuẩn của hệ thống nếu cần đổi */}
                                {allSystemSteps.length > 0 && (
                                  <div>
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block mb-1">
                                      Chọn bước quy trình (stepId) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      value={st.stepId}
                                      onChange={(e) => {
                                        const chosen = allSystemSteps.find((s) => s.stepId === e.target.value);
                                        if (chosen) {
                                          handleReviewStepFieldChange(idx, 'stepId', chosen.stepId);
                                          handleReviewStepFieldChange(idx, 'stepName', chosen.stepName);
                                          handleReviewStepFieldChange(idx, 'duration', chosen.duration || 24);
                                          handleReviewStepFieldChange(idx, 'notes', chosen.description || chosen.stepName);
                                        }
                                      }}
                                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 outline-none focus:border-orange-500"
                                    >
                                      <option value="">-- Chọn bước có sẵn trong hệ thống --</option>
                                      {allSystemSteps.map((s) => (
                                        <option key={s.stepId} value={s.stepId}>
                                          {s.stepName} (⏱️ {s.duration || 24}h)
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* Form cấu hình bước: Cán bộ phụ trách (assigneeId) & Ghi chú (notes) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Dropdown chọn cán bộ phụ trách */}
                                  <div>
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block mb-1">
                                      Cán bộ phụ trách (assigneeId) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      value={st.assigneeId}
                                      onChange={(e) =>
                                        handleReviewStepFieldChange(idx, 'assigneeId', e.target.value)
                                      }
                                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                    >
                                      <option value="">-- Chọn cán bộ tiếp nhận --</option>
                                      {staffList.map((staff) => (
                                        <option key={staff.userId || staff.email} value={staff.userId}>
                                          {staff.fullName} ({staff.departmentName || 'Cán bộ'})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Ghi chú bước */}
                                  <div>
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block mb-1">
                                      Ghi chú công việc (notes)
                                    </label>
                                    <input
                                      type="text"
                                      value={st.notes || ''}
                                      onChange={(e) =>
                                        handleReviewStepFieldChange(idx, 'notes', e.target.value)
                                      }
                                      placeholder="Ví dụ: Tiến hành khảo sát hiện trường trong 24h"
                                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-[11px] font-medium text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                    />
                                  </div>
                                </div>

                                {/* Step ID preview */}
                                <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
                                  <span className={`truncate max-w-[280px] ${isValidUuid(st.stepId) ? 'text-slate-400' : 'text-red-600 font-bold'}`}>
                                    {isValidUuid(st.stepId) ? `stepId: ${st.stepId}` : `⚠️ stepId không hợp lệ: "${st.stepId || 'chưa chọn'}"`}
                                  </span>
                                  <span className="text-slate-400">Thứ tự: {st.orderIndex || idx + 1}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CHẾ ĐỘ 2: TỪ CHỐI TIẾP NHẬN HỒ SƠ */}
              {modalView === 'reject' && (
                <div className="max-w-2xl mx-auto space-y-4 py-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-[13px] text-red-800 font-medium leading-relaxed flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="font-bold">Lưu ý khi từ chối hồ sơ phản ánh:</p>
                      <p className="text-[12px] text-red-700 mt-0.5">
                        Hồ sơ sẽ chuyển sang trạng thái <strong>TỪ CHỐI (REJECTED)</strong>. Hệ thống sẽ tự động gửi thông báo kèm lý do từ chối cụ thể đến ứng dụng của người dân.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-white border border-slate-200 rounded-2xl p-4.5">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                      Lý do từ chối tiếp nhận <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Nêu rõ lý do (ví dụ: Hình ảnh không rõ ràng, sự cố không thuộc phạm vi xử lý của cơ quan công cộng, phản ánh trùng lặp...)"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 text-[12px] text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-2xl p-4.5">
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block mb-1.5">
                        Kiến nghị danh mục đúng (nếu có)
                      </label>
                      <select
                        value={rejectCatId}
                        onChange={(e) => setRejectCatId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-[12px] text-slate-900 outline-none focus:border-orange-500"
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
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block mb-1.5">
                        Kiến nghị chuyển tiếp cơ quan khác
                      </label>
                      <select
                        value={rejectDeptId}
                        onChange={(e) => setRejectDeptId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-[12px] text-slate-900 outline-none focus:border-orange-500"
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
                <div className="space-y-4 max-w-3xl mx-auto py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900">
                        Quy trình các bước thực hiện hiện tại
                      </h4>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        Theo dõi tiến độ, phân bổ thứ tự và thiết lập hạn chót hoàn thành cho từng bước
                      </p>
                    </div>
                  </div>

                  {steps.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 text-[13px] space-y-1">
                      <p className="font-bold text-slate-700">Chưa có các bước xử lý nào được kích hoạt</p>
                      <p className="text-[12px] text-slate-400">
                        Hệ thống sẽ kích hoạt các bước xử lý ngay sau khi bạn bấm "Phê duyệt & Điều phối hồ sơ".
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
                            className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveStep(idx, 'up')}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer text-xs"
                                title="Đưa lên trên"
                              >
                                ▲
                              </button>
                              <span className="font-mono-cf text-[12px] font-bold text-slate-600 w-5 text-center">
                                {idx + 1}
                              </span>
                              <button
                                type="button"
                                disabled={idx === steps.length - 1}
                                onClick={() => handleMoveStep(idx, 'down')}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer text-xs"
                                title="Hạ xuống dưới"
                              >
                                ▼
                              </button>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-slate-900 truncate">
                                {st.stepName || `Bước ${idx + 1}`}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Cán bộ phụ trách: <span className="font-semibold text-slate-700">{st.assigneeName || 'Chưa phân công'}</span> · Trạng thái: {st.status || 'Chờ thực hiện'}
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
                                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] outline-none"
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
                                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono-cf text-[11px] text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
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
                                    className="px-2.5 py-1 text-[11px] font-semibold border border-slate-300 bg-white hover:bg-slate-50 rounded-lg cursor-pointer"
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

            {/* Modal Footer Hành Động - Sticky Liền Mạch */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/90 backdrop-blur flex items-center justify-between flex-shrink-0">
              {modalView === 'dispatch' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModalView('reject')}
                    className="px-4 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-[12px] font-bold transition-all cursor-pointer shadow-2xs hover:border-red-300"
                  >
                    ✕ Từ chối tiếp nhận
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleReviewSubmit}
                      className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[12px] uppercase tracking-wider transition-all shadow-md shadow-orange-600/25 disabled:opacity-60 cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <span>{submitting ? 'Đang điều phối...' : '✓ Phê duyệt & Điều phối hồ sơ'}</span>
                    </button>
                  </div>
                </>
              ) : modalView === 'reject' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModalView('dispatch')}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    ← Quay lại điều phối
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleRejectSubmit}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-[12px] uppercase tracking-wider transition-all shadow-md shadow-red-600/25 disabled:opacity-60 cursor-pointer active:scale-95"
                  >
                    {submitting ? 'Đang từ chối...' : 'Xác nhận từ chối hồ sơ'}
                  </button>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalView('dispatch')}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[12px] font-bold cursor-pointer shadow-2xs"
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

// Dữ liệu mẫu hồ sơ chờ duyệt (INITIATED) bám sát theo tài liệu BE
function getFallbackInitiatedTickets(): ManagerTicketItem[] {
  return [
    {
      id: 'ticket-oga-001',
      ticketId: 'ticket-oga-001',
      description: 'Ổ gà lớn giữa đường gây nguy hiểm cho người tham gia giao thông',
      address: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
      status: 'INITIATED',
      severity: 'HIGH',
      dangerLevel: 'DANGEROUS',
      categoryId: 'CAT001',
      categoryName: 'Hạ tầng giao thông',
      subCategoryId: 'sub-oga-001',
      subCategoryName: 'Ổ gà, sụt lún mặt đường',
      subCategories: [
        {
          id: 'sub-oga-001',
          subCategoryId: 'sub-oga-001',
          name: 'Ổ gà, sụt lún mặt đường',
        },
      ],
      isLifeThreatening: false,
      createdAt: '2026-10-15T09:30:00Z',
    },
    {
      id: 'ticket-ngap-002',
      ticketId: 'ticket-ngap-002',
      description: 'Cống thoát nước bị nghẹt rác gây ngập cục bộ sau mưa',
      address: '45 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
      status: 'INITIATED',
      severity: 'MEDIUM',
      dangerLevel: 'CAUTION',
      categoryId: 'CAT002',
      categoryName: 'Thoát nước & Ngập úng',
      subCategoryId: 'sub-cong-002',
      subCategoryName: 'Cống nghẹt, ứ đọng nước',
      subCategories: [
        {
          id: 'sub-cong-002',
          subCategoryId: 'sub-cong-002',
          name: 'Cống nghẹt, ứ đọng nước',
        },
      ],
      isLifeThreatening: false,
      createdAt: '2026-10-15T10:15:00Z',
    },
  ];
}

