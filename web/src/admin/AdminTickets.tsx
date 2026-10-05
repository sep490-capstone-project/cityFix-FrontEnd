import { useState, useEffect } from 'react';
import { message } from 'antd';

import {
  TICKETS as MOCK_TICKETS,
  STATUS_MAP,
  SEV_MAP,
  DANGER_MAP,
  StatusKey,
  Severity,
  DangerLevel,
  getDept,
  getCat,
  statusInfo,
  sevInfo,
  dangerInfo,
  Ticket as MockTicket,
} from '../data';
import { getAllTickets, TicketResponse } from '../services/tickets';

interface Props {
  onOpenTicket: (id: string) => void;
}

export default function TicketList({ onOpenTicket }: Props) {
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<StatusKey | 'all'>('all');
  const [sevF, setSevF] = useState<Severity | 'all'>('all');
  const [dangerF, setDangerF] = useState<DangerLevel | 'all'>('all');
  const [catF, setCatF] = useState('all');
  const [deptF, setDeptF] = useState('all');

  // --- API INTEGRATION ---
  const [apiTickets, setApiTickets] = useState<TicketResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsingMock, setIsUsingMock] = useState(true); // Default to mock if API fails
  
  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      // Gọi API lấy toàn bộ tickets (Nếu backend đã code API này ở GET /api/v1/tickets)
      const res = await getAllTickets({ page: 0, size: 100 });
      if (res && res.content) {
        setApiTickets(res.content);
        setIsUsingMock(false);
        message.success('Tải dữ liệu từ API thành công!');
      }
    } catch (err) {
      console.warn('API /api/v1/tickets chưa có, chuyển sang dùng Mock Data:', err);
      // Fallback to mock data if API fails or doesn't exist
      setIsUsingMock(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Nếu dùng Mock Data thì dùng MOCK_TICKETS, nếu có API thì convert TicketResponse sang định dạng hiển thị
  const displayTickets = isUsingMock 
    ? MOCK_TICKETS 
    : apiTickets.map((t): MockTicket => ({
        ticketId: t.id,
        userId: t.createdBy || 'U000',
        departmentId: 'D001', // Fallback as API doesn't return dept ID directly in this struct
        categoryId: t.categoryId,
        assigneeId: undefined, // Need assignments array to parse assignee
        description: t.description,
        severity: t.severity,
        dangerLevel: t.dangerLevel,
        locationMethod: t.locationMethod,
        location: { lat: t.latitude, lng: t.longitude },
        address: t.address,
        province: 'TP.HCM', // Hardcode or extract from address
        ward: 'Phường 1',
        status: t.status as StatusKey,
        createdAt: new Date(t.createdAt).toLocaleString('vi-VN'),
        updatedAt: new Date(t.createdAt).toLocaleString('vi-VN'),
        isLifeThreatening: t.dangerLevel === 'CRITICAL' || t.severity === 'CRITICAL',
        needsManualReview: t.status === 'INITIATED',
      }));

  const filtered = displayTickets.filter((t) => {
    if (statusF !== 'all' && t.status !== statusF) return false;
    if (sevF !== 'all' && t.severity !== sevF) return false;
    if (dangerF !== 'all' && t.dangerLevel !== dangerF) return false;
    if (catF !== 'all' && t.categoryId !== catF) return false;
    if (deptF !== 'all' && t.departmentId !== deptF) return false;

    if (search.trim()) {
      const s = search.toLowerCase();
      if (!t.ticketId.toLowerCase().includes(s) && !t.description.toLowerCase().includes(s)) {
        return false;
      }
    }

    return true;
  });

  const sel = (val: any, setVal: any, opts: any[], title: string) => (
    <div className="flex items-center gap-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</p>
      <select
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="text-[12px] text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none cursor-pointer focus:border-orange-500"
      >
        <option value="all">Tất cả</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6 flex flex-col min-h-full">
      {/* =========================
          HEADER
      ========================== */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-3xl font-extrabold text-gray-900 tracking-tight">
            Quản lý Hồ sơ
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Theo dõi và xử lý các sự cố được phản ánh {isUsingMock ? '(Mock Data)' : '(API Data)'}
          </p>
        </div>

        <button 
          onClick={fetchTickets}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] shadow-sm flex items-center gap-2"
        >
          {isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {/* =========================
          FILTERS
      ========================== */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 bg-white px-5 py-4 rounded-2xl border border-gray-200 shadow-sm">
        {/* Search */}
        <div className="relative w-64 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Tìm theo ID, mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Status */}
        {sel(
          statusF,
          setStatusF,
          Object.entries(STATUS_MAP).map(([k, v]) => ({
            value: k,
            label: v.label,
          })),
          'Trạng thái'
        )}

        {/* Severity */}
        {sel(
          sevF,
          setSevF,
          Object.entries(SEV_MAP).map(([k, v]) => ({
            value: k,
            label: v.label,
          })),
          'Mức độ'
        )}

        {/* Danger */}
        {sel(
          dangerF,
          setDangerF,
          Object.entries(DANGER_MAP).map(([k, v]) => ({
            value: k,
            label: v.label,
          })),
          'Mức nguy hiểm'
        )}

        <div className="flex-1" />

        <span className="font-mono-cf text-[11px] text-gray-400">
          {filtered.length} Hồ sơ
        </span>

        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 text-[11px] font-semibold transition-all active:scale-[0.97]">
          Xuất CSV
        </button>
      </div>

      {/* =========================
          TABLE
      ========================== */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
             <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        )}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {['ID', 'Danh mục', 'Tỉnh/TP', 'Phường', 'Cơ quan', 'Phụ trách', 'Mức độ', 'Nguy hiểm', 'Trạng thái', 'Ngày tạo'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <p className="font-display text-2xl font-bold text-gray-300 uppercase">Không có kết quả</p>
                    <p className="text-gray-400 text-sm mt-1">Thử thay đổi bộ lọc</p>
                  </td>
                </tr>
              )}

              {filtered.map((t) => {
                const dept = getDept(t.departmentId);
                const cat = getCat(t.categoryId) || { name: 'Sự cố chung' }; // Fallback

                return (
                  <tr key={t.ticketId} onClick={() => onOpenTicket(t.ticketId)} className="hover:bg-orange-50/50 transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {t.isLifeThreatening && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title="Đe doạ tính mạng" />}
                        {t.needsManualReview && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Cần xét duyệt" />}
                        <span className="font-mono-cf text-[10px] text-gray-500" title={t.ticketId}>
                          {t.ticketId.substring(0, 8)}{t.ticketId.length > 8 ? '...' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-700 max-w-[150px] truncate">{cat?.name}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">{t.province}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[100px] truncate">{t.ward}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[140px] truncate">{dept?.name || '-'}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">{t.assigneeId ?? <span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sevInfo(t.severity).cls}`}>
                        {sevInfo(t.severity).label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${dangerInfo(t.dangerLevel).cls}`}>
                        {dangerInfo(t.dangerLevel).label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${statusInfo(t.status).cls}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${statusInfo(t.status).dot}`} />
                        {statusInfo(t.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">{t.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================
          LEGEND
      ========================== */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[11px] text-gray-500">Đe dọa tính mạng</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[11px] text-gray-500">Cần xét duyệt thủ công</span>
        </div>
      </div>
    </div>
  );
}
