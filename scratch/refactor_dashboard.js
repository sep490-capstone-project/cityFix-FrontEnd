const fs = require('fs');
const file = 'web/src/admin/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add useNavigate import
if (!content.includes("import { useNavigate }")) {
    content = "import { useNavigate } from 'react-router-dom';\n" + content;
}

// 2. Add path to KPIS
content = content.replace("label: 'Tổng hồ sơ',\n      value: String(TICKETS.length),\n      color: 'text-orange-500',\n      trend: '+19%',", 
"label: 'Tổng hồ sơ',\n      value: String(TICKETS.length),\n      color: 'text-orange-500',\n      trend: '+19%',\n      path: '/tickets',");

content = content.replace("label: 'Chờ xét duyệt',\n      value: String(pendingReview.length),\n      color: 'text-amber-500',\n      trend: '',", 
"label: 'Chờ xét duyệt',\n      value: String(pendingReview.length),\n      color: 'text-amber-500',\n      trend: '',\n      path: '/manual-review',");

content = content.replace("label: 'Đe dọa tính mạng',\n      value: String(lifeThreats.length),\n      color: 'text-red-500',\n      trend: '!',", 
"label: 'Đe dọa tính mạng',\n      value: String(lifeThreats.length),\n      color: 'text-red-500',\n      trend: '!',\n      path: '/tickets',");

content = content.replace("label: 'Đã phân công',\n      value: String(assigned.length),\n      color: 'text-purple-500',\n      trend: '',", 
"label: 'Đã phân công',\n      value: String(assigned.length),\n      color: 'text-purple-500',\n      trend: '',\n      path: '/tickets',");

content = content.replace("label: 'Đang xử lý',\n      value: String(inProgress.length),\n      color: 'text-orange-500',\n      trend: '',", 
"label: 'Đang xử lý',\n      value: String(inProgress.length),\n      color: 'text-orange-500',\n      trend: '',\n      path: '/tickets',");

content = content.replace("label: 'Hoàn thành',\n      value: String(completed.length),\n      color: 'text-green-600',\n      trend: '+8%',", 
"label: 'Hoàn thành',\n      value: String(completed.length),\n      color: 'text-green-600',\n      trend: '+8%',\n      path: '/tickets',");

// 3. Add const navigate = useNavigate();
content = content.replace("return (\n    <div className=\"p-6 space-y-5 screen-enter\">", "const navigate = useNavigate();\n\n  return (\n    <div className=\"p-6 space-y-5 screen-enter\">");

// 4. Update click handler on cards
content = content.replace("className=\"relative bg-white border border-gray-200 rounded-2xl px-4 py-4 overflow-hidden shadow-sm\"", 
"onClick={() => navigate(k.path)}\n              className=\"relative bg-white border border-gray-200 rounded-2xl px-4 py-4 overflow-hidden shadow-sm cursor-pointer hover:shadow-md hover:border-orange-200 transition-all active:scale-[0.98]\"");

fs.writeFileSync(file, content, 'utf8');
