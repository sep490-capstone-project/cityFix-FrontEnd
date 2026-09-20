import { useState } from 'react';
import { Ticket, User, getCat, getDept, getUser, statusInfo, sevInfo, dangerInfo, TICKET_HISTORY, DEPARTMENTS } from '../data';

interface Props {
  ticket: Ticket;
  currentUser: User;
  onBack: () => void;
}

export default function StaffTicketDetail({ ticket: initialTicket, currentUser, onBack }: Props) {
  const [ticket, setTicket] = useState(initialTicket);
  const [showResForm, setShowResForm] = useState(false);
  const [resNote, setResNote] = useState('');
  const [resImg, setResImg] = useState('');
  const [done, setDone] = useState(false);
  // Flow 3: progress chat
  const [progressNotes, setProgressNotes] = useState<{ text: string; time: string }[]>([]);
  const [progressInput, setProgressInput] = useState('');
  // Flow 3: transfer dept
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferDept, setTransferDept] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferred, setTransferred] = useState(false);

  const cat    = getCat(ticket.categoryId);
  const dept   = getDept(ticket.departmentId);
  const si     = statusInfo(ticket.status);
  const sv     = sevInfo(ticket.severity);
  const di     = dangerInfo(ticket.dangerLevel);
  const aiSv   = sevInfo(ticket.aiSeverity ?? '');
  const aiDi   = dangerInfo(ticket.aiDangerLevel ?? '');
  const assignee = getUser(ticket.assigneeId ?? '');
  const history = TICKET_HISTORY[ticket.ticketId] ?? [];

  const canStartWork = ticket.status === 'ASSIGNED' && ticket.assigneeId === currentUser.userId;
  const canSubmitRes = ticket.status === 'IN_PROGRESS' && ticket.assigneeId === currentUser.userId;

  function startWork() {
    setTicket({ ...ticket, status: 'IN_PROGRESS' });
  }

  function submitResolution() {
    if (!resNote.trim()) return;
    setTicket({ ...ticket, status: 'RESOLVED' });
    setShowResForm(false);
    setDone(true);
  }

  function addProgressNote() {
    if (!progressInput.trim()) return;
    setProgressNotes(n => [...n, { text: progressInput, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]);
    setProgressInput('');
  }

  function handleTransfer() {
    if (!transferDept || !transferReason.trim()) return;
    setTransferred(true);
    setShowTransfer(false);
    setTicket(t => ({ ...t, departmentId: transferDept }));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto screen-enter space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-[13px] font-semibold transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Quay lại
        </button>
        <div className="flex-1" />
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${si.cls}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
          {si.label}
        </span>
      </div>

      {/* Life-threatening banner */}
      {ticket.isLifeThreatening && (
        <div className="relative rounded-2xl overflow-hidden border border-red-500/40">
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-white" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'repeating-linear-gradient(-45deg,#ef4444,#ef4444 8px,transparent 8px,transparent 16px)' }} />
          <div className="relative flex items-center gap-3 px-5 py-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-[13px] font-bold text-red-300">Cảnh báo: Vé này có nguy cơ đe dọa tính mạng người dân</p>
          </div>
        </div>
      )}

      {done && (
        <div className="relative rounded-2xl overflow-hidden border border-green-500/40">
          <div className="absolute inset-0 bg-green-50" />
          <div className="relative flex items-center gap-3 px-5 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <p className="text-[13px] font-bold text-green-400">Đã ghi nhận kết quả xử lý. Vé chuyển sang trạng thái Đã giải quyết.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {/* A – Thông tin vé */}
          <Section title="A — Thông tin vé">
            <InfoGrid items={[
              { label: 'ID vé', val: ticket.ticketId, mono: true },
              { label: 'Danh mục', val: cat?.name },
              { label: 'Địa chỉ', val: ticket.address },
              { label: 'Phường / Quận', val: `${ticket.ward} — ${ticket.district}` },
              { label: 'Tỉnh / TP', val: ticket.province },
              { label: 'Ngày tạo', val: ticket.createdAt, mono: true },
            ]} />
            <div className="flex gap-2 flex-wrap mt-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${sv.cls}`}>{sv.label}</span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${di.cls}`}>{di.label}</span>
              {ticket.isLifeThreatening && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400">Đe dọa tính mạng</span>
              )}
            </div>
          </Section>

          {/* B – Vị trí */}
          <Section title="B — Vị trí & Bằng chứng">
            <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-300 h-36 flex items-center justify-center">
              <div className="text-center space-y-1">
                <svg className="mx-auto text-gray-300" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <p className="text-[11px] text-gray-300">{ticket.address}, {ticket.ward}</p>
              </div>
            </div>
            {(ticket.evidenceUrls?.length ?? 0) > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {ticket.evidenceUrls!.map((u, i) => (
                  <div key={i} className="w-20 h-20 rounded-xl bg-gray-50 border border-gray-300 flex items-center justify-center text-gray-300">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* C – Người báo cáo */}
          <Section title="C — Người báo cáo">
            <InfoGrid items={[
              { label: 'Họ tên', val: ticket.reporterName },
              { label: 'Điện thoại', val: ticket.reporterPhone, mono: true },
              { label: 'Email', val: ticket.reporterEmail, mono: true },
              { label: 'Kênh gửi', val: ticket.reportedVia },
            ]} />
          </Section>

          {/* D – Kết quả AI (read-only) */}
          <Section title="D — Phân tích AI (chỉ xem)">
            <div className="relative rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 grid grid-cols-2 gap-3">
              <div className="absolute top-2 right-2">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg border border-gray-300 text-gray-400 bg-white uppercase tracking-wider">Chỉ xem</span>
              </div>
              <InfoItem label="Mức độ AI" val={aiSv.label} badge cls={aiSv.cls} />
              <InfoItem label="Nguy hiểm AI" val={aiDi.label} badge cls={aiDi.cls} />
              <InfoItem label="Điểm xác minh" val={ticket.aiVerificationScore != null ? String(ticket.aiVerificationScore) : '—'} />
              <InfoItem label="Cần xét duyệt thủ công" val={ticket.needsManualReview ? 'Có' : 'Không'} />
            </div>
          </Section>
        </div>

        <div className="space-y-4">
          {/* E – Phân công (read-only) */}
          <Section title="E — Phân công (chỉ xem)">
            <div className="space-y-2">
              <InfoItem label="Cơ quan" val={dept?.name ?? ticket.departmentId} />
              <InfoItem label="Nhân viên xử lý" val={assignee?.fullName ?? ticket.assigneeId ?? 'Chưa phân công'} />
              <InfoItem label="Hạn xử lý" val={ticket.deadline ?? '—'} />
            </div>
          </Section>

          {/* Action buttons */}
          {canStartWork && (
            <div className="bg-white border border-orange-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] text-orange-400/80 font-semibold uppercase tracking-wider">Vé được giao cho bạn</p>
              <p className="text-[12px] text-gray-500">Nhấn nút bên dưới để bắt đầu xử lý vé này</p>
              <button onClick={startWork}
                className="w-full relative rounded-xl overflow-hidden px-4 py-3 active:scale-[0.97] transition-transform">
                <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <span className="relative text-white font-bold uppercase tracking-wide text-[13px]">Bắt đầu xử lý</span>
              </button>
            </div>
          )}

          {canSubmitRes && !showResForm && (
            <div className="bg-white border border-green-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] text-green-400/80 font-semibold uppercase tracking-wider">Đang xử lý</p>
              <p className="text-[12px] text-gray-500">Khi hoàn tất, ghi nhận kết quả xử lý</p>
              <button onClick={() => setShowResForm(true)}
                className="w-full relative rounded-xl overflow-hidden px-4 py-3 active:scale-[0.97] transition-transform">
                <div className="absolute inset-0 bg-gradient-to-r from-green-800 to-green-600" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <span className="relative text-white font-bold uppercase tracking-wide text-[13px]">Ghi nhận kết quả</span>
              </button>
            </div>
          )}

          {/* Flow 3: Transfer dept (Phát hiện vượt thẩm quyền) */}
          {(canSubmitRes || canStartWork) && !done && !transferred && (
            <div className="bg-white border border-amber-500/20 rounded-2xl overflow-hidden card-depth">
              <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
                <p className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider">Phát hiện vượt thẩm quyền?</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Nếu vé thuộc thẩm quyền cơ quan khác, chuyển giao ngay</p>
              </div>
              {!showTransfer ? (
                <div className="px-5 py-3">
                  <button onClick={() => setShowTransfer(true)}
                    className="w-full py-2.5 rounded-xl border border-amber-500/25 text-amber-400 text-[12px] font-bold uppercase tracking-wide hover:bg-amber-500/8 transition-colors active:scale-[0.97]">
                    Chuyển giao cơ quan khác
                  </button>
                </div>
              ) : (
                <div className="px-5 py-3 space-y-2.5">
                  <select value={transferDept} onChange={e => setTransferDept(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50">
                    <option value="">— Chọn cơ quan đúng —</option>
                    {DEPARTMENTS.filter(d => d.departmentId !== currentUser.departmentId).map(d =>
                      <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                    )}
                  </select>
                  <textarea value={transferReason} onChange={e => setTransferReason(e.target.value)}
                    rows={2} placeholder="Lý do chuyển giao..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 placeholder-zinc-700 outline-none focus:border-orange-500/50 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowTransfer(false)}
                      className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 text-[12px] font-semibold">Hủy</button>
                    <button onClick={handleTransfer} disabled={!transferDept || !transferReason.trim()}
                      className="flex-1 relative rounded-xl overflow-hidden py-2 active:scale-[0.97] transition-transform disabled:opacity-40">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-800 to-amber-600" />
                      <span className="relative text-white font-bold text-[12px]">Chuyển giao</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {transferred && (
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/30">
              <div className="absolute inset-0 bg-amber-50" />
              <div className="relative flex items-center gap-3 px-5 py-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <p className="text-[13px] font-bold text-amber-400">Đã chuyển giao sang {getDept(ticket.departmentId)?.name ?? ticket.departmentId}</p>
              </div>
            </div>
          )}

          {/* Flow 3: Progress chat while IN_PROGRESS */}
          {ticket.status === 'IN_PROGRESS' && !done && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
              <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
                <SectionLabel>Cập nhật tiến độ</SectionLabel>
              </div>
              <div className="px-5 py-3 space-y-2.5">
                {progressNotes.length > 0 && (
                  <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-thin">
                    {progressNotes.map((n, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-[12px] text-gray-700">{n.text}</p>
                        <p className="font-mono-cf text-[10px] text-gray-400 mt-0.5">{n.time} · {currentUser.fullName}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={progressInput} onChange={e => setProgressInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addProgressNote()}
                    placeholder="Nhập cập nhật tiến độ..."
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 placeholder-zinc-700 outline-none focus:border-orange-500/50" />
                  <button onClick={addProgressNote}
                    className="px-3 py-2 rounded-xl bg-orange-500/15 border border-orange-500/20 text-orange-400 text-[12px] font-bold hover:bg-orange-500/20 transition-colors">
                    Gửi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resolution form */}
          {showResForm && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
              <div className="px-5 pt-4 pb-3 border-b border-gray-200">
                <SectionLabel>Bằng chứng xử lý</SectionLabel>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">URL ảnh sau xử lý (tùy chọn)</label>
                  <input value={resImg} onChange={e => setResImg(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-[12px] text-gray-900 placeholder-zinc-700 outline-none focus:border-orange-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">Ghi chú xử lý *</label>
                  <textarea value={resNote} onChange={e => setResNote(e.target.value)}
                    rows={4} placeholder="Mô tả công việc đã thực hiện..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-[12px] text-gray-900 placeholder-zinc-700 outline-none focus:border-orange-500/50 transition-colors resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowResForm(false)}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-[12px] text-gray-600 font-semibold hover:text-gray-800 transition-colors">
                    Hủy
                  </button>
                  <button onClick={submitResolution} disabled={!resNote.trim()}
                    className="flex-1 relative rounded-xl overflow-hidden px-3 py-2.5 active:scale-[0.97] transition-transform disabled:opacity-40">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-800 to-green-600" />
                    <span className="relative text-white font-bold text-[12px]">Xác nhận</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* F – Timeline */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
              <SectionLabel>F — Lịch sử vé</SectionLabel>
            </div>
            {history.length === 0
              ? <p className="px-5 py-5 text-[12px] text-gray-300">Chưa có lịch sử</p>
              : (
                <div className="px-5 py-4 space-y-3 relative before:absolute before:left-[22px] before:top-4 before:bottom-4 before:w-px before:bg-gray-100/60">
                  {history.map((h, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white flex-shrink-0 mt-0.5 z-10" />
                      <div className="min-w-0">
                        <p className="text-[12px] text-gray-700">{h.note}</p>
                        <p className="font-mono-cf text-[10px] text-gray-400 mt-0.5">{h.time} · {h.actor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
      <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
        <SectionLabel>{title}</SectionLabel>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-0.5 opacity-70">
        <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-90" />
        <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-50" />
      </div>
      <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">{children}</p>
    </div>
  );
}

function InfoGrid({ items }: { items: { label: string; val?: string; mono?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(it => <InfoItem key={it.label} label={it.label} val={it.val} mono={it.mono} />)}
    </div>
  );
}

function InfoItem({ label, val, mono, badge, cls }: { label: string; val?: string; mono?: boolean; badge?: boolean; cls?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-0.5">{label}</p>
      {badge && cls
        ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cls}`}>{val}</span>
        : <p className={`text-[12px] text-gray-800 ${mono ? 'font-mono-cf' : ''}`}>{val ?? '—'}</p>
      }
    </div>
  );
}
