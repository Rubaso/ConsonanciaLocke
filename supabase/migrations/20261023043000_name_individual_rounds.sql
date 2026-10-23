drop function public.create_individual_match_round(uuid);

create function public.create_individual_match_round(
  p_name text,
  p_organizer_player_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_round_id uuid;
  v_round_number integer;
  v_player_ids uuid[];
  v_player_count integer;
  v_index integer;
begin
  if p_name is null or length(btrim(p_name)) not between 1 and 80 then
    raise exception 'El nombre debe tener entre 1 y 80 caracteres.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede crear rondas.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('individual_match_rounds'));

  select coalesce(max(round_number), 0) + 1
  into v_round_number
  from public.individual_match_rounds;
  if v_round_number > 100 then
    raise exception 'Se ha alcanzado el máximo de rondas.' using errcode = '22023';
  end if;

  select array_agg(id order by random())
  into v_player_ids
  from public.players
  where is_active and lower(username) <> 'rubaso';

  v_player_count := coalesce(cardinality(v_player_ids), 0);
  if v_player_count < 2 then
    raise exception 'Se necesitan al menos dos participantes activos para crear una ronda.' using errcode = '22023';
  end if;

  insert into public.individual_match_rounds (
    round_number,
    name,
    status,
    rest_player_id,
    created_by_player_id
  )
  values (
    v_round_number,
    btrim(p_name),
    'draft',
    case when v_player_count % 2 = 1 then v_player_ids[v_player_count] else null end,
    p_organizer_player_id
  )
  returning id into v_round_id;

  for v_index in 1..(v_player_count / 2) loop
    insert into public.individual_matches (
      round_id,
      round_match_number,
      player_a_id,
      player_b_id,
      status,
      created_by_player_id
    )
    values (
      v_round_id,
      v_index,
      v_player_ids[(v_index * 2) - 1],
      v_player_ids[v_index * 2],
      'draft',
      p_organizer_player_id
    );
  end loop;

  return v_round_id;
end;
$$;

revoke all on function public.create_individual_match_round(text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_individual_match_round(text, uuid)
  to service_role;
