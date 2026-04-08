# ScheduleLab

Field operations management platform for crane hire and construction scheduling. Built with React, TypeScript, and Cloudflare Pages Functions backed by D1 (SQLite).

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite, hosted on Cloudflare Pages
- **Backend**: Cloudflare Pages Functions (edge workers)
- **Database**: Cloudflare D1 (SQLite)
- **Email**: MailChannels (via Cloudflare Workers integration, no API key required)
- **Auth**: Magic-link / one-time passcode via email

## Getting Started

```bash
npm install
npm run dev        # local dev server
npm run build      # production build
```

Database migrations are applied via the Cloudflare D1 CLI:

```bash
wrangler d1 migrations apply schedule-lab-db
```

---

## Email Notifications

Emails are sent automatically via MailChannels from `no-reply@schedule-lab.pages.dev`. The company display name and app URL are pulled from the `platform_settings` table (configurable by admins under Settings).

### Personnel email preferences

Each personnel record has two independent flags:

| Flag | Purpose |
|---|---|
| **Can login to system** | Allows the person to authenticate and access the app |
| **Receives email notifications** | Opts the person in to automated notification emails |

These are set independently on the Personnel edit page. A person can receive emails without having login access, and vice versa.

> **Important:** Only personnel with **Receives email notifications** enabled will receive automated notification emails. Having **Can login** checked alone is not sufficient.

### Trigger events

| Event | Recipients | Trigger condition |
|---|---|---|
| **New public enquiry** | All dispatchers and admins with `receives_emails = true` | A new enquiry is submitted via the public enquiry form |
| **Job scheduled** | All personnel assigned to the job with `receives_emails = true` | Job status changes to "Job Scheduled", OR both `start_time` and `end_time` are set on a job update |
| **Docket rejected** | All personnel assigned to the job with `receives_emails = true` | A dispatcher rejects a docket with notes |
| **Docket validated (copy)** | Any signatory who provided an `email_copy_to` address on their signature | A dispatcher validates/approves a completed docket |
| **Personnel invitation** | The invited person | Personnel is created with `can_login = true` and an email address, or when "Send Invite" is clicked manually |

### Recipient filtering rules

- **Assigned operators** (job scheduled, docket rejected): must have a valid email address **and** `receives_emails = true`
- **Dispatchers / admins** (new enquiry): must have a valid email address **and** `receives_emails = true`
- **Signature copy** (docket validated): any email address provided in the `email_copy_to` field at signing time — not subject to the `receives_emails` flag
- **Invitation**: gated on `can_login = true` and a valid email address — not subject to the `receives_emails` flag

### Error handling

All notification emails are fire-and-forget — a send failure is logged but does not cause the originating API request to fail. The sole exception is the personnel invite endpoint, which returns HTTP 500 if the email cannot be sent.

---

## Project Structure

```
src/
  features/          # Feature-scoped React pages and components
    personnel/
    jobs/
    dockets/
    ...
  shared/
    lib/             # API client, utilities
    validation/      # Zod schemas shared between frontend and backend
    ui/              # Shared UI components

functions/
  api/               # Cloudflare Pages Functions (API routes)
  lib/
    db.ts            # D1 helpers, auth, email send utility
    emails.ts        # Email templates and notification helpers

db/
  schema.sql         # Base database schema

migrations/          # Incremental D1 migrations (applied in filename order)
```

## Roles

| Role | Permissions |
|---|---|
| `admin` | Full access including settings and personnel management |
| `dispatcher` | Can manage jobs, dockets, personnel, and enquiries |
| `operator` | Read-only access; submits dockets from the field |
