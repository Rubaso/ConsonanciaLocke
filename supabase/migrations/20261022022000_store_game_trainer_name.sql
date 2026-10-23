alter table public.players
  add column if not exists game_trainer_name text
    check (
      game_trainer_name is null
      or (
        length(btrim(game_trainer_name)) between 1 and 60
      )
    );

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

  import_summary := public.import_player_save_with_dead_boxes(
    p_player_id,
    p_pokemon,
    p_medal_ids
  );

  return import_summary;
end;
$$;

revoke all on function public.import_player_save_with_dead_boxes(
  uuid, jsonb, smallint[], text
) from public, anon, authenticated;
grant execute on function public.import_player_save_with_dead_boxes(
  uuid, jsonb, smallint[], text
) to service_role;

comment on column public.players.game_trainer_name is
  'In-game trainer name read from the player save; populated atomically during save import.';

comment on function public.import_player_save_with_dead_boxes(
  uuid, jsonb, smallint[], text
) is
  'Stores the in-game trainer name and imports the save atomically, including dead-box classification. The argument name is retained for compatibility with the prior RPC signature.';
