const fs = require('fs');
let appSlice = fs.readFileSync('web/src/store/appSlice.ts', 'utf8');
appSlice = appSlice.replace(/'STAFF' \| 'ADMIN'/g, "'STAFF' | 'MANAGER' | 'ADMIN'");
fs.writeFileSync('web/src/store/appSlice.ts', appSlice, 'utf8');
