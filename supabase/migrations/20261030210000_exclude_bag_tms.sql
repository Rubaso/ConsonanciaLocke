begin;

delete from public.player_bag_items
where pocket = 'tm'
   or item_key ~* '^(TM|HM|MT|MO|TR)[0-9]'
   or item_name ~* '^(TM|HM|MT|MO|TR)[[:space:]]*[0-9]';

create or replace function public.import_player_save_with_dead_boxes(
  p_player_id uuid,
  p_pokemon jsonb,
  p_medal_ids smallint[],
  p_game_trainer_id text,
  p_bag jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  import_summary jsonb;
  updated_players integer;
  bag_count integer;
begin
  if p_game_trainer_id is null
    or pg_catalog.length(pg_catalog.btrim(p_game_trainer_id)) not between 1 and 60
  then
    raise exception 'El nombre del entrenador del save no es válido';
  end if;

  if p_bag is null or pg_catalog.jsonb_typeof(p_bag) is distinct from 'array' then
    raise exception 'Los objetos de la mochila no son válidos';
  end if;

  if pg_catalog.jsonb_array_length(p_bag) > 400 then
    raise exception 'La mochila del save tiene demasiados objetos';
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

  delete from public.player_bag_items
  where player_id = p_player_id;

  insert into public.player_bag_items (
    player_id,
    item_key,
    item_name,
    item_slug,
    quantity,
    pocket
  )
  select
    p_player_id,
    pg_catalog.btrim(imported.item_key),
    pg_catalog.btrim(imported.item_name),
    nullif(pg_catalog.btrim(imported.item_slug), ''),
    imported.quantity,
    imported.pocket
  from pg_catalog.jsonb_to_recordset(p_bag) as imported(
    item_key text,
    item_name text,
    item_slug text,
    quantity integer,
    pocket text
  )
  where imported.item_key is not null
    and pg_catalog.length(pg_catalog.btrim(imported.item_key)) between 1 and 80
    and imported.item_name is not null
    and pg_catalog.length(pg_catalog.btrim(imported.item_name)) between 1 and 80
    and imported.quantity between 1 and 999
    and imported.pocket in ('usable', 'held', 'ball', 'berry')
    and pg_catalog.btrim(imported.item_key) !~* '^(TM|HM|MT|MO|TR)[0-9]'
    and pg_catalog.btrim(imported.item_name) !~* '^(TM|HM|MT|MO|TR)[[:space:]]*[0-9]';

  get diagnostics bag_count = row_count;

  return import_summary || pg_catalog.jsonb_build_object('bagItems', bag_count);
end;
$$;

commit;
