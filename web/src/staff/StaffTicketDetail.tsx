import { useState, useEffect } from 'react';
import { User, getCat, getDept, statusInfo, sevInfo, priorityInfo } from '../data';
import {
  StaffTicketItem,
  StaffTicketStepEvidence,
  createStaffRequest,
  updateStaffTicketStatus,
  submitStaffEvidence,
  getStaffTicketSteps,
  getDepartments,
  DepartmentItem,
  getAdminCategories,
  AdminCategory,
  checkStepReadiness,
  ApiError,
} from '../services';

interface Props {
  ticket: StaffTicketItem | any;
  currentUser: User;
  onBack: () => void;
}

function getStepTitle(st: any, i: number = 0): string {
  if (!st) return `Bước ${i + 1}`;
  return (
    st.stepName ||
    st.name ||
    st.title ||
    st.stepTitle ||
    st.step?.stepName ||
    st.step?.name ||
    st.notes ||
    `Bước ${i + 1}`
  );
}

export default function StaffTicketDetail({ ticket: initialTicket, currentUser, onBack }: Props) {
  const [ticket, setTicket] = useState<StaffTicketItem>(initialTicket);
  const ticketId = ticket.id || ticket.ticketId || '';

  // Lists for dropdowns
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);

  // Modals state
  const [modalType, setModalType] = useState<'request' | 'evidence' | 'status' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form tạo request gửi Manager (POST /api/v1/staff/requests)
  const [requestTitle, setRequestTitle] = useState('');
  const [requestContent, setRequestContent] = useState('');
  const [requestStepId, setRequestStepId] = useState('');

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

    // Fetch steps to ensure up-to-date step details and extract any existing evidences
    async function initStepsAndEvidences() {
      let currentSteps = ticket.steps;
      if (ticketId) {
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

  function openEvidenceModal(preselectedStepId?: string) {
    if (typeof preselectedStepId === 'string' && preselectedStepId) {
      setSelectedStepId(preselectedStepId);
    } else {
      const defaultStep =
        ticket.steps?.find((s) => s.status === 'IN_PROGRESS' || s.status === 'ASSIGNED' || s.status === 'PENDING') ||
        ticket.steps?.[0];
      if (defaultStep) {
        setSelectedStepId(defaultStep.id || (defaultStep as any).ticketStepId || defaultStep.stepId || '');
      }
    }
    setModalType('evidence');
  }

  function openEvidenceForStep(stepId: string) {
    openEvidenceModal(stepId);
  }

  // API: Staff tạo request gửi đến Manager (POST /api/v1/staff/requests)
  // Thay thế cho quyền forward/reject trực tiếp, gửi yêu cầu để Manager xem xét & điều chỉnh
  async function handleRequestSubmit() {
    if (!requestTitle.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập tiêu đề yêu cầu.' });
      return;
    }
    if (!requestContent.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập nội dung chi tiết của yêu cầu.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await createStaffRequest({
        ticketId: ticketId || undefined,
        stepId: requestStepId || undefined,
        title: requestTitle.trim(),
        content: requestContent.trim(),
      });
      const mgrNames = res.recipientManagerNames?.length
        ? ` (${res.recipientManagerNames.join(', ')})`
        : '';
      setFeedback({
        type: 'success',
        message: `Đã gửi yêu cầu tới Quản lý${mgrNames} thành công! Quản lý sẽ nhận được thông báo thời gian thực.`,
      });
      setModalType(null);
      setRequestTitle('');
      setRequestContent('');
      setRequestStepId('');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Gửi yêu cầu tới Quản lý thất bại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  function openRequestModal(stepId?: string, defaultTitle?: string) {
    if (stepId) setRequestStepId(stepId);
    else setRequestStepId('');
    if (defaultTitle) setRequestTitle(defaultTitle);
    else setRequestTitle('');
    setRequestContent('');
    setModalType('request');
  }

  function openStatusModal(target?: string, stepId?: string) {
    if (target) {
      setNewStatus(target);
    }
    if (stepId) {
      setStatusStepId(stepId);
    } else {
      const activeStep =
        ticket.steps?.find((s) => s.status === 'IN_PROGRESS' || s.status === 'ASSIGNED' || s.status === 'PENDING') ||
        ticket.steps?.[0];
      if (activeStep) {
        setStatusStepId(activeStep.id || (activeStep as any).ticketStepId || activeStep.stepId || '');
      }
    }
    setModalType('status');
  }

  // API 4: Cập nhật trạng thái tổng thể vé
  async function handleStatusSubmit(target?: string) {
    const statusToSet = target || newStatus;
    setSubmitting(true);
    setFeedback(null);
    try {
      const activeStepId =
        statusStepId ||
        ticket.steps?.find((s) => s.status === 'IN_PROGRESS' || s.status === 'ASSIGNED' || s.status === 'PENDING')?.id ||
        (ticket.steps?.[0] as any)?.id ||
        (ticket.steps?.[0] as any)?.ticketStepId ||
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

  // Cập nhật trạng thái cho từng bước cụ thể (Item 3)
  async function handleStepStatusChange(stepInstanceId: string, targetStatus: string) {
    if (!stepInstanceId) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const activeStep = ticket.steps?.find(
        (s) => (s.id || (s as any).ticketStepId || s.stepId) === stepInstanceId
      );
      const note = `Cập nhật bước "${getStepTitle(activeStep, 0)}" sang ${statusInfo(targetStatus).label}`;
      const updated = await updateStaffTicketStatus(ticketId, targetStatus, note, stepInstanceId);

      setTicket((prev) => {
        const updatedSteps = (prev.steps || []).map((st) => {
          const sId = st.id || (st as any).ticketStepId || st.stepId;
          if (sId === stepInstanceId) {
            return { ...st, status: targetStatus };
          }
          return st;
        });

        const allStepsResolved =
          updatedSteps.length > 0 &&
          updatedSteps.every((s) => s.status === 'RESOLVED' || s.status === 'COMPLETED');

        return {
          ...prev,
          ...updated,
          steps: updatedSteps,
          status: allStepsResolved
            ? 'RESOLVED'
            : prev.status === 'ASSIGNED'
            ? 'IN_PROGRESS'
            : prev.status,
        };
      });

      setFeedback({
        type: 'success',
        message: `Đã cập nhật trạng thái bước sang "${statusInfo(targetStatus).label}".`,
      });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Cập nhật trạng thái bước thất bại.';
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

      // Cập nhật bằng chứng mới mà KHÔNG tự động chuyển trạng thái sang RESOLVED
      setTicket((prev) => {
        const updatedSteps = prev.steps?.map((st) => {
          const sId = st.id || st.stepId;
          if (sId === targetStepId) {
            return {
              ...st,
              evidences: uploaded && uploaded.length > 0 ? [...(st.evidences || []), ...uploaded] : st.evidences,
            };
          }
          return st;
        });

        return {
          ...prev,
          steps: updatedSteps,
        };
      });

      setFeedback({
        type: 'success',
        message: 'Đã tải lên bằng chứng thành công! Bạn có thể chuyển đổi trạng thái bước sang "Đã giải quyết" khi đã hoàn tất.',
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
            onClick={() => openEvidenceModal()}
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

          {/* Nút gửi yêu cầu tới Quản lý (thay thế chuyển giao & từ chối) */}
          <button
            type="button"
            onClick={() => openRequestModal()}
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[12px] transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
            title="Nhân viên tạo yêu cầu gửi tới người quản lý phụ trách phòng ban"
          >
            <span>📨</span> Gửi yêu cầu tới Quản lý
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
                  {ticket.categoryName || cat?.name || (Array.isArray(ticket.subCategories) && (ticket.subCategories[0]?.name || (ticket.subCategories[0] as any)?.subCategoryName)) || '—'}
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

        {/* CỘT PHẢI (7/12): QUY TRÌNH TỪNG BƯỚC & BẰNG CHỨNG XỬ LÝ */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. KHỐI QUY TRÌNH CÁC BƯỚC XỬ LÝ (TÍCH HỢP ĐỔI TRẠNG THÁI & TẢI BẰNG CHỨNG TỪNG BƯỚC) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
              <div>
                <h3 className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📋</span> Quy trình xử lý theo từng bước ({ticket.steps?.length || 0})
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Cập nhật trạng thái tiến độ và đính kèm bằng chứng nghiệm thu cho từng bước
                </p>
              </div>
              {ticket.steps && ticket.steps.length > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  {ticket.steps.filter((s) => s.status === 'RESOLVED' || s.status === 'COMPLETED').length}/{ticket.steps.length} bước xong
                </span>
              )}
            </div>

            {(!ticket.steps || ticket.steps.length === 0) ? (
              <div className="p-6 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
                <p className="text-[13px] font-bold text-gray-600">Hồ sơ chưa có danh sách quy trình các bước cụ thể</p>
                <p className="text-[11px] text-gray-400">
                  Cán bộ có thể sử dụng các nút "Bắt đầu xử lý", "Gửi bằng chứng" hoặc "Đổi trạng thái" ở thanh công cụ phía trên.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {ticket.steps.map((st, i) => {
                  const stepInstanceId = st.id || (st as any).ticketStepId || st.stepId || '';
                  const stInfo = statusInfo(st.status || 'PENDING');
                  const isDone = st.status === 'RESOLVED' || st.status === 'COMPLETED';
                  const readiness = checkStepReadiness(st, (ticket.steps || []) as any);

                  return (
                    <div
                      key={stepInstanceId || i}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isDone
                          ? 'bg-emerald-50/30 border-emerald-200/80'
                          : st.status === 'IN_PROGRESS'
                          ? 'bg-orange-50/20 border-orange-200'
                          : 'bg-gray-50/70 border-gray-200'
                      }`}
                    >
                      {/* Tiêu đề bước & Hành động */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-2.5 min-w-[200px] flex-1">
                          <span
                            className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : st.status === 'IN_PROGRESS'
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {st.orderIndex !== undefined ? st.orderIndex + 1 : i + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-[13px] font-bold text-gray-900 leading-tight">
                                {getStepTitle(st, i)}
                              </h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${stInfo.cls}`}>
                                {stInfo.label}
                              </span>
                            </div>

                            {/* Người giải quyết & Khả năng làm ngay tức thì / Chờ bước phụ thuộc */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-gray-200 text-[10px] shadow-2xs">
                                <span className="text-gray-500 font-medium">👤 Người giải quyết:</span>
                                <span className="font-extrabold text-gray-900">
                                  {readiness.assigneeName}
                                </span>
                              </div>

                              {/* Huy hiệu: Có thể làm ngay tức thì hay Phải chờ */}
                              {!isDone && (
                                readiness.canDoNow ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold shadow-2xs">
                                    <span>⚡ Có thể làm ngay tức thì</span>
                                    <span className="font-normal opacity-85">
                                      ({readiness.hasDependencies ? 'Các bước tiền đề đã xong' : 'Bước độc lập'})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold shadow-2xs">
                                    <span>⏳ Phải chờ bước phụ thuộc</span>
                                    <span className="font-normal opacity-85">
                                      ({readiness.pendingDependencies.length} bước chưa xong)
                                    </span>
                                  </span>
                                )
                              )}
                            </div>

                            {/* Chi tiết các bước phụ thuộc cần chờ */}
                            {!isDone && !readiness.canDoNow && readiness.pendingDependencies.length > 0 && (
                              <div className="mt-1.5 p-2 bg-amber-50/70 border border-amber-200 rounded-xl text-[10px] text-amber-900 flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-amber-950 flex items-center gap-1">
                                  <span>⚠️</span> Phải chờ hoàn tất bước:
                                </span>
                                {readiness.pendingDependencies.map((pd, pidx) => (
                                  <span
                                    key={pd.id || pidx}
                                    className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 text-[9px] font-semibold shadow-2xs inline-flex items-center gap-1"
                                  >
                                    <span>{pd.name}</span>
                                    <span className="text-[8px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-normal">
                                      {pd.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chưa xử lý'}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}

                            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                              {st.notes || 'Thực hiện theo chỉ đạo của đơn vị quản lý chuyên trách.'}
                            </p>
                          </div>
                        </div>

                        {/* Các thao tác trực tiếp trên bước */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Đổi trạng thái bước */}
                          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                            <span className="text-[10px] font-bold text-gray-400">Trạng thái:</span>
                            <select
                              value={st.status || 'PENDING'}
                              disabled={submitting || st.status === 'COMPLETED'}
                              onChange={(e) => handleStepStatusChange(stepInstanceId, e.target.value)}
                              className="text-[11px] font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
                              title="Chọn để cập nhật trạng thái bước này"
                            >
                              <option value="PENDING">Chờ xử lý (Pending)</option>
                              <option value="IN_PROGRESS">Đang xử lý (In Progress)</option>
                              <option value="RESOLVED">Đã giải quyết (Resolved)</option>
                              {st.status === 'COMPLETED' && <option value="COMPLETED">Đã duyệt xong (Completed)</option>}
                            </select>
                          </div>

                          {/* Tải bằng chứng cho bước */}
                          <button
                            type="button"
                            onClick={() => openEvidenceForStep(stepInstanceId)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Tải ảnh/video kết quả xử lý cho riêng bước này"
                          >
                            <span>📸</span>
                            <span>Tải bằng chứng</span>
                          </button>

                          {/* Báo cáo / Yêu cầu riêng cho bước */}
                          <button
                            type="button"
                            onClick={() => openRequestModal(stepInstanceId, `Yêu cầu hỗ trợ bước: ${getStepTitle(st, i)}`)}
                            className="px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Gửi yêu cầu hoặc báo cáo vấn đề của bước này lên Quản lý"
                          >
                            <span>💬</span>
                            <span>Báo cáo bước</span>
                          </button>
                        </div>
                      </div>

                      {/* Danh sách ảnh bằng chứng đính kèm riêng cho bước này */}
                      {st.evidences && st.evidences.length > 0 && (
                        <div className="pt-2 border-t border-gray-200/60 space-y-1.5">
                          <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                            <span>📎</span> Minh chứng đã nộp cho bước ({st.evidences.length}):
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {st.evidences.map((ev, evIdx) => (
                              <div
                                key={ev.evidenceId || evIdx}
                                onClick={() => setZoomUrl(ev.imageUrl)}
                                className="group relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-100 cursor-pointer shadow-2xs hover:shadow-xs"
                                title="Nhấn để phóng to ảnh minh chứng"
                              >
                                <img
                                  src={ev.imageUrl}
                                  alt="Bằng chứng bước"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                                  🔍 Xem
                                </div>
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

          {/* 2. TỔNG HỢP TOÀN BỘ BẰNG CHỨNG HIỆN TRƯỜNG */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
              <div>
                <h3 className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🖼️</span> Kho bằng chứng & hình ảnh tổng hợp ({evidencesList.length})
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Toàn bộ hình ảnh, video nghiệm thu đã tải lên của hồ sơ
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEvidenceModal()}
                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] transition-all shadow-xs cursor-pointer active:scale-95"
              >
                + Tải thêm bằng chứng
              </button>
            </div>

            {evidencesList.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
                <p className="text-[13px] font-bold text-gray-500">Chưa có minh chứng xử lý nào được tải lên</p>
                <p className="text-[11px] text-gray-400">
                  Tải bằng chứng tại từng bước ở trên hoặc nhấn "Tải thêm bằng chứng" để nộp kết quả nghiệm thu
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
        </div>
      </div>

      {/* ================= MODAL: GỬI YÊU CẦU TỚI QUẢN LÝ (POST /api/v1/staff/requests) ================= */}
      {modalType === 'request' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 text-sm">
                  📨
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900">Gửi yêu cầu tới Quản lý phòng ban</h3>
                  <p className="text-[11px] text-gray-500">
                    Tạo thông báo thời gian thực gửi Quản lý để xem xét & điều chỉnh hồ sơ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Gợi ý mẫu yêu cầu nhanh */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Gợi ý yêu cầu nhanh:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: '↗ Chuyển giao phòng ban',
                    title: 'Đề xuất chuyển giao hồ sơ sang phòng ban khác',
                    content: 'Kính gửi Quản lý: Hồ sơ này không thuộc chuyên môn xử lý của phòng ban hiện tại. Đề xuất xem xét chuyển giao sang phòng ban phụ trách phù hợp.',
                  },
                  {
                    label: '✕ Đề xuất từ chối vé',
                    title: 'Đề xuất từ chối tiếp nhận hồ sơ do không hợp lệ',
                    content: 'Kính gửi Quản lý: Qua khảo sát thực tế, sự cố không tồn tại hoặc phản ánh không đúng sự thật. Đề xuất Quản lý xem xét từ chối hồ sơ.',
                  },
                  {
                    label: '⏱️ Đề xuất gia hạn deadline',
                    title: 'Đề xuất gia hạn thời gian xử lý sự cố',
                    content: 'Kính gửi Quản lý: Do điều kiện khách quan (thời tiết / vật tư chưa về kịp), bước xử lý cần thêm thời gian để hoàn thành đúng tiêu chuẩn. Đề xuất gia hạn deadline.',
                  },
                  {
                    label: '🛠️ Xin hỗ trợ nhân lực/vật tư',
                    title: 'Đề xuất xin hỗ trợ thêm thiết bị và nhân lực',
                    content: 'Kính gửi Quản lý: Quy mô sự cố phức tạp hơn dự kiến, kính đề nghị Quản lý điều phối thêm nhân lực và thiết bị hỗ trợ xử lý hiện trường.',
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRequestTitle(preset.title);
                      setRequestContent(preset.content);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-gray-200 text-gray-700 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bước liên quan (tùy chọn) */}
            {ticket.steps && ticket.steps.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  Bước xử lý liên quan (tùy chọn):
                </label>
                <select
                  value={requestStepId}
                  onChange={(e) => setRequestStepId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 font-medium outline-none focus:border-indigo-500"
                >
                  <option value="">-- Toàn bộ hồ sơ (Không gắn riêng bước cụ thể) --</option>
                  {ticket.steps.map((st, i) => {
                    const stId = st.id || (st as any).ticketStepId || st.stepId || '';
                    return (
                      <option key={stId || i} value={stId}>
                        Bước {st.orderIndex !== undefined ? st.orderIndex + 1 : i + 1}: {getStepTitle(st, i)} ({st.status || 'PENDING'})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Tiêu đề yêu cầu */}
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">
                Tiêu đề yêu cầu <span className="text-red-500">*</span>:
              </label>
              <input
                type="text"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                maxLength={255}
                placeholder="Ví dụ: Đề xuất gia hạn thời gian / Chuyển giao phòng ban..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            {/* Nội dung chi tiết */}
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">
                Nội dung chi tiết yêu cầu <span className="text-red-500">*</span>:
              </label>
              <textarea
                value={requestContent}
                onChange={(e) => setRequestContent(e.target.value)}
                rows={4}
                placeholder="Nhập chi tiết lý do, nguyên nhân thực tế tại hiện trường và đề xuất cụ thể..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-indigo-500 resize-none font-medium"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRequestSubmit}
                disabled={submitting || !requestTitle.trim() || !requestContent.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    <span>Đang gửi yêu cầu...</span>
                  </>
                ) : (
                  <>
                    <span>📨</span>
                    <span>Gửi yêu cầu tới Quản lý</span>
                  </>
                )}
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
                    <option key={st.id || (st as any).ticketStepId || st.stepId || i} value={st.id || (st as any).ticketStepId || st.stepId || ''}>
                      {getStepTitle(st, i)} ({statusInfo(st.status || 'PENDING').label})
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
                    <option key={st.id || (st as any).ticketStepId || st.stepId || i} value={st.id || (st as any).ticketStepId || st.stepId || ''}>
                      {getStepTitle(st, i)} ({statusInfo(st.status || 'PENDING').label})
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
