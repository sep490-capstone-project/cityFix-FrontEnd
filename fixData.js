const fs = require('fs');
let content = fs.readFileSync('web/src/data.ts', 'utf8');
content = content.replace("export type Role = 'RESIDENT' | 'STAFF' | 'ADMIN';", "export type Role = 'RESIDENT' | 'STAFF' | 'MANAGER' | 'ADMIN';");
fs.writeFileSync('web/src/data.ts', content, 'utf8');

let appContent = fs.readFileSync('web/src/manager/ManagerApp.tsx', 'utf8');
appContent = appContent.replace("u.role === 'Manager'", "u.role === 'MANAGER'");
fs.writeFileSync('web/src/manager/ManagerApp.tsx', appContent, 'utf8');
