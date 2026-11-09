import React, { useState, useMemo } from 'react';
import { message } from 'antd';
import {
  FileTextIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingIcon,
  MapPinIcon,
} from '../components/Icons';
import { PROVINCE_WARDS } from '../data';
import { downloadCsvFile, downloadExcelReport } from '../utils/exportFile';

const MONTHLY_RAW = [
  { month: 'T4', total: 89, done: 71 },
  { month: 'T5', total: 104, done: 88 },
  { month: 'T6', total: 97, done: 79 },
  { month: 'T7', total: 118, done: 96 },
  { month: 'T8', total: 131, done: 108 },
  { month: 'T9', total: 142, done: 118 },
];

const AREA_STATS = [
  { province: 'TP. Hồ Chí Minh', ward: 'Phường Võ Thị Sáu', count: 32, done: 27 },
  { province: 'TP. Hồ Chí Minh', ward: 'Phường Bến Nghé', count: 26, done: 23 },
  { province: 'TP. Hồ Chí Minh', ward: 'Phường 6', count: 18, done: 15 },
  { province: 'TP. Hà Nội', ward: 'Phường Điện Biên', count: 24, done: 20 },
  { province: 'TP. Hà Nội', ward: 'Phường Tràng Tiền', count: 16, done: 14 },
  { province: 'TP. Đà Nẵng', ward: 'Phường Hải Châu 1', count: 15, done: 11 },
  { province: 'TP. Đà Nẵng', ward: 'Phường Thạch Thang', count: 11, done: 8 },
];

const DEPARTMENT_STATS = [
  {
    name: 'Sở Giao thông Vận tải TP.HCM',
    province: 'TP. Hồ Chí Minh',
    level: 'Cấp Thành phố',
    total: 42,
    inProgress: 6,
    completed: 36,
    rate: 85.7,
  },
  {
    name: 'Tổng Công ty Điện lực TP.HCM',
    province: 'TP. Hồ Chí Minh',
    level: 'Cấp Thành phố',
    total: 24,
    inProgress: 2,
    completed: 22,
    rate: 91.7,
  },
  {
    name: 'UBND Phường Võ Thị Sáu',
    province: 'TP. Hồ Chí Minh',
    level: 'Cấp Xã/Phường',
    total: 18,
    inProgress: 3,
    completed: 15,
    rate: 83.3,
  },
  {
    name: 'Sở Xây dựng TP. Hà Nội',
    province: 'TP. Hà Nội',
    level: 'Cấp Thành phố',
    total: 25,
    inProgress: 4,
    completed: 21,
    rate: 84.0,
  },
  {
    name: 'UBND Phường Điện Biên',
    province: 'TP. Hà Nội',
    level: 'Cấp Xã/Phường',
    total: 15,
    inProgress: 2,
    completed: 13,
    rate: 86.7,
  },
  {
    name: 'Sở Tài nguyên & Môi trường Đà Nẵng',
    province: 'TP. Đà Nẵng',
    level: 'Cấp Thành phố',
    total: 18,
    inProgress: 7,
    completed: 11,
    rate: 61.1,
  },
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<'7d' | 'month' | 'quarter' | 'year'>('month');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedWard, setSelectedWard] = useState<string>('all');

  const availableWards = useMemo(() => {
    if (selectedProvince === 'all') {
      return Object.values(PROVINCE_WARDS).flat();
    }
    return PROVINCE_WARDS[selectedProvince] || [];
  }, [selectedProvince]);

  const filteredAreas = useMemo(() => {
    return AREA_STATS.filter((item) => {
      if (selectedProvince !== 'all' && item.province !== selectedProvince) return false;
      if (selectedWard !== 'all' && item.ward !== selectedWard) return false;
      return true;
    });
  }, [selectedProvince, selectedWard]);

  const filteredDepts = useMemo(() => {
    return DEPARTMENT_STATS.filter((dept) => {
      if (selectedProvince !== 'all' && dept.province !== selectedProvince) return false;
      return true;
    });
  }, [selectedProvince]);

  const summary = useMemo(() => {
    const total = filteredAreas.reduce((acc, a) => acc + a.count, 0);
    const done = filteredAreas.reduce((acc, a) => acc + a.done, 0);
    const remaining = Math.max(total - done, 0);
    const inProgress = Math.round(remaining * 0.65);
    const pending = remaining - inProgress;
    const rate = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0';
    return { total, done, inProgress, pending, rate };
  }, [filteredAreas]);

  const maxAreaCount = useMemo(() => {
    return Math.max(...filteredAreas.map((d) => d.count), 1);
  }, [filteredAreas]);

  const maxMonthlyTotal = useMemo(() => {
    return Math.max(...MONTHLY_RAW.map((m) => m.total), 1);
  }, []);

  const scopeLabel =
    selectedProvince === 'all'
      ? 'Toàn hệ thống'
      : selectedWard === 'all'
      ? selectedProvince
      : `${selectedWard}, ${selectedProvince}`;

  const handleExportCSV = () => {
    downloadCsvFile(
      'CityFix_Thong_Ke_Co_Quan',
      ['Cơ quan phụ trách', 'Tỉnh/Thành phố', 'Cấp quản lý', 'Tổng tiếp nhận', 'Đang xử lý', 'Hoàn thành', 'Tỷ lệ (%)'],
      filteredDepts.map((d) => [d.name, d.province, d.level, d.total, d.inProgress, d.completed, `${d.rate}%`])
    );
    message.success('Đã xuất file CSV thống kê thành công!');
  };

  const handleExportExcel = () => {
    downloadExcelReport(
      'CityFix_Bao_Cao_Thong_Ke',
      'BÁO CÁO THỐNG KÊ HỆ THỐNG CITYFIX',
      `Phạm vi: ${scopeLabel}`,
      [
        {
          heading: '1. Tổng quan chỉ số xử lý hồ sơ',
          headers: ['Chỉ tiêu', 'Số lượng / Giá trị'],
          rows: [
            ['Tổng hồ sơ tiếp nhận', summary.total],
            ['Hồ sơ đã hoàn thành', `${summary.done} (${summary.rate}%)`],
            ['Hồ sơ đang xử lý', summary.inProgress],
            ['Hồ sơ chờ xét duyệt', summary.pending],
          ],
        },
        {
          heading: '2. Phân bố theo Địa bàn (Tỉnh/Thành phố - Phường/Xã)',
          headers: ['Tỉnh / Thành phố', 'Phường / Xã', 'Tổng tiếp nhận', 'Đã giải quyết xong'],
          rows: filteredAreas.map((a) => [a.province, a.ward, a.count, a.done]),
        },
        {
          heading: '3. Thống kê kết quả xử lý theo Đơn vị / Cơ quan',
          headers: ['Cơ quan phụ trách', 'Tỉnh / Thành phố', 'Cấp quản lý', 'Tổng tiếp nhận', 'Đang xử lý', 'Hoàn thành', 'Tỷ lệ hoàn thành'],
          rows: filteredDepts.map((d) => [d.name, d.province, d.level, d.total, d.inProgress, d.completed, `${d.rate}%`]),
        },
        {
          heading: '4. Xu hướng hồ sơ theo tháng',
          headers: ['Tháng', 'Tổng tiếp nhận', 'Đã hoàn thành'],
          rows: MONTHLY_RAW.map((m) => [m.month, m.total, m.done]),
        },
      ]
    );
    message.success('Đã xuất Báo cáo Excel (.xls) thành công!');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto screen-enter">
      {/* 1. HEADER & FILTER BAR */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
                Thống kê & Báo cáo Hệ thống
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Dữ liệu Thống kê Tổng hợp
              </span>
            </div>
            <p className="text-[12px] text-gray-500 mt-1">
              Tổng hợp số liệu tiếp nhận, tỷ lệ hoàn thành theo địa bàn Tỉnh/Thành phố → Phường/Xã và hiệu suất các cơ quan
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Xuất CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-[12px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors cursor-pointer"
            >
              Xuất Báo cáo Excel (.xls)
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          {/* Time Range Pills */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-[11px] font-semibold">
            {[
              { key: '7d', label: '7 ngày qua' },
              { key: 'month', label: 'Tháng này' },
              { key: 'quarter', label: 'Quý này' },
              { key: 'year', label: 'Năm 2026' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTimeRange(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeRange === tab.key
                    ? 'bg-white text-orange-600 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Location Filters: Province -> Ward */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500">1. Tỉnh/TP:</span>
              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedWard('all');
                }}
                className="text-[12px] font-medium bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="all">Toàn hệ thống (Tất cả Tỉnh/TP)</option>
                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="TP. Hà Nội">TP. Hà Nội</option>
                <option value="TP. Đà Nẵng">TP. Đà Nẵng</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500">2. Phường/Xã:</span>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="text-[12px] font-medium bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="all">Tất cả Phường/Xã</option>
                {availableWards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 CLEAN KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Tổng Hồ Sơ Tiếp Nhận
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <FileTextIcon className="w-4 h-4" />
            </div>
          </div>
          <span className="font-display text-3xl font-black text-gray-900">{summary.total}</span>
          <p className="text-[11px] text-gray-500 mt-2">
            Tổng số phản ánh ghi nhận trong kỳ
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Đã Giải Quyết Xong
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-emerald-600">{summary.done}</span>
            <span className="text-xs font-bold text-emerald-600">({summary.rate}%)</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Hồ sơ đã xử lý và đóng thành công
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Đang Xử Lý
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <span className="font-display text-3xl font-black text-orange-600">{summary.inProgress}</span>
          <p className="text-[11px] text-gray-500 mt-2">
            Đơn vị đang thực hiện các bước xử lý
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Chờ Xét Duyệt
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <span className="font-display text-3xl font-black text-amber-600">{summary.pending}</span>
          <p className="text-[11px] text-gray-500 mt-2">
            Hồ sơ mới khởi tạo chờ đơn vị duyệt
          </p>
        </div>
      </div>

      {/* 3. ROW 1: MONTHLY TREND & STATUS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Trend */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">
                Xu hướng Hồ sơ theo Tháng
              </h3>
              <p className="text-[11px] text-gray-400">
                So sánh số lượng tiếp nhận và hoàn thành trên toàn hệ thống
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-orange-200" /> Tiếp nhận
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-orange-500" /> Hoàn thành
              </span>
            </div>
          </div>

          <div className="pt-6 pb-2">
            <div className="flex items-end gap-4 h-44">
              {MONTHLY_RAW.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-500">
                    {m.done}/{m.total}
                  </span>
                  <div className="w-full flex items-end gap-1.5 h-32">
                    <div
                      title={`Tiếp nhận: ${m.total}`}
                      className="flex-1 rounded-t-md bg-orange-100 border border-orange-200"
                      style={{ height: `${(m.total / maxMonthlyTotal) * 100}%` }}
                    />
                    <div
                      title={`Hoàn thành: ${m.done}`}
                      className="flex-1 rounded-t-md bg-orange-500"
                      style={{ height: `${(m.done / maxMonthlyTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-gray-600">{m.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">
                Tỷ trọng theo Trạng thái Hồ sơ
              </h3>
              <p className="text-[11px] text-gray-400">
                Phân bổ trạng thái xử lý theo quy trình chuẩn
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
              Tổng {summary.total} hồ sơ
            </span>
          </div>

          <div className="space-y-4 py-4">
            {[
              {
                label: 'Chờ xét duyệt (INITIATED)',
                count: summary.pending,
                pct: summary.total > 0 ? Math.round((summary.pending / summary.total) * 100) : 0,
                bar: 'bg-amber-500',
              },
              {
                label: 'Đang xử lý (ASSIGNED / IN_PROGRESS)',
                count: summary.inProgress,
                pct: summary.total > 0 ? Math.round((summary.inProgress / summary.total) * 100) : 0,
                bar: 'bg-orange-500',
              },
              {
                label: 'Đã hoàn thành (RESOLVED / COMPLETED)',
                count: summary.done,
                pct: summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0,
                bar: 'bg-emerald-500',
              },
            ].map((st, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-gray-700">{st.label}</span>
                  <span className="font-bold text-gray-900">
                    {st.count} hồ sơ ({st.pct}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${st.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. ROW 2: WARD BREAKDOWN & DEPARTMENT TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left (5/12): Breakdown by Province -> Ward */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <h3 className="text-[14px] font-bold text-gray-900">
              Phân bố theo Địa bàn (Tỉnh/TP — Phường/Xã)
            </h3>
            <p className="text-[11px] text-gray-400">
              Số lượng phản ánh theo cấp hành chính Tỉnh/Thành phố → Phường/Xã
            </p>
          </div>

          <div className="space-y-3.5">
            {filteredAreas.map((area) => (
              <div key={`${area.province}-${area.ward}`} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPinIcon className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    <span className="font-semibold text-gray-800 truncate">{area.ward}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">({area.province})</span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 flex-shrink-0">
                    {area.done}/{area.count} xong
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${(area.count / maxAreaCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (7/12): Department Resolution Table */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-[14px] font-bold text-gray-900">
              Thống kê Kết quả Xử lý theo Cơ quan / Đơn vị
            </h3>
            <p className="text-[11px] text-gray-400">
              Tổng hợp tiến độ xử lý hồ sơ của các cơ quan Cấp Thành phố/Tỉnh và Cấp Xã/Phường
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3 px-4">Cơ quan phụ trách</th>
                  <th className="py-3 px-3">Cấp quản lý</th>
                  <th className="py-3 px-3 text-center">Tổng số</th>
                  <th className="py-3 px-3 text-center">Đang xử lý</th>
                  <th className="py-3 px-3 text-center">Hoàn thành</th>
                  <th className="py-3 px-4 text-right">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[12px]">
                {filteredDepts.map((dept, i) => (
                  <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-semibold text-gray-800">
                        <BuildingIcon className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        <span>{dept.name}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 pl-5">{dept.province}</p>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">
                        {dept.level}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-gray-800">{dept.total}</td>
                    <td className="py-3 px-3 text-center font-semibold text-orange-600">{dept.inProgress}</td>
                    <td className="py-3 px-3 text-center font-semibold text-emerald-600">{dept.completed}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{dept.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
