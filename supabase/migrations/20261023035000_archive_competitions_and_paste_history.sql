alter table public.tournaments
  add column archived_at timestamptz;

alter table public.individual_match_rounds
  drop constraint individual_match_rounds_status_check,
  add constraint individual_match_rounds_status_check
    check (status in ('draft', 'published', 'completed', 'cancelled', 'archived')),
  add column archived_at timestamptz;

create table public.player_pokepaste_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  competition_kind text not null
    check (competition_kind in ('tournament', 'individual_round')),
  competition_id uuid not null,
  competition_name text not null check (length(btrim(competition_name)) between 1 and 120),
  match_id uuid not null,
  phase text,
  round_number smallint not null check (round_number between 1 and 100),
  match_number smallint not null check (match_number between 1 and 64),
  opponent_player_id uuid references public.players (id) on delete set null,
  opponent_name text not null check (length(btrim(opponent_name)) between 1 and 60),
  pokepaste_url text not null
    check (pokepaste_url ~ '^https://(www\.)?pokepast\.es/[A-Za-z0-9_-]{4,80}$'),
  played_at timestamptz,
  archived_at timestamptz not null default now(),
  constraint player_pokepaste_history_unique_entry
    unique (competition_kind, competition_id, player_id, match_id)
);

create index player_pokepaste_history_player_idx
  on public.player_pokepaste_history (player_id, archived_at desc);

alter table public.player_pokepaste_history enable row level security;
revoke all on table public.player_pokepaste_history from public, anon, authenticated;
grant all privileges on table public.player_pokepaste_history to service_role;

create function public.prevent_individual_round_pokepaste_changes_after_submission()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.round_id is not null
    and exists (
      select 1
      from public.individual_match_rounds
      where id = old.round_id
        and status in ('published', 'completed')
    )
    and (
      (old.player_a_pokepaste_url is not null
        and new.player_a_pokepaste_url is distinct from old.player_a_pokepaste_url)
      or
      (old.player_b_pokepaste_url is not null
        and new.player_b_pokepaste_url is distinct from old.player_b_pokepaste_url)
    )
  then
    raise exception 'Los enlaces de Poképast.es no se pueden modificar después de enviarlos durante la ronda.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger individual_matches_lock_submitted_round_pokepastes
before update of player_a_pokepaste_url, player_b_pokepaste_url
on public.individual_matches
for each row
execute function public.prevent_individual_round_pokepaste_changes_after_submission();

create function public.clear_tournament_pokepaste_when_player_changes()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.player_a_id is distinct from old.player_a_id then
    new.player_a_pokepaste_url := null;
  end if;
  if new.player_b_id is distinct from old.player_b_id then
    new.player_b_pokepaste_url := null;
  end if;
  return new;
end;
$$;

create trigger tournament_matches_clear_pokepaste_on_player_change
before update of player_a_id, player_b_id
on public.tournament_matches
for each row
execute function public.clear_tournament_pokepaste_when_player_changes();

create function public.clear_individual_pokepaste_when_player_changes()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.player_a_id is distinct from old.player_a_id then
    new.player_a_pokepaste_url := null;
  end if;
  if new.player_b_id is distinct from old.player_b_id then
    new.player_b_pokepaste_url := null;
  end if;
  return new;
end;
$$;

create trigger individual_matches_clear_pokepaste_on_player_change
before update of player_a_id, player_b_id
on public.individual_matches
for each row
execute function public.clear_individual_pokepaste_when_player_changes();

create or replace function public.prevent_tournament_pokepaste_changes_after_submission()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tournament_status text;
begin
  select status into v_tournament_status
  from public.tournaments
  where id = old.tournament_id;

  if v_tournament_status = 'archived'
    and (
      (old.player_a_pokepaste_url is distinct from new.player_a_pokepaste_url
        and new.player_a_pokepaste_url is not null)
      or
      (old.player_b_pokepaste_url is distinct from new.player_b_pokepaste_url
        and new.player_b_pokepaste_url is not null)
    )
  then
    raise exception 'No se pueden añadir enlaces de Poképast.es a un torneo archivado.'
      using errcode = '23514';
  end if;

  if v_tournament_status in ('published', 'in_progress', 'completed') and (
    (old.player_a_pokepaste_url is not null
      and new.player_a_pokepaste_url is distinct from old.player_a_pokepaste_url)
    or
    (old.player_b_pokepaste_url is not null
      and new.player_b_pokepaste_url is distinct from old.player_b_pokepaste_url)
  ) then
    raise exception 'Los enlaces de Poképast.es no se pueden modificar después de enviarlos durante el torneo.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_individual_round_pokepaste_changes_after_submission()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_round_status text;
begin
  if old.round_id is null then
    return new;
  end if;

  select status into v_round_status
  from public.individual_match_rounds
  where id = old.round_id;

  if v_round_status = 'archived'
    and (
      (old.player_a_pokepaste_url is distinct from new.player_a_pokepaste_url
        and new.player_a_pokepaste_url is not null)
      or
      (old.player_b_pokepaste_url is distinct from new.player_b_pokepaste_url
        and new.player_b_pokepaste_url is not null)
    )
  then
    raise exception 'No se pueden añadir enlaces de Poképast.es a una ronda archivada.'
      using errcode = '23514';
  end if;

  if v_round_status in ('published', 'completed') and (
    (old.player_a_pokepaste_url is not null
      and new.player_a_pokepaste_url is distinct from old.player_a_pokepaste_url)
    or
    (old.player_b_pokepaste_url is not null
      and new.player_b_pokepaste_url is distinct from old.player_b_pokepaste_url)
  ) then
    raise exception 'Los enlaces de Poképast.es no se pueden modificar después de enviarlos durante la ronda.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.archive_consonancia_tournament(
  p_tournament_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_match_count integer;
begin
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede archivar torneos.' using errcode = '42501';
  end if;

  select * into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;
  if not found then
    raise exception 'No se encontró el torneo.' using errcode = '22023';
  end if;
  if v_tournament.status = 'archived' then
    return;
  end if;
  if v_tournament.status <> 'completed' then
    raise exception 'Solo se pueden archivar torneos finalizados.' using errcode = '22023';
  end if;

  select count(*) into v_match_count
  from public.tournament_matches
  where tournament_id = p_tournament_id;
  if v_match_count = 0 or exists (
    select 1
    from public.tournament_matches
    where tournament_id = p_tournament_id
      and status not in ('completed', 'bye', 'forfeit')
  ) then
    raise exception 'Todos los combates deben estar terminados antes de archivar el torneo.' using errcode = '22023';
  end if;

  update public.tournaments
  set status = 'archived', archived_at = now()
  where id = p_tournament_id;

  insert into public.player_pokepaste_history (
    player_id, competition_kind, competition_id, competition_name,
    match_id, phase, round_number, match_number, opponent_player_id,
    opponent_name, pokepaste_url, played_at
  )
  select m.player_a_id, 'tournament', p_tournament_id, v_tournament.name,
    m.id, m.phase, m.round_number, m.match_number,
    m.player_b_id, coalesce(opponent.display_name, 'Participante'),
    m.player_a_pokepaste_url, m.completed_at
  from public.tournament_matches m
  left join public.players opponent on opponent.id = m.player_b_id
  where m.tournament_id = p_tournament_id
    and m.player_a_id is not null
    and m.player_a_pokepaste_url is not null
  union all
  select m.player_b_id, 'tournament', p_tournament_id, v_tournament.name,
    m.id, m.phase, m.round_number, m.match_number,
    m.player_a_id, coalesce(opponent.display_name, 'Participante'),
    m.player_b_pokepaste_url, m.completed_at
  from public.tournament_matches m
  left join public.players opponent on opponent.id = m.player_a_id
  where m.tournament_id = p_tournament_id
    and m.player_b_id is not null
    and m.player_b_pokepaste_url is not null
  on conflict (competition_kind, competition_id, player_id, match_id) do nothing;

  update public.tournament_matches
  set player_a_pokepaste_url = null, player_b_pokepaste_url = null
  where tournament_id = p_tournament_id
    and (player_a_pokepaste_url is not null or player_b_pokepaste_url is not null);
end;
$$;

revoke all on function public.archive_consonancia_tournament(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.archive_consonancia_tournament(uuid, uuid)
  to service_role;

create function public.archive_individual_match_round(
  p_round_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_round public.individual_match_rounds%rowtype;
  v_match_count integer;
begin
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede archivar rondas.' using errcode = '42501';
  end if;

  select * into v_round
  from public.individual_match_rounds
  where id = p_round_id
  for update;
  if not found then
    raise exception 'No se encontró la ronda.' using errcode = '22023';
  end if;
  if v_round.status = 'archived' then
    return;
  end if;
  if v_round.status <> 'completed' then
    raise exception 'Solo se pueden archivar rondas finalizadas.' using errcode = '22023';
  end if;

  select count(*) into v_match_count
  from public.individual_matches
  where round_id = p_round_id;
  if v_match_count = 0 or exists (
    select 1
    from public.individual_matches
    where round_id = p_round_id
      and status not in ('completed', 'forfeit')
  ) then
    raise exception 'Todos los combates deben estar terminados antes de archivar la ronda.' using errcode = '22023';
  end if;

  update public.individual_match_rounds
  set status = 'archived', archived_at = now()
  where id = p_round_id;

  insert into public.player_pokepaste_history (
    player_id, competition_kind, competition_id, competition_name,
    match_id, phase, round_number, match_number, opponent_player_id,
    opponent_name, pokepaste_url, played_at
  )
  select m.player_a_id, 'individual_round', p_round_id, v_round.name,
    m.id, v_round.name, v_round.round_number,
    coalesce(m.round_match_number, 1), m.player_b_id,
    coalesce(opponent.display_name, 'Participante'),
    m.player_a_pokepaste_url, m.completed_at
  from public.individual_matches m
  left join public.players opponent on opponent.id = m.player_b_id
  where m.round_id = p_round_id
    and m.player_a_pokepaste_url is not null
  union all
  select m.player_b_id, 'individual_round', p_round_id, v_round.name,
    m.id, v_round.name, v_round.round_number,
    coalesce(m.round_match_number, 1), m.player_a_id,
    coalesce(opponent.display_name, 'Participante'),
    m.player_b_pokepaste_url, m.completed_at
  from public.individual_matches m
  left join public.players opponent on opponent.id = m.player_a_id
  where m.round_id = p_round_id
    and m.player_b_pokepaste_url is not null
  on conflict (competition_kind, competition_id, player_id, match_id) do nothing;

  update public.individual_matches
  set player_a_pokepaste_url = null, player_b_pokepaste_url = null
  where round_id = p_round_id
    and (player_a_pokepaste_url is not null or player_b_pokepaste_url is not null);
end;
$$;

revoke all on function public.archive_individual_match_round(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.archive_individual_match_round(uuid, uuid)
  to service_role;
