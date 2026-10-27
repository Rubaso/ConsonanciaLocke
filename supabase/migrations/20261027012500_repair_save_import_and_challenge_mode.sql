alter table public.players
  add column if not exists challenge_mode text;

update public.players
set challenge_mode = case
  when lower(username) in ('shiro', 'titosanti', 'evarathz', 'pokecartas')
    then 'BELLELOKE'
  else 'HARDLOCKE'
end
where challenge_mode is null;

alter table public.players
  alter column challenge_mode set default 'HARDLOCKE',
  alter column challenge_mode set not null;

alter table public.players
  drop constraint if exists players_challenge_mode_check;

alter table public.players
  add constraint players_challenge_mode_check
  check (challenge_mode in ('BELLELOKE', 'HARDLOCKE'));

create or replace function public.wipe_player_game_data(p_player_id uuid)
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

drop function if exists public.import_player_save_with_dead_boxes(
  uuid, jsonb, smallint[], text, text
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

comment on function public.import_player_save_with_dead_boxes(
  uuid, jsonb, smallint[], text
) is
  'Stores the in-game trainer name and imports the save atomically, including dead-box classification.';

alter table public.players
  drop column if exists game_mode;
