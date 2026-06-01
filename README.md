# Yale Smart Lock — Service Automation

Automates the Yale door-lock service workflow for a Chennai dealer:

```
Yale email → Lead created → Customer WhatsApp bot → Technician assigned
   → Work tracked (web link + GPS) → OCR serial number → PDF report → Email to Yale
```

**Stack:** Next.js (Vercel) · Supabase (Postgres + Auth + Storage) · WhatsApp Business API · Google Vision (OCR).

---

## Build roadmap

| Step | Scope | Status |
|------|-------|--------|
| **1** | Database schema + Owner dashboard (create leads, assign technicians, track status) | ✅ this commit |
| 2 | Technician web page (PWA) — secret link, accept/reject, GPS, uploads | ⬜ |
| 3 | WhatsApp notifications (owner + technician link) | ⬜ |
| 4 | Email watcher — auto-create leads from Yale | ⬜ |
| 5 | OCR — auto-read serial number | ⬜ |
| 6 | PDF report + auto-email to Yale | ⬜ |

---

## Setup (Step 1)

### 1. Create a Supabase project
- Go to [supabase.com](https://supabase.com) → New project (free tier is fine).
- Open **SQL Editor** → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
  This creates all tables and seeds sample technicians + zones.

### 2. Connect the app
- In Supabase: **Settings → API**, copy the **Project URL** and **service_role** key.
- Copy `.env.example` to `.env.local` and fill them in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> The `service_role` key is secret — it stays on the server only. `.env.local` is git-ignored.

### 3. Install & run
```bash
npm install
npm run dev      # http://localhost:3000
```

The dashboard shows a friendly setup notice until Supabase is connected and the schema is run.

---

## Deploy (Vercel)
1. Push this folder to its own GitHub repo.
2. Import it on [vercel.com](https://vercel.com).
3. Add the two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) in **Project Settings → Environment Variables**.
4. Deploy.

---

## Project structure
```
app/
  page.tsx          Owner dashboard (jobs table, stats, assign, status)
  leads/new/        New-lead form
  actions.ts        Server actions (createLead, assignTechnician, setJobStatus)
lib/
  supabase.ts       Server-only Supabase client (service role)
  types.ts          Domain types + status labels
supabase/
  schema.sql        Database schema + seed data (run once in Supabase)
```
