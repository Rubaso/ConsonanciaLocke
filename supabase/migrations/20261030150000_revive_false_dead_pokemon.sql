create or replace function public.import_player_save_with_dead_boxes(
  p_player_id uuid,
  p_pokemon jsonb,
  p_medal_ids smallint[],
  p_game_trainer_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  import_summary jsonb;
  updated_players integer;
begin
  if p_game_trainer_id is null
    or pg_catalog.length(pg_catalog.btrim(p_game_trainer_id)) not between 1 and 60
  then
    raise exception 'El nombre del entrenador del save no es válido';
  end if;

  update public.players
  set game_trainer_name = pg_catalog.btrim(p_game_trainer_id)
  where id = p_player_id
    and is_active;

  get diagnostics updated_players = row_count;
  if updated_players <> 1 then
    raise exception 'No se encontró un jugador activo para importar';
  end if;

  update public.pokemon
  set present_in_save = false,
      team_position = null
  where player_id = p_player_id;

  import_summary := public.import_player_save_with_dead_boxes(
    p_player_id,
    p_pokemon,
    p_medal_ids
  );

  update public.pokemon as stored
  set present_in_save = true
  from pg_catalog.jsonb_to_recordset(p_pokemon) as imported(
    source_identity text
  )
  where stored.player_id = p_player_id
    and stored.source_identity = imported.source_identity;

  update public.pokemon as stored
  set status = 'dead',
      team_position = null
  from pg_catalog.jsonb_to_recordset(p_pokemon) as imported(
    source_identity text,
    status text
  )
  where stored.player_id = p_player_id
    and stored.source_identity = imported.source_identity
    and imported.status = 'dead'
    and stored.status = 'alive';

  update public.pokemon as stored
  set status = 'alive',
      died_at = null,
      death_area = null,
      team_position = imported.team_position
  from pg_catalog.jsonb_to_recordset(p_pokemon) as imported(
    source_identity text,
    status text,
    team_position smallint
  )
  where stored.player_id = p_player_id
    and stored.source_identity = imported.source_identity
    and imported.status = 'alive'
    and stored.status = 'dead';

  return import_summary;
end;
$$;

revoke all on function public.import_player_save_with_dead_boxes(
  uuid, jsonb, smallint[], text
) from public, anon, authenticated;
grant execute on function public.import_player_save_with_dead_boxes(
  uuid, jsonb, smallint[], text
) to service_role;

comment on function public.import_player_save_with_dead_boxes(
  uuid, jsonb, smallint[], text
) is
  'Imports the save, marks grave-box Pokémon as dead, and restores Pokémon that are alive again in the save.';
