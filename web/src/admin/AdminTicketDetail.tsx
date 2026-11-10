import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket, TicketHistory, STATUS_META, SEVERITY_META, DANGER_META,
} from '../data';
import {
  getAccessToken,
  fetchAllDepartmentsForAdmin,
  getTicketHistory,
  getAdminTicketDetail,
  mapAdminTicketToUiTicket,
  mapAdminHistoryToUiHistory,
  AdminTicketStepItem,
  AdminTicketRatingItem,
} from '../services';

interface Props {
  ticket?: Ticket | null;
  ticketId?: string;
  onBack: () => void;
}

const ACTION_LABEL: Record<string, string> = {
  CREATED:            'Người dân gửi phản ánh sự cố',
  AI_REVIEWED:        'Hệ thống tiếp nhận & phân loại tự động',
  MANUAL_APPROVED:    'Quản trị / Điều phối viên xác nhận hồ sơ',
  ROUTED:             'Định tuyến tự động về Cơ quan phụ trách',
  ASSIGNED:           'Giao việc cho Cán bộ hiện trường',
  REASSIGNED:         'Điều chuyển Cán bộ xử lý',
  REROUTED:           'Chuyển tuyến sang Đơn vị khác',
  WORK_STARTED:       'Cán bộ bắt đầu xử lý tại hiện trường',
  EVIDENCE_SUBMITTED: 'Cán bộ tải lên ảnh minh chứng hoàn thành',
  CLOSED:             'Xác nhận hoàn tất & đóng hồ sơ sự cố',
};

const STEP_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  COMPLETED:   { label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RESOLVED:    { label: 'Đã xử lý',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  IN_PROGRESS: { label: 'Đang thực hiện', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  ASSIGNED:    { label: 'Đã phân công', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  PENDING:     { label: 'Chờ xử lý',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  WAITING:     { label: 'Chờ bước trước', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  REJECTED:    { label: 'Từ chối',     cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function AdminTicketDetail({ ticket: initialTicket, ticketId: propTicketId, onBack }: Props) {
  const [ticketData, setTicketData] = useState<Ticket | null>(initialTicket ?? null);
  const [steps, setSteps] = useState<AdminTicketStepItem[]>([]);
  const [ratings, setRatings] = useState<AdminTicketRatingItem[]>([]);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [deptMeta, setDeptMeta] = useState<{
    name: string;
    level: 'CITY' | 'WARD';
    contactEmail?: string;
    phoneNumber?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const resolvedId = propTicketId || initialTicket?.rawId || initialTicket?.ticketId || '';

  const loadFullTicketDetail = useCallback(async () => {
    if (!resolvedId) {
      setLoading(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const [detailRes, deptsRes] = await Promise.all([
        getAdminTicketDetail(resolvedId),
        fetchAllDepartmentsForAdmin(),
      ]);

      if (detailRes) {
        const mappedTicket = mapAdminTicketToUiTicket(detailRes);
        const matchedDept = (deptsRes || []).find(
          (d) => String(d.departmentId) === mappedTicket.departmentId,
        );

        if (matchedDept) {
          mappedTicket.departmentName = matchedDept.name || mappedTicket.departmentName;
          setDeptMeta({
            name: matchedDept.name,
            level: matchedDept.level === 'WARD' ? 'WARD' : 'CITY',
            contactEmail: matchedDept.contactEmail,
            phoneNumber: matchedDept.phoneNumber,
          });
        } else if (mappedTicket.departmentName) {
          setDeptMeta({
            name: mappedTicket.departmentName,
            level: /ubnd|phường|xã/i.test(mappedTicket.departmentName) ? 'WARD' : 'CITY',
          });
        }

        setTicketData(mappedTicket);
        setSteps(Array.isArray(detailRes.steps) ? detailRes.steps : []);
        setRatings(Array.isArray(detailRes.ratings) ? detailRes.ratings : []);

        const imgs = Array.isArray(detailRes.imageUrls)
          ? detailRes.imageUrls.filter(Boolean)
          : mappedTicket.imageUrl
          ? [mappedTicket.imageUrl]
          : [];
        setAllImages(imgs);

        if (Array.isArray(detailRes.histories) && detailRes.histories.length > 0) {
          setHistory(mapAdminHistoryToUiHistory(detailRes.histories, mappedTicket.ticketId));
        } else {
          // Fallback thử gọi GET /api/v1/tickets/{id}/history nếu mảng histories trống
          const fallbackHist = await getTicketHistory(resolvedId).catch(() => []);
          if (fallbackHist.length > 0) {
            setHistory(
              fallbackHist.map((item) => ({
                ticketId: mappedTicket.ticketId,
                action: ((item.actionType || item.action) as TicketHistory['action']) || 'MANUAL_APPROVED',
                actor: item.actorName || item.actor || 'Hệ thống',
                note: item.note || item.description || 'Cập nhật trạng thái xử lý hồ sơ',
                time: (item.createdAt || item.timestamp)
                  ? new Date((item.createdAt || item.timestamp) as string).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : mappedTicket.createdAt,
              })),
            );
          } else {
            setHistory([
              {
                ticketId: mappedTicket.ticketId,
                action: 'CREATED',
                actor: `${mappedTicket.reporterName ?? 'Người dân'} (Cư dân)`,
                note: `Gửi phản ánh qua ${mappedTicket.reportedVia ?? 'Ứng dụng CityFix'} tại ${mappedTicket.address}`,
                time: mappedTicket.createdAt,
              },
            ]);
          }
        }
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Không thể tải thông tin chi tiết hồ sơ.');
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    if (initialTicket) {
      setTicketData(initialTicket);
      if (initialTicket.imageUrl) {
        setAllImages([initialTicket.imageUrl]);
      }
    }
    loadFullTicketDetail();
  }, [initialTicket, loadFullTicketDetail]);

  if (!ticketData && loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-600">
            Đang tải chi tiết hồ sơ từ máy chủ...
          </p>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 text-xs font-semibold transition-all cursor-pointer"
        >
          ← Quay lại danh sách
        </button>
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
          <p className="text-sm font-bold text-red-600">
            {errorMsg || 'Không tìm thấy dữ liệu hồ sơ sự cố.'}
          </p>
          <button
            onClick={loadFullTicketDetail}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 cursor-pointer"
          >
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  const ticket = ticketData;
  const st = STATUS_META[ticket.status] || STATUS_META.INITIATED;
  const sv = SEVERITY_META[ticket.severity] || SEVERITY_META.MEDIUM;
  const dg = DANGER_META[ticket.dangerLevel] || DANGER_META.CAUTION;
  const deptName = deptMeta?.name || ticket.departmentName || ticket.departmentId || 'Chưa phân tuyến';
  const catName = ticket.categoryName || ticket.categoryId || 'Chưa phân loại';

  const isRejected = ticket.status === 'REJECTED' || ticket.status === 'CANCELLED';
  let currentStageIdx = 0;
  if (ticket.status === 'COMPLETED') currentStageIdx = 4;
  else if (ticket.status === 'RESOLVED') currentStageIdx = 3;
  else if (ticket.status === 'IN_PROGRESS') currentStageIdx = 2;
  else if (ticket.status === 'ASSIGNED') currentStageIdx = 1;
  else currentStageIdx = 0;

  const lifecycleStages = [
    {
      key: 'INITIATED',
      title: '1. Tiếp nhận sự cố',
      desc: 'Người dân gửi phản ánh',
      time: ticket.createdAt,
    },
    {
      key: 'ASSIGNED',
      title: '2. Phân tuyến & Giao việc',
      desc: deptName,
      time: undefined,
    },
    {
      key: 'IN_PROGRESS',
      title: '3. Đang xử lý',
      desc: ticket.assigneeName || 'Cán bộ hiện trường',
      time: ticket.deadline ? `Hạn: ${ticket.deadline}` : undefined,
    },
    {
      key: 'RESOLVED',
      title: '4. Đã khắc phục',
      desc: 'Báo cáo minh chứng',
      time: undefined,
    },
    {
      key: 'COMPLETED',
      title: '5. Nghiệm thu & Đóng',
      desc: 'Hoàn tất & Lưu trữ',
      time: undefined,
    },
  ];

  const completedStepsCount = steps.filter((s) => {
    const k = String(s.status || '').toUpperCase();
    return k === 'COMPLETED' || k === 'RESOLVED';
  }).length;
  const stepsProgressPct = steps.length > 0 ? Math.round((completedStepsCount / steps.length) * 100) : 0;

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-6xl mx-auto">

      {/* ── Top Bar: Back + Ticket ID + Read-only Admin Badge ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <BackIcon /> Quay lại danh sách
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-mono-cf text-sm font-bold text-orange-600" title={ticket.ticketId}>
            {ticket.ticketId}
          </span>
          {ticket.isLifeThreatening && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono-cf text-[11px] font-bold">
              ● KHẨN CẤP (SOS)
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sv.cls}`}>
            Mức độ: {sv.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span className="px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold animate-pulse">
              Đang đồng bộ...
            </span>
          )}
          <button
            onClick={loadFullTicketDetail}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            ↻ Làm mới
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
            <EyeIcon />
            <span>Chế độ Xem & Tra cứu (Dành cho Quản trị viên)</span>
          </div>
        </div>
      </div>

      {/* ── Thông báo lỗi nếu có ── */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={loadFullTicketDetail}
            className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-100 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── Sơ đồ Tiến trình Vòng đời Hồ sơ (Ticket Lifecycle Pipeline Diagram) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <h3 className="font-display text-sm font-bold text-gray-900">
                Sơ đồ Tiến trình Vòng đời Hồ sơ (Lifecycle Pipeline)
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.cls}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${st.dot} mr-1.5`} />
                {st.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Theo dõi trực quan toàn bộ tiến trình từ lúc tiếp nhận đến khi nghiệm thu dứt điểm
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {ticket.isLifeThreatening && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-[11px] animate-pulse">
                ⚡ Sự cố SOS
              </span>
            )}
            <span className="px-3 py-1 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-xs shadow-2xs">
              Giai đoạn: <strong className="text-orange-600">{isRejected ? 'Đã từ chối' : `${currentStageIdx + 1}/5`}</strong>
            </span>
          </div>
        </div>

        {isRejected ? (
          <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-base shadow-xs">
              ✕
            </div>
            <div>
              <p className="text-xs font-bold text-red-900">
                Hồ sơ này đã bị Từ chối xử lý
              </p>
              <p className="text-[11px] text-red-700 mt-0.5">
                Sự cố không thuộc thẩm quyền xử lý hoặc phản ánh không hợp lệ theo quy chế đô thị.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="flex items-center justify-between min-w-[640px] relative px-2">
              {/* Thanh ray nền chạy ngang */}
              <div className="absolute left-8 right-8 top-5 h-1 bg-gray-100 rounded-full z-0" />
              {/* Thanh ray đã hoàn thành */}
              <div
                className="absolute left-8 top-5 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-orange-500 rounded-full z-0 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (currentStageIdx / (lifecycleStages.length - 1)) * 100))}%`,
                  maxWidth: 'calc(100% - 64px)',
                }}
              />

              {lifecycleStages.map((stage, idx) => {
                const isPassed = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;

                return (
                  <div
                    key={stage.key}
                    className="relative z-10 flex flex-col items-center text-center flex-1 min-w-[110px]"
                  >
                    {/* Node Circle */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                        isPassed
                          ? 'bg-emerald-500 text-white shadow-xs ring-4 ring-emerald-50'
                          : isCurrent
                          ? 'bg-orange-500 text-white shadow-md ring-4 ring-orange-100 scale-110'
                          : 'bg-white border-2 border-gray-200 text-gray-400'
                      }`}
                    >
                      {isPassed ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    {/* Stage Label */}
                    <span
                      className={`mt-2 text-xs font-bold ${
                        isCurrent
                          ? 'text-orange-600'
                          : isPassed
                          ? 'text-emerald-700'
                          : 'text-gray-400'
                      }`}
                    >
                      {stage.title}
                    </span>

                    {/* Stage Subtitle */}
                    <span className="text-[10px] text-gray-500 max-w-[110px] truncate mt-0.5" title={stage.desc}>
                      {stage.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Main 2-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left Column (2/3): Hình ảnh, Nội dung, Quy trình & Lịch sử xử lý ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Thông tin chính của phản ánh */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {allImages.length > 0 ? (
              <div className="relative h-64 sm:h-72 bg-slate-900 overflow-hidden">
                <img
                  src={allImages[0]}
                  alt={ticket.ticketId}
                  onClick={() => setPreviewImg(allImages[0])}
                  className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md bg-orange-500 text-white text-[11px] font-bold">
                      {catName}
                    </span>
                    {ticket.subCategoryName && (
                      <span className="ml-1.5 px-2.5 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-semibold backdrop-blur-xs">
                        {ticket.subCategoryName}
                      </span>
                    )}
                    <p className="text-white text-xs font-medium mt-1 drop-shadow-xs">
                      📍 {ticket.address} ({ticket.ward}, {ticket.province})
                    </p>
                  </div>
                  <button
                    onClick={() => setPreviewImg(allImages[0])}
                    className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium backdrop-blur-xs cursor-pointer"
                  >
                    Phóng to ảnh
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-36 bg-slate-100 border-b border-gray-100 flex flex-col items-center justify-center text-gray-400 text-xs gap-1">
                <span>📷 Hồ sơ không có ảnh hiện trường đính kèm</span>
                <span className="text-[11px] text-gray-400">
                  📍 {ticket.address} ({ticket.ward}, {ticket.province})
                </span>
              </div>
            )}

            {/* Danh sách ảnh bổ sung nếu có nhiều hơn 1 ảnh */}
            {allImages.length > 1 && (
              <div className="px-5 pt-3 flex items-center gap-2 overflow-x-auto">
                {allImages.map((imgUrl, idx) => (
                  <img
                    key={idx}
                    src={imgUrl}
                    alt={`Ảnh ${idx + 1}`}
                    onClick={() => setPreviewImg(imgUrl)}
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 cursor-zoom-in hover:border-orange-400 transition-all flex-shrink-0"
                  />
                ))}
              </div>
            )}

            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Nội dung phản ánh từ người dân
                </p>
                <p className="text-gray-900 text-sm leading-relaxed font-medium bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  {ticket.description}
                </p>
              </div>

              {/* Ảnh minh chứng khắc phục nếu đã có */}
              {ticket.evidenceUrls && ticket.evidenceUrls.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-2">
                    Hình ảnh Minh chứng Kết quả Xử lý ({ticket.evidenceUrls.length} ảnh)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ticket.evidenceUrls.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewImg(url)}
                        className="relative h-28 rounded-xl overflow-hidden border border-emerald-200 cursor-zoom-in group"
                      >
                        <img
                          src={url}
                          alt={`Minh chứng ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-semibold">
                          Ảnh nghiệm thu #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Các bước quy trình xử lý (Ticket Steps từ GET /api/v1/admin/tickets/{id}) */}
          {steps.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="font-display text-sm font-bold text-gray-900">
                      Sơ đồ & Tiến độ Quy trình Thực hiện Thực tế
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tiến độ hoàn thành từng bước nghiệp vụ của cán bộ phụ trách tại hiện trường
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs">
                    Tiến độ: {completedStepsCount}/{steps.length} bước ({stepsProgressPct}%)
                  </span>
                </div>
              </div>

              {/* Sơ đồ trực quan chuỗi bước xử lý (Horizontal Stepper Pipeline) */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-gray-200/80 mb-4 overflow-x-auto scrollbar-thin">
                <div className="flex items-center gap-2 min-w-max py-1">
                  {steps.map((s, idx) => {
                    const stKey = String(s.status || 'PENDING').toUpperCase();
                    const isDone = stKey === 'COMPLETED' || stKey === 'RESOLVED';
                    const isInProg = stKey === 'IN_PROGRESS' || stKey === 'ASSIGNED';

                    return (
                      <React.Fragment key={s.id || s.stepId || idx}>
                        <div
                          className={`w-44 p-3 rounded-xl border flex flex-col justify-between transition-all ${
                            isDone
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-2xs'
                              : isInProg
                              ? 'bg-orange-50/90 border-orange-300 text-orange-950 shadow-xs ring-2 ring-orange-500/15'
                              : 'bg-white border-gray-200 text-gray-500'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-mono-cf text-[10px] font-bold ${
                                isDone
                                  ? 'bg-emerald-500 text-white'
                                  : isInProg
                                  ? 'bg-orange-500 text-white animate-pulse'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isDone ? '✓' : idx + 1}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isInProg
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isDone ? 'Xong' : isInProg ? 'Đang làm' : 'Chờ'}
                            </span>
                          </div>

                          <div className="font-bold text-xs truncate text-gray-900" title={s.stepName}>
                            {s.stepName || `Bước #${idx + 1}`}
                          </div>

                          <div className="text-[10px] text-gray-500 truncate mt-1">
                            {s.assigneeName ? `👤 ${s.assigneeName}` : 'Chưa phân công'}
                          </div>
                        </div>

                        {idx < steps.length - 1 && (
                          <div className="flex items-center text-gray-300 flex-shrink-0 px-0.5">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {steps.map((s, idx) => {
                  const stKey = String(s.status || 'PENDING').toUpperCase();
                  const badge = STEP_STATUS_BADGE[stKey] || {
                    label: stKey,
                    cls: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  return (
                    <div
                      key={s.id || s.stepId || idx}
                      className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-100 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-orange-500 text-white font-mono-cf text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-900">
                            {s.stepName || `Bước xử lý #${idx + 1}`}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-500 pt-1">
                        <div>
                          Cán bộ:{' '}
                          <strong className="text-gray-800">{s.assigneeName || 'Chưa phân công'}</strong>
                        </div>
                        {s.deadline && (
                          <div>
                            Hạn xử lý:{' '}
                            <strong className="font-mono-cf text-orange-600">
                              {new Date(s.deadline).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </strong>
                          </div>
                        )}
                        {s.completedAt && (
                          <div>
                            Hoàn thành:{' '}
                            <strong className="font-mono-cf text-emerald-600">
                              {new Date(s.completedAt).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </strong>
                          </div>
                        )}
                      </div>

                      {s.notes && (
                        <p className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                          Ghi chú: {s.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nhật ký / Lịch sử xử lý hồ sơ */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-gray-900">
                  Nhật ký Giải quyết Hồ sơ
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lịch sử toàn bộ quá trình tiếp nhận, phân tuyến và xử lý sự cố
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                {history.length} mốc thời gian
              </span>
            </div>

            <div className="space-y-4">
              {history.map((h, i) => (
                <div key={i} className="flex gap-3.5 relative">
                  {i < history.length - 1 && (
                    <div className="absolute left-3.5 top-7 bottom-[-16px] w-0.5 bg-gray-100" />
                  )}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border ${
                      i === history.length - 1
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 bg-gray-50/70 rounded-xl p-3 border border-gray-100">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-gray-900">
                        {ACTION_LABEL[h.action] ?? h.action}
                      </span>
                      <span className="font-mono-cf text-[11px] text-gray-400">{h.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{h.note}</p>
                    <p className="text-[11px] text-orange-600 font-semibold mt-1">
                      Thực hiện bởi: {h.actor}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Đánh giá của người dân (nếu có) */}
          {ratings.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
              <h3 className="font-display text-sm font-bold text-gray-900 mb-3">
                Đánh giá từ Người dân ({ratings.length})
              </h3>
              <div className="space-y-2.5">
                {ratings.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800">
                        {r.isAnonymous ? 'Người dân ẩn danh' : r.userName || 'Người dân'}
                      </span>
                      <span className="font-mono-cf font-bold text-amber-600">
                        {'★'.repeat(Math.max(1, Math.min(5, Number(r.rate) || 5)))} ({r.rate}/5)
                      </span>
                    </div>
                    {r.feedback && <p className="text-xs text-gray-700 mt-1.5">{r.feedback}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column (1/3): Thông tin Định tuyến, Vị trí & Người phản ánh ── */}
        <div className="space-y-4">

          {/* Cơ quan & Phân tuyến */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-gray-400">
              Thông tin Định tuyến & Xử lý
            </h3>
            <div className="space-y-2.5 text-xs">
              <InfoRow label="Cơ quan phụ trách" value={deptName} highlight />
              <InfoRow
                label="Cấp quản lý"
                value={deptMeta?.level === 'WARD' ? 'Cấp Phường / Xã' : 'Cấp Thành phố (Sở/Ngành)'}
              />
              {deptMeta?.phoneNumber && (
                <InfoRow label="Hotline đơn vị" value={deptMeta.phoneNumber} mono />
              )}
              <InfoRow label="Danh mục sự cố" value={catName} />
              {ticket.subCategoryName && (
                <InfoRow label="Danh mục con" value={ticket.subCategoryName} />
              )}
              <InfoRow
                label="Cán bộ hiện trường"
                value={ticket.assigneeName ?? ticket.assigneeId ?? 'Chưa phân công'}
              />
              <InfoRow label="Cảnh báo an toàn" value={dg.label} />
              {ticket.deadline && <InfoRow label="Hạn xử lý (SLA)" value={ticket.deadline} mono />}
            </div>
          </div>

          {/* Vị trí & Địa bàn hành chính */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-gray-400">
              Vị trí & Địa bàn Hành chính
            </h3>
            <div className="space-y-2.5 text-xs">
              <InfoRow label="Địa chỉ chi tiết" value={ticket.address} />
              <InfoRow label="Phường / Xã" value={ticket.ward} highlight />
              <InfoRow label="Tỉnh / Thành phố" value={ticket.province} />
              <InfoRow
                label="Phương thức định vị"
                value={ticket.locationMethod === 'AUTO_GPS' ? 'Tự động qua GPS' : 'Nhập địa chỉ thủ công'}
              />
              <InfoRow
                label="Tọa độ GPS"
                value={`${ticket.location.lat.toFixed(4)}, ${ticket.location.lng.toFixed(4)}`}
                mono
              />
            </div>
            <a
              href={`https://www.google.com/maps?q=${ticket.location.lat},${ticket.location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              🗺️ Mở vị trí trên Google Maps ↗
            </a>
          </div>

          {/* Người gửi phản ánh */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-gray-400">
              Thông tin Người gửi Phản ánh
            </h3>
            <div className="space-y-2.5 text-xs">
              <InfoRow label="Họ và tên" value={ticket.reporterName ?? 'Người dân'} />
              <InfoRow label="Số điện thoại" value={ticket.reporterPhone ?? '—'} mono />
              {ticket.reporterEmail && (
                <InfoRow label="Email" value={ticket.reporterEmail} />
              )}
              <InfoRow label="Kênh gửi" value={ticket.reportedVia ?? 'Ứng dụng CityFix'} />
              <InfoRow label="Thời điểm tạo" value={ticket.createdAt} mono />
              <InfoRow label="Cập nhật gần nhất" value={ticket.updatedAt} mono />
              {ticket.feedbackRating && (
                <InfoRow
                  label="Đánh giá của dân"
                  value={`${'★'.repeat(Math.round(ticket.feedbackRating))} (${ticket.feedbackRating}/5)`}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox phóng to ảnh ── */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute -top-10 right-0 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold cursor-pointer"
            >
              Đóng ✕
            </button>
            <img
              src={previewImg}
              alt="Xem ảnh lớn"
              className="w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span
        className={`text-right ${mono ? 'font-mono-cf' : ''} ${
          highlight ? 'font-bold text-orange-600' : 'font-semibold text-gray-800'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
