import { useState, useEffect } from 'react';
import {
  priorityInfo,
} from '../data';
import {
  getManagerInitiatedTickets,
  reviewManagerTicket,
  rejectManagerTicket,
  getSuggestedDepartments,
  updateStepDeadline,
  updateTicketStepDeadlines,
  updateTicketStepStatus,
  deleteTicketStep,
  getTicketSteps,
  getTicketById,
  updateStepDependencies,
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
  onOpenTicket: (ticketOrId: any) => void;
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
  const [editingStepDeps, setEditingStepDeps] = useState<{
    stepId: string;
    stepName: string;
    dependsOnStepIds: string[];
  } | null>(null);

  // 6. Kết quả routing sau khi duyệt thành công
  const [routingResult, setRoutingResult] = useState<{
    ticketId: string;
    deptName: string;
    note?: string;
  } | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

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
        setTickets(list);
      } else {
        setTickets([]);
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
      let stepsList: any[] = [];
      if (stepsRes.status === 'fulfilled' && stepsRes.value) {
        const val: any = stepsRes.value;
        stepsList = Array.isArray(val)
          ? val
          : Array.isArray(val.data)
            ? val.data
            : Array.isArray(val.content)
              ? val.content
              : [];
      }

      // Fallback cho Manager nếu /api/v1/admin/steps bị 403 Forbidden:
      if (stepsList.length === 0 && subCatsRes.status === 'fulfilled' && Array.isArray(subCatsRes.value)) {
        try {
          const sampleSubCats = subCatsRes.value.slice(0, 15);
          const stepsPromises = sampleSubCats.map((sc: any) =>
            getStepsBySubCategory(sc.subCategoryId).catch(() => [])
          );
          const subCatStepsResults = await Promise.all(stepsPromises);
          const stepMap = new Map();
          subCatStepsResults.flat().forEach((st: any) => {
            if (st && st.stepId) stepMap.set(st.stepId, st);
          });
          stepsList = Array.from(stepMap.values());
        } catch (e) {
          console.warn('Lỗi tải fallback steps cho Manager:', e);
        }
      }

      if (stepsList.length > 0) {
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
  async function loadStepsForReview(subCatIdsInput: string[] | string, ticket?: ManagerTicketItem) {
    const ids = Array.isArray(subCatIdsInput) ? subCatIdsInput : [subCatIdsInput];
    const validIds = ids.filter((id) => isValidUuid(id));
    setLoadingSteps(true);
    try {
      let stepsFromApi: any[] = [];
      if (validIds.length > 0) {
        const stepResults = await Promise.all(
          validIds.map((id) => getStepsBySubCategory(id).catch(() => []))
        );
        stepsFromApi = stepResults.flat();
      }

      // Nếu API subcategory chưa có bước, thử lọc từ allSystemSteps theo subCategoryIds
      if (stepsFromApi.length === 0 && validIds.length > 0) {
        stepsFromApi = allSystemSteps.filter((st) => validIds.includes(st.subCategoryId || ''));
      }

      // Đồng bộ các bước này vào allSystemSteps để Manager có thể chọn khi thêm bước
      if (stepsFromApi && stepsFromApi.length > 0) {
        setAllSystemSteps((prev) => {
          const map = new Map(prev.map((s) => [s.stepId, s]));
          stepsFromApi.forEach((s) => {
            if (s && s.stepId) map.set(s.stepId, s);
          });
          return Array.from(map.values());
        });

        const formatted: ReviewStepItemPayload[] = stepsFromApi.map((st, idx) => ({
          stepId: st.stepId,
          stepName: st.stepName,
          duration: st.duration || 24,
          assigneeId: staffList[idx % Math.max(staffList.length, 1)]?.userId || '',
          dependsOnStepIds: idx === 0 ? [] : (stepsFromApi[idx - 1]?.stepId ? [stepsFromApi[idx - 1].stepId] : []),
          deadline: null,
          notes: st.description || st.stepName || '',
        }));
        setReviewSteps(formatted);
      } else if (ticket?.steps && ticket.steps.length > 0) {
        // Đồng bộ các bước từ vé vào allSystemSteps
        setAllSystemSteps((prev) => {
          const map = new Map(prev.map((s) => [s.stepId, s]));
          ticket.steps?.forEach((s: any) => {
            const sId = s.stepId || s.id;
            if (sId && isValidUuid(sId)) {
              map.set(sId, {
                stepId: sId,
                stepName: s.stepName,
                duration: s.duration || 24,
                description: s.notes || s.stepName,
              } as any);
            }
          });
          return Array.from(map.values());
        });

        const tSteps = ticket.steps;
        setReviewSteps(
          tSteps.map((st, idx) => ({
            stepId: st.stepId || st.id || '',
            stepName: st.stepName || `Bước ${idx + 1}`,
            duration: 24,
            assigneeId: st.assigneeId || staffList[idx % Math.max(staffList.length, 1)]?.userId || '',
            dependsOnStepIds: st.dependsOnStepIds || (idx === 0 ? [] : [tSteps[idx - 1]?.stepId || tSteps[idx - 1]?.id || '']),
            deadline: st.deadline || null,
            notes: st.notes || '',
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

  // Thêm một SubCategory phối hợp hỗ trợ giải quyết từ phòng ban khác
  async function handleAddSupportingSubCategory(subCatId: string) {
    if (!subCatId || !isValidUuid(subCatId)) return;
    if (selectedSubCategoryIds.includes(subCatId)) return;
    const newSelected = [...selectedSubCategoryIds, subCatId];
    setSelectedSubCategoryIds(newSelected);
    try {
      const extraSteps = await getStepsBySubCategory(subCatId);
      if (extraSteps && extraSteps.length > 0) {
        setAllSystemSteps((prev) => {
          const map = new Map(prev.map((s) => [s.stepId, s]));
          extraSteps.forEach((s) => {
            if (s && s.stepId) map.set(s.stepId, s);
          });
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn('Lỗi khi nạp bước cho danh mục phối hợp:', e);
    }
  }

  // Xóa bớt một SubCategory phối hợp
  function handleRemoveSupportingSubCategory(subCatId: string) {
    setSelectedSubCategoryIds((prev) => prev.filter((id) => id !== subCatId));
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
      currentCatId = categories[0]?.id || categories[0]?.categoryId || '';
    }

    const defaultDept = departments[0]?.departmentId || '';

    setReviewCatId(currentCatId);
    setTargetDeptId(defaultDept);
    setSelectedDeptIds(defaultDept ? [defaultDept] : []);
    setIsLifeThreatening(Boolean(ticket.isLifeThreatening));
    setReviewNote('');
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

    setSelectedSubCategoryIds(foundSubCatIds);

    // 3. Tải quy trình các bước của SubCategory (cả primary và secondary nếu có)
    await loadStepsForReview(foundSubCatIds.length > 0 ? foundSubCatIds : [''], ticket);

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
        setSuggestedDepts([]);
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
    // Tìm bước trong allSystemSteps chưa được sử dụng
    const usedStepIds = new Set(reviewSteps.map((s) => s.stepId).filter(Boolean));
    const unusedCandidate = allSystemSteps.find((s) => s.stepId && !usedStepIds.has(s.stepId));
    const candidate = unusedCandidate || allSystemSteps[nextIndex % Math.max(allSystemSteps.length, 1)] || allSystemSteps[0];

    // Mặc định phụ thuộc vào bước liền trước (nếu có)
    const prevStep = reviewSteps.length > 0 ? reviewSteps[reviewSteps.length - 1] : null;
    const defaultDependsOn = prevStep && prevStep.stepId && isValidUuid(prevStep.stepId) ? [prevStep.stepId] : [];

    if (!candidate || !candidate.stepId) {
      setFeedback({
        type: 'error',
        message: 'Lưu ý: Không tìm thấy thêm bước mẫu trong quy trình của danh mục này. Vui lòng chọn bước có sẵn hoặc liên hệ Admin cấu hình thêm.',
      });
    }

    setReviewSteps((prev) => [
      ...prev,
      {
        stepId: candidate?.stepId || '',
        stepName: candidate?.stepName || `Bước ${nextIndex}: Xử lý sự cố`,
        duration: candidate?.duration || 24,
        assigneeId: staffList[0]?.userId || '',
        dependsOnStepIds: defaultDependsOn,
        deadline: null,
        notes: candidate?.description || candidate?.stepName || '',
      },
    ]);
  }

  function handleRemoveReviewStep(index: number) {
    const removedStep = reviewSteps[index];
    setReviewSteps((prev) => {
      const remaining = prev.filter((_, i) => i !== index);
      if (removedStep?.stepId) {
        return remaining.map((s) => ({
          ...s,
          dependsOnStepIds: (s.dependsOnStepIds || []).filter((id) => id !== removedStep.stepId),
        }));
      }
      return remaining;
    });
  }

  function handleToggleReviewStepDependency(stepIndex: number, dependsOnStepId: string) {
    setReviewSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        const currentDeps = s.dependsOnStepIds || [];
        const exists = currentDeps.includes(dependsOnStepId);
        const newDeps = exists
          ? currentDeps.filter((id) => id !== dependsOnStepId)
          : [...currentDeps, dependsOnStepId];
        return { ...s, dependsOnStepIds: newDeps };
      })
    );
  }

  function handleSetReviewStepDependencyMode(stepIndex: number, mode: 'parallel' | 'sequential') {
    setReviewSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        if (mode === 'parallel') {
          return { ...s, dependsOnStepIds: [] };
        } else {
          // Tuần tự: phụ thuộc vào bước liền trước
          const prevStep = i > 0 ? prev[i - 1] : null;
          const prevId = prevStep?.stepId || '';
          return { ...s, dependsOnStepIds: prevId && isValidUuid(prevId) ? [prevId] : [] };
        }
      })
    );
  }

  function handleReviewStepFieldChange(
    index: number,
    field: keyof ReviewStepItemPayload,
    value: any
  ) {
    setReviewSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (field === 'stepName') {
          return { ...s, stepName: value, name: value, title: value, stepTitle: value };
        }
        return { ...s, [field]: value };
      })
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
          message: 'Vui lòng chọn lĩnh vực xử lý sự cố hợp lệ từ danh mục.',
        });
        return;
      }
    }

    // 2. Kiểm tra các bước xử lý
    if (reviewSteps.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Vui lòng thiết lập ít nhất 1 bước xử lý cho hồ sơ.',
      });
      return;
    }

    for (let i = 0; i < reviewSteps.length; i++) {
      const st = reviewSteps[i];
      if (!st.stepId || !isValidUuid(st.stepId)) {
        setFeedback({
          type: 'error',
          message: `Bước ${i + 1} (${st.stepName || ''}) chưa được chọn từ quy trình mẫu. Vui lòng chọn bước xử lý chuẩn.`,
        });
        return;
      }
      if (!st.assigneeId || !isValidUuid(st.assigneeId)) {
        setFeedback({
          type: 'error',
          message: `Vui lòng chỉ định Cán bộ phụ trách cho Bước ${i + 1} (${st.stepName || 'Xử lý'}).`,
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
    //     { "stepId": "...", "assigneeId": "...", "dependsOnStepIds": [...], "notes": "..." }
    //   ]
    // }
    const payload: ReviewTicketPayload = {
      isLifeThreatening: Boolean(isLifeThreatening),
      reviewNote: reviewNote.trim() || 'Đã tiếp nhận và giao các cán bộ phụ trách xử lý khẩn cấp',
      subCategoryIds: validSubCatIds,
      steps: reviewSteps.map((s, idx) => {
        const sName = s.stepName?.trim() || (s as any).name?.trim() || `Bước ${idx + 1}`;
        return {
          stepId: s.stepId.trim(),
          stepName: sName,
          name: sName,
          title: sName,
          stepTitle: sName,
          assigneeId: s.assigneeId.trim(),
          dependsOnStepIds: Array.isArray(s.dependsOnStepIds)
            ? s.dependsOnStepIds.filter((id) => isValidUuid(id))
            : [],
          deadline: s.deadline?.trim() ? s.deadline.trim() : null,
          notes: (s.notes?.trim() || sName || 'Tiến hành xử lý theo quy trình'),
        };
      }),
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

  // Fetch lại steps và ticket sau khi cập nhật để đồng bộ dữ liệu Backend mới nhất (không tự tính cascade ở FE)
  async function refreshTicketAndSteps(ticketId: string) {
    if (!ticketId) return;
    try {
      const [updatedSteps, updatedTicket] = await Promise.all([
        getTicketSteps(ticketId).catch(() => null),
        getTicketById(ticketId).catch(() => null),
      ]);
      if (updatedSteps && updatedSteps.length > 0) {
        setSteps(updatedSteps);
      }
      if (updatedTicket) {
        setSelectedTicket((prev) => (prev ? { ...prev, ...updatedTicket } : updatedTicket));
        setTickets((prev) =>
          prev.map((t) => ((t.id || t.ticketId) === ticketId ? { ...t, ...updatedTicket } : t))
        );
      }
    } catch (fetchErr) {
      console.warn('Lỗi khi fetch lại ticket và steps:', fetchErr);
    }
  }

  // 3. Cập nhật deadline cho bước
  async function handleUpdateStepDeadline(stepId: string, deadlineStr: string) {
    if (!selectedTicket || !stepId) return;
    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';
    try {
      await updateStepDeadline(stepId, { deadline: deadlineStr });
      setEditingStepDeadline(null);
      setFeedback({ type: 'success', message: 'Đã cập nhật thời hạn hoàn thành cho bước xử lý.' });
      await refreshTicketAndSteps(ticketId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Cập nhật thời hạn thất bại.' });
    }
  }

  // 3.1. Cập nhật trạng thái cho bước
  async function handleUpdateStepStatus(stepId: string, newStatus: string) {
    if (!selectedTicket || !stepId) return;
    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';
    const statusLabels: Record<string, string> = {
      PENDING: 'Chờ xử lý',
      IN_PROGRESS: 'Đang xử lý',
      RESOLVED: 'Đã giải quyết',
      COMPLETED: 'Hoàn thành',
      TRANSFERRED: 'Chuyển tiếp',
      CANCELLED: 'Đã hủy',
    };
    try {
      await updateTicketStepStatus(stepId, newStatus);
      setFeedback({ type: 'success', message: `Đã cập nhật trạng thái bước xử lý thành "${statusLabels[newStatus] || newStatus}".` });
      await refreshTicketAndSteps(ticketId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Cập nhật trạng thái bước thất bại.' });
    }
  }

  // 3.2. Xóa mềm bước
  async function handleDeleteStep(stepId: string) {
    if (!selectedTicket || !stepId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa bước xử lý này? Hệ thống sẽ tự động cập nhật lại thời hạn toàn bộ hồ sơ.')) return;
    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';
    try {
      await deleteTicketStep(stepId);
      setFeedback({ type: 'success', message: 'Đã xóa bước xử lý thành công.' });
      await refreshTicketAndSteps(ticketId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Xóa bước xử lý thất bại.' });
    }
  }

  // 4. Cập nhật thứ tự thực hiện các bước cho hồ sơ đã điều phối
  async function handleSaveStepDependencies(stepId: string, dependsOnStepIds: string[]) {
    if (!selectedTicket || !stepId) return;
    const ticketId = selectedTicket.id || selectedTicket.ticketId || '';
    try {
      await updateStepDependencies(stepId, { dependsOnStepIds });
      setEditingStepDeps(null);
      setFeedback({ type: 'success', message: 'Đã cập nhật thứ tự thực hiện các bước thành công.' });
      await refreshTicketAndSteps(ticketId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Cập nhật thứ tự bước thất bại.' });
    }
  }

  // Lọc vé
  const filteredTickets = tickets.filter((t) => {
    if (priorityFilter !== 'all') {
      const p = (t.priority || t.subCategories?.[0]?.priority || '').toUpperCase();
      if (p !== priorityFilter.toUpperCase()) return false;
    }
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
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 font-medium outline-none cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <option value="all">Tất cả độ ưu tiên</option>
          <option value="CRITICAL">Khẩn cấp</option>
          <option value="HIGH">Ưu tiên cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>
      </div>

      {/* Bảng hồ sơ chờ duyệt */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[850px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                {['MÃ HỒ SƠ', 'DANH MỤC', 'ĐỊA CHỈ HIỆN TRƯỜNG', 'ĐỘ ƯU TIÊN', 'THỜI GIAN TIẾP NHẬN', 'THAO TÁC'].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
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
                      {(() => {
                        const pi = priorityInfo(t.priority || t.subCategories?.[0]?.priority);
                        return (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${pi.cls}`}>
                            {pi.label}
                          </span>
                        );
                      })()}
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
                          onClick={() => onOpenTicket(t)}
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

                      {/* Đánh giá độ ưu tiên */}
                      <div className="pt-0.5">
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Độ ưu tiên</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border inline-block ${priorityInfo(selectedTicket.priority || selectedTicket.subCategories?.[0]?.priority).cls}`}>
                            {priorityInfo(selectedTicket.priority || selectedTicket.subCategories?.[0]?.priority).label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CỘT PHẢI (7/12): THIẾT LẬP ĐIỀU PHỐI VÀ QUY TRÌNH THỰC HIỆN */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* 1. Lựa chọn Phân loại danh mục sự cố & Đơn vị phụ trách */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="text-orange-500">🏷️</span> Phân loại sự cố & Đơn vị phụ trách <span className="text-red-500">*</span>
                        </label>
                        {loadingSteps && (
                          <span className="text-[11px] text-orange-600 font-semibold animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping" />
                            Đang nạp quy trình các bước...
                          </span>
                        )}
                      </div>

                      {/* 1.1. Đơn vị chủ trì xử lý (Danh mục chính) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Đơn vị chủ trì xử lý (Danh mục chính) <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400">Phòng ban chịu trách nhiệm chính</span>
                        </div>
                        <div className="relative">
                          <select
                            value={selectedSubCategoryIds[0] || ''}
                            onChange={(e) => {
                              const scId = e.target.value;
                              if (scId) {
                                const remaining = selectedSubCategoryIds.slice(1).filter((id) => id !== scId);
                                const newIds = [scId, ...remaining];
                                setSelectedSubCategoryIds(newIds);
                                loadStepsForReview(newIds, selectedTicket);
                              }
                            }}
                            className="w-full bg-slate-50 hover:bg-slate-50/80 border border-slate-300 focus:border-orange-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-[12px] font-bold text-slate-800 outline-none transition-all cursor-pointer appearance-none pr-10 shadow-2xs"
                          >
                            <option value="">-- Chọn danh mục xử lý sự cố chuẩn --</option>
                            {allSubCategories.map((sc) => {
                              const catName = categories.find((c) => (c.id || c.categoryId) === sc.categoryId)?.name;
                              return (
                                <option key={sc.subCategoryId} value={sc.subCategoryId}>
                                  {sc.name} {catName ? `(${catName})` : ''}
                                </option>
                              );
                            })}
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                            ▼
                          </div>
                        </div>
                      </div>

                      {/* 1.2. Đơn vị phối hợp hỗ trợ (Danh mục bổ sung) */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                            <span>🤝</span> Đơn vị phối hợp hỗ trợ ({selectedSubCategoryIds.length > 1 ? selectedSubCategoryIds.length - 1 : 0})
                          </label>
                          <span className="text-[10px] text-slate-400">Điều phối liên phòng ban</span>
                        </div>

                        {/* Danh sách danh mục phối hợp đã thêm */}
                        {selectedSubCategoryIds.slice(1).map((subId) => {
                          const scInfo = allSubCategories.find((s) => s.subCategoryId === subId);
                          const catName = scInfo ? categories.find((c) => (c.id || c.categoryId) === scInfo.categoryId)?.name : '';
                          return (
                            <div
                              key={subId}
                              className="flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-xl px-3 py-1.5 text-xs text-blue-900"
                            >
                              <div className="flex items-center gap-1.5 font-bold truncate pr-2">
                                <span className="text-blue-600">✓</span>
                                <span className="truncate">{scInfo?.name || subId}</span>
                                {catName && (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 font-normal px-1.5 py-0.5 rounded">
                                    {catName}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSupportingSubCategory(subId)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer flex-shrink-0"
                                title="Bỏ đơn vị phối hợp này"
                              >
                                ✕ Bỏ chọn
                              </button>
                            </div>
                          );
                        })}

                        {/* Select thêm danh mục phối hợp mới */}
                        <div className="relative">
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddSupportingSubCategory(e.target.value);
                              }
                            }}
                            className="w-full bg-white hover:bg-blue-50/30 border border-dashed border-blue-300 focus:border-blue-500 rounded-xl px-3 py-2 text-[11px] font-semibold text-blue-700 outline-none transition-all cursor-pointer appearance-none pr-8"
                          >
                            <option value="">+ Thêm danh mục phối hợp (Chọn để phòng ban khác cùng tham gia giải quyết)...</option>
                            {allSubCategories
                              .filter((sc) => !selectedSubCategoryIds.includes(sc.subCategoryId))
                              .map((sc) => {
                                const catName = categories.find((c) => (c.id || c.categoryId) === sc.categoryId)?.name;
                                return (
                                  <option key={sc.subCategoryId} value={sc.subCategoryId}>
                                    + {sc.name} {catName ? `(${catName})` : ''}
                                  </option>
                                );
                              })}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400 text-[10px]">
                            ▼
                          </div>
                        </div>
                      </div>

                      {/* Hiển thị tổng kết các danh mục đang chọn */}
                      {selectedSubCategoryIds.length > 0 && (
                        <div className="flex items-center justify-between text-[11px] bg-orange-50/60 border border-orange-200/80 rounded-xl px-3 py-2 text-orange-900">
                          <div className="flex items-center gap-1.5 font-bold truncate pr-2">
                            <span className="text-orange-600">✓ Tổng {selectedSubCategoryIds.length} lĩnh vực:</span>
                            <span className="truncate">
                              {selectedSubCategoryIds.map((id) => allSubCategories.find((s) => s.subCategoryId === id)?.name || id.slice(0, 8)).join(', ')}
                            </span>
                          </div>
                          <span className="text-[10px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md font-semibold flex-shrink-0">
                            {selectedSubCategoryIds.length} phòng ban cùng xử lý
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. Đánh dấu tình huống khẩn cấp - Thẻ chọn trực quan */}
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
                            Xác nhận tình huống khẩn cấp (Nguy hiểm đến an toàn / Tính mạng)
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

                    {/* 3. Ý kiến chỉ đạo & Ghi chú tiếp nhận */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 shadow-xs">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                        Ý kiến chỉ đạo & Ghi chú tiếp nhận
                      </label>
                      <textarea
                        rows={2}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Ví dụ: Đã tiếp nhận và giao các cán bộ phụ trách xử lý khẩn cấp..."
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 text-[12px] font-medium text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
                      />
                    </div>

                    {/* 4. Quy trình xử lý & Phân công cán bộ */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[12px] font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                            <span>📋</span> Quy trình xử lý & Phân công cán bộ ({reviewSteps.length} bước)
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Mỗi bước có thể bắt đầu ngay từ đầu (chạy song song) hoặc chờ bước khác làm xong trước.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddReviewStep}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-[11px] font-extrabold text-orange-700 transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                        >
                          <span>+</span> Thêm bước mới
                        </button>
                      </div>

                      {/* SƠ ĐỒ TRỰC QUAN TÓM TẮT TRÌNH TỰ CÁC BƯỚC */}
                      {reviewSteps.length > 1 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                              <span>🗺️</span> Sơ đồ trình tự thực hiện:
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {reviewSteps.filter((s) => !s.dependsOnStepIds || s.dependsOnStepIds.length === 0).length} bước khởi đầu ngay
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                            {reviewSteps.map((st, i) => {
                              const isParallel = !st.dependsOnStepIds || st.dependsOnStepIds.length === 0;
                              return (
                                <div key={st.stepId || i} className="flex items-center gap-1.5 flex-shrink-0">
                                  {i > 0 && (
                                    <span className="text-slate-400 font-bold text-[11px]">
                                      {isParallel ? '||' : '➔'}
                                    </span>
                                  )}
                                  <div
                                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 shadow-2xs ${
                                      isParallel
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                        : 'bg-purple-50 border-purple-300 text-purple-900'
                                    }`}
                                  >
                                    <span
                                      className={`w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
                                        isParallel ? 'bg-emerald-600' : 'bg-purple-600'
                                      }`}
                                    >
                                      {i + 1}
                                    </span>
                                    <span className="max-w-[110px] truncate">{st.stepName || `Bước ${i + 1}`}</span>
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-white/80 font-normal">
                                      {isParallel ? 'Chạy ngay' : 'Chờ bước trước'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Danh sách các bước */}
                      {reviewSteps.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                          Chưa có bước xử lý nào. Hãy bấm "+ Thêm bước mới" để thiết lập quy trình.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {reviewSteps.map((st, idx) => {
                            const isParallel = !st.dependsOnStepIds || st.dependsOnStepIds.length === 0;
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
                                        ⏱️ Dự kiến: {st.duration} giờ
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {reviewSteps.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveReviewStep(idx)}
                                        className="p-1 px-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 cursor-pointer text-xs font-bold transition-colors"
                                        title="Xóa bước này khỏi quy trình"
                                      >
                                        ✕ Xóa bước
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Lựa chọn bước quy trình mẫu & Tự điền / Tùy chỉnh tên bước */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Cột 1: Mẫu bước quy trình chuẩn */}
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                                        Chọn mẫu quy trình chuẩn <span className="text-red-500">*</span>
                                      </label>
                                      {!isValidUuid(st.stepId) && (
                                        <span className="text-[10px] font-bold text-red-600">
                                          ⚠️ Cần chọn bước
                                        </span>
                                      )}
                                    </div>
                                    <select
                                      value={st.stepId || ''}
                                      onChange={(e) => {
                                        const chosen = allSystemSteps.find((s) => s.stepId === e.target.value);
                                        if (chosen) {
                                          handleReviewStepFieldChange(idx, 'stepId', chosen.stepId);
                                          handleReviewStepFieldChange(idx, 'stepName', chosen.stepName);
                                          handleReviewStepFieldChange(idx, 'duration', chosen.duration || 24);
                                          handleReviewStepFieldChange(idx, 'notes', chosen.description || chosen.stepName);
                                        } else {
                                          handleReviewStepFieldChange(idx, 'stepId', e.target.value);
                                        }
                                      }}
                                      className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 outline-none transition-colors cursor-pointer ${
                                        !isValidUuid(st.stepId)
                                          ? 'border-red-400 bg-red-50/20 focus:border-red-500 ring-1 ring-red-200'
                                          : 'border-slate-300 focus:border-orange-500'
                                      }`}
                                    >
                                      <option value="">-- Chọn bước có sẵn trong quy trình (*) --</option>
                                      {allSystemSteps.map((s) => (
                                        <option key={s.stepId} value={s.stepId}>
                                          {s.stepName} (⏱️ {s.duration || 24} giờ)
                                        </option>
                                      ))}
                                    </select>
                                    {allSystemSteps.length === 0 && (
                                      <p className="text-[10px] text-amber-600 mt-1">
                                        ⚠️ Chưa có bước mẫu được tải từ hệ thống.
                                      </p>
                                    )}
                                  </div>

                                  {/* Cột 2: Tên bước xử lý thực tế */}
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                                        Tên bước thực tế (Tự sửa nếu cần) <span className="text-red-500">*</span>
                                      </label>
                                      <span className="text-[10px] text-slate-400">Có thể chỉnh sửa</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={st.stepName || ''}
                                      onChange={(e) => {
                                        const newName = e.target.value;
                                        setReviewSteps((prev) =>
                                          prev.map((s, i) => {
                                            if (i !== idx) return s;
                                            const shouldSyncNotes = !s.notes || s.notes === s.stepName;
                                            return {
                                              ...s,
                                              stepName: newName,
                                              name: newName,
                                              title: newName,
                                              stepTitle: newName,
                                              ...(shouldSyncNotes ? { notes: newName } : {}),
                                            };
                                          })
                                        );
                                      }}
                                      placeholder="Nhập tên bước xử lý thực tế..."
                                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                    />
                                  </div>
                                </div>

                                {/* Form cấu hình bước: Cán bộ phụ trách & Nội dung chi tiết */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Dropdown chọn cán bộ phụ trách */}
                                  <div>
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block mb-1">
                                      Cán bộ phụ trách thực hiện <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      value={st.assigneeId}
                                      onChange={(e) =>
                                        handleReviewStepFieldChange(idx, 'assigneeId', e.target.value)
                                      }
                                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                    >
                                      <option value="">-- Chọn cán bộ tiếp nhận công việc --</option>
                                      {staffList.map((staff) => (
                                        <option key={staff.userId || staff.email} value={staff.userId}>
                                          {staff.fullName} ({staff.departmentName || 'Cán bộ'})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Ghi chú nội dung công việc */}
                                  <div>
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block mb-1">
                                      Nội dung yêu cầu công việc
                                    </label>
                                    <input
                                      type="text"
                                      value={st.notes || ''}
                                      onChange={(e) =>
                                        handleReviewStepFieldChange(idx, 'notes', e.target.value)
                                      }
                                      placeholder="Ví dụ: Tiến hành kiểm tra và khảo sát hiện trường..."
                                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-[11px] font-medium text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                    />
                                  </div>

                                  {/* Hạn chót bước tùy chọn (Hệ thống tự tính nếu để trống) */}
                                  <div className="col-span-1 md:col-span-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                                        Thời hạn hoàn thành riêng cho bước này (Tùy chọn)
                                      </label>
                                      <span className="text-[10px] text-slate-400">
                                        Để trống: Hệ thống tự động tính theo thời lượng ({st.duration || 24} giờ)
                                      </span>
                                    </div>
                                    <input
                                      type="datetime-local"
                                      value={st.deadline || ''}
                                      onChange={(e) =>
                                        handleReviewStepFieldChange(idx, 'deadline', e.target.value || null)
                                      }
                                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                    />
                                  </div>
                                </div>

                                {/* LOGIC ĐIỀU PHỐI BƯỚC: BẮT ĐẦU KHI NÀO? (CỰC KỲ DỄ HIỂU, 100% TIẾNG VIỆT) */}
                                <div className="p-3 bg-white border border-slate-200/90 rounded-xl space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                      <span>⚡</span> Thời điểm kích hoạt bước này:
                                    </label>
                                    <span className="text-[10px] text-slate-400">
                                      {isParallel ? 'Chạy song song ngay' : `Chờ hoàn tất ${st.dependsOnStepIds?.length || 0} bước`}
                                    </span>
                                  </div>

                                  {/* 2 Thẻ chọn chế độ thực hiện to, rõ */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {/* Lựa chọn 1: Bắt đầu ngay từ đầu */}
                                    <div
                                      onClick={() => handleSetReviewStepDependencyMode(idx, 'parallel')}
                                      className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                                        isParallel
                                          ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-200 shadow-2xs'
                                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`step-mode-${idx}`}
                                        checked={isParallel}
                                        onChange={() => handleSetReviewStepDependencyMode(idx, 'parallel')}
                                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                      <div>
                                        <span className="text-[11px] font-bold text-slate-900 block">
                                          🟢 Bắt đầu ngay từ đầu
                                        </span>
                                        <span className="text-[10px] text-slate-500 block mt-0.5 leading-snug">
                                          Chạy song song, cán bộ có thể bắt đầu làm việc ngay khi hồ sơ được tiếp nhận.
                                        </span>
                                      </div>
                                    </div>

                                    {/* Lựa chọn 2: Chờ bước khác hoàn thành trước */}
                                    <div
                                      onClick={() => {
                                        if (isParallel) {
                                          handleSetReviewStepDependencyMode(idx, 'sequential');
                                        }
                                      }}
                                      className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                                        !isParallel
                                          ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-200 shadow-2xs'
                                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`step-mode-${idx}`}
                                        checked={!isParallel}
                                        onChange={() => {
                                          if (isParallel) {
                                            handleSetReviewStepDependencyMode(idx, 'sequential');
                                          }
                                        }}
                                        className="mt-0.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                      />
                                      <div>
                                        <span className="text-[11px] font-bold text-slate-900 block">
                                          🟡 Chờ bước khác làm xong trước
                                        </span>
                                        <span className="text-[10px] text-slate-500 block mt-0.5 leading-snug">
                                          Chỉ bắt đầu khi các bước được chỉ định dưới đây đã hoàn thành xong.
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Khi chọn Chờ bước khác: Cho tích chọn các bước tiên quyết */}
                                  {!isParallel && (
                                    <div className="pt-2 border-t border-purple-100 bg-purple-50/40 -mx-3 -mb-3 p-3 rounded-b-xl space-y-1.5">
                                      <span className="text-[10px] font-bold text-purple-900 block">
                                        Tích chọn các bước bắt buộc phải hoàn thành xong trước khi bắt đầu bước này:
                                      </span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {reviewSteps.map((otherStep, otherIdx) => {
                                          if (otherIdx === idx) return null;
                                          const otherId = otherStep.stepId;
                                          const isChecked = Boolean(otherId && st.dependsOnStepIds?.includes(otherId));
                                          return (
                                            <label
                                              key={otherId || otherIdx}
                                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                                                isChecked
                                                  ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold shadow-2xs'
                                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                disabled={!otherId || !isValidUuid(otherId)}
                                                onChange={() => {
                                                  if (otherId && isValidUuid(otherId)) {
                                                    handleToggleReviewStepDependency(idx, otherId);
                                                  }
                                                }}
                                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                              />
                                              <span>Bước {otherIdx + 1}: {otherStep.stepName || 'Xử lý'}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Tóm tắt trạng thái bước bằng tiếng Việt thân thiện */}
                                <div className="flex items-center justify-between text-[11px] pt-0.5">
                                  <span className="text-slate-500 font-medium">
                                    Thứ tự hiển thị: Bước {idx + 1}
                                  </span>
                                  <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                                    isParallel
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                                  }`}>
                                    {isParallel
                                      ? '🟢 Bắt đầu ngay từ đầu'
                                      : `🟡 Chờ hoàn tất: ${st.dependsOnStepIds?.map(dId => {
                                          const foundIdx = reviewSteps.findIndex(r => r.stepId === dId);
                                          return foundIdx >= 0 ? `Bước ${foundIdx + 1}` : 'Bước trước';
                                        }).join(', ')}`}
                                  </span>
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
                        Hồ sơ sẽ chuyển sang trạng thái <strong>TỪ CHỐI TIẾP NHẬN</strong>. Hệ thống sẽ tự động gửi thông báo kèm lý do từ chối cụ thể đến ứng dụng của người dân.
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

                  {/* Hiển thị hạn chót hoàn thành toàn bộ hồ sơ */}
                  <div className="flex items-center justify-between p-3.5 bg-orange-50/80 border border-orange-200 rounded-xl text-xs">
                    <div>
                      <span className="font-bold text-orange-950">Thời hạn hoàn thành toàn bộ hồ sơ: </span>
                      <span className="font-mono-cf font-extrabold text-orange-700 ml-1">
                        {selectedTicket.deadline ? selectedTicket.deadline.replace('T', ' ').slice(0, 16) : 'Chưa thiết lập (tính theo các bước)'}
                      </span>
                    </div>
                    <span className="text-[11px] text-orange-600">
                      Hệ thống tự động cập nhật lại thời hạn khi các bước thay đổi hoặc được điều chỉnh
                    </span>
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
                        const stepInstanceId = st.id || (st as any).ticketStepId || (st as any).stepInstanceId || st.stepId || '';
                        const stepId = stepInstanceId || `step-${idx}`;
                        const isEditingDeadline = editingStepDeadline?.stepId === stepInstanceId;
                        return (
                          <div
                            key={stepId}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors space-y-2.5"
                          >
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {idx + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-bold text-slate-900 truncate">
                                    {st.stepName || `Bước ${idx + 1}`}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-[11px] text-slate-500">
                                      Cán bộ: <span className="font-semibold text-slate-700">{st.assigneeName || 'Chưa phân công'}</span>
                                    </span>
                                    {st.dependsOnStepIds && st.dependsOnStepIds.length > 0 ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                        🔗 Phụ thuộc ({st.dependsOnStepIds.length} bước)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        ⚡ Chạy song song
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap ml-auto">
                                {/* Trạng thái step (PUT /api/v1/manager/tickets/steps/{stepId}/status?status=...) */}
                                <select
                                  value={st.status || 'PENDING'}
                                  onChange={(e) => handleUpdateStepStatus(stepInstanceId, e.target.value)}
                                  disabled={!stepInstanceId}
                                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none hover:border-orange-500 cursor-pointer disabled:opacity-50"
                                  title="Cập nhật trạng thái bước"
                                >
                                  <option value="PENDING">Chờ xử lý</option>
                                  <option value="IN_PROGRESS">Đang xử lý (Yêu cầu làm lại)</option>
                                  <option value="RESOLVED">Đã giải quyết (Chờ duyệt)</option>
                                  <option value="COMPLETED">Hoàn thành (Duyệt bước)</option>
                                  <option value="TRANSFERRED">Chuyển tiếp</option>
                                  <option value="CANCELLED">Hủy bước</option>
                                </select>

                                {/* Cập nhật bước phụ thuộc DAG (PUT /api/v1/manager/tickets/steps/{stepId}/dependencies) */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingStepDeps({
                                      stepId: stepInstanceId,
                                      stepName: st.stepName || `Bước ${idx + 1}`,
                                      dependsOnStepIds: st.dependsOnStepIds || [],
                                    })
                                  }
                                  className="px-2.5 py-1 text-[11px] font-semibold border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-700 rounded-lg cursor-pointer transition-colors"
                                  title="Thiết lập thứ tự thực hiện"
                                >
                                  🔗 Thứ tự
                                </button>

                                {/* Chỉnh sửa deadline */}
                                {isEditingDeadline && editingStepDeadline ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="datetime-local"
                                      value={editingStepDeadline.deadline}
                                      onChange={(e) =>
                                        setEditingStepDeadline({
                                          stepId: editingStepDeadline.stepId,
                                          deadline: e.target.value,
                                        })
                                      }
                                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStepDeadline(stepInstanceId, editingStepDeadline.deadline)}
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
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono-cf text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                      {st.deadline ? st.deadline.replace('T', ' ') : 'Chưa có hạn chót'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingStepDeadline({
                                          stepId: stepInstanceId,
                                          deadline: st.deadline ? st.deadline.slice(0, 16) : '',
                                        })
                                      }
                                      className="px-2.5 py-1 text-[11px] font-semibold border border-slate-300 bg-white hover:bg-slate-50 rounded-lg cursor-pointer"
                                    >
                                      Đổi hạn
                                    </button>
                                  </div>
                                )}

                                {/* Xóa bước */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStep(stepInstanceId)}
                                  disabled={!stepInstanceId}
                                  className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg cursor-pointer disabled:opacity-50"
                                  title="Xóa bước này (Hệ thống sẽ tự động cập nhật lại thời hạn)"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>

                            {/* Cửa sổ sửa thứ tự thực hiện cho bước này */}
                            {editingStepDeps && editingStepDeps.stepId === stepInstanceId && (
                              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 mt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-purple-900">
                                    Cập nhật bước tiên quyết cho: <span className="underline">{editingStepDeps.stepName}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingStepDeps({
                                        ...editingStepDeps,
                                        dependsOnStepIds: [],
                                      })
                                    }
                                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer"
                                  >
                                    ⚡ Bắt đầu ngay (Không chờ bước nào)
                                  </button>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-500 block">
                                    Tích chọn các bước phải hoàn thành trước khi bước này có thể bắt đầu:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {steps
                                      .filter((other) => (other.id || other.stepId) !== stepInstanceId)
                                      .map((other, oIdx) => {
                                        const otherId = other.id || other.stepId || '';
                                        const isChecked = editingStepDeps.dependsOnStepIds.includes(otherId);
                                        return (
                                          <label
                                            key={otherId || oIdx}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                                              isChecked
                                                ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                const nextDeps = isChecked
                                                  ? editingStepDeps.dependsOnStepIds.filter((id) => id !== otherId)
                                                  : [...editingStepDeps.dependsOnStepIds, otherId];
                                                setEditingStepDeps({
                                                  ...editingStepDeps,
                                                  dependsOnStepIds: nextDeps,
                                                });
                                              }}
                                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                            />
                                            <span>{other.stepName || `Bước ${oIdx + 1}`}</span>
                                          </label>
                                        );
                                      })}
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-purple-200/60">
                                  <button
                                    type="button"
                                    onClick={() => setEditingStepDeps(null)}
                                    className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveStepDependencies(stepInstanceId, editingStepDeps.dependsOnStepIds)}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold cursor-pointer shadow-xs"
                                  >
                                    Lưu thứ tự thực hiện
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Bằng chứng đã có của bước */}
                            {st.evidences && st.evidences.length > 0 && (
                              <div className="pt-2 border-t border-slate-200/60">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                                  📎 Bằng chứng nghiệm thu ({st.evidences.length} ảnh):
                                </span>
                                <div className="flex gap-2 flex-wrap">
                                  {st.evidences.map((ev, i) => (
                                    <div
                                      key={ev.evidenceId || i}
                                      className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs"
                                    >
                                      <img src={ev.imageUrl} alt="Bằng chứng" className="w-full h-full object-cover" />
                                      {ev.resolutionNote && (
                                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[8px] text-white overflow-hidden leading-tight flex items-center justify-center text-center">
                                          {ev.resolutionNote}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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

