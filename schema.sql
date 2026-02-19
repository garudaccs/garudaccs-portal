-- Garuda CCS — Command & Control Station (Neon / Postgres)

create table if not exists users (
  id bigserial primary key,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('Admin','Team','Stakeholder')),
  created_at timestamptz not null default now()
);

create table if not exists token_usage (
  id bigserial primary key,
  used_at timestamptz not null default now(),
  scope text not null check (scope in ('adhiratha','personal','minervainfo')),
  agent text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  meta jsonb
);

create index if not exists token_usage_used_at_idx on token_usage (used_at);
create index if not exists token_usage_scope_idx on token_usage (scope);

create table if not exists agent_activity (
  id bigserial primary key,
  updated_at timestamptz not null default now(),
  scope text not null check (scope in ('adhiratha','personal','minervainfo')),
  agent text not null,
  status text not null,
  last_activity_at timestamptz,
  details text,
  unique (scope, agent)
);

create table if not exists tasks (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scope text not null check (scope in ('adhiratha','personal','minervainfo')),
  area text,
  title text not null,
  owner text,
  priority text,
  status text not null default 'Todo',
  start_date date,
  due_date date,
  completed_at timestamptz,
  source text,
  unique (scope, area, title)
);

create index if not exists tasks_scope_idx on tasks(scope);
create index if not exists tasks_status_idx on tasks(status);
create index if not exists tasks_owner_idx on tasks(owner);
create index if not exists tasks_updated_at_idx on tasks(updated_at);

-- Decisions log
create table if not exists decisions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  date date not null default (now()::date),
  decision text not null,
  context text,
  decided_by text,
  scope text not null check (scope in ('adhiratha','personal','minervainfo'))
);

create index if not exists decisions_date_idx on decisions(date);
create index if not exists decisions_scope_idx on decisions(scope);

-- Reminders
create table if not exists reminders (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  due_date date,
  priority text not null default 'P2' check (priority in ('P1','P2','P3')),
  category text not null default 'work' check (category in ('personal','work','follow-up')),
  status text not null default 'Open' check (status in ('Open','Done')),
  scope text not null check (scope in ('adhiratha','personal','minervainfo')),
  created_by text
);

create index if not exists reminders_due_idx on reminders(due_date);
create index if not exists reminders_scope_idx on reminders(scope);
create index if not exists reminders_status_idx on reminders(status);

-- Communication log (summaries, not full transcripts)
create table if not exists communications (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  timestamp timestamptz not null default now(),
  from_agent text,
  to_agent text,
  summary text not null,
  scope text not null check (scope in ('adhiratha','personal','minervainfo')),
  message_type text
);

create index if not exists communications_ts_idx on communications(timestamp);
create index if not exists communications_scope_idx on communications(scope);
create index if not exists communications_from_idx on communications(from_agent);

-- Magic-link / code auth (temporary dev-code display for Admins)
create table if not exists auth_codes (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists auth_codes_user_idx on auth_codes(user_id);
create index if not exists auth_codes_expires_idx on auth_codes(expires_at);

-- Lightweight migration helpers for existing deployments
alter table tasks add column if not exists start_date date;
alter table tasks add column if not exists due_date date;
alter table tasks add column if not exists completed_at timestamptz;
