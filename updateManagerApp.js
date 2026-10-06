const fs = require('fs');
let content = fs.readFileSync('web/src/manager/ManagerApp.tsx', 'utf8');
content = content.replace("import ManagerTicketDetail from './ManagerTicketDetail';", "import ManagerTicketDetail from './ManagerTicketDetail';\nimport ManagerDispatch from './ManagerDispatch';");
content = content.replace("type ManagerPage = 'dashboard' | 'tickets' | 'ticket-detail' | 'profile';", "type ManagerPage = 'dashboard' | 'tickets' | 'ticket-detail' | 'dispatch' | 'profile';");
content = content.replace("{page === 'tickets' && <ManagerTickets currentUser={currentUser} onOpenTicket={openTicket} />}", "{page === 'tickets' && <ManagerTickets currentUser={currentUser} onOpenTicket={openTicket} />}\n          {page === 'dispatch' && <ManagerDispatch onOpenTicket={openTicket} />}");
fs.writeFileSync('web/src/manager/ManagerApp.tsx', content, 'utf8');
