create or replace function public.create_tournament_bracket(
  p_name text,
  p_player_ids uuid[],
  p_created_by_player_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tournament_id uuid;
  v_player_count integer;
  v_bracket_size integer := 1;
  v_round_count integer := 0;
  v_round integer;
  v_match_number integer;
  v_match_count integer;
  v_first_round_match_count integer;
  v_full_match_count integer;
  v_player_a_id uuid;
  v_player_b_id uuid;
begin
  if p_name is null or length(btrim(p_name)) not between 1 and 120 then
    raise exception 'El nombre debe tener entre 1 y 120 caracteres.' using errcode = '22023';
  end if;

  if p_player_ids is null then
    raise exception 'Selecciona entre 2 y 40 participantes.' using errcode = '22023';
  end if;

  v_player_count := cardinality(p_player_ids);
  if v_player_count < 2 or v_player_count > 40
    or (select count(distinct player_id) from unnest(p_player_ids) as player_id) <> v_player_count
  then
    raise exception 'Selecciona entre 2 y 40 participantes distintos.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.players
    where id = p_created_by_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede crear torneos.' using errcode = '42501';
  end if;

  if (
    select count(*)
    from public.players
    where id = any(p_player_ids) and is_active
  ) <> v_player_count then
    raise exception 'Todos los participantes deben tener una cuenta activa.' using errcode = '22023';
  end if;

  insert into public.tournaments (
    name,
    format_key,
    status,
    participant_limit,
    created_by_player_id
  )
  values (btrim(p_name), 'single_elimination', 'draft', 40, p_created_by_player_id)
  returning id into v_tournament_id;

  insert into public.tournament_participants (tournament_id, player_id, seed)
  select v_tournament_id, player_id, ordinal::smallint
  from unnest(p_player_ids) with ordinality as entrants(player_id, ordinal);

  while v_bracket_size < v_player_count loop
    v_bracket_size := v_bracket_size * 2;
    v_round_count := v_round_count + 1;
  end loop;

  for v_round in 1..v_round_count loop
    v_match_count := v_bracket_size / (2 ^ v_round);
    if v_round = 1 then
      v_first_round_match_count := v_match_count;
      v_full_match_count := greatest(v_player_count - v_first_round_match_count, 0);
    end if;

    for v_match_number in 1..v_match_count loop
      v_player_a_id := null;
      v_player_b_id := null;
      if v_round = 1 then
        if v_match_number <= v_full_match_count then
          v_player_a_id := p_player_ids[(v_match_number * 2) - 1];
          v_player_b_id := p_player_ids[v_match_number * 2];
        else
          v_player_a_id := p_player_ids[
            (v_full_match_count * 2) + (v_match_number - v_full_match_count)
          ];
        end if;
      end if;

      insert into public.tournament_matches (
        tournament_id,
        phase,
        round_number,
        match_number,
        player_a_id,
        player_b_id,
        winner_player_id,
        status
      )
      values (
        v_tournament_id,
        'main',
        v_round,
        v_match_number,
        v_player_a_id,
        v_player_b_id,
        case
          when v_round = 1 and v_player_a_id is null then v_player_b_id
          when v_round = 1 and v_player_b_id is null then v_player_a_id
          else null
        end,
        case
          when v_round = 1 and (v_player_a_id is null or v_player_b_id is null) then 'bye'
          else 'pending'
        end
      );
    end loop;
  end loop;

  update public.tournament_matches current_match
  set
    next_match_id = next_match.id,
    next_player_slot = case when current_match.match_number % 2 = 1 then 1 else 2 end
  from public.tournament_matches next_match
  where current_match.tournament_id = v_tournament_id
    and next_match.tournament_id = v_tournament_id
    and next_match.round_number = current_match.round_number + 1
    and next_match.match_number = (current_match.match_number + 1) / 2;

  for v_round in 2..v_round_count loop
    update public.tournament_matches next_match
    set player_a_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_tournament_id
      and next_match.round_number = v_round
      and previous_match.tournament_id = v_tournament_id
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 1
      and previous_match.status in ('bye', 'completed', 'forfeit');

    update public.tournament_matches next_match
    set player_b_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_tournament_id
      and next_match.round_number = v_round
      and previous_match.tournament_id = v_tournament_id
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 2
      and previous_match.status in ('bye', 'completed', 'forfeit');

    update public.tournament_matches next_match
    set
      status = 'bye',
      winner_player_id = coalesce(next_match.player_a_id, next_match.player_b_id)
    where next_match.tournament_id = v_tournament_id
      and next_match.round_number = v_round
      and (next_match.player_a_id is null or next_match.player_b_id is null)
      and coalesce(next_match.player_a_id, next_match.player_b_id) is not null
      and (
        select count(*) = 2
          and bool_and(previous_match.status in ('bye', 'completed', 'forfeit'))
        from public.tournament_matches previous_match
        where previous_match.next_match_id = next_match.id
      );
  end loop;

  return v_tournament_id;
end;
$$;

revoke all on function public.create_tournament_bracket(text, uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.create_tournament_bracket(text, uuid[], uuid)
  to service_role;
