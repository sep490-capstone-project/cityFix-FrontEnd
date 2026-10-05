import { useState } from 'react';

import {
  TICKETS,
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
} from '../data';

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

  const filtered = TICKETS.filter((t) => {
    if (statusF !== 'all' && t.status !== statusF) return false;
    if (sevF !== 'all' && t.severity !== sevF) return false;
    if (dangerF !== 'all' && t.dangerLevel !== dangerF) return false;
    if (catF !== 'all' && t.categoryId !== catF) return false;
    if (deptF !== 'all' && t.departmentId !== deptF) return false;

    if (search) {
      const q = search.toLowerCase();

      const cat = getCat(t.categoryId)?.name.toLowerCase() ?? '';
      const dept = getDept(t.departmentId)?.name.toLowerCase() ?? '';

      if (
        !t.ticketId.toLowerCase().includes(q) &&
        !cat.includes(q) &&
        !t.province.toLowerCase().includes(q) &&
        !t.ward.toLowerCase().includes(q) &&
        !dept.includes(q) &&
        !(t.assigneeId ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  const sel = <T extends string>(
    v: T,
    onChange: (v: T) => void,
    opts: { value: string; label: string }[],
    placeholder: string
  ) => (
    <select
      value={v}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
    >
      <option value="all">{placeholder}</option>

      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="p-6 screen-enter space-y-4">
      {/* =========================
          FILTERS
      ========================== */}
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-56 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            />
          </svg>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ID, danh mục, phường, cơ quan..."
            className="bg-transparent text-[12px] text-gray-700 placeholder-gray-400 outline-none flex-1"
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

        {/* Result count */}
        <span className="font-mono-cf text-[11px] text-gray-400">
          {filtered.length} Hồ sơ
        </span>

        {/* Export */}
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 text-[11px] font-semibold transition-all active:scale-[0.97]">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>

          Xuất CSV
        </button>
      </div>

      {/* =========================
          TABLE
      ========================== */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {[
                  'ID',
                  'Danh mục',
                  'Tỉnh/TP',
                  'Phường',
                  'Cơ quan',
                  'Phụ trách',
                  'Mức độ',
                  'Nguy hiểm',
                  'Trạng thái',
                  'Ngày tạo',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {/* Empty state */}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <p className="font-display text-2xl font-bold text-gray-300 uppercase">
                      Không có kết quả
                    </p>

                    <p className="text-gray-400 text-sm mt-1">
                      Thử thay đổi bộ lọc
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((t) => {
                const dept = getDept(t.departmentId);
                const cat = getCat(t.categoryId);

                return (
                  <tr
                    key={t.ticketId}
                    onClick={() => onOpenTicket(t.ticketId)}
                    className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                  >
                    {/* ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {t.isLifeThreatening && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"
                            title="Đe dọa tính mạng"
                          />
                        )}

                        {t.needsManualReview && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                            title="Cần xét duyệt"
                          />
                        )}

                        <span className="font-mono-cf text-[10px] text-gray-500">
                          {t.ticketId}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-[12px] text-gray-700 max-w-[150px] truncate">
                      {cat?.name}
                    </td>

                    {/* Province */}
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      {t.province}
                    </td>

                    {/* Ward */}
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[100px] truncate">
                      {t.ward}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[140px] truncate">
                      {dept?.name}
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      {t.assigneeId ?? (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sevInfo(t.severity).cls}`}
                      >
                        {sevInfo(t.severity).label}
                      </span>
                    </td>

                    {/* Danger */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${dangerInfo(t.dangerLevel).cls}`}
                      >
                        {dangerInfo(t.dangerLevel).label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${statusInfo(t.status).cls}`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${statusInfo(t.status).dot}`}
                        />

                        {statusInfo(t.status).label}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">
                      {t.createdAt}
                    </td>
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

          <span className="text-[11px] text-gray-500">
            Đe dọa tính mạng
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />

          <span className="text-[11px] text-gray-500">
            Cần xét duyệt thủ công
          </span>
        </div>
      </div>
    </div>
  );
}
