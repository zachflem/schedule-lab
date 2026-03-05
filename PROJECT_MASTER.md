# ScheduleLab - Master Reference Document

## 1. Core Logic
ScheduleLab is a cloud-based SaaS platform designed to manage the end-to-end lifecycle of asset hire, specifically focusing on Crane Hire & Fleet Management. The system revolves around three core pillars:
1. **The "Growing Form"**: A dynamic, state-based form that evolves and conditionally renders fields from an initial Enquiry all the way through to Final Invoice as the job progresses.
2. **Dynamic Gantt Chart**: A visual scheduling engine for drag-and-drop resource allocation (for cranes and personnel) with real-time conflict detection and websocket synchronization.
3. **Compliance Engine**: A safety and maintenance tracking system that strictly enforces rules (e.g., preventing allocation of expired personnel or equipment) and triggers maintenance alerts based on aggregate hours from dockets.

**Work Types**:
- **General Hire**: Booked for a specific task; site dockets capture each day separately.
- **Project Hire**: Booked for ongoing projects; frequency configurable but daily capture is strictly required.
- **Docket Completion Models**: Configurable to either individual operator completion or site supervisor bulk completion.

## 2. Full Status Workflow ("The Growing Form")
The system follows a strict linear status progression with specific form contexts at each stage:
1. **Enquiry**: Draft mode. Captures basic requirements (Customer Name, Date, Location, Crane Size, Job Brief, Max Weight/Radius, Hazards, Site Access).
2. **Quote**: Requires pricing and selected crane category to proceed.
3. **Quote Sent**: System sends a unique URL to the customer. The internal form becomes Read-Only for staff.
4. **Quote Accepted**: *Gate: T&Cs ticked, Approver Name entered.* Triggers an email/in-app alert to the Scheduler.
5. **Job Booked**: Operational details are added to the form.
6. **Job Scheduled**: Appears on the Gantt Chart. *Gate: A specific Crane Asset ID must be assigned.*
7. **Allocated**: Personnel assigned to the job. Conflict checks run to highlight double-bookings in red. *Gate: Personnel must have valid licenses.*
8. **Site Docket**: Active phase recording Machine Hours, Operator Hours, Fuel, and Site Sign-off. Accessed via mobile responsive view.
9. **Completed**: Job is finished. Status is locked. *Gate: Customer Signature required to lock.*
10. **Invoiced**: Calculations generated based on Docket hours. Ready to sync via API. *Trigger: Sync to Xero/MYOB via Push.*

## 3. Technical Hard Stops & Rules
These rules strictly prevent a job or action from moving forward if requirements are unmet:
- **Quote Acceptance**: The Customer *must* tick T&Cs and provide an Approver Name.
- **Scheduling**: A specific Crane Asset ID *must* be assigned to move a Job to "Scheduled".
- **Allocation & Compliance**: Personnel *must* have valid, non-expired licenses (HRWL, White Card, Medical) to be allocated. Expired licenses block the action.
- **Double-Booking Prevention**: The Gantt chart conflict algorithm blocks overlapping allocations of Asset IDs or Personnel, returning warnings and highlighting in Red.
- **Completion**: A Customer Signature (saved as a timestamped PNG/SVG blob) is absolutely required to lock a Site Docket and mark it Completed.
- **Security & Edit Restrictions**: Once "Completed", dockets are locked. Only Admins can edit locked dockets, and every change must be recorded in an Audit Trail (User, Timestamp, Old Value, New Value).
- **Fleet Maintenance**: The system must trigger a "Service Required" alert when aggregate operator hours bring a crane within 50hrs of its 450hr interval.

## 4. Database Schema Map (Phase 1 → Phase 3 Requirements)
To support the Phase 1 MVP while structurally anticipating Phase 2 features and Phase 3 (Xero API, Service Alerts, Analytics), the relational database (PostgreSQL) is mapped with the following core entities and relationships:

### Core Entities & Relationships

**1. Customers (Contacts)**
- `id` (PK, UUID)
- `name`, `contact_details`
- `accounting_uid` (Identifier for Xero/MYOB matching - *Crucial for Phase 3 Data Mapping*)
- *Relationships*: 1:N to Jobs.

**2. Personnel (Users)**
- `id` (PK, UUID)
- `name`
- `role` (Admin, Scheduler, Sales, Operator)
- `active_role` (Supports switching mechanism)
- *Relationships*: 1:N to Licenses, 1:N to Allocations.

**3. Licenses (Personnel Compliance - Phase 2)**
- `id` (PK, UUID)
- `personnel_id` (FK)
- `license_type` (e.g., HRWL, White Card, Medical)
- `expiry_date`
- *Logic*: System strictly checks `expiry_date < Job_Date` before allocation (Hard Stop).

**4. Cranes (Assets)**
- `id` (PK, UUID)
- `name`, `category`
- `total_hours_run` (Aggregated from Site Dockets for 450hr maintenance alerts - *Phase 3*)
- `cranesafe_expiry`, `rego_expiry`, `insurance_expiry`
- `tracking_category_id` (For Xero P&L revenue tracking - *Phase 3*)
- *Relationships*: 1:N to Allocations.

**5. Jobs ("The Growing Form")**
- `id` (PK, UUID)
- `customer_id` (FK)
- `status_id` (Enum: Enquiry -> Invoiced - Dictates conditional rendering)
- `job_type` (General vs Project)
- `docket_completion_model` (Individual vs Supervisor)
- *Form Fields*: `location`, `crane_size`, `job_brief`, `max_weight`, `hazards`, `site_access`
- *Quote Fields*: `pricing`, `quote_url`
- *Acceptance Fields*: `tc_accepted`, `approver_name`
- *Relationships*: 1:N to Allocations, 1:N to Site Dockets.

**6. Allocations (Gantt Chart Engine)**
- `id` (PK, UUID)
- `job_id` (FK)
- `crane_id` (FK - *Scheduled Gate*)
- `personnel_id` (FK - *Allocated Gate*)
- `start_time`, `end_time`
- *Logic*: Evaluated on every drag_end event for overlapping conflicts.

**7. Site Dockets**
- `id` (PK, UUID)
- `job_id` (FK)
- `date`
- `machine_hours`, `operator_hours`, `fuel`
- `customer_signature_blob` (PNG/SVG - *Completed Gate*)
- `is_locked` (Boolean)
- *Logic*: Hours sync immediately to `Cranes.total_hours_run` (Phase 3 support). 

**8. Invoices (Phase 3 Financial API)**
- `id` (PK, UUID)
- `job_id` (FK)
- `draft_status`
- `xero_invoice_id`
- *Logic*: Triggered pushing Line Items mapped to Chart of Accounts when status moves to "Invoiced".

**9. Audit Trail (Security & Phase 3 Reports)**
- `id` (PK, UUID)
- `entity_type`, `entity_id` (Polymorphic: used primarily for Admin edits on Locked Site Dockets)
- `admin_user_id` (FK)
- `timestamp`
- `old_value`, `new_value`

## 5. UI/UX Rules
- **Dark/Light Mode Contrast Trap**: Until full theming is verified, all `input`, `select`, and `textarea` elements MUST explicitly enforce light-mode text readability using `text-gray-900` and `bg-white` to prevent system dark-mode preferences from rendering invisible light text on a light background.
