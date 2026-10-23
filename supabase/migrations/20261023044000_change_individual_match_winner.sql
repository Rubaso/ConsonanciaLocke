create function public.set_individual_match_winner(
  p_match_id uuid,
  p_winner_player_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.individual_matches%rowtype;
  v_round_id uuid;
  v_round_status text;
begin
  if not exists (
    select 1
    from public.players
    where id = p_organizer_player_id
      and role = 'organizer'
      and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede gestionar los combates.'
      using errcode = '42501';
  end if;

  select round_id
  into v_round_id
  from public.individual_matches
  where id = p_match_id;

  if not found then
    raise exception 'No se encontró el combate.' using errcode = '22023';
  end if;

  if v_round_id is not null then
    select status
    into v_round_status
    from public.individual_match_rounds
    where id = v_round_id
    for update;

    if not found or v_round_status not in ('published', 'completed') then
      raise exception 'Solo se pueden cambiar resultados de rondas publicadas y no archivadas.'
        using errcode = '22023';
    end if;
  end if;

  select *
  into v_match
  from public.individual_matches
  where id = p_match_id
  for update;

  if not found
    or v_match.round_id is distinct from v_round_id
    or v_match.status not in ('pending', 'completed', 'forfeit')
    or p_winner_player_id is null
    or not (
      p_winner_player_id = v_match.player_a_id
      or p_winner_player_id = v_match.player_b_id
    )
  then
    raise exception 'El combate no está activo o el ganador no participa.'
      using errcode = '22023';
  end if;

  update public.individual_matches
  set winner_player_id = p_winner_player_id,
      status = 'completed',
      completed_at = now()
  where id = p_match_id;
end;
$$;

revoke all on function public.set_individual_match_winner(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_individual_match_winner(uuid, uuid, uuid)
  to service_role;
