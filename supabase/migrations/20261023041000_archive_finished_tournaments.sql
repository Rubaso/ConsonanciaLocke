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
