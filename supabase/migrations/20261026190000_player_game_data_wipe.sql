create function public.wipe_player_game_data(p_player_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  event_count integer;
  medal_count integer;
  pokemon_count integer;
begin
  perform 1
  from public.players
  where id = p_player_id
    and is_active
  for update;

  if not found then
    raise exception 'No se encontró un jugador activo';
  end if;

  delete from public.activity_events
  where player_id = p_player_id;
  get diagnostics event_count = row_count;

  delete from public.player_medals
  where player_id = p_player_id;
  get diagnostics medal_count = row_count;

  delete from public.pokemon
  where player_id = p_player_id;
  get diagnostics pokemon_count = row_count;

  update public.players
  set game_trainer_name = null
  where id = p_player_id;

  return pg_catalog.jsonb_build_object(
    'eventsDeleted', event_count,
    'medalsDeleted', medal_count,
    'pokemonDeleted', pokemon_count
  );
end;
$$;

revoke all on function public.wipe_player_game_data(uuid)
  from public, anon, authenticated;
grant execute on function public.wipe_player_game_data(uuid)
  to service_role;

comment on function public.wipe_player_game_data(uuid) is
  'Atomically clears one active player''s save-derived Pokémon, medals, activity, and in-game trainer name. Account, profile settings, and tournament history remain.';
