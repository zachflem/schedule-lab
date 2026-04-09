# ScheduleLab

A job scheduling and site docket management platform built for equipment hire and services operators. ScheduleLab covers the full job lifecycle — from customer enquiry through to on-site completion — with digital dockets, asset tracking, and role-based workflows.

## Features

- **Enquiry-to-Job pipeline** — Public enquiry form converts directly to scheduled jobs
- **Job scheduling & calendar view** — Dispatch jobs, allocate assets and personnel, track status
- **Projects** — Group recurring or long-term jobs under a single project with job templates
- **Site dockets** — Operators complete digital dockets on-site: timesheets, safety checklists, hazard logs, equipment metrics, photos, and captured signatures
- **Asset management** — Equipment inventory with type-specific fields, compliance expiry tracking (CraneSafe, registration, insurance), service intervals, and rate cards
- **Personnel management** — Staff records with qualifications, expiry tracking, and hourly rates
- **Customer records** — Contact management with site and billing contacts and full job history
- **Role-based access** — Admin, Dispatcher, and Operator roles with scoped permissions
- **PWA / offline support** — Works on mobile devices on-site via IndexedDB local storage

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router 7 |
| Validation | Zod |
| Offline storage | Dexie (IndexedDB) |
| Backend | Cloudflare Pages Functions (serverless) |
| Database | Cloudflare D1 (SQLite) |
| Auth | Cloudflare Access (JWT) |
| Email | MailChannels API |
| Deployment | Cloudflare Pages + Wrangler |

## Prerequisites

- Node.js v18+
- A [Cloudflare](https://cloudflare.com) account
- Wrangler CLI: `npm i -g wrangler`

## Getting Started

```bash
# Install dependencies
npm install

# Authenticate with Cloudflare
wrangler login

# Initialise the remote D1 database
npm run db:init:remote
```

## Development

```bash
npm run dev
```

Starts the Vite dev server. API requests (`/api/*`) are proxied to `localhost:8788` where Wrangler runs the Pages Functions locally.

**Role mocking in development:** Set a `mock-role` cookie to `admin`, `dispatcher`, or `operator` to test different permission levels without Cloudflare Access configured.

## Database

Schema and seed files live in the `db/` directory.

```bash
npm run db:init:remote   # Apply schema + seed to remote D1
```

The Cloudflare D1 binding is configured in `wrangler.toml`.

## Build & Deploy

```bash
npm run build    # Type-check + Vite bundle → ./dist/
npm run deploy   # Deploy to Cloudflare Pages
```

## Project Structure

```
src/
  features/       # Feature modules (jobs, dockets, customers, assets, etc.)
  shared/         # Auth context, API client, validation schemas, shared UI
  widgets/        # Layout, Header, NavMenu
functions/
  api/            # Backend REST endpoints (Cloudflare Pages Functions)
  lib/            # Shared backend utilities (D1 helpers, email, recurrence)
db/
  schema.sql      # Database schema
  seed.sql        # Seed data
```

## Authentication

ScheduleLab uses Cloudflare Access for authentication. The middleware in `functions/_middleware.ts` extracts the authenticated user email from the `CF-Access-Authenticated-User-Email` header and resolves the corresponding Personnel record.

Logout redirects to `/cdn-cgi/access/logout`.

## Linting

```bash
npm run lint
```
