create table public.week_two_event_submissions (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null check (
    event_slug in ('el-loco-de-la-colina')
  ),
  player_id uuid not null references public.players (id) on delete cascade,
  evidence_url text not null check (
    length(btrim(evidence_url)) between 8 and 500
    and evidence_url ~* '^https?://'
  ),
  submitted_at timestamptz not null default now(),
  constraint week_two_event_submissions_player_unique
    unique (event_slug, player_id)
);

create index week_two_event_submissions_event_submitted_idx
  on public.week_two_event_submissions (event_slug, submitted_at desc);

alter table public.week_two_event_submissions enable row level security;
revoke all on table public.week_two_event_submissions from public, anon, authenticated;
grant all privileges on table public.week_two_event_submissions to service_role;

comment on table public.week_two_event_submissions is
  'Private participant evidence links for the Week 2 Hill challenge. Access is mediated by authenticated server handlers.';
