import { useState, useEffect } from 'react';
import { User, getCat, getDept, statusInfo, sevInfo, priorityInfo } from '../data';
import {
  StaffTicketItem,
  StaffTicketStepEvidence,
  forwardStaffTicket,
  rejectStaffTicket,
  updateStaffTicketStatus,
  submitStaffEvidence,
  getStaffTicketSteps,
  getDepartments,
  DepartmentItem,
  getAdminCategories,
  AdminCategory,
  ApiError,
} from '../services';

interface Props {
  ticket: StaffTicketItem | any;
  currentUser: User;
  onBack: () => void;
}

export default function StaffTicketDetail({ ticket: initialTicket, currentUser, onBack }: Props) {
  const [ticket, setTicket] = useState<StaffTicketItem>(initialTicket);
  const ticketId = ticket.id || ticket.ticketId || '';

  // Lists for dropdowns
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);

  // Modals state
  const [modalType, setModalType] = useState<'forward' | 'reject' | 'evidence' | 'status' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 2. Forward Form
  const [forwardDeptId, setForwardDeptId] = useState('');
  const [forwardCatId, setForwardCatId] = useState(ticket.categoryId || '');
  const [forwardReason, setForwardReason] = useState('');

  // 3. Reject Form
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDeptId, setRejectDeptId] = useState('');
  const [rejectCatId, setRejectCatId] = useState('');

  // 4. Status Form
  const [newStatus, setNewStatus] = useState<string>(ticket.status || 'IN_PROGRESS');
  const [statusNote, setStatusNote] = useState('');
  const [statusStepId, setStatusStepId] = useState('');

  // 5. Evidence Form
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [resolutionNote, setResolutionNote] = useState('');
  const [selectedStepId, setSelectedStepId] = useState('');

  // Zoom image
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  // Timeline / Evidences list
  const [evidencesList, setEvidencesList] = useState<StaffTicketStepEvidence[]>([]);

  useEffect(() => {
    async function loadAuxData() {
      try {
        const [deptRes, catRes] = await Promise.allSettled([
          getDepartments(),
          getAdminCategories(),
        ]);

        if (deptRes.status === 'fulfilled' && deptRes.value) {
          const dList = Array.isArray(deptRes.value) ? deptRes.value : (deptRes.value as any).content || [];
          setDepartments(dList);
        }

        if (catRes.status === 'fulfilled' && catRes.value) {
          setCategories(catRes.value);
        }
      } catch (err) {
        console.warn('Lỗi tải dữ liệu phụ trợ cho StaffTicketDetail:', err);
      }
    }

    loadAuxData();

    // Fetch steps if missing, or extract any existing evidences from steps
    async function initStepsAndEvidences() {
      let currentSteps = ticket.steps;
      if ((!currentSteps || currentSteps.length === 0) && ticketId) {
        try {
          const fetched = await getStaffTicketSteps(ticketId);
          if (fetched && fetched.length > 0) {
            currentSteps = fetched;
            setTicket((prev) => ({ ...prev, steps: fetched }));
          }
        } catch (e) {
          console.warn('Lỗi tải danh sách steps cho vé:', e);
        }
      }

      if (currentSteps && currentSteps.length > 0) {
        const allEv: StaffTicketStepEvidence[] = [];
        currentSteps.forEach((st) => {
          if (st.evidences && st.evidences.length > 0) {
            allEv.push(...st.evidences);
          }
        });
        setEvidencesList(allEv);
      }
    }

    initStepsAndEvidences();
  }, [ticketId, currentUser.departmentId]);

  // Clean previews on unmount
  useEffect(() => {
    return () => {
      evidencePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [evidencePreviews]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setEvidenceFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setEvidencePreviews((prev) => [...prev, ...newPreviews]);
  }

  function handleRemoveFile(index: number) {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(evidencePreviews[index]);
    setEvidencePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function openEvidenceModal() {
    const defaultStep =
      ticket.steps?.find((s) => s.status === 'IN_PROGRESS' || s.status === 'ASSIGNED' || s.status === 'PENDING') ||
      ticket.steps?.[0];
    if (defaultStep) {
      setSelectedStepId(defaultStep.id || defaultStep.stepId || '');
    }
    setModalType('evidence');
  }

  // API 2: Chuyển giao vé (Forward)
  async function handleForwardSubmit() {
    if (!forwardReason.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập lý do chuyển giao.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        reason: forwardReason.trim(),
        suggestedDepartmentId: forwardDeptId || undefined,
        suggestedCategoryId: forwardCatId || undefined,
      };
      const updated = await forwardStaffTicket(ticketId, payload);
      setTicket((prev) => ({
        ...prev,
        ...updated,
        departmentId: forwardDeptId || prev.departmentId,
        departmentName: departments.find((d) => d.departmentId === forwardDeptId)?.name || prev.departmentName,
      }));
      setFeedback({ type: 'success', message: 'Đã chuyển giao hồ sơ sang cơ quan khác!' });
      setModalType(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Chuyển giao thất bại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // API 3: Từ chối hồ sơ
  async function handleRejectSubmit() {
    if (!rejectReason.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập lý do từ chối hồ sơ.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        reason: rejectReason.trim(),
        suggestedDepartmentId: rejectDeptId || undefined,
        suggestedCategoryId: rejectCatId || undefined,
      };
      const updated = await rejectStaffTicket(ticketId, payload);
      setTicket((prev) => ({
        ...prev,
        ...updated,
        status: 'REJECTED',
      }));
      setFeedback({ type: 'success', message: 'Đã từ chối tiếp nhận hồ sơ.' });
      setModalType(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Từ chối hồ sơ thất bại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  function openStatusModal(target?: string) {
    if (target) {
      setNewStatus(target);
    }
    const activeStep =
      ticket.steps?.find((s) => s.status === 'IN_PROGRESS' || s.status === 'ASSIGNED' || s.status === 'PENDING') ||
      ticket.steps?.[0];
    if (activeStep) {
      setStatusStepId(activeStep.id || activeStep.stepId || '');
    }
    setModalType('status');
  }

  // API 4: Cập nhật trạng thái
  async function handleStatusSubmit(target?: string) {
    const statusToSet = target || newStatus;
    setSubmitting(true);
    setFeedback(null);
    try {
      const activeStepId =
        statusStepId ||
        ticket.steps?.find((s) => s.status === 'IN_PROGRESS' || s.status === 'ASSIGNED' || s.status === 'PENDING')?.id ||
        ticket.steps?.[0]?.id ||
        ticket.steps?.[0]?.stepId;

      const updated = await updateStaffTicketStatus(ticketId, statusToSet, statusNote, activeStepId);
      setTicket((prev) => ({
        ...prev,
        ...updated,
        status: statusToSet,
      }));
      setFeedback({ type: 'success', message: `Đã cập nhật trạng thái hồ sơ sang "${statusInfo(statusToSet).label}".` });
      setModalType(null);
      setStatusNote('');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Cập nhật trạng thái thất bại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // API 5: Upload bằng chứng xử lý
  async function handleEvidenceSubmit() {
    if (evidenceFiles.length === 0) {
      setFeedback({ type: 'error', message: 'Vui lòng chọn ít nhất 1 file hình ảnh hoặc video minh chứng.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const targetStepId =
      selectedStepId ||
      (ticket.steps && ticket.steps.length > 0 ? (ticket.steps[0].id || ticket.steps[0].stepId) : undefined);

    if (!targetStepId) {
      setFeedback({
        type: 'error',
        message: 'Hồ sơ chưa có bước quy trình (stepId) để đính kèm bằng chứng. Vui lòng kiểm tra lại danh sách bước.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const uploaded = await submitStaffEvidence(
        targetStepId,
        evidenceFiles,
        resolutionNote.trim()
      );

      if (uploaded && uploaded.length > 0) {
        setEvidencesList((prev) => [...uploaded, ...prev]);
      }

      // Cập nhật trạng thái bước vừa hoàn thành sang RESOLVED
      // Theo nghiệp vụ: khi TẤT CẢ các bước chuyển sang RESOLVED thì vé mới chuyển sang RESOLVED
      setTicket((prev) => {
        const updatedSteps = prev.steps?.map((st) => {
          const sId = st.id || st.stepId;
          if (sId === targetStepId) {
            return {
              ...st,
              status: 'RESOLVED',
              evidences: uploaded && uploaded.length > 0 ? [...(st.evidences || []), ...uploaded] : st.evidences,
            };
          }
          return st;
        });

        const allStepsResolved =
          updatedSteps &&
          updatedSteps.length > 0 &&
          updatedSteps.every((s) => s.status === 'RESOLVED' || s.status === 'COMPLETED');

        return {
          ...prev,
          steps: updatedSteps,
          status: allStepsResolved ? 'RESOLVED' : prev.status,
        };
      });

      setFeedback({
        type: 'success',
        message: 'Đã tải lên bằng chứng thành công! Bước quy trình đã chuyển sang "Đã giải quyết" (chờ quản lý duyệt hoàn thành).',
      });
      setEvidenceFiles([]);
      setEvidencePreviews([]);
      setResolutionNote('');
      setModalType(null);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Tải bằng chứng thất bại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const si = statusInfo(ticket.status);
  const sv = sevInfo(ticket.severity || 'LOW');
  const pi = priorityInfo(ticket.priority || ticket.subCategories?.[0]?.priority);
  const dept = departments.find((d) => d.departmentId === ticket.departmentId) || (ticket.departmentId ? getDept(ticket.departmentId) : undefined);
  const cat = categories.find((c) => c.categoryId === ticket.categoryId) || (ticket.categoryId ? getCat(ticket.categoryId) : undefined);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 screen-enter">
      {/* Thanh Điều hướng & Thao tác Đầu trang */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-[13px] font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Quay lại danh sách
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono-cf text-[14px] font-black text-gray-900">
                #{ticketId.slice(0, 8)}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1 ${si.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                {si.label}
              </span>
              {ticket.isLifeThreatening && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg border text-red-700 bg-red-50 border-red-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                  Khẩn cấp
                </span>
              )}
            </div>
            <p className="text-[12px] text-gray-500 mt-0.5 truncate max-w-xl">
              📍 {ticket.address || 'Chưa xác định địa chỉ hiện trường'}
            </p>
          </div>
        </div>

        {/* Thanh nút hành động nghiệp vụ Staff */}
        <div className="flex items-center gap-2 flex-wrap">
          {ticket.status === 'ASSIGNED' && (
            <button
              type="button"
              onClick={() => handleStatusSubmit('IN_PROGRESS')}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-[12px] uppercase tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>🚀</span> Bắt đầu xử lý
            </button>
          )}

          <button
            type="button"
            onClick={openEvidenceModal}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>📸</span> Gửi bằng chứng
          </button>

          <button
            type="button"
            onClick={() => openStatusModal()}
            className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-[12px] transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>⚙</span> Đổi trạng thái
          </button>

          <button
            type="button"
            onClick={() => setModalType('forward')}
            className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[12px] transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>↗</span> Chuyển giao
          </button>

          <button
            type="button"
            onClick={() => setModalType('reject')}
            className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[12px] transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>✕</span> Từ chối
          </button>
        </div>
      </div>

      {/* Thông báo Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-[12px] flex items-center justify-between ${
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

      {/* Bố cục 2 Cột */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (5/12): THÔNG TIN PHẢN ÁNH TỪ NGƯỜI DÂN */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>📸</span> Hiện trường phản ánh
              </h3>
              <span className="font-mono-cf text-[11px] text-gray-400">
                {ticket.createdAt ? ticket.createdAt.replace('T', ' ').slice(0, 16) : '—'}
              </span>
            </div>

            {/* Ảnh hiện trường */}
            {ticket.imageUrl || (ticket.images && ticket.images.length > 0) || (ticket.evidenceUrls && ticket.evidenceUrls.length > 0) ? (
              <div
                onClick={() => setZoomUrl(ticket.imageUrl || ticket.images?.[0] || ticket.evidenceUrls?.[0] || null)}
                className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video group cursor-pointer shadow-2xs"
              >
                <img
                  src={ticket.imageUrl || ticket.images?.[0] || ticket.evidenceUrls?.[0]}
                  alt="Hiện trường"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  🔍 Bấm để phóng to
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-400 text-xs bg-gray-50/50">
                Không có ảnh chụp hiện trường
              </div>
            )}

            {/* Mô tả sự cố */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 block mb-1">Mô tả sự cố:</span>
              <p className="text-[12px] text-gray-800 leading-relaxed bg-gray-50/70 border border-gray-200 rounded-xl p-3 font-medium">
                {ticket.description || 'Không có mô tả chi tiết'}
              </p>
            </div>

            {/* Địa chỉ */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 block mb-1">Địa điểm:</span>
              <div className="flex items-start gap-2 text-[12px] text-gray-700 bg-gray-50/70 border border-gray-200 rounded-xl p-3">
                <span className="text-orange-500 flex-shrink-0 mt-0.5">📍</span>
                <span className="font-medium">{ticket.address || '—'}</span>
              </div>
            </div>

            {/* Phân loại & Mức độ */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-gray-400 block mb-1">Danh mục</span>
                <span className="text-[11px] font-bold text-gray-800 truncate block">
                  {ticket.categoryName || cat?.name || 'Chưa phân loại'}
                </span>
              </div>
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-gray-400 block mb-1">Cơ quan phụ trách</span>
                <span className="text-[11px] font-bold text-gray-800 truncate block">
                  {ticket.departmentName || dept?.name || 'Chưa phân công'}
                </span>
              </div>
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-gray-400 block mb-1">Mức nghiêm trọng</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block ${sv.cls}`}>
                  {sv.label}
                </span>
              </div>
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-gray-400 block mb-1">Độ ưu tiên</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block ${pi.cls}`}>
                  {pi.label}
                </span>
              </div>
            </div>

            {/* Thông tin người báo cáo */}
            {(ticket.creatorFullName || ticket.reporterName || ticket.creatorPhoneNumber || ticket.reporterPhone) && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-gray-700 block mb-1">👤 Người phản ánh:</span>
                <p className="text-gray-800 font-semibold">{ticket.creatorFullName || ticket.reporterName || 'Người dân'}</p>
                {(ticket.creatorPhoneNumber || ticket.reporterPhone) && (
                  <p className="font-mono-cf text-gray-500">📞 {ticket.creatorPhoneNumber || ticket.reporterPhone}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (7/12): TIẾN ĐỘ & BẰNG CHỨNG XỬ LÝ (EVIDENCES) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
              <div>
                <h3 className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📸</span> Bằng chứng xử lý hiện trường ({evidencesList.length})
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Hình ảnh và kết quả nghiệm thu được cán bộ cập nhật
                </p>
              </div>
              <button
                type="button"
                onClick={openEvidenceModal}
                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] transition-all shadow-xs cursor-pointer active:scale-95"
              >
                + Tải thêm bằng chứng
              </button>
            </div>

            {evidencesList.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
                <p className="text-[13px] font-bold text-gray-500">Chưa có minh chứng xử lý nào được tải lên</p>
                <p className="text-[11px] text-gray-400">
                  Nhấn "Gửi bằng chứng" để tải ảnh nghiệm thu hoàn tất sự cố lên hệ thống
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {evidencesList.map((ev, idx) => (
                  <div
                    key={ev.evidenceId || idx}
                    onClick={() => setZoomUrl(ev.imageUrl)}
                    className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 group cursor-pointer shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <div className="aspect-video relative overflow-hidden bg-gray-200">
                      <img
                        src={ev.imageUrl}
                        alt="Bằng chứng"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        🔍 Phóng to
                      </div>
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-[11px] text-gray-800 font-semibold line-clamp-2">
                        {ev.resolutionNote || 'Bằng chứng xử lý'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono-cf pt-1">
                        <span>{ev.staffName || 'Cán bộ'}</span>
                        <span>{ev.createdAt ? ev.createdAt.slice(0, 10) : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danh sách các bước (steps) nếu có */}
          {ticket.steps && ticket.steps.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <h3 className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span> Quy trình các bước ({ticket.steps.length})
              </h3>
              <div className="space-y-2">
                {ticket.steps.map((st, i) => (
                  <div key={st.id || st.stepId || i} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-bold text-gray-800">{st.stepName || `Bước ${i + 1}`}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{st.notes || 'Không có ghi chú'}</p>
                    </div>
                    {(() => {
                      const stInfo = statusInfo(st.status || 'PENDING');
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${stInfo.cls}`}>
                          {stInfo.label}
                        </span>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL 2: CHUYỂN GIAO VÉ (API 2) ================= */}
      {modalType === 'forward' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">↗ Chuyển giao cơ quan khác</h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">✕</button>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Cơ quan chuyển đến:</label>
              <select
                value={forwardDeptId}
                onChange={(e) => setForwardDeptId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 font-semibold outline-none focus:border-orange-500"
              >
                <option value="">-- Chọn cơ quan chức năng đúng --</option>
                {departments
                  .filter((d) => d.departmentId !== ticket.departmentId)
                  .map((d) => (
                    <option key={d.departmentId} value={d.departmentId}>
                      {d.name} ({d.level || 'Cơ quan'})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Lý do chuyển giao <span className="text-red-500">*</span>:</label>
              <textarea
                value={forwardReason}
                onChange={(e) => setForwardReason(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Vấn đề không thuộc thẩm quyền của phòng ban chúng tôi..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-orange-500 resize-none font-medium"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleForwardSubmit}
                disabled={submitting || !forwardReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang chuyển giao...' : 'Xác nhận chuyển'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: TỪ CHỐI HỒ SƠ (API 3) ================= */}
      {modalType === 'reject' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-red-600">✕ Từ chối tiếp nhận hồ sơ</h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">✕</button>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Lý do từ chối <span className="text-red-500">*</span>:</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Nhập lý do không tiếp nhận hoặc phản ánh không hợp lệ..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-red-500 resize-none font-medium"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={submitting || !rejectReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: ĐỔI TRẠNG THÁI (API 4) ================= */}
      {modalType === 'status' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">⚙ Cập nhật trạng thái hồ sơ</h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">✕</button>
            </div>
            {/* Chọn bước áp dụng nếu vé có steps */}
            {ticket.steps && ticket.steps.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Bước quy trình áp dụng:</label>
                <select
                  value={statusStepId}
                  onChange={(e) => setStatusStepId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 font-semibold outline-none focus:border-orange-500 cursor-pointer"
                >
                  {ticket.steps.map((st, i) => (
                    <option key={st.id || st.stepId || i} value={st.id || st.stepId || ''}>
                      {st.stepName || `Bước ${i + 1}`} ({statusInfo(st.status || 'PENDING').label})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Trạng thái mới:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 font-semibold outline-none focus:border-orange-500"
              >
                <option value="ASSIGNED">Đã phân công</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="RESOLVED">Đã giải quyết</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Ghi chú trạng thái:</label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
                placeholder="Nhập ghi chú cập nhật tiến độ (tùy chọn)..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-orange-500 resize-none font-medium"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleStatusSubmit()}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : 'Lưu trạng thái'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: GỬI BẰNG CHỨNG XỬ LÝ (API 5) ================= */}
      {modalType === 'evidence' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">📸 Tải lên bằng chứng xử lý</h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">✕</button>
            </div>

            {/* Chọn bước nếu vé có nhiều bước */}
            {ticket.steps && ticket.steps.length > 0 ? (
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1.5">
                  Bước quy trình xử lý minh chứng:
                </label>
                <select
                  value={selectedStepId}
                  onChange={(e) => setSelectedStepId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 font-semibold outline-none focus:border-orange-500 cursor-pointer"
                >
                  {ticket.steps.map((st, i) => (
                    <option key={st.id || st.stepId || i} value={st.id || st.stepId || ''}>
                      {st.stepName || `Bước ${i + 1}`} ({statusInfo(st.status || 'PENDING').label})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-800 flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <p className="font-bold">Hồ sơ chưa có bước quy trình (step)</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Hệ thống yêu cầu gắn minh chứng với một bước xử lý cụ thể. Vui lòng kiểm tra lại quy trình xử lý.
                  </p>
                </div>
              </div>
            )}

            {/* Chọn file */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">
                Chọn file minh chứng (ảnh/video, tối đa 7 files):
              </label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
              />
            </div>

            {/* Previews */}
            {evidencePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 bg-gray-50 rounded-xl border border-gray-200">
                {evidencePreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Ghi chú */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Ghi chú kết quả xử lý:</label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
                placeholder="Mô tả công việc đã hoàn thành tại hiện trường..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-orange-500 resize-none font-medium"
              />
            </div>

            {/* Hướng dẫn quy trình xử lý */}
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-[12px] text-blue-900 flex items-start gap-2.5">
              <span className="text-sm">ℹ️</span>
              <div className="space-y-0.5">
                <p className="font-bold text-[12px] text-blue-950">Quy trình nghiệm thu:</p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Gửi minh chứng sẽ chuyển bước này sang trạng thái <strong>"Đã giải quyết"</strong>. Khi <strong>tất cả các bước</strong> của hồ sơ đều được giải quyết, hồ sơ sẽ chuyển sang <strong>"Đã giải quyết"</strong> để Quản lý thẩm định và phê duyệt hoàn thành.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleEvidenceSubmit}
                disabled={submitting || evidenceFiles.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang tải lên...' : `Tải lên (${evidenceFiles.length} file)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL PHÓNG TO ẢNH ================= */}
      {zoomUrl && (
        <div
          onClick={() => setZoomUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={zoomUrl} alt="Phóng to" className="w-full h-full object-contain max-h-[85vh]" />
            <button
              onClick={() => setZoomUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-sm hover:bg-red-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
