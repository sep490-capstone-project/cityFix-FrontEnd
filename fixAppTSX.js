const fs = require('fs');
let content = fs.readFileSync('web/src/App.tsx', 'utf8');

content = content.replace("const decoded = decodeJwt(token);", "const decoded = decodeJwt(token as string);");
content = content.replace("getProfile(token).catch(() => {});", "getProfile(token as string).catch(() => {});");

fs.writeFileSync('web/src/App.tsx', content, 'utf8');
