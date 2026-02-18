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
  source text,
  unique (scope, area, title)
);
