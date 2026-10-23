create or replace function public.set_tournament_bracket_slot(
  p_match_id uuid,
  p_slot smallint,
  p_player_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.tournament_matches%rowtype;
  v_source_match public.tournament_matches%rowtype;
  v_old_player_id uuid;
  v_round integer;
  v_round_count integer;
begin
  if p_slot not in (1, 2) then
    raise exception 'La posición del participante no es válida.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede gestionar el torneo.' using errcode = '42501';
  end if;

  select * into v_match
  from public.tournament_matches
  where id = p_match_id and round_number = 1
  for update;
  if not found or not exists (
    select 1 from public.tournaments
    where id = v_match.tournament_id and status = 'draft'
  ) then
    raise exception 'Solo se pueden editar los cruces de un borrador.' using errcode = '22023';
  end if;

  if p_player_id is not null and not exists (
    select 1 from public.tournament_participants
    where tournament_id = v_match.tournament_id and player_id = p_player_id
  ) then
    raise exception 'El participante no pertenece a este torneo.' using errcode = '22023';
  end if;

  v_old_player_id := case when p_slot = 1 then v_match.player_a_id else v_match.player_b_id end;
  if p_player_id is not null and (
    (p_slot = 1 and p_player_id = v_match.player_b_id)
    or (p_slot = 2 and p_player_id = v_match.player_a_id)
  ) then
    raise exception 'Un jugador no puede ocupar las dos posiciones de un cruce.' using errcode = '22023';
  end if;

  if v_old_player_id is distinct from p_player_id then
    if p_slot = 1 then
      update public.tournament_matches set player_a_id = null where id = v_match.id;
    else
      update public.tournament_matches set player_b_id = null where id = v_match.id;
    end if;

    if p_player_id is not null then
      select * into v_source_match
      from public.tournament_matches
      where tournament_id = v_match.tournament_id
        and round_number = 1
        and id <> v_match.id
        and (player_a_id = p_player_id or player_b_id = p_player_id)
      for update;

      if found then
        if v_source_match.player_a_id = p_player_id then
          update public.tournament_matches
          set player_a_id = v_old_player_id
          where id = v_source_match.id;
        else
          update public.tournament_matches
          set player_b_id = v_old_player_id
          where id = v_source_match.id;
        end if;
      end if;

      if p_slot = 1 then
        update public.tournament_matches set player_a_id = p_player_id where id = v_match.id;
      else
        update public.tournament_matches set player_b_id = p_player_id where id = v_match.id;
      end if;
    end if;
  end if;

  update public.tournament_matches
  set status = case when player_a_id is null or player_b_id is null then 'bye' else 'pending' end,
      winner_player_id = case
        when player_a_id is null then player_b_id
        when player_b_id is null then player_a_id
        else null
      end,
      completed_at = null
  where tournament_id = v_match.tournament_id and round_number = 1;

  update public.tournament_matches
  set player_a_id = null,
      player_b_id = null,
      winner_player_id = null,
      status = 'pending',
      completed_at = null
  where tournament_id = v_match.tournament_id and round_number > 1;

  select max(round_number) into v_round_count
  from public.tournament_matches
  where tournament_id = v_match.tournament_id;

  for v_round in 2..v_round_count loop
    update public.tournament_matches next_match
    set player_a_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_match.tournament_id
      and next_match.round_number = v_round
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 1
      and previous_match.status = 'bye';

    update public.tournament_matches next_match
    set player_b_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_match.tournament_id
      and next_match.round_number = v_round
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 2
      and previous_match.status = 'bye';

    update public.tournament_matches next_match
    set
      status = 'bye',
      winner_player_id = coalesce(next_match.player_a_id, next_match.player_b_id)
    where next_match.tournament_id = v_match.tournament_id
      and next_match.round_number = v_round
      and (next_match.player_a_id is null or next_match.player_b_id is null)
      and coalesce(next_match.player_a_id, next_match.player_b_id) is not null
      and (
        select count(*) = 2 and bool_and(previous_match.status = 'bye')
        from public.tournament_matches previous_match
        where previous_match.next_match_id = next_match.id
      );
  end loop;
end;
$$;

revoke all on function public.set_tournament_bracket_slot(uuid, smallint, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_tournament_bracket_slot(uuid, smallint, uuid, uuid)
  to service_role;
