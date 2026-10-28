create table public.fishing_contests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by_player_id uuid not null references public.players (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fishing_contests_dates_check check (
    ended_at is null or ended_at >= started_at
  ),
  constraint fishing_contests_status_dates_check check (
    (status = 'active' and ended_at is null)
    or (status = 'ended' and ended_at is not null)
  )
);

create unique index fishing_contests_one_active_idx
  on public.fishing_contests ((true))
  where status = 'active';

create index fishing_contests_history_idx
  on public.fishing_contests (ended_at desc, started_at desc);

create table public.fishing_contest_entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.fishing_contests (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  pokemon_id uuid references public.pokemon (id) on delete set null,
  chosen_species text not null check (length(btrim(chosen_species)) between 1 and 80),
  weight_kg numeric(8, 1) not null check (weight_kg > 0 and weight_kg < 10000),
  clip_url text not null check (
    length(btrim(clip_url)) between 8 and 500
    and clip_url ~* '^https?://'
  ),
  is_disqualified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fishing_contest_entries_unique_player unique (contest_id, player_id)
);

create index fishing_contest_entries_ranking_idx
  on public.fishing_contest_entries (contest_id, is_disqualified, weight_kg desc, updated_at);

create trigger fishing_contests_set_updated_at
before update on public.fishing_contests
for each row execute function public.set_updated_at();

create trigger fishing_contest_entries_set_updated_at
before update on public.fishing_contest_entries
for each row execute function public.set_updated_at();

alter table public.fishing_contests enable row level security;
alter table public.fishing_contest_entries enable row level security;

revoke all on table public.fishing_contests from public, anon, authenticated;
revoke all on table public.fishing_contest_entries from public, anon, authenticated;
grant all privileges on table public.fishing_contests to service_role;
grant all privileges on table public.fishing_contest_entries to service_role;

comment on table public.fishing_contests is
  'Consonancia fishing contests. At most one row may have status = active.';
comment on table public.fishing_contest_entries is
  'One fishing entry per player and contest. Weight is stored from the official Pokédex of the chosen species.';
