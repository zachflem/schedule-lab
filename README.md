# 🗓️ ScheduleLab

**ScheduleLab** is a premium, full-stack logistics and personnel management platform designed for high-efficiency scheduling and operational oversight. Built with a modern tech stack, it provides a seamless interface for dispatchers, operators, and administrators to coordinate complex workflows.

---

## 🚀 Key Capabilities

### 🛠️ Resource Management
*   **Personnel Tracking**: Comprehensive database of staff with integrated license management and automated login provisioning.
*   **Fleet & Assets**: Manage your equipment inventory with built-in maintenance tracking and allocation history.

### 📅 Advanced Scheduling
*   **Unified Dashboard**: Real-time insights into unscheduled bookings and critical operational KPIs.
*   **Intelligent Gantt View**: Drag-and-drop resource allocation with visual conflict detection and resource utilization heatmaps.
*   **Job Lifecycle**: Seamlessly transition from Enquiry → Quote → Confirmed Job.

### 📋 Field Operations
*   **Dynamic Dockets**: Automatically generate digital dockets with mobile-responsive layouts for field staff.
*   **Safety Integration**: Embedded safety checklists and electronic signature capture for field personnel.

### 💰 Billing & Analytics
*   **Xero Integration**: One-click export of job data formatted specifically for Xero billing.
*   **Fleet Reporting**: Granular reports on personnel hours, asset utilization, and financial performance.

---

## 🏗️ Technical Architecture
ScheduleLab is built for stability, security, and scalability:
- **Frontend**: Next.js 15 (App Router) with Tailwind CSS.
- **Backend/DB**: Supabase (PostgreSQL) with a full self-hosted microservice stack.
- **Security**: Role-Based Access Control (RBAC) with secure JWT-based authentication.
- **Reliability**: Automated backup and restore system with SQL snapshotting.

---

## 📦 Deployment

ScheduleLab is designed to be deployed as a containerized stack using **Docker Compose**.

### Quick Start (Standalone VPS)
1. **Clone the repository**:
   ```bash
   git clone https://github.com/zachflem/schedule-lab.git
   cd schedule-lab
   ```
2. **Run the 1-Click Installer**:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
   *The installer will automatically configure your Docker environment, generate secure cryptographic secrets, and initialize the database schema.*

3. **Access the platform**:
   - Web UI: `http://your-server-ip/`
   - Database Management: `http://your-server-ip:8000`

For detailed configuration (SSL, SMTP, etc.), please refer to [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 📝 License
Proprietary. All rights reserved.
