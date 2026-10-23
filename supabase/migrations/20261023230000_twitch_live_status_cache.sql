create table public.twitch_live_status (
  player_id uuid primary key references public.players (id) on delete cascade,
  twitch_username text not null
    check (twitch_username ~ '^[A-Za-z0-9_]{1,25}$'),
  is_live boolean not null,
  checked_at timestamptz not null
);

create index twitch_live_status_checked_at_idx
  on public.twitch_live_status (checked_at desc);

alter table public.twitch_live_status enable row level security;
revoke all on table public.twitch_live_status from public, anon, authenticated;
grant all privileges on table public.twitch_live_status to service_role;
