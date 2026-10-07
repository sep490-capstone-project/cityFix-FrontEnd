const fs = require('fs');
let dashboardContent = fs.readFileSync('web/src/manager/ManagerDashboard.tsx', 'utf8');

const notifSection = `
        {/* Notifications */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
            <SectionLabel>Thông báo hoạt động</SectionLabel>
          </div>
          <div className="p-2 max-h-60 overflow-y-auto scrollbar-thin">
            <div onClick={() => onOpenTicket('CF-2851')} className="cursor-pointer transition-all hover:bg-blue-100 hover:border-blue-200 p-3 mb-2 bg-blue-50/50 rounded-xl border border-blue-100">
              <p className="text-[12px] text-gray-800"><b>CF-2851</b> (SOS) đã được chuyển đến phòng ban của bạn.</p>
              <p className="text-[10px] text-gray-400 mt-1">2 phút trước</p>
            </div>
            <div onClick={() => onOpenTicket('CF-2853')} className="cursor-pointer transition-all hover:bg-gray-100 hover:border-gray-300 p-3 mb-2 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[12px] text-gray-800">Trần Minh Quân (STAFF) đã cập nhật trạng thái <b>CF-2853</b> thành ĐANG XỬ LÝ.</p>
              <p className="text-[10px] text-gray-400 mt-1">10 phút trước</p>
            </div>
            <div onClick={() => onOpenTicket('CF-2848')} className="cursor-pointer transition-all hover:bg-red-50 hover:border-red-200 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[12px] text-gray-800"><b>CF-2848</b> đang chờ phân công khẩn cấp (SLA đe dọa).</p>
              <p className="text-[10px] text-gray-400 mt-1">1 giờ trước</p>
            </div>
          </div>
        </div>
`;
// Need to replace the old notification section safely
dashboardContent = dashboardContent.replace(/\{\/\* Notifications \*\/\}.*?\{\/\* Quick stats \*\/\}/s, notifSection + '\n          {/* Quick stats */}');
fs.writeFileSync('web/src/manager/ManagerDashboard.tsx', dashboardContent, 'utf8');
