-- ============================================================
-- Yale Smart Lock Service Automation — Database Schema
-- Run this in the Supabase SQL Editor (one time).
-- ============================================================

-- ---------- Enums ----------
do $$ begin
  create type request_type as enum ('installation', 'breakdown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum (
    'new',              -- lead just created
    'docs_pending',     -- waiting on customer documents (WhatsApp)
    'ready_to_assign',  -- customer docs received
    'assigned_pending', -- sent to technician, 10-min accept timer running
    'accepted',         -- technician accepted
    'reached',          -- technician reached site (GPS captured)
    'working',          -- work in progress
    'completed',        -- done, docs uploaded, report sent
    'cancelled'         -- cancelled / rejected / timed out
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tech_status as enum ('available', 'busy', 'off');
exception when duplicate_object then null; end $$;

-- ---------- Technicians ----------
create table if not exists technicians (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text not null,
  status       tech_status not null default 'available',
  access_token text unique,           -- secret token used in their WhatsApp link
  created_at   timestamptz not null default now()
);

-- ---------- Zones (service area -> technician) ----------
create table if not exists zones (
  id            uuid primary key default gen_random_uuid(),
  area          text not null unique,  -- e.g. 'Anna Nagar'
  technician_id uuid references technicians(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ---------- Leads (from Yale email or manual entry) ----------
create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  customer_name     text not null,
  phone             text not null,             -- CUSTOMER MOBILE (bot messages this)
  address           text,                      -- POSTAL ADDRESS
  area              text,                      -- matched to a zone
  product_details   text,
  request_type      request_type not null,     -- CALL TYPE
  yale_ref_no       text,                      -- BRAND TICKET ID
  source            text not null default 'manual',  -- 'email' | 'manual'
  -- ---- extra fields from the Yale call-log email ----
  branch            text,
  registration_date date,
  customer_type     text,
  caller_number     text,
  city              text,
  state             text,
  pincode           text,
  brand             text,
  product_group     text,
  model             text,
  dop               date,                      -- date of purchase
  dealer_name       text,
  customer_remarks  text,
  call_logged_by    text,
  raw_email         text,                      -- original email kept for audit
  customer_token    text unique,               -- secret token for the customer doc link
  cust_lat          double precision,          -- customer-shared location
  cust_lng          double precision,
  map_url           text,                      -- google maps link if the customer pastes one
  chat_state        text,                      -- WhatsApp bot conversation step
  created_at        timestamptz not null default now()
);

-- Backfill the call-log columns for databases created before they existed.
alter table leads add column if not exists branch            text;
alter table leads add column if not exists registration_date date;
alter table leads add column if not exists customer_type     text;
alter table leads add column if not exists caller_number     text;
alter table leads add column if not exists city              text;
alter table leads add column if not exists state             text;
alter table leads add column if not exists pincode           text;
alter table leads add column if not exists brand             text;
alter table leads add column if not exists product_group     text;
alter table leads add column if not exists model             text;
alter table leads add column if not exists dop               date;
alter table leads add column if not exists dealer_name       text;
alter table leads add column if not exists customer_remarks  text;
alter table leads add column if not exists call_logged_by    text;
alter table leads add column if not exists raw_email         text;
alter table leads add column if not exists customer_token    text;
alter table leads add column if not exists cust_lat          double precision;
alter table leads add column if not exists cust_lng          double precision;
alter table leads add column if not exists map_url           text;
alter table leads add column if not exists chat_state        text;   -- WhatsApp bot conversation step
create index if not exists leads_customer_token_idx on leads(customer_token);

-- Give any existing leads a customer token so their link works.
update leads
  set customer_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  where customer_token is null;

-- ---------- Customer documents (collected via WhatsApp bot) ----------
create table if not exists customer_docs (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references leads(id) on delete cascade,
  invoice_url       text,
  issue_description text,
  preferred_date    date,
  preferred_time    text,
  notes             text,
  media_urls        text[],           -- door images / damage photos/videos
  created_at        timestamptz not null default now()
);

alter table customer_docs add column if not exists preferred_time text;

-- ---------- Jobs (the workflow engine) ----------
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references leads(id) on delete cascade,
  technician_id   uuid references technicians(id) on delete set null,
  status          job_status not null default 'new',
  assigned_at     timestamptz,
  accept_deadline timestamptz,        -- assigned_at + 10 minutes
  accepted_at     timestamptz,
  reached_at      timestamptz,
  reached_lat     double precision,
  reached_lng     double precision,
  completed_at    timestamptz,
  completed_lat   double precision,
  completed_lng   double precision,
  serial_number   text,
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_technician_idx on jobs(technician_id);

-- ---------- Job completion documents (uploaded by technician) ----------
create table if not exists job_docs (
  id                   uuid primary key default gen_random_uuid(),
  job_id               uuid not null references jobs(id) on delete cascade,
  completion_photo_urls text[],
  bill_url             text,
  serial_image_url     text,
  created_at           timestamptz not null default now()
);

-- ---------- Reports (PDF + email to Yale) ----------
create table if not exists reports (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references jobs(id) on delete cascade,
  pdf_url      text,
  email_sent   boolean not null default false,
  email_sent_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------- keep jobs.updated_at fresh ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists jobs_set_updated_at on jobs;
create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- We access the DB only from the server using the SERVICE ROLE
-- key (which bypasses RLS). Enabling RLS with no policies blocks
-- all anonymous/browser access — the secure default.
-- ============================================================
alter table technicians   enable row level security;
alter table zones         enable row level security;
alter table leads         enable row level security;
alter table customer_docs enable row level security;
alter table jobs          enable row level security;
alter table job_docs      enable row level security;
alter table reports       enable row level security;

-- ============================================================
-- Seed data (sample technicians + zones from the spec)
-- ============================================================
-- Only seed on a fresh database (guarded so re-running db:push is safe).
do $$
begin
  if not exists (select 1 from technicians) then
    insert into technicians (name, phone, access_token) values
      ('Technician A', '+910000000001', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
      ('Technician B', '+910000000002', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
      ('Technician C', '+910000000003', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

    insert into zones (area, technician_id) values
      ('Egmore',        (select id from technicians where name = 'Technician A')),
      ('Chetpet',       (select id from technicians where name = 'Technician A')),
      ('Anna Nagar',    (select id from technicians where name = 'Technician A')),
      ('T Nagar',       (select id from technicians where name = 'Technician B')),
      ('Nungambakkam',  (select id from technicians where name = 'Technician B')),
      ('Koyambedu',     (select id from technicians where name = 'Technician B')),
      ('Tambaram',      (select id from technicians where name = 'Technician C')),
      ('Chrompet',      (select id from technicians where name = 'Technician C'))
    on conflict (area) do nothing;
  end if;
end $$;

-- ============================================================
-- Storage bucket for technician uploads
-- (completion photos, bill copy, serial-number image)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('job-docs', 'job-docs', true)
on conflict (id) do nothing;
