create function public.clear_tournament_match_result(
  p_match_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.tournament_matches%rowtype;
  v_round integer;
  v_round_count integer;
begin
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede gestionar el torneo.' using errcode = '42501';
  end if;

  select * into v_match
  from public.tournament_matches
  where id = p_match_id
  for update;

  if not found or v_match.status <> 'completed' or v_match.winner_player_id is null then
    raise exception 'El combate no tiene un resultado que se pueda quitar.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.tournaments
    where id = v_match.tournament_id
      and status in ('published', 'in_progress', 'completed')
  ) then
    raise exception 'El torneo no está disponible para editar.' using errcode = '22023';
  end if;

  update public.tournament_matches
  set status = 'pending',
      winner_player_id = null,
      completed_at = null
  where id = v_match.id;

  update public.tournament_matches
  set player_a_id = null,
      player_b_id = null,
      winner_player_id = null,
      status = 'pending',
      completed_at = null
  where tournament_id = v_match.tournament_id
    and round_number > v_match.round_number;

  select max(round_number) into v_round_count
  from public.tournament_matches
  where tournament_id = v_match.tournament_id;

  for v_round in (v_match.round_number + 1)..coalesce(v_round_count, v_match.round_number) loop
    update public.tournament_matches next_match
    set player_a_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_match.tournament_id
      and next_match.round_number = v_round
      and previous_match.tournament_id = v_match.tournament_id
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 1
      and previous_match.status in ('completed', 'bye', 'forfeit');

    update public.tournament_matches next_match
    set player_b_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_match.tournament_id
      and next_match.round_number = v_round
      and previous_match.tournament_id = v_match.tournament_id
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 2
      and previous_match.status in ('completed', 'bye', 'forfeit');

    update public.tournament_matches next_match
    set status = 'bye',
        winner_player_id = coalesce(next_match.player_a_id, next_match.player_b_id)
    where next_match.tournament_id = v_match.tournament_id
      and next_match.round_number = v_round
      and (next_match.player_a_id is null or next_match.player_b_id is null)
      and coalesce(next_match.player_a_id, next_match.player_b_id) is not null
      and (
        select count(*) = 2
          and bool_and(previous_match.status in ('completed', 'bye', 'forfeit'))
        from public.tournament_matches previous_match
        where previous_match.next_match_id = next_match.id
      );
  end loop;

  update public.tournaments
  set status = 'in_progress',
      completed_at = null
  where id = v_match.tournament_id
    and status = 'completed';
end;
$$;

revoke all on function public.clear_tournament_match_result(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.clear_tournament_match_result(uuid, uuid)
  to service_role;
