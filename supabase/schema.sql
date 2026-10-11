-- Run this in Supabase: SQL Editor -> New query -> paste -> Run
-- Safe to re-run. On an existing database it upgrades the tables in place and keeps all responses.

-- =========================== Alumni feedback ===========================
create table if not exists public.alumni_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  reg_no text not null,
  grad_year text not null,
  email text not null,
  cell_no text not null,
  employment_status text not null,
  ratings smallint[] not null check (array_length(ratings, 1) = 9),
  comments text not null default '',
  signature text not null           -- PNG data URL of the drawn signature
);

-- Department (nullable: responses submitted before departments existed have none; the admin can set it)
alter table public.alumni_feedback add column if not exists department text;
-- Set when the admin edits a response (the edit overwrites the old values)
alter table public.alumni_feedback add column if not exists updated_at timestamptz;
-- Last time the PDF was downloaded; only a "New / Downloaded" marker, downloads are unlimited
alter table public.alumni_feedback add column if not exists downloaded_at timestamptz;

alter table public.alumni_feedback drop constraint if exists alumni_feedback_employment_status_check;
alter table public.alumni_feedback add constraint alumni_feedback_employment_status_check
  check (employment_status in ('employed', 'self_employed', 'unemployed'));

alter table public.alumni_feedback drop constraint if exists alumni_feedback_department_check;
alter table public.alumni_feedback add constraint alumni_feedback_department_check
  check (department is null or department in ('electrical', 'civil', 'mechanical', 'computer_science'));

-- One response per registration number (case-insensitive)
create unique index if not exists alumni_feedback_reg_no_uidx
  on public.alumni_feedback (lower(reg_no));
create index if not exists alumni_feedback_created_idx
  on public.alumni_feedback (created_at desc);
create index if not exists alumni_feedback_department_idx
  on public.alumni_feedback (department);

-- Lock the table down: no public access. The app uses the service role key on the server only.
alter table public.alumni_feedback enable row level security;

-- =========================== Employer feedback ===========================
create table if not exists public.employer_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  employee_name text not null,
  employee_designation text not null,
  department text not null
    check (department in ('electrical', 'civil', 'mechanical', 'computer_science')),
  employer_name text not null,
  employer_designation text not null,
  -- 'details': organization name + address typed in; 'stamp': company stamp image instead
  org_mode text not null check (org_mode in ('details', 'stamp')),
  organization_name text not null default '',
  address text not null default '',
  stamp text,                        -- PNG data URL with transparent background
  email text not null,
  ratings smallint[] not null check (array_length(ratings, 1) = 11),
  downloaded_at timestamptz,
  constraint employer_feedback_org_check check (
    (org_mode = 'details' and organization_name <> '' and address <> '' and stamp is null)
    or (org_mode = 'stamp' and stamp is not null)
  )
);

create index if not exists employer_feedback_created_idx
  on public.employer_feedback (created_at desc);
create index if not exists employer_feedback_department_idx
  on public.employer_feedback (department);

alter table public.employer_feedback enable row level security;

-- =========================== Cleanup from the old version ===========================
-- Downloads are no longer once-only, so the batch-claiming function is not used any more.
drop function if exists public.claim_feedback_batch(uuid[]);
-- Old, now unused: alumni_feedback.download_batch, sequence alumni_feedback_batch_seq and the
-- table alumni_feedback_redownloads (super admin re-download log). They are left in place so no
-- history is lost; drop them by hand if you do not need them.
