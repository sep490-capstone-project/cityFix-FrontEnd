const fs = require('fs');
let content = fs.readFileSync('web/src/manager/ManagerDashboard.tsx', 'utf8');

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

content = content.replace('{/* Quick stats */}', notifSection + '\n          {/* Quick stats */}');
fs.writeFileSync('web/src/manager/ManagerDashboard.tsx', content, 'utf8');
