Update the existing CityFix Web application and create a dedicated STAFF portal.

IMPORTANT:
The current Staff interface incorrectly has the same permissions and pages as Admin.
Separate the Staff UI from Admin UI.

Staff must NOT have access to:
- Manual Review
- User Management
- Category Management
- Department Management
- Routing Rule Management
- Global Analytics
- Admin Settings
- Changing department assignment
- Changing routing rules
- Approving or rejecting AI verification

Staff belongs to one Department through:
User.departmentId

Staff should only work with tickets related to their Department and/or tickets directly assigned to them through:
Ticket.departmentId
Ticket.assigneeId

==================================================
STAFF SIDEBAR
==================================================

Create a simple Staff sidebar:

- Dashboard
- My Tickets
- My Profile
- Logout

Do not show Admin navigation items.

==================================================
1. STAFF DASHBOARD
==================================================

Create a Staff-specific dashboard.

Do NOT show global city-wide statistics.

Show KPI cards:
- Assigned to Me
- In Progress
- Critical
- Resolved

Show "My Recent Tickets" table.

Columns:
- Ticket ID
- Category
- Ward
- Severity
- Danger Level
- Status
- Created At

Only show tickets assigned to the logged-in Staff.

Use:
Ticket.assigneeId = currentUser.userId

If Department Queue is supported, optionally provide:
- My Assigned
- Department Queue

Department filtering:
currentUser.departmentId = Ticket.departmentId

==================================================
2. MY TICKETS
==================================================

Create a dedicated My Tickets page.

Filters:
- Status
- Category
- Severity
- Danger Level
- Ward

Table columns:
- ticketId
- categoryId
- address
- severity
- dangerLevel
- status
- createdAt

Do not allow Staff to edit:
- departmentId
- routing rule
- category
- AI result

==================================================
3. STAFF TICKET DETAIL
==================================================

Create a complete Staff Ticket Detail page.

Ticket attributes:
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

Sections:

A. Ticket Information
- Ticket ID
- Category
- Description
- Severity
- Danger Level
- Status

B. Report Image
- Display citizen uploaded images

C. Location
- Province
- Ward
- Address
- Map
- Location Method

D. Reporter
- Full Name
- Phone
- Email

E. Assignment
- Department
- Assigned Staff

Staff can VIEW assignment information but cannot change Department or Routing Rule.

F. AI Verification
Display:
- Category
- Severity
- Danger Level
- Confidence
- isLifeThreatening
- needsManualReview

Staff can only VIEW AI verification results.

Do NOT show:
- Approve
- Modify
- Reject

These actions belong to Admin Manual Review.

==================================================
4. STAFF ACTIONS
==================================================

If ticket.status = ASSIGNED:

Show button:
"Start Work"

When clicked:
ASSIGNED → IN_PROGRESS

If ticket.status = IN_PROGRESS:

Show:
"Submit Resolution"

Open Resolution Evidence form:

- Upload Image
- Resolution Note

Attributes:
- evidenceId
- ticketId
- staffId
- imageUrl
- resolutionNote
- createdAt

After submitting:
IN_PROGRESS → RESOLVED

==================================================
5. TICKET HISTORY
==================================================

Create a read-only timeline.

Display:
- CREATED
- AI_REVIEWED
- ROUTED
- ASSIGNED
- REASSIGNED
- REROUTED
- WORK_STARTED
- EVIDENCE_SUBMITTED
- CLOSED

Staff cannot edit history.

==================================================
6. STAFF PROFILE
==================================================

Show current Staff information:

- userId
- fullName
- email
- phoneNumber
- province
- ward
- address
- role
- departmentId
- status

Display:
Role = STAFF
Department = current user's department

Allow only profile-related actions supported by the backend.

==================================================
ROLE RESTRICTION
==================================================

The Staff portal must be visually and functionally different from Admin.

ADMIN:
- Dashboard
- Ticket Management
- Manual Review
- Analytics
- User Management
- Category Management
- Department Management
- Routing Rules

STAFF:
- Dashboard
- My Tickets
- Ticket Detail
- My Profile

Staff must only access tickets within their authorized Department or assigned tickets.

Use the existing CityFix visual design, hazard stripe branding, header and responsive desktop layout.

Do not create new database entities or attributes.
Use only the existing CityFix Flow 2 attributes.