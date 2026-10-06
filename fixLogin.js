const fs = require('fs');
let content = fs.readFileSync('web/src/pages/Login.tsx', 'utf8');
content = content.replace(/'STAFF' \| 'ADMIN'/g, "'STAFF' | 'MANAGER' | 'ADMIN'");
fs.writeFileSync('web/src/pages/Login.tsx', content, 'utf8');
