const fs = require('fs');
const file = 'web/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import { useNavigate }")) {
    content = content.replace("import RouteSync from './components/RouteSync';", "import RouteSync from './components/RouteSync';\nimport { useNavigate } from 'react-router-dom';");
}

if (!content.includes("const routerNavigate = useNavigate();")) {
    content = content.replace("const reduxState = useAppSelector((s) => s.app);", "const reduxState = useAppSelector((s) => s.app);\n  const routerNavigate = useNavigate();");
}

if (content.includes("const [messageApi, contextHolder] = message.useMessage();")) {
    content = content.replace("const [messageApi, contextHolder] = message.useMessage();", "const { message: messageApi, modal } = AntdApp.useApp();");
    
    // Remove all contextHolder usages safely
    content = content.replace(/\{contextHolder\}/g, "");
}

// Update back logic
content = content.replace("onBack={() => navigate('tickets')}", "onBack={() => { if (window.history.length > 1) routerNavigate(-1); else navigate('tickets'); }}");

// Replace handleLogout logic
const oldLogout = `  async function handleLogout() {
    try {
      await logout();
    } catch (e) {
      console.warn('Lỗi khi đăng xuất:', e);
    }
    dispatch(resetUser());
    setAuthPage('login');
    messageApi.info('Đã đăng xuất');
  }`;

const newLogout = `  function handleLogout() {
    modal.confirm({
      title: 'Xác nhận đăng xuất',
      content: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
      okText: 'Đăng xuất',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await logout();
        } catch (e) {
          console.warn('Lỗi khi đăng xuất:', e);
        }
        dispatch(resetUser());
        setAuthPage('login');
        messageApi.info('Đã đăng xuất');
      }
    });
  }`;

content = content.replace(oldLogout, newLogout);

fs.writeFileSync(file, content, 'utf8');
