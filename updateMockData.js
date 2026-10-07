const fs = require('fs');
let dataContent = fs.readFileSync('web/src/data.ts', 'utf8');

// Update CF-2844 to mention 2 departments
dataContent = dataContent.replace(
  "description: 'Mặt đường sụt lún tạo thành hố sâu sau mưa lớn, tiềm ẩn tai nạn giao thông nghiêm trọng.',",
  "description: 'Mặt đường sụt lún tạo thành hố sâu làm đứt cáp điện ngầm bên dưới, cần phối hợp cả Điện lực và Giao thông.',"
);

dataContent = dataContent.replace(
  "{ ticketId: 'CF-2844', action: 'CREATED',        actor: 'Người dùng U008',  note: 'Báo cáo được ghi nhận qua ứng dụng',            time: '05/09 08:50' },",
  "{ ticketId: 'CF-2844', action: 'CREATED',        actor: 'Người dùng U008',  note: 'Báo cáo được ghi nhận qua ứng dụng',            time: '05/09 08:50' },\n    { ticketId: 'CF-2844', action: 'AI_REVIEWED',    actor: 'Hệ thống AI',      note: 'Phát hiện sự cố liên quan đến 2 phòng ban: Hạ tầng Giao thông & Điện lực. Yêu cầu điều phối.', time: '05/09 08:51' },"
);

fs.writeFileSync('web/src/data.ts', dataContent, 'utf8');
