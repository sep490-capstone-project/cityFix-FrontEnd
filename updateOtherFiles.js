const fs = require('fs');
let content = fs.readFileSync('web/src/pages/Login.tsx', 'utf8');
content = content.replace("'STAFF' | 'ADMIN'", "'STAFF' | 'MANAGER' | 'ADMIN'");
content = content.replace("const role = rawRole.includes('STAFF') ? 'STAFF' : 'ADMIN';", "const role = rawRole.includes('MANAGER') ? 'MANAGER' : rawRole.includes('STAFF') ? 'STAFF' : 'ADMIN';");
content = content.replace("admin@cityfix.gov.vn <span className=\"text-slate-400\">/</span> admin123", "admin@cityfix.gov.vn <span className=\"text-slate-400\">/</span> admin123<br /> manager@cityfix.gov.vn <span className=\"text-slate-400\">/</span> manager123");
content = content.replace("if (email === 'admin@cityfix.gov.vn'", "if (email === 'manager@cityfix.gov.vn' && password === 'manager123') {\n          onLogin(email, 'MANAGER', found?.userId ?? 'M001');\n          return;\n        } else if (email === 'admin@cityfix.gov.vn'");
fs.writeFileSync('web/src/pages/Login.tsx', content, 'utf8');

let appSlice = fs.readFileSync('web/src/store/appSlice.ts', 'utf8');
appSlice = appSlice.replace("'STAFF' | 'ADMIN'", "'STAFF' | 'MANAGER' | 'ADMIN'");
fs.writeFileSync('web/src/store/appSlice.ts', appSlice, 'utf8');
