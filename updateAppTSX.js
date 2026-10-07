const fs = require('fs');
let content = fs.readFileSync('web/src/App.tsx', 'utf8');

// Update routing
content = content.replace("import StaffApp from './staff/StaffApp';", "import StaffApp from './staff/StaffApp';\nimport ManagerApp from './manager/ManagerApp';");

content = content.replace("if (authPage === 'app' && userRole === 'STAFF') {", "if (authPage === 'app' && userRole === 'MANAGER') {\n    return <><RouteSync authPage={authPage} setAuthPage={setAuthPage} /><ManagerApp userId={userId} onLogout={handleLogout} /></>;\n  }\n\n  if (authPage === 'app' && userRole === 'STAFF') {");

// Update handleLogin
content = content.replace("role: 'STAFF' | 'ADMIN'", "role: 'STAFF' | 'MANAGER' | 'ADMIN'");
content = content.replace("const role = rawRole.includes('STAFF') ? 'STAFF' : 'ADMIN';", "const role = rawRole.includes('MANAGER') ? 'MANAGER' : rawRole.includes('STAFF') ? 'STAFF' : 'ADMIN';");

// Fix login bug
content = content.replace("if (!token) return;", "if (!token && !reduxState.userEmail) return;\n    if (!token && reduxState.userEmail) { setAuthPage('app'); return; }");

content = content.replace("getProfile(token).catch(() => {});\n        }\n      } catch {", "getProfile(token).catch(() => {});\n        } else if (reduxState.userEmail) { setAuthPage('app'); }\n      } catch (e) {\n        if (reduxState.userEmail) { setAuthPage('app'); return; }");

fs.writeFileSync('web/src/App.tsx', content, 'utf8');
