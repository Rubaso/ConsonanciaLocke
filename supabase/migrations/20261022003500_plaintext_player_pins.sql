do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'players'
      and column_name = 'pin_hash'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'players'
        and column_name = 'pin'
    ) then
      alter table public.players add column pin text;
    end if;

    alter table public.players drop constraint if exists players_pin_hash_check;
    alter table public.players drop column pin_hash;
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'players'
      and column_name = 'pin'
  ) then
    alter table public.players add column pin text;
  end if;
end;
$$;

alter table public.players
  drop constraint if exists players_pin_hash_check;

alter table public.players
  drop constraint if exists players_pin_check;

alter table public.players
  drop constraint if exists players_pin_format_check;

alter table public.players
  add constraint players_pin_format_check
  check (pin is null or pin ~ '^[A-Za-z0-9]{5}$');

update public.player_sessions as sessions
set revoked_at = pg_catalog.now()
from public.players as players
where players.id = sessions.player_id
  and players.pin is null
  and sessions.revoked_at is null;

comment on table public.players is
  'Consonancia accounts. PINs are plaintext and must only be accessed by trusted server-side code.';
comment on column public.players.pin is
  'Nullable five-character alphanumeric PIN. Plaintext is intentional; restrict access to trusted server-side code.';
