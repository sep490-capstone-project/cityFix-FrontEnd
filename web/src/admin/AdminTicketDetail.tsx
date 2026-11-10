import React, { useState, useEffect } from 'react';
import {
  Ticket,
  getDept,
  getCat,
  getUser,
  TICKET_HISTORY,
  statusInfo,
  sevInfo,
  dangerInfo,
} from '../data';
import {
  BuildingIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
} from '../components/Icons';
import { getTicketHistory, TicketHistoryItemResponse } from '../services/tickets';
import { getDepartments, DepartmentItem, formatDepartmentLevel } from '../services/departments';

interface Props {
  ticket: Ticket;
  onBack: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Khởi tạo hồ sơ',
  AI_REVIEWED: 'Phân loại tự động',
  MANUAL_APPROVED: 'Duyệt hồ sơ',
  ROUTED: 'Định tuyến đơn vị',
  ASSIGNED: 'Phân công cán bộ',
  REASSIGNED: 'Điều chỉnh phân công',
  REROUTED: 'Chuyển giao đơn vị',
  WORK_STARTED: 'Bắt đầu xử lý',
  IN_PROGRESS: 'Đang xử lý',
  EVIDENCE_SUBMITTED: 'Cập nhật kết quả',
  RESOLVED: 'Đã giải quyết',
  COMPLETED: 'Hoàn thành hồ sơ',
  CLOSED: 'Đóng hồ sơ',
  REJECTED: 'Từ chối hồ sơ',
};

export default function TicketDetail({ ticket, onBack }: Props) {
  const [historyList, setHistoryList] = useState<
    Array<{ action: string; actor: string; note: string; time: string }>
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deptDetail, setDeptDetail] = useState<DepartmentItem | null>(null);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const fallbackDept = getDept(ticket.departmentId);
  const cat = getCat(ticket.categoryId);
  const reporter = getUser(ticket.userId);

  useEffect(() => {
    let mounted = true;

    async function loadExtraInfo() {
      setLoadingHistory(true);
      try {
        const lookupId = ticket.rawId || ticket.ticketId;
        const apiHistory = await getTicketHistory(lookupId);
        if (mounted && apiHistory && apiHistory.length > 0) {
          const mapped = apiHistory.map((h: TicketHistoryItemResponse) => {
            const rawAction = h.actionType || h.action || 'UPDATED';
            const rawTime = h.createdAt || h.timestamp || '';
            const formattedTime = rawTime
              ? new Date(rawTime).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—';
            return {
              action: ACTION_LABELS[rawAction] || rawAction,
              actor: h.actorName || h.actor || h.actorId || 'Hệ thống',
              note: h.note || h.description || 'Cập nhật trạng thái hồ sơ',
              time: formattedTime,
            };
          });
          setHistoryList(mapped);
        } else if (mounted) {
          const mockHist = TICKET_HISTORY[ticket.ticketId] ?? [
            {
              ticketId: ticket.ticketId,
              action: 'CREATED',
              actor: reporter?.fullName || ticket.userId || 'Cư dân',
              note: 'Gửi phản ánh sự cố lên hệ thống',
              time: ticket.createdAt,
            },
            {
              ticketId: ticket.ticketId,
              action: 'ROUTED',
              actor: 'Hệ thống Định tuyến',
              note: `Định tuyến đến ${ticket.departmentName || fallbackDept?.name || 'Đơn vị phụ trách'}`,
              time: ticket.updatedAt || ticket.createdAt,
            },
          ];
          setHistoryList(
            mockHist.map((m) => ({
              action: ACTION_LABELS[m.action] || m.action,
              actor: m.actor,
              note: m.note,
              time: m.time,
            }))
          );
        }
      } catch {
        if (mounted) {
          const mockHist = TICKET_HISTORY[ticket.ticketId] ?? [
            {
              ticketId: ticket.ticketId,
              action: 'CREATED',
              actor: reporter?.fullName || ticket.userId || 'Cư dân',
              note: 'Gửi phản ánh sự cố lên hệ thống',
              time: ticket.createdAt,
            },
            {
              ticketId: ticket.ticketId,
              action: 'ROUTED',
              actor: 'Hệ thống Định tuyến',
              note: `Định tuyến đến ${ticket.departmentName || fallbackDept?.name || 'Đơn vị phụ trách'}`,
              time: ticket.updatedAt || ticket.createdAt,
            },
          ];
          setHistoryList(
            mockHist.map((m) => ({
              action: ACTION_LABELS[m.action] || m.action,
              actor: m.actor,
              note: m.note,
              time: m.time,
            }))
          );
        }
      } finally {
        if (mounted) setLoadingHistory(false);
      }

      try {
        const deptsRes = await getDepartments({ page: 0, size: 100 });
        const list: DepartmentItem[] = Array.isArray(deptsRes)
          ? deptsRes
          : Array.isArray((deptsRes as any)?.content)
          ? (deptsRes as any).content
          : [];
        const matched = list.find((d) => d.departmentId === ticket.departmentId);
        if (mounted && matched) {
          setDeptDetail(matched);
        }
      } catch {
        // Ignore error and use fallback
      }
    }

    loadExtraInfo();
    return () => {
      mounted = false;
    };
  }, [ticket, fallbackDept?.name, reporter?.fullName]);

  const deptName = deptDetail?.name || ticket.departmentName || fallbackDept?.name || 'Chưa phân công đơn vị';
  const deptLevel = deptDetail?.level || fallbackDept?.level;
  const catName = ticket.categoryName || cat?.name || 'Hạ tầng đô thị';
  const images = [
    ...(ticket.imageUrl ? [ticket.imageUrl] : []),
    ...(Array.isArray(ticket.evidenceUrls) ? ticket.evidenceUrls : []),
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 screen-enter">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors text-[12px] font-semibold cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Quay lại
          </button>

          <span className="font-mono text-[13px] font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
            {ticket.ticketId}
          </span>

          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${statusInfo(ticket.status).cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo(ticket.status).dot}`} />
            {statusInfo(ticket.status).label}
          </span>

          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${sevInfo(ticket.severity).cls}`}>
            Mức độ: {sevInfo(ticket.severity).label}
          </span>

          {ticket.isLifeThreatening && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border text-red-700 bg-red-50 border-red-200">
              Khẩn cấp (SOS)
            </span>
          )}
        </div>

        <span className="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg self-start sm:self-auto">
          Chế độ Xem (Read-only) • Chỉ tra cứu
        </span>
      </div>

      {/* Main Content: 2 Clean Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7/12): Ticket Details & Location */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Incident Content */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">
                Nội dung Phản ánh Sự cố
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                {catName}
              </span>
            </div>

            <p className="text-[14px] text-gray-800 leading-relaxed font-medium">
              {ticket.description}
            </p>

            {/* Location Info (Province -> Ward -> Address) */}
            <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <MapPinIcon className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-[12px]">
                  <p className="font-bold text-gray-900">{ticket.address}</p>
                  <p className="text-gray-600">
                    Phường/Xã: <strong className="text-gray-800">{ticket.ward || '—'}</strong> • Tỉnh/Thành phố:{' '}
                    <strong className="text-gray-800">{ticket.province || '—'}</strong>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 font-mono">
                <span>
                  Tọa độ GPS: {ticket.location.lat.toFixed(5)}, {ticket.location.lng.toFixed(5)}
                </span>
                <span>
                  Định vị: {ticket.locationMethod === 'AUTO_GPS' ? 'GPS tự động' : 'Nhập thủ công'}
                </span>
              </div>
            </div>

            {/* Attached Images (only if present) */}
            <div className="pt-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Hình ảnh đính kèm
              </p>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setZoomImg(url)}
                      className="h-36 rounded-xl border border-gray-200 overflow-hidden bg-gray-100 cursor-pointer group relative"
                    >
                      <img
                        src={url}
                        alt={`Ảnh hiện trường ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 px-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-center text-[12px] text-gray-400">
                  Không có hình ảnh đính kèm trên hồ sơ này
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Department & Reporter */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 mb-4">
              Đơn vị Phụ trách & Người Gửi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold uppercase">
                  <BuildingIcon className="w-3.5 h-3.5 text-orange-500" />
                  <span>Cơ quan tiếp nhận</span>
                </div>
                <p className="font-bold text-gray-900 text-[13px]">{deptName}</p>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  {deptLevel && (
                    <span className="px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-600 font-medium">
                      {formatDepartmentLevel(deptLevel)}
                    </span>
                  )}
                  <span>Cán bộ: <strong className="text-gray-700">{ticket.assigneeId || 'Chưa phân công'}</strong></span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold uppercase">
                  <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Người gửi phản ánh</span>
                </div>
                <p className="font-bold text-gray-900 text-[13px]">
                  {ticket.reporterName || reporter?.fullName || ticket.userId || 'Cư dân'}
                </p>
                <p className="text-[11px] text-gray-500">
                  Liên hệ: {ticket.reporterPhone || reporter?.phoneNumber || 'Đã xác thực qua ứng dụng'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5/12): Metadata & Ticket History */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Metadata Summary */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100">
              Thông tin Thời gian & Mức độ
            </h3>

            <div className="divide-y divide-gray-100 text-[12px]">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-500">Thời điểm tiếp nhận</span>
                <span className="font-mono font-semibold text-gray-800">{ticket.createdAt}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-500">Cập nhật gần nhất</span>
                <span className="font-mono font-semibold text-gray-800">{ticket.updatedAt || ticket.createdAt}</span>
              </div>
              {ticket.deadline && (
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-gray-500">Hạn xử lý (SLA)</span>
                  <span className="font-mono font-bold text-orange-600">{ticket.deadline}</span>
                </div>
              )}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-500">Mức độ nguy hiểm</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${dangerInfo(ticket.dangerLevel).cls}`}>
                  {dangerInfo(ticket.dangerLevel).label}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Audit Trail / Ticket History */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-orange-500" />
                <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">
                  Lịch sử Xử lý Hồ sơ
                </h3>
              </div>
              <span className="text-[11px] text-gray-400">
                {loadingHistory ? 'Đang tải...' : `${historyList.length} sự kiện`}
              </span>
            </div>

            {historyList.length === 0 ? (
              <p className="text-[12px] text-gray-400 text-center py-6">
                Chưa có lịch sử cập nhật cho hồ sơ này.
              </p>
            ) : (
              <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {historyList.map((h, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full border-2 border-white bg-orange-500" />
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-bold text-gray-900">{h.action}</p>
                        <span className="text-[10px] font-mono text-gray-400">{h.time}</span>
                      </div>
                      <p className="text-[12px] text-gray-600">{h.note}</p>
                      <p className="text-[11px] text-gray-400">Thực hiện: {h.actor}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomImg && (
        <div
          onClick={() => setZoomImg(null)}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img src={zoomImg} alt="Ảnh hiện trường" className="w-full h-full object-contain" />
            <button
              onClick={() => setZoomImg(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
