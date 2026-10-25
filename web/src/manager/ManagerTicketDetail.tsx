import { useState, useEffect } from 'react';
import { Ticket, User, getCat, getDept, statusInfo, sevInfo, priorityInfo } from '../data';
import {
  getTicketSteps,
  getTicketById,
  updateTicketStepStatus,
  deleteTicketStep,
  uploadStepEvidence,
  checkStepReadiness,
  TicketStep,
  TicketStepEvidence,
  ManagerTicketItem,
  ApiError,
} from '../services';

interface Props {
  ticket?: Ticket | ManagerTicketItem;
  ticketId?: string;
  currentUser: User;
  onBack: () => void;
}

export default function ManagerTicketDetail({ ticket: initialTicket, ticketId: propTicketId, currentUser, onBack }: Props) {
  const actualTicketId = (initialTicket as any)?.ticketId || (initialTicket as any)?.id || propTicketId || '';
  
  const [ticket, setTicket] = useState<any>(initialTicket || null);
  const [steps, setSteps] = useState<TicketStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Upload bằng chứng
  const [evidenceStep, setEvidenceStep] = useState<TicketStep | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [resolutionNote, setResolutionNote] = useState('');
  const [uploading, setUploading] = useState(false);

  // Modal xem ảnh phóng to
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Tải chi tiết Ticket và các bước từ Backend
  async function loadData() {
    if (!actualTicketId) return;
    try {
      const [ticketRes, stepsRes] = await Promise.allSettled([
        getTicketById(actualTicketId),
        getTicketSteps(actualTicketId),
      ]);

      if (ticketRes.status === 'fulfilled' && ticketRes.value) {
        setTicket((prev: any) => ({ ...prev, ...ticketRes.value }));
      }

      // Ưu tiên danh sách bước từ stepsRes nếu có, hoặc từ ticketRes.steps
      const loadedSteps =
        stepsRes.status === 'fulfilled' && Array.isArray(stepsRes.value) && stepsRes.value.length > 0
          ? stepsRes.value
          : ticketRes.status === 'fulfilled' && Array.isArray((ticketRes.value as any)?.steps) && (ticketRes.value as any).steps.length > 0
          ? (ticketRes.value as any).steps
          : null;

      if (loadedSteps) {
        setSteps(loadedSteps);
      }
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu chi tiết vé:', err);
    }
  }

  useEffect(() => {
    if (initialTicket) {
      setTicket(initialTicket);
      const initSteps = (initialTicket as any).steps;
      if (initSteps && Array.isArray(initSteps) && initSteps.length > 0) {
        setSteps(initSteps);
      }
    }
    loadData();
  }, [actualTicketId]);

  // Xử lý chọn file ảnh bằng chứng
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setEvidenceFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setEvidencePreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeFile(index: number) {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
    setEvidencePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  // Upload bằng chứng (POST /api/v1/ticket-steps/{stepId}/evidences?resolutionNote=...)
  async function handleSubmitEvidence() {
    const stepId = evidenceStep?.id || (evidenceStep as any)?.ticketStepId;
    if (!stepId) {
      setFeedback({ type: 'error', message: 'Không tìm thấy ID của bước xử lý để gửi bằng chứng.' });
      return;
    }
    if (evidenceFiles.length === 0) {
      setFeedback({ type: 'error', message: 'Vui lòng chọn ít nhất 1 ảnh bằng chứng xử lý.' });
      return;
    }

    setUploading(true);
    setFeedback(null);
    try {
      await uploadStepEvidence(stepId, evidenceFiles, resolutionNote.trim());
      setFeedback({
        type: 'success',
        message: `Đã tải lên ${evidenceFiles.length} ảnh bằng chứng thành công! Bạn có thể chuyển đổi trạng thái bước sang "Đã giải quyết" khi đã hoàn tất.`,
      });

      // Dọn dẹp form
      setEvidenceStep(null);
      setEvidenceFiles([]);
      evidencePreviews.forEach((url) => URL.revokeObjectURL(url));
      setEvidencePreviews([]);
      setResolutionNote('');

      // Reload dữ liệu mới nhất
      await loadData();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Tải lên bằng chứng thất bại. Vui lòng thử lại.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setUploading(false);
    }
  }

  // Cập nhật trạng thái bước (PUT /api/v1/manager/tickets/steps/{stepId}/status?status=COMPLETED|IN_PROGRESS)
  async function handleUpdateStatus(stepInstanceId: string, newStatus: string) {
    if (!stepInstanceId) {
      setFeedback({ type: 'error', message: 'Không tìm thấy ID bước xử lý (cần id trong step trả về từ vé).' });
      return;
    }
    try {
      await updateTicketStepStatus(stepInstanceId, newStatus);
      setFeedback({
        type: 'success',
        message:
          newStatus === 'COMPLETED'
            ? 'Đã phê duyệt bước xử lý thành "Hoàn thành".'
            : newStatus === 'IN_PROGRESS'
            ? 'Đã chuyển bước xử lý về "Đang xử lý" (yêu cầu xử lý lại).'
            : `Đã cập nhật trạng thái bước sang ${newStatus}.`,
      });

      // Cập nhật local state phản hồi tức thì
      setSteps((prev) => {
        const next = prev.map((s) => {
          const sId = s.id || (s as any).ticketStepId;
          return sId === stepInstanceId ? { ...s, status: newStatus } : s;
        });
        const allCompleted = next.length > 0 && next.every((s) => s.status === 'COMPLETED');
        if (allCompleted) {
          setTicket((t: any) => ({ ...t, status: 'COMPLETED' }));
        }
        return next;
      });

      await loadData();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Không thể cập nhật trạng thái bước.';
      setFeedback({ type: 'error', message: msg });
    }
  }

  // Xóa mềm bước (DELETE /api/v1/ticket-steps/{id})
  async function handleDeleteStep(stepId: string) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bước xử lý này? Backend sẽ tự động tính lại hạn chót tổng của Ticket.')) return;
    try {
      await deleteTicketStep(stepId);
      setFeedback({ type: 'success', message: 'Đã xóa bước xử lý thành công.' });
      await loadData();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Không thể xóa bước xử lý.';
      setFeedback({ type: 'error', message: msg });
    }
  }

  const cat = getCat(ticket?.categoryId);
  const dept = getDept(ticket?.departmentId);
  const si = statusInfo(ticket?.status || 'PENDING');
  const sv = sevInfo(ticket?.severity || 'LOW');
  const pi = priorityInfo(ticket?.priority || ticket?.subCategories?.[0]?.priority);

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
            Quay lại
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[18px] font-black text-gray-900 tracking-tight">
                Hồ sơ #{actualTicketId ? actualTicketId.slice(0, 8) : '—'}
              </h2>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1.5 ${si.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                {si.label}
              </span>
              {ticket?.isLifeThreatening && (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border border-red-300 bg-red-50 text-red-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                  Ưu tiên khẩn cấp
                </span>
              )}
            </div>
            <p className="text-[12px] text-gray-500 mt-0.5 truncate max-w-xl">
              📍 {ticket?.address || 'Chưa xác định địa chỉ hiện trường'}
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-2 text-xs font-semibold"
          title="Làm mới dữ liệu"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Thông báo Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-[12px] flex items-center justify-between shadow-xs ${
            feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span className="font-semibold">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="cursor-pointer font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Bố cục 2 Cột Chuyên Nghiệp */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (5/12): THÔNG TIN PHẢN ÁNH TỪ NGƯỜI DÂN */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>📸</span> Thông tin hiện trường
              </h3>
              <span className="font-mono-cf text-[11px] text-gray-400">
                {ticket?.createdAt ? ticket.createdAt.replace('T', ' ').slice(0, 16) : '—'}
              </span>
            </div>

            {/* Ảnh hiện trường ban đầu */}
            {ticket?.imageUrl || (ticket?.evidenceUrls && ticket.evidenceUrls.length > 0) ? (
              <div
                onClick={() => setZoomImageUrl(ticket.imageUrl || ticket.evidenceUrls[0])}
                className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video group cursor-pointer shadow-2xs"
              >
                <img
                  src={ticket?.imageUrl || ticket?.evidenceUrls?.[0]}
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

            {/* Nội dung phản ánh */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 block mb-1">Mô tả sự cố:</span>
              <p className="text-[12px] text-gray-800 leading-relaxed bg-gray-50/70 border border-gray-200 rounded-xl p-3 font-medium">
                {ticket?.description || 'Không có mô tả chi tiết'}
              </p>
            </div>

            {/* Địa chỉ */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 block mb-1">Địa điểm:</span>
              <div className="flex items-start gap-2 text-[12px] text-gray-700 bg-gray-50/70 border border-gray-200 rounded-xl p-3">
                <span className="text-orange-500 flex-shrink-0 mt-0.5">📍</span>
                <span className="font-medium">{ticket?.address || '—'}</span>
              </div>
            </div>

            {/* Phân loại & Mức độ */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-gray-400 block mb-1">Danh mục</span>
                <span className="text-[11px] font-bold text-gray-800 truncate block">
                  {ticket?.categoryName || cat?.name || 'Chưa phân loại'}
                </span>
              </div>
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-gray-400 block mb-1">Hạn chót tổng</span>
                <span className="font-mono-cf text-[11px] font-extrabold text-orange-700 truncate block">
                  {ticket?.deadline ? ticket.deadline.replace('T', ' ').slice(0, 16) : 'Tính theo các bước'}
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

            {/* Ý kiến chỉ đạo của Quản lý */}
            {ticket?.reviewNote && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900">
                <span className="font-bold block mb-0.5">💬 Ý kiến chỉ đạo điều phối:</span>
                <p className="italic">{ticket.reviewNote}</p>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (7/12): TIẾN ĐỘ CÁC BƯỚC XỬ LÝ & BẰNG CHỨNG NGHIỆM THU */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
              <div>
                <h3 className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📋</span> Quy trình xử lý & Nghiệm thu ({steps.length} bước)
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Theo dõi tiến độ, xem ảnh bằng chứng giải quyết và quản lý trạng thái từng bước
                </p>
              </div>
            </div>

            {/* Sơ đồ trực quan thứ tự thực hiện các bước */}
            {steps.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                  <span className="font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <span>🗺️</span> Tiến độ quy trình & Thứ tự phụ thuộc
                  </span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {steps.filter((s) => checkStepReadiness(s, steps).canDoNow).length} bước làm được ngay
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {steps.filter((s) => !checkStepReadiness(s, steps).canDoNow).length} bước đang chờ
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                  {steps.map((st, i) => {
                    const r = checkStepReadiness(st, steps);
                    const isDone = st.status === 'COMPLETED' || st.status === 'RESOLVED';
                    return (
                      <div key={st.id || st.stepId || i} className="flex items-center gap-1.5 flex-shrink-0">
                        {i > 0 && (
                          <span className="text-slate-400 font-bold text-[10px]">
                            {r.hasDependencies ? '➔' : '||'}
                          </span>
                        )}
                        <div
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 shadow-2xs ${
                            isDone
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : r.canDoNow
                              ? 'bg-blue-50 border-blue-300 text-blue-900 ring-1 ring-blue-200'
                              : 'bg-amber-50 border-amber-300 text-amber-900'
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center ${
                              isDone ? 'bg-emerald-600' : r.canDoNow ? 'bg-blue-600' : 'bg-amber-600'
                            }`}
                          >
                            {isDone ? '✓' : i + 1}
                          </span>
                          <span className="max-w-[100px] truncate">
                            {st.stepName || (st as any).name || `Bước ${i + 1}`}
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-white/80 font-normal">
                            {isDone ? 'Xong' : r.canDoNow ? 'Làm ngay' : 'Chờ bước trước'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Danh sách các bước */}
            {steps.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-400 text-xs space-y-1">
                <p className="font-bold text-gray-600">Hồ sơ chưa có bước xử lý nào được thiết lập</p>
                <p className="text-[11px] text-gray-400">
                  Các bước sẽ được khởi tạo khi Quản lý thực hiện phê duyệt tại trang Điều phối.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {steps.map((st, idx) => {
                  // Theo Backend: API PUT /api/v1/manager/tickets/steps/{stepId}/status dùng st.id của bước trong ticket, fallback ticketStepId hoặc stepId
                  const stepInstanceId = st.id || (st as any).ticketStepId || (st as any).stepInstanceId || st.stepId || '';
                  const isCompleted = st.status === 'COMPLETED';
                  const isResolved = st.status === 'RESOLVED';
                  const isInProgress = st.status === 'IN_PROGRESS';
                  const evidences = st.evidences || [];
                  const readiness = checkStepReadiness(st, steps);

                  return (
                    <div
                      key={stepInstanceId || st.stepId || `step-${idx}`}
                      className={`border rounded-2xl p-4 transition-all shadow-2xs space-y-3 ${
                        isCompleted
                          ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                          : isResolved
                          ? 'bg-blue-50/30 border-blue-200 ring-1 ring-blue-100'
                          : isInProgress
                          ? 'bg-orange-50/30 border-orange-200 ring-1 ring-orange-200'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      {/* Tiêu đề bước */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-gray-200/60">
                        <div className="flex items-start gap-2.5 flex-1 min-w-[240px]">
                          <span
                            className={`w-6 h-6 rounded-full font-mono text-[11px] font-bold flex items-center justify-center shadow-xs text-white flex-shrink-0 mt-0.5 ${
                              isCompleted
                                ? 'bg-emerald-600'
                                : isResolved
                                ? 'bg-blue-600'
                                : isInProgress
                                ? 'bg-orange-600'
                                : 'bg-slate-400'
                            }`}
                          >
                            {isCompleted ? '✓' : (st.orderIndex || idx + 1)}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-[13px] font-extrabold text-gray-900">
                                {st.stepName || (st as any).name || (st as any).title || (st as any).stepTitle || (st as any).step?.stepName || (st as any).step?.name || st.notes || `Bước ${idx + 1}`}
                              </h4>
                              {isCompleted ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                  <span>✓</span> Đã hoàn thành (Duyệt xong)
                                </span>
                              ) : isResolved ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
                                  <span>⏳</span> Đã giải quyết (Chờ duyệt)
                                </span>
                              ) : isInProgress ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-300">
                                  Đang xử lý
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                                  Chờ xử lý
                                </span>
                              )}
                            </div>

                            {/* Người giải quyết & Khả năng làm ngay tức thì / Chờ bước phụ thuộc */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white border border-gray-200 text-[11px] shadow-2xs">
                                <span className="text-gray-500 font-medium">👤 Người giải quyết:</span>
                                <span className="font-extrabold text-gray-900">
                                  {readiness.assigneeName}
                                </span>
                              </div>

                              {/* Huy hiệu: Có thể làm ngay tức thì hay Phải chờ */}
                              {!isCompleted && !isResolved && (
                                readiness.canDoNow ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold shadow-2xs">
                                    <span>⚡ Có thể làm ngay tức thì</span>
                                    <span className="font-normal opacity-85">
                                      ({readiness.hasDependencies ? 'Các bước tiền đề đã xong' : 'Bước độc lập'})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold shadow-2xs">
                                    <span>⏳ Phải chờ bước phụ thuộc</span>
                                    <span className="font-normal opacity-85">
                                      ({readiness.pendingDependencies.length} bước chưa xong)
                                    </span>
                                  </span>
                                )
                              )}
                            </div>

                            {/* Chi tiết các bước phụ thuộc cần chờ */}
                            {!isCompleted && !isResolved && !readiness.canDoNow && readiness.pendingDependencies.length > 0 && (
                              <div className="mt-2 p-2 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-amber-950 flex items-center gap-1">
                                  <span>⚠️</span> Phải chờ hoàn tất bước:
                                </span>
                                {readiness.pendingDependencies.map((pd, pidx) => (
                                  <span
                                    key={pd.id || pidx}
                                    className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 text-[10px] font-semibold shadow-2xs inline-flex items-center gap-1"
                                  >
                                    <span>{pd.name}</span>
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-normal">
                                      {pd.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chưa xử lý'}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Thao tác Trạng thái & Xóa */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Nút bấm trực tiếp Phê duyệt hoàn thành bước (Dành cho Quản lý) */}
                          {!isCompleted ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(stepInstanceId, 'COMPLETED')}
                              disabled={!stepInstanceId || loading}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1"
                              title="Bấm để phê duyệt hoàn thành bước này"
                            >
                              <span>✓</span> Duyệt hoàn thành
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(stepInstanceId, 'IN_PROGRESS')}
                              disabled={!stepInstanceId || loading}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-[11px] rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1"
                              title="Yêu cầu cán bộ làm lại bước này"
                            >
                              <span>↩</span> Yêu cầu làm lại
                            </button>
                          )}

                          {/* Dropdown đổi trạng thái bước: PUT /api/v1/manager/tickets/steps/{stepId}/status */}
                          <select
                            value={st.status || 'PENDING'}
                            onChange={(e) => handleUpdateStatus(stepInstanceId, e.target.value)}
                            disabled={!stepInstanceId || loading}
                            className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700 outline-none hover:border-orange-500 focus:border-orange-500 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Quản lý phê duyệt bước hoặc yêu cầu xử lý lại"
                          >
                            <option value="PENDING">Chờ xử lý</option>
                            <option value="IN_PROGRESS">Đang xử lý (Làm lại)</option>
                            <option value="RESOLVED">Đã giải quyết (Chờ duyệt)</option>
                            <option value="COMPLETED">Hoàn thành (Đã duyệt)</option>
                            <option value="TRANSFERRED">Chuyển tiếp</option>
                            <option value="CANCELLED">Hủy bước</option>
                          </select>

                          {/* Nút Xóa bước dành cho Manager */}
                          {currentUser.role === 'MANAGER' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStep(stepInstanceId)}
                              disabled={!stepInstanceId || loading}
                              className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Xóa bước này"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Chi tiết Hạn chót & Ghi chú của bước */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">⏱️ Hạn chót:</span>
                          <span className="font-mono-cf font-semibold text-gray-800">
                            {st.deadline ? st.deadline.replace('T', ' ').slice(0, 16) : 'Chưa có hạn chót'}
                          </span>
                        </div>
                        {st.notes && (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-gray-400">📝 Nhiệm vụ:</span>
                            <span className="font-medium text-gray-700 truncate">{st.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* KHU VỰC BẰNG CHỨNG (EVIDENCES GALLERY) */}
                      <div className="pt-2 border-t border-gray-200/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                            <span>📎</span> Bằng chứng nghiệm thu ({evidences.length} ảnh):
                          </span>

                          {/* Nút Upload bằng chứng */}
                          <button
                            type="button"
                            onClick={() => {
                              setEvidenceStep(st);
                              setEvidenceFiles([]);
                              setEvidencePreviews([]);
                              setResolutionNote('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                          >
                            <span>+</span> Tải lên bằng chứng
                          </button>
                        </div>

                        {evidences.length === 0 ? (
                          <p className="text-[11px] italic text-gray-400 bg-white/70 border border-dashed border-gray-200 rounded-xl p-2.5 text-center">
                            Chưa có ảnh bằng chứng nghiệm thu cho bước này.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                            {evidences.map((ev, evIdx) => (
                              <div
                                key={ev.evidenceId || evIdx}
                                className="group relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xs hover:border-orange-400 transition-all"
                              >
                                <div
                                  onClick={() => setZoomImageUrl(ev.imageUrl)}
                                  className="aspect-video bg-gray-100 overflow-hidden cursor-pointer"
                                >
                                  <img
                                    src={ev.imageUrl}
                                    alt="Bằng chứng"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                                <div className="p-2 space-y-0.5">
                                  {ev.resolutionNote && (
                                    <p className="text-[10px] font-medium text-gray-800 truncate" title={ev.resolutionNote}>
                                      💬 {ev.resolutionNote}
                                    </p>
                                  )}
                                  <p className="font-mono-cf text-[9px] text-gray-400 truncate">
                                    {ev.staffName || 'Cán bộ'} · {ev.createdAt ? ev.createdAt.slice(0, 10) : ''}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL UPLOAD BẰNG CHỨNG XỬ LÝ (POST /api/v1/ticket-steps/{stepId}/evidences)
         ========================================================================= */}
      {evidenceStep && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 flex-shrink-0">
              <div>
                <h3 className="font-display text-[14px] font-bold text-gray-900 uppercase tracking-tight">
                  Tải lên bằng chứng xử lý
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Bước: <span className="font-semibold text-orange-600">{(evidenceStep as any).stepName || (evidenceStep as any).name || (evidenceStep as any).title || (evidenceStep as any).notes || 'Xử lý'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEvidenceStep(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Nội dung Modal */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Chọn file ảnh */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                  Hình ảnh kết quả / Bằng chứng nghiệm thu <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-2xl p-4 text-center bg-gray-50/50 hover:bg-orange-50/20 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="space-y-1">
                    <span className="text-2xl block">📸</span>
                    <p className="text-[12px] font-bold text-gray-700">Bấm để chọn hoặc kéo thả nhiều ảnh vào đây</p>
                    <p className="text-[10px] text-gray-400">Hỗ trợ JPG, PNG, WEBP</p>
                  </div>
                </div>
              </div>

              {/* Danh sách ảnh xem trước */}
              {evidencePreviews.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Ảnh đã chọn ({evidencePreviews.length} ảnh):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {evidencePreviews.map((url, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video group">
                        <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                          title="Xóa ảnh này"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ghi chú kết quả xử lý (resolutionNote) */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                  Ghi chú kết quả xử lý (resolutionNote)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Ví dụ: Đã khắc phục xong ổ gà, dặm vá thảm nhựa và vệ sinh khu vực mặt đường..."
                  className="w-full bg-gray-50 focus:bg-white border border-gray-300 rounded-xl p-3 text-[12px] text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 leading-relaxed">
                ℹ️ <strong>Lưu ý:</strong> Sau khi tải lên bằng chứng thành công, Backend sẽ tự động cập nhật bước xử lý sang trạng thái <strong>Đã xử lý</strong>.
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setEvidenceStep(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-[12px] font-bold transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={uploading || evidenceFiles.length === 0}
                onClick={handleSubmitEvidence}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-[12px] transition-all shadow-md shadow-orange-600/25 disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <span>{uploading ? 'Đang tải lên...' : '✓ Xác nhận tải lên'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Ảnh Phóng To */}
      {zoomImageUrl && (
        <div
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={zoomImageUrl} alt="Phóng to" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
            <button
              onClick={() => setZoomImageUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center shadow-lg hover:bg-gray-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
