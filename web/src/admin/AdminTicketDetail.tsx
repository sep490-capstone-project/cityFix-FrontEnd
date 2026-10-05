import { useState } from 'react';
import { Ticket, STATUS_MAP, StatusKey, getDept, getCat, getUser, USERS, DEPARTMENTS, ROUTING_RULES, TICKET_HISTORY, statusInfo, sevInfo, dangerInfo } from '../data';

interface Props { ticket: Ticket; onBack: () => void; }

const HISTORY_LABELS: Record<string, string> = {
  CREATED: 'Tạo Hồ sơ', AI_REVIEWED: 'AI xem xét', MANUAL_APPROVED: 'Duyệt thủ công',
  ROUTED: 'Định tuyến', ASSIGNED: 'Phân công', REASSIGNED: 'Phân công lại',
  REROUTED: 'Định tuyến lại', WORK_STARTED: 'Bắt đầu xử lý',
  EVIDENCE_SUBMITTED: 'Nộp bằng chứng', CLOSED: 'Đóng Hồ sơ',
};

export default function TicketDetail({ ticket: initialTicket, onBack }: Props) {
  const [ticket, setTicket] = useState(initialTicket);
  const [newStatus, setNewStatus] = useState<StatusKey>(initialTicket.status);
  const [statusUpdated, setStatusUpdated] = useState(false);

  // Flow 2: Accept & Assign state
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId ?? '');
  const [assignMsg, setAssignMsg] = useState('');

  // Flow 2: Re-route state
  const [showReroute, setShowReroute] = useState(false);
  const [rerouteDept, setRerouteDept] = useState(ticket.departmentId);
  const [rerouteReason, setRerouteReason] = useState('');
  const [rerouteDone, setRerouteDone] = useState(false);

  // Flow 4: Feedback section
  const [showFeedback] = useState(ticket.status === 'RESOLVED' || ticket.status === 'COMPLETED');

  const dept = getDept(ticket.departmentId);
  const cat = getCat(ticket.categoryId);
  const reporter = getUser(ticket.userId);
  const assignee = ticket.assigneeId ? getUser(ticket.assigneeId) : null;
  const history = TICKET_HISTORY[ticket.ticketId] ?? [];

  // Staff in current department
  const deptStaff = USERS.filter(u => u.role === 'STAFF' && u.departmentId === ticket.departmentId);
  // Routing rule that matched
  const matchedRule = ROUTING_RULES.find(r =>
    r.categoryId === ticket.categoryId && r.departmentId === ticket.departmentId
  ) ?? ROUTING_RULES.find(r => r.categoryId === ticket.categoryId);

  function handleAssign() {
    if (!assigneeId) return;
    const u = getUser(assigneeId);
    setTicket(t => ({ ...t, assigneeId, status: 'ASSIGNED' }));
    setNewStatus('ASSIGNED');
    setAssignMsg(`Đã phân công cho ${u?.fullName ?? assigneeId}`);
  }

  function handleReroute() {
    if (!rerouteDept || !rerouteReason) return;
    setTicket(t => ({ ...t, departmentId: rerouteDept, assigneeId: undefined, status: 'OPEN' }));
    setNewStatus('OPEN');
    setShowReroute(false);
    setRerouteDone(true);
  }

  function handleStatusUpdate() {
    setTicket(t => ({ ...t, status: newStatus }));
    setStatusUpdated(true);
    setTimeout(() => setStatusUpdated(false), 2000);
  }

  const canAssign = ticket.status === 'OPEN' || ticket.status === 'ASSIGNED';
  const canReroute = ticket.status === 'OPEN' || ticket.status === 'ASSIGNED' || ticket.status === 'PENDING_REVIEW';

  return (
    <div className="p-6 space-y-5 screen-enter">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors text-[13px] font-semibold active:scale-[0.97]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Quay lại
        </button>
        <span className="font-mono-cf text-[12px] text-gray-400 tracking-widest">{ticket.ticketId}</span>
        {ticket.isLifeThreatening && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border text-red-600 bg-red-50 border-red-200 inline-flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> SOS — Đe dọa tính mạng
          </span>
        )}
        {ticket.needsManualReview && ticket.status === 'PENDING_REVIEW' && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border text-amber-600 bg-amber-50 border-amber-200">
            Cần xét duyệt thủ công
          </span>
        )}
        <div className="flex-1" />
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${statusInfo(ticket.status).cls}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusInfo(ticket.status).dot}`} /> {statusInfo(ticket.status).label}
        </span>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${sevInfo(ticket.severity).cls}`}>{sevInfo(ticket.severity).label}</span>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${dangerInfo(ticket.dangerLevel).cls}`}>{dangerInfo(ticket.dangerLevel).label}</span>
      </div>

      {/* Flow 2: Re-route success banner */}
      {rerouteDone && (
        <div className="relative rounded-2xl overflow-hidden border border-blue-200">
          <div className="absolute inset-0 bg-blue-50" />
          <div className="relative flex items-center gap-3 px-5 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <p className="text-[13px] font-bold text-blue-600">
              Đã định tuyến lại → {getDept(rerouteDept)?.name ?? rerouteDept}. Hồ sơ đang chờ tiếp nhận.
            </p>
          </div>
        </div>
      )}

      {/* Flow 2: Assign success */}
      {assignMsg && (
        <div className="relative rounded-2xl overflow-hidden border border-green-200">
          <div className="absolute inset-0 bg-green-50" />
          <div className="relative flex items-center gap-3 px-5 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <p className="text-[13px] font-bold text-green-600">{assignMsg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Left */}
        <div className="xl:col-span-2 space-y-4">
          {/* A. Ticket Info */}
          <Card label="A. Thông tin Hồ sơ">
            <Row label="Mã Hồ sơ"><span className="font-mono-cf text-orange-500">{ticket.ticketId}</span></Row>
            <Row label="Danh mục">{cat?.name}</Row>
            <Row label="Mô tả"><span className="text-gray-700 leading-relaxed">{ticket.description}</span></Row>
            <Row label="Mức độ nghiêm trọng">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${sevInfo(ticket.severity).cls}`}>{sevInfo(ticket.severity).label}</span>
            </Row>
            <Row label="Mức nguy hiểm">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${dangerInfo(ticket.dangerLevel).cls}`}>{dangerInfo(ticket.dangerLevel).label}</span>
            </Row>
            <Row label="Đe dọa tính mạng">
              <span className={`text-[11px] font-bold ${ticket.isLifeThreatening ? 'text-red-400' : 'text-green-600'}`}>
                {ticket.isLifeThreatening ? 'Có ⚠' : 'Không'}
              </span>
            </Row>
          </Card>

          {/* B. Location */}
          <Card label="B. Vị trí">
            <Row label="Tỉnh/Thành phố">{ticket.province}</Row>
            <Row label="Phường/Xã">{ticket.ward}</Row>
            <Row label="Địa chỉ">{ticket.address}</Row>
            <Row label="Phương thức xác định">
              <span className="font-mono-cf text-[11px] text-gray-500">{ticket.locationMethod}</span>
            </Row>
            <Row label="Tọa độ">
              <span className="font-mono-cf text-[11px] text-gray-500">{ticket.location.lat.toFixed(4)}, {ticket.location.lng.toFixed(4)}</span>
            </Row>
            <div className="mt-2 h-36 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 blueprint-grid opacity-60" />
              <div className="relative text-center">
                <svg className="mx-auto mb-2 text-orange-500" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <p className="font-mono-cf text-[10px] text-gray-400">{ticket.location.lat.toFixed(4)}, {ticket.location.lng.toFixed(4)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{ticket.address}, {ticket.ward}</p>
              </div>
            </div>
          </Card>

          {/* C. Reporter */}
          <Card label="C. Người báo cáo">
            <Row label="Họ tên">{reporter?.fullName ?? ticket.userId}</Row>
            <Row label="Email">{reporter?.email ?? '—'}</Row>
            <Row label="Điện thoại">{reporter?.phoneNumber ?? '—'}</Row>
          </Card>

          {/* D. AI Verification */}
          <div className="bg-white border border-orange-200 rounded-2xl overflow-hidden card-depth">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-100 flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              </div>
              <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">D. Xác minh AI</p>
              <span className="font-mono-cf text-[10px] text-orange-500 ml-auto">Độ tin cậy: {ticket.aiConfidence ?? 0}%</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${ticket.aiConfidence ?? 0}%`, background: 'linear-gradient(90deg,#9a3412,#f97316 55%,#fb923c)' }} />
              </div>
              {ticket.aiSeverity && <Row label="Phân loại AI">{getCat(ticket.aiCategory ?? '')?.name ?? ticket.aiCategory}</Row>}
              {ticket.aiSeverity && <Row label="Mức độ AI">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${sevInfo(ticket.aiSeverity).cls}`}>{sevInfo(ticket.aiSeverity).label}</span>
              </Row>}
              {ticket.aiDangerLevel && <Row label="Nguy hiểm AI">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${dangerInfo(ticket.aiDangerLevel).cls}`}>{dangerInfo(ticket.aiDangerLevel).label}</span>
              </Row>}
              <Row label="Đe dọa tính mạng (AI)">
                <span className={`text-[11px] font-bold ${ticket.isLifeThreatening ? 'text-red-400' : 'text-green-600'}`}>{ticket.isLifeThreatening ? 'Có' : 'Không'}</span>
              </Row>
              <Row label="Cần xét duyệt thủ công">
                <span className={`text-[11px] font-bold ${ticket.needsManualReview ? 'text-amber-400' : 'text-green-600'}`}>{ticket.needsManualReview ? 'Có' : 'Không'}</span>
              </Row>
              {/* Flow 2 routing decision display */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">Quyết định định tuyến AI</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${ticket.needsManualReview ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  <p className="text-[12px] text-gray-500">
                    {ticket.needsManualReview
                      ? 'Yêu cầu xét duyệt thủ công → Chuyển PENDING_REVIEW'
                      : 'AI Auto Submit → Định tuyến tự động đến cơ quan'}
                  </p>
                </div>
                {matchedRule && (
                  <div className="mt-2 bg-gray-50/80 border border-gray-100 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Quy tắc khớp</p>
                    <p className="font-mono-cf text-[11px] text-orange-500">{matchedRule.ruleId}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{cat?.name} · {matchedRule.ward}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Flow 4: Feedback section (after RESOLVED/COMPLETED) */}
          {showFeedback && (
            <div className="bg-white border border-teal-200 rounded-2xl overflow-hidden card-depth">
              <div className="px-5 pt-3.5 pb-3 border-b border-gray-100 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">G. Đánh giá cư dân (Flow 4)</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Điểm trung bình</p>
                    <p className="font-display text-[28px] font-extrabold text-teal-600">4.2</p>
                    <div className="flex justify-center gap-0.5 mt-1">
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={i <= 4 ? '#2dd4bf' : 'none'} stroke="#2dd4bf" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tỷ lệ không hài lòng</p>
                    <p className="font-display text-[28px] font-extrabold text-green-600">18%</p>
                    <p className="text-[10px] text-gray-400 mt-1">Dưới ngưỡng 50%</p>
                  </div>
                </div>
                <div className="bg-gray-50/80 border border-gray-100 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bình luận cư dân</p>
                  <p className="text-[12px] text-gray-500 italic">"Đã xử lý khá nhanh, mặc dù mất 2 ngày nhưng kết quả tốt. Cảm ơn cơ quan!"</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">— Người dùng {ticket.userId} · 12/09/2026</p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-gray-500">Không kích hoạt cảnh báo — Tỷ lệ không hài lòng dưới 50%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="space-y-4">

          {/* E. Routing & Assignment — FLOW 2 core */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden card-depth">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">E. Định tuyến & Phân công</p>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Flow 2</span>
            </div>

            {/* Routing pipeline */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-1.5 mb-3">
                {[
                  { label: 'AI/Manual', done: true },
                  { label: 'Định tuyến', done: ticket.status !== 'INITIATED' && ticket.status !== 'PENDING_REVIEW' },
                  { label: 'Phân công', done: ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS' || ticket.status === 'RESOLVED' || ticket.status === 'COMPLETED' },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-1">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider
                      ${step.done ? 'border-orange-500/30 bg-orange-500/10 text-orange-500' : 'border-gray-100 text-gray-400'}`}>
                      {step.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      {step.label}
                    </div>
                    {i < 2 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="flex items-start gap-3 px-5 py-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] w-28 flex-shrink-0 mt-0.5">Cơ quan hiện tại</p>
                <p className="text-[13px] text-gray-700 flex-1">{dept?.name}</p>
              </div>
              <div className="flex items-start gap-3 px-5 py-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] w-28 flex-shrink-0 mt-0.5">Email liên hệ</p>
                <p className="font-mono-cf text-[11px] text-gray-500 flex-1">{dept?.contactEmail}</p>
              </div>
              <div className="flex items-start gap-3 px-5 py-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] w-28 flex-shrink-0 mt-0.5">Nhân viên phụ trách</p>
                <p className="text-[13px] text-gray-700 flex-1">
                  {assignee?.fullName ?? <span className="text-gray-400">Chưa phân công</span>}
                </p>
              </div>
            </div>

            {/* Accept & Assign — Flow 2 "Accept & Assign" action */}
            {canAssign && (
              <div className="px-5 pt-3 pb-4 border-t border-gray-100 space-y-2.5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Phân công nhân viên xử lý</p>
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors">
                  <option value="">— Chọn nhân viên —</option>
                  {deptStaff.length > 0
                    ? deptStaff.map(u => <option key={u.userId} value={u.userId}>{u.fullName}</option>)
                    : USERS.filter(u => u.role === 'STAFF').map(u => <option key={u.userId} value={u.userId}>{u.fullName}</option>)
                  }
                </select>
                <button onClick={handleAssign} disabled={!assigneeId}
                  className="w-full relative rounded-xl overflow-hidden px-4 py-2.5 active:scale-[0.97] transition-transform disabled:opacity-40">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">✓ Tiếp nhận & Phân công</span>
                </button>
              </div>
            )}

            {/* Reject & Re-route — Flow 2 "Từ chối & Bổ sung cơ quan đúng" */}
            {canReroute && (
              <div className="px-5 pb-4 border-t border-gray-100">
                {!showReroute ? (
                  <button onClick={() => setShowReroute(true)}
                    className="w-full mt-3 py-2.5 rounded-xl border border-red-200 text-red-600 text-[12px] font-bold uppercase tracking-wide hover:bg-red-50 transition-colors active:scale-[0.97]">
                    ✕ Từ chối & Chuyển cơ quan đúng
                  </button>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-[0.15em]">Chuyển cơ quan đúng (Re-route)</p>
                    <select value={rerouteDept} onChange={e => setRerouteDept(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
                      {DEPARTMENTS.map(d => <option key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
                    </select>
                    <textarea value={rerouteReason} onChange={e => setRerouteReason(e.target.value)}
                      rows={2} placeholder="Lý do từ chối & chuyển..."
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-white placeholder-gray-400 outline-none focus:border-orange-500/50 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => setShowReroute(false)}
                        className="flex-1 py-2 rounded-xl border border-gray-200/60 text-gray-500 text-[12px] font-semibold hover:text-gray-700 transition-colors">
                        Hủy
                      </button>
                      <button onClick={handleReroute} disabled={!rerouteReason.trim()}
                        className="flex-1 relative rounded-xl overflow-hidden py-2 active:scale-[0.97] transition-transform disabled:opacity-40">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-800 to-red-600" />
                        <span className="relative text-white font-bold text-[12px]">Xác nhận chuyển</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status update */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden card-depth">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-100">
              <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">Cập nhật trạng thái</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as StatusKey)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors">
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={handleStatusUpdate}
                className="w-full relative rounded-xl overflow-hidden px-4 py-2.5 active:scale-[0.97] transition-transform">
                <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'repeating-linear-gradient(-45deg,white,white 8px,transparent 8px,transparent 16px)' }} />
                <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">
                  {statusUpdated ? '✓ Đã cập nhật' : 'Cập nhật'}
                </span>
              </button>
            </div>
          </div>

          {/* F. Timeline */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden card-depth">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-100">
              <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">F. Lịch sử xử lý</p>
            </div>
            <div className="px-5 py-4">
              {history.length === 0 && <p className="text-[12px] text-gray-400">Chưa có lịch sử</p>}
              {history.map((h, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[9px] font-bold
                      ${i === history.length - 1 ? 'bg-orange-500 border-orange-400 text-white' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                      {i + 1}
                    </div>
                    {i < history.length - 1 && <div className="w-0.5 h-8 mt-1 bg-gray-100" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className={`text-[12px] font-semibold ${i === history.length - 1 ? 'text-orange-500' : 'text-gray-700'}`}>
                      {HISTORY_LABELS[h.action] ?? h.action}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{h.note}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-gray-400">{h.actor}</p>
                      <span className="text-gray-300">·</span>
                      <p className="font-mono-cf text-[10px] text-gray-400">{h.time}</p>
                    </div>
                    {i === history.length - 1 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping-slow" />
                        <span className="text-[10px] text-orange-500 font-medium">Hiện tại</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden card-depth">
            <div className="divide-y divide-gray-100">
              <MetaRow label="Ngày tạo" val={ticket.createdAt} />
              <MetaRow label="Cập nhật" val={ticket.updatedAt} />
              <MetaRow label="Người dùng ID" val={ticket.userId} mono />
              <MetaRow label="Phương thức vị trí" val={ticket.locationMethod} mono />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden card-depth">
      <div className="px-5 pt-3 pb-2.5 border-b border-gray-100">
        <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">{label}</p>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-2.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] w-36 flex-shrink-0 mt-0.5">{label}</p>
      <p className="text-[13px] text-gray-700 flex-1">{children}</p>
    </div>
  );
}

function MetaRow({ label, val, mono }: { label: string; val: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">{label}</p>
      <p className={`text-[12px] text-gray-500 ${mono ? 'font-mono-cf' : ''}`}>{val}</p>
    </div>
  );
}

