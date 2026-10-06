const fs = require('fs');
const path = require('path');

const srcDir = 'web/src/staff';
const destDir = 'web/src/manager';

// Create manager dir if not exists
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);

// 1. Copy and replace files from staff
const files = ['StaffApp.tsx', 'StaffDashboard.tsx', 'StaffTicketDetail.tsx', 'StaffTickets.tsx', 'StaffProfile.tsx'];

for (const file of files) {
  let content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  content = content.replace(/Staff/g, 'Manager');
  content = content.replace(/staff/g, 'manager');
  
  const destFile = file.replace('Staff', 'Manager');
  fs.writeFileSync(path.join(destDir, destFile), content, 'utf8');
}

// 2. Clone AdminManualReview.tsx to ManagerDispatch.tsx
let dispatchContent = fs.readFileSync('web/src/admin/AdminManualReview.tsx', 'utf8');
dispatchContent = dispatchContent.replace("export default function ManualReview", "export default function ManagerDispatch");
dispatchContent = dispatchContent.replace(/Admin phê duyệt/g, "Quản lý điều phối");
dispatchContent = dispatchContent.replace(/cần xét duyệt/g, "cần điều phối");
dispatchContent = dispatchContent.replace("Chỉ hiển thị vé cần xác nhận bởi Admin", "Chỉ hiển thị vé cần Điều phối (SOS, unconfidence, >= 2 phòng ban)");
fs.writeFileSync('web/src/manager/ManagerDispatch.tsx', dispatchContent, 'utf8');

// 3. Re-apply ManagerApp customizations
let appContent = fs.readFileSync('web/src/manager/ManagerApp.tsx', 'utf8');
appContent = appContent.replace("import ManagerTicketDetail from './ManagerTicketDetail';", "import ManagerTicketDetail from './ManagerTicketDetail';\nimport ManagerDispatch from './ManagerDispatch';");
appContent = appContent.replace("type ManagerPage = 'dashboard' | 'tickets' | 'ticket-detail' | 'profile';", "type ManagerPage = 'dashboard' | 'tickets' | 'ticket-detail' | 'dispatch' | 'profile';");
appContent = appContent.replace("{page === 'tickets' && <ManagerTickets currentUser={currentUser} onOpenTicket={openTicket} />}", "{page === 'tickets' && <ManagerTickets currentUser={currentUser} onOpenTicket={openTicket} />}\n          {page === 'dispatch' && <ManagerDispatch onOpenTicket={openTicket} />}");
appContent = appContent.replace(/const NAV = \[\s*\{ key: 'dashboard'[^\]]+\] as const;/s, `const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: <GridIcon /> },
  { key: 'tickets', label: 'Quản lý Hồ sơ', icon: <TicketIcon /> },
  { key: 'dispatch', label: 'Điều phối', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg> },
  { key: 'profile', label: 'Tài khoản', icon: <UserIcon /> }
] as const;`);
appContent = appContent.replace("u.role === 'Manager'", "u.role === 'MANAGER'");
fs.writeFileSync('web/src/manager/ManagerApp.tsx', appContent, 'utf8');

// 4. Re-apply ManagerDashboard customizations
let dashboardContent = fs.readFileSync('web/src/manager/ManagerDashboard.tsx', 'utf8');
const notifSection = `
        {/* Notifications */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
            <SectionLabel>Thông báo hoạt động</SectionLabel>
          </div>
          <div className="p-2 max-h-60 overflow-y-auto scrollbar-thin">
            <div className="p-3 mb-2 bg-blue-50/50 rounded-xl border border-blue-100">
              <p className="text-[12px] text-gray-800"><b>CF-3042</b> (SOS) đã được tự động chuyển đến phòng ban của bạn.</p>
              <p className="text-[10px] text-gray-400 mt-1">2 phút trước</p>
            </div>
            <div className="p-3 mb-2 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[12px] text-gray-800">Trần Minh Quân (STAFF) đã cập nhật trạng thái <b>CF-2011</b> thành ĐANG XỬ LÝ.</p>
              <p className="text-[10px] text-gray-400 mt-1">10 phút trước</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[12px] text-gray-800"><b>CF-1008</b> đã quá hạn SLA bước 1. Cần điều phối ngay.</p>
              <p className="text-[10px] text-gray-400 mt-1">1 giờ trước</p>
            </div>
          </div>
        </div>
`;
dashboardContent = dashboardContent.replace('{/* Quick stats */}', notifSection + '\n          {/* Quick stats */}');
fs.writeFileSync('web/src/manager/ManagerDashboard.tsx', dashboardContent, 'utf8');

// 5. Re-apply ManagerTicketDetail customizations
let detailContent = fs.readFileSync('web/src/manager/ManagerTicketDetail.tsx', 'utf8');
const detailReplacement = `
          {/* QUẢN LÝ STAFF & TIMELINE (MANAGER) */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-200 flex justify-between items-center">
              <SectionLabel>Gán Staff & Timeline</SectionLabel>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">Phân công Staff cho bước xử lý</label>
                <select className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50">
                  <option value="">-- Chọn Staff --</option>
                  <option value="U010">Trần Minh Quân (Tổ kỹ thuật)</option>
                  <option value="U011">Lê Văn B (Tổ hiện trường)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">Hạn xử lý (Timeline)</label>
                  <input type="datetime-local" defaultValue="2026-10-10T12:00" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">Ghi chú điều phối</label>
                  <input type="text" placeholder="Yêu cầu xử lý gấp..." className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50" />
                </div>
              </div>
              <button className="bg-blue-600/10 text-blue-700 border border-blue-600/20 rounded-xl px-4 py-2 text-[12px] font-bold hover:bg-blue-600/20 transition-colors">
                Cập nhật thay đổi
              </button>
            </div>
          </div>

          {/* Action buttons */}
`;
detailContent = detailContent.replace('{/* Action buttons */}', detailReplacement);
fs.writeFileSync('web/src/manager/ManagerTicketDetail.tsx', detailContent, 'utf8');

console.log("Done");
