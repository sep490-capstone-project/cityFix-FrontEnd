const fs = require('fs');
const file = 'web/src/admin/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const kpiPattern = /const KPIS = \[([\s\S]*?)\];/;
const kpisRepl = `const KPIS = [
    {
      label: 'Tổng hồ sơ',
      value: String(TICKETS.length),
      color: 'text-orange-500',
      trend: '+19%',
      path: '/tickets',
    },
    {
      label: 'Chờ xét duyệt',
      value: String(pendingReview.length),
      color: 'text-amber-500',
      trend: '',
      path: '/manual-review',
    },
    {
      label: 'Đe dọa tính mạng',
      value: String(lifeThreats.length),
      color: 'text-red-500',
      trend: '!',
      path: '/tickets',
    },
    {
      label: 'Đã phân công',
      value: String(assigned.length),
      color: 'text-purple-500',
      trend: '',
      path: '/tickets',
    },
    {
      label: 'Đang xử lý',
      value: String(inProgress.length),
      color: 'text-orange-500',
      trend: '',
      path: '/tickets',
    },
    {
      label: 'Hoàn thành',
      value: String(completed.length),
      color: 'text-green-600',
      trend: '+8%',
      path: '/tickets',
    },
  ];

  const navigate = useNavigate();`;

content = content.replace(kpiPattern, kpisRepl);

if (!content.includes('useNavigate')) {
    content = "import { useNavigate } from 'react-router-dom';\n" + content;
}

content = content.replace(
    'className="relative bg-white border border-gray-200 rounded-2xl px-4 py-4 overflow-hidden shadow-sm"',
    'onClick={() => navigate(k.path)}\n              className="relative bg-white border border-gray-200 rounded-2xl px-4 py-4 overflow-hidden shadow-sm cursor-pointer hover:shadow-md hover:border-orange-200 transition-all active:scale-[0.98]"'
);

fs.writeFileSync(file, content, 'utf8');
