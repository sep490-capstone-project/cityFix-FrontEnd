Update the existing CityFix Admin Web UI for Flow 2 – Validation, Routing & Assignment.

Keep the existing visual style, layout, colors, hazard-stripe branding, sidebar and header. Do not redesign the whole application.

The Admin Web must support these Flow 2 functions:
1. Dashboard
2. Ticket Management
3. Manual Review
4. Analytics & Reports
5. User Management
6. System Settings:
   - Category Management
   - Department Management
   - Routing Rule Management

Use realistic CityFix data. Do not use placeholder "Coming Soon" pages.

==================================================
1. ADMIN DASHBOARD
==================================================

Keep the existing KPI dashboard, but align the data with Flow 2.

KPI cards:
- Total Tickets
- Pending Review
- Critical / Life-threatening
- Assigned
- In Progress
- Completed

Recent Tickets table:
- Ticket ID
- Category
- Province
- Ward
- Department
- Assignee
- Severity
- Danger Level
- Status
- Created At

Department performance:
- Department name
- Total tickets
- Assigned
- In Progress
- Completed

Critical ticket section:
Highlight tickets where:
isLifeThreatening = true

==================================================
2. TICKET MANAGEMENT
==================================================

Create a ticket list page.

Search:
- Ticket ID
- Category
- Province
- Ward
- Department
- Assignee

Filters:
- Status
- Severity
- Danger Level
- Category
- Department

Table columns:
- Ticket ID
- Category
- Province
- Ward
- Department
- Assignee
- Severity
- Danger Level
- Status
- Created At

Clicking a ticket opens Ticket Detail.

==================================================
3. TICKET DETAIL
==================================================

Create a complete ticket detail page using the following attributes:

Ticket:
- ticketId
- userId
- departmentId
- categoryId
- assigneeId
- description
- severity
- dangerLevel
- locationMethod
- location
- address
- status
- createdAt
- updatedAt
- isLifeThreatening
- needsManualReview

Display sections:

A. Ticket Information
- Ticket ID
- Category
- Description
- Severity
- Danger Level
- Status

B. Location
- Province
- Ward
- Address
- Map location
- Location Method

C. Reporter
- Reporter name
- Email
- Phone

D. AI Verification
- AI Category
- Confidence score
- Severity
- Danger Level
- Life-threatening status
- Manual Review Required status

If needsManualReview = true:
show a prominent "Manual Review Required" warning.

E. Routing & Assignment
- Department
- Assigned Staff
- Current routing rule

F. Ticket Timeline
Use the ticket history actions:
- CREATED
- AI_REVIEWED
- MANUAL_APPROVED
- ROUTED
- ASSIGNED
- REASSIGNED
- REROUTED
- WORK_STARTED
- EVIDENCE_SUBMITTED
- CLOSED

==================================================
4. MANUAL REVIEW
==================================================

Create a dedicated Admin Manual Review page.

Only show tickets where:
needsManualReview = true

Table:
- Ticket ID
- Category
- Province
- Ward
- AI Confidence
- Severity
- Danger Level
- Life-threatening
- Created At
- Action

Action:
"Review"

Manual Review Detail:
Show:
- Original ticket information
- AI analysis result
- Confidence
- Severity
- Danger Level
- Life-threatening flag

Admin actions:
- Approve
- Modify
- Reject

If Modify is selected:
allow Admin to edit:
- Category
- Severity
- Danger Level

Show confirmation before submitting the decision.

==================================================
5. ANALYTICS & REPORTS
==================================================

Keep the existing Analytics page.

Use:
- Total tickets
- Completed tickets
- In-progress tickets
- Critical tickets
- Tickets by category
- Tickets by department
- Tickets by province/ward
- Ticket status distribution

Avoid adding metrics that do not exist in the current backend attributes.

==================================================
6. USER MANAGEMENT
==================================================

Create a complete User Management page.

User attributes:
- userId
- fullName
- email
- phoneNumber
- province
- ward
- address
- role
- status
- departmentId
- createdAt
- updatedAt

Table:
- Name
- Email
- Phone
- Role
- Department
- Status
- Created At
- Actions

Actions:
- View
- Create
- Edit
- Block/Delete

Create/Edit User form:
- Full Name
- Email
- Phone
- Province
- Ward
- Address
- Role
- Department
- Status

Roles:
- Resident
- Staff
- Admin

==================================================
7. CATEGORY MANAGEMENT
==================================================

Create Category Management.

Category attributes:
- categoryId
- name
- description
- isActive

Table:
- Category ID
- Name
- Description
- Status
- Actions

Actions:
- Create
- Edit
- Delete
- Activate/Deactivate

==================================================
8. DEPARTMENT MANAGEMENT
==================================================

Create Department Management.

Department attributes:
- departmentId
- level
- name
- contactEmail
- phoneNumber

Table:
- Department ID
- Name
- Level
- Contact Email
- Phone
- Actions

Actions:
- Create
- Edit
- Delete

Department level:
- CITY
- WARD

==================================================
9. ROUTING RULE MANAGEMENT
==================================================

Create Routing Rule Management.

Routing Rule attributes:
- ruleId
- departmentId
- categoryId
- province
- ward

Table:
- Rule ID
- Category
- Province
- Ward
- Department
- Actions

Actions:
- Create
- Edit
- Delete

Create/Edit form:
- Category dropdown
- Province dropdown
- Ward dropdown
- Department dropdown

The routing logic is:

Category + Province + Ward
→ Routing Rule
→ Department

==================================================
10. STATUS
==================================================

Use these exact ticket statuses:

- INITIATED
- PENDING_REVIEW
- OPEN
- ASSIGNED
- IN_PROGRESS
- RESOLVED
- COMPLETED

Use clear visual status badges.

==================================================
11. GLOBAL UI
==================================================

Keep:
- Collapsible sidebar
- CityFix logo
- Hazard stripe branding
- Fixed header
- Global search
- Notification bell
- Admin profile
- Emergency alert indicator

Sidebar:

Dashboard
Ticket Management
Manual Review
Analytics
Users
Settings

Settings submenu:
- Categories
- Departments
- Routing Rules

Make the UI desktop-first, professional, clean and suitable for a university capstone project demo.

Do not create new database entities or attributes beyond the attributes specified above.