const fs = require('fs');
const file = 'web/src/admin/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const returnPattern = /return \(\s*<div className="p-6 space-y-5 screen-enter">/;
content = content.replace(returnPattern, "const navigate = useNavigate();\n\n  return (\n    <div className=\"p-6 space-y-5 screen-enter\">");

fs.writeFileSync(file, content, 'utf8');
