create or replace function public.sync_player_pokepaste_profile_to_matches()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.pokepaste_url is not distinct from old.pokepaste_url
    or new.pokepaste_url is null
  then
    return new;
  end if;

  update public.tournament_matches m
  set
    player_a_pokepaste_url = case
      when m.player_a_id = new.id and t.status = 'draft' then new.pokepaste_url
      when m.player_a_id = new.id then coalesce(m.player_a_pokepaste_url, new.pokepaste_url)
      else m.player_a_pokepaste_url
    end,
    player_b_pokepaste_url = case
      when m.player_b_id = new.id and t.status = 'draft' then new.pokepaste_url
      when m.player_b_id = new.id then coalesce(m.player_b_pokepaste_url, new.pokepaste_url)
      else m.player_b_pokepaste_url
    end
  from public.tournaments t
  where t.id = m.tournament_id
    and t.status in ('draft', 'published', 'in_progress')
    and (
      (m.player_a_id = new.id and (
        (t.status = 'draft' and m.player_a_pokepaste_url is distinct from new.pokepaste_url)
        or (t.status <> 'draft' and m.player_a_pokepaste_url is null)
      ))
      or
      (m.player_b_id = new.id and (
        (t.status = 'draft' and m.player_b_pokepaste_url is distinct from new.pokepaste_url)
        or (t.status <> 'draft' and m.player_b_pokepaste_url is null)
      ))
    );

  update public.individual_matches m
  set
    player_a_pokepaste_url = case
      when m.player_a_id = new.id and r.status = 'draft' then new.pokepaste_url
      when m.player_a_id = new.id then coalesce(m.player_a_pokepaste_url, new.pokepaste_url)
      else m.player_a_pokepaste_url
    end,
    player_b_pokepaste_url = case
      when m.player_b_id = new.id and r.status = 'draft' then new.pokepaste_url
      when m.player_b_id = new.id then coalesce(m.player_b_pokepaste_url, new.pokepaste_url)
      else m.player_b_pokepaste_url
    end
  from public.individual_match_rounds r
  where r.id = m.round_id
    and r.status in ('draft', 'published')
    and (
      (m.player_a_id = new.id and (
        (r.status = 'draft' and m.player_a_pokepaste_url is distinct from new.pokepaste_url)
        or (r.status = 'published' and m.player_a_pokepaste_url is null)
      ))
      or
      (m.player_b_id = new.id and (
        (r.status = 'draft' and m.player_b_pokepaste_url is distinct from new.pokepaste_url)
        or (r.status = 'published' and m.player_b_pokepaste_url is null)
      ))
    );

  update public.individual_matches m
  set
    player_a_pokepaste_url = case
      when m.player_a_id = new.id then new.pokepaste_url
      else m.player_a_pokepaste_url
    end,
    player_b_pokepaste_url = case
      when m.player_b_id = new.id then new.pokepaste_url
      else m.player_b_pokepaste_url
    end
  where m.round_id is null
    and m.status = 'pending'
    and (
      (m.player_a_id = new.id and m.player_a_pokepaste_url is null)
      or (m.player_b_id = new.id and m.player_b_pokepaste_url is null)
    );

  return new;
end;
$$;

create or replace function public.archive_consonancia_tournament(
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
  if v_tournament.status not in ('published', 'in_progress', 'completed') then
    raise exception 'Solo se pueden archivar torneos publicados y finalizados.' using errcode = '22023';
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

  with submitted_pastes as (
    select m.player_a_id as player_id,
      m.id as match_id,
      m.phase,
      m.round_number,
      m.match_number,
      m.player_b_id as opponent_player_id,
      coalesce(opponent.display_name, 'Participante') as opponent_name,
      m.player_a_pokepaste_url as pokepaste_url,
      m.completed_at as played_at
    from public.tournament_matches m
    left join public.players opponent on opponent.id = m.player_b_id
    where m.tournament_id = p_tournament_id
      and m.player_a_id is not null
      and m.player_a_pokepaste_url is not null
    union all
    select m.player_b_id,
      m.id,
      m.phase,
      m.round_number,
      m.match_number,
      m.player_a_id,
      coalesce(opponent.display_name, 'Participante'),
      m.player_b_pokepaste_url,
      m.completed_at
    from public.tournament_matches m
    left join public.players opponent on opponent.id = m.player_a_id
    where m.tournament_id = p_tournament_id
      and m.player_b_id is not null
      and m.player_b_pokepaste_url is not null
  ),
  one_paste_per_player as (
    select distinct on (player_id) *
    from submitted_pastes
    order by player_id, round_number desc, match_number desc
  )
  insert into public.player_pokepaste_history (
    player_id, competition_kind, competition_id, competition_name,
    match_id, phase, round_number, match_number, opponent_player_id,
    opponent_name, pokepaste_url, played_at
  )
  select player_id, 'tournament', p_tournament_id, v_tournament.name,
    match_id, phase, round_number, match_number, opponent_player_id,
    opponent_name, pokepaste_url, played_at
  from one_paste_per_player
  on conflict (competition_kind, competition_id, player_id, match_id) do nothing;

  update public.tournament_matches
  set player_a_pokepaste_url = null, player_b_pokepaste_url = null
  where tournament_id = p_tournament_id
    and (player_a_pokepaste_url is not null or player_b_pokepaste_url is not null);

  update public.players
  set pokepaste_url = null
  where pokepaste_url is not null
    and id in (
      select player_id
      from public.tournament_participants
      where tournament_id = p_tournament_id
    );
end;
$$;

revoke all on function public.archive_consonancia_tournament(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.archive_consonancia_tournament(uuid, uuid)
  to service_role;

create or replace function public.archive_individual_match_round(
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

  with submitted_pastes as (
    select m.player_a_id as player_id,
      m.id as match_id,
      v_round.name as phase,
      v_round.round_number,
      coalesce(m.round_match_number, 1) as match_number,
      m.player_b_id as opponent_player_id,
      coalesce(opponent.display_name, 'Participante') as opponent_name,
      m.player_a_pokepaste_url as pokepaste_url,
      m.completed_at as played_at
    from public.individual_matches m
    left join public.players opponent on opponent.id = m.player_b_id
    where m.round_id = p_round_id
      and m.player_a_pokepaste_url is not null
    union all
    select m.player_b_id,
      m.id,
      v_round.name,
      v_round.round_number,
      coalesce(m.round_match_number, 1),
      m.player_a_id,
      coalesce(opponent.display_name, 'Participante'),
      m.player_b_pokepaste_url,
      m.completed_at
    from public.individual_matches m
    left join public.players opponent on opponent.id = m.player_a_id
    where m.round_id = p_round_id
      and m.player_b_pokepaste_url is not null
  ),
  one_paste_per_player as (
    select distinct on (player_id) *
    from submitted_pastes
    order by player_id, match_number desc
  )
  insert into public.player_pokepaste_history (
    player_id, competition_kind, competition_id, competition_name,
    match_id, phase, round_number, match_number, opponent_player_id,
    opponent_name, pokepaste_url, played_at
  )
  select player_id, 'individual_round', p_round_id, v_round.name,
    match_id, phase, round_number, match_number, opponent_player_id,
    opponent_name, pokepaste_url, played_at
  from one_paste_per_player
  on conflict (competition_kind, competition_id, player_id, match_id) do nothing;

  update public.individual_matches
  set player_a_pokepaste_url = null, player_b_pokepaste_url = null
  where round_id = p_round_id
    and (player_a_pokepaste_url is not null or player_b_pokepaste_url is not null);

  update public.players
  set pokepaste_url = null
  where pokepaste_url is not null
    and id in (
      select player_a_id from public.individual_matches where round_id = p_round_id
      union
      select player_b_id from public.individual_matches where round_id = p_round_id
      union
      select rest_player_id
      from public.individual_match_rounds
      where id = p_round_id and rest_player_id is not null
    );
end;
$$;

revoke all on function public.archive_individual_match_round(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.archive_individual_match_round(uuid, uuid)
  to service_role;
