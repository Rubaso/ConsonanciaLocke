create function public.import_player_save(
  p_player_id uuid,
  p_pokemon jsonb,
  p_medal_ids smallint[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  pokemon_count integer;
  inserted_count integer;
  updated_count integer;
  medal_count integer;
begin
  if p_player_id is null
    or pg_catalog.jsonb_typeof(p_pokemon) is distinct from 'array'
  then
    raise exception 'Datos de importación no válidos';
  end if;

  pokemon_count := pg_catalog.jsonb_array_length(p_pokemon);
  if pokemon_count < 1 or pokemon_count > 1000 then
    raise exception 'El número de Pokémon del save no es válido';
  end if;

  if p_medal_ids is null
    or coalesce(pg_catalog.array_length(p_medal_ids, 1), 0) > 5
    or exists (
      select 1
      from pg_catalog.unnest(p_medal_ids) as imported_medal(medal_id)
      where imported_medal.medal_id < 1 or imported_medal.medal_id > 5
    )
  then
    raise exception 'Las medallas del save no son válidas';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_pokemon) as imported(
      source_identity text,
      team_position smallint,
      moves jsonb
    )
    where imported.source_identity is null
      or imported.source_identity = ''
      or (imported.team_position is not null and imported.team_position not between 1 and 6)
      or (imported.moves is not null and pg_catalog.jsonb_typeof(imported.moves) <> 'array')
  ) then
    raise exception 'Los datos de Pokémon del save no son válidos';
  end if;

  if exists (
    select imported.source_identity
    from pg_catalog.jsonb_to_recordset(p_pokemon) as imported(source_identity text)
    group by imported.source_identity
    having pg_catalog.count(*) > 1
  ) then
    raise exception 'El save contiene Pokémon duplicados';
  end if;

  if exists (
    select imported.team_position
    from pg_catalog.jsonb_to_recordset(p_pokemon) as imported(team_position smallint)
    where imported.team_position is not null
    group by imported.team_position
    having pg_catalog.count(*) > 1
  ) then
    raise exception 'El equipo del save contiene posiciones duplicadas';
  end if;

  update public.pokemon
  set team_position = null
  where player_id = p_player_id
    and team_position is not null;

  with upserted as (
    insert into public.pokemon as stored (
      player_id,
      source_identity,
      species,
      form,
      nickname,
      level,
      gender,
      nature,
      ability,
      held_item,
      is_shiny,
      status,
      team_position,
      origin_map_id,
      origin_name,
      obtain_method,
      captured_at,
      iv_hp,
      iv_attack,
      iv_defense,
      iv_special_attack,
      iv_special_defense,
      iv_speed,
      ev_hp,
      ev_attack,
      ev_defense,
      ev_special_attack,
      ev_special_defense,
      ev_speed
    )
    select
      p_player_id,
      imported.source_identity,
      imported.species,
      imported.form,
      imported.nickname,
      imported.level,
      imported.gender,
      imported.nature,
      imported.ability,
      imported.held_item,
      imported.is_shiny,
      'alive',
      imported.team_position,
      imported.origin_map_id,
      imported.origin_name,
      imported.obtain_method,
      imported.captured_at,
      imported.iv_hp,
      imported.iv_attack,
      imported.iv_defense,
      imported.iv_special_attack,
      imported.iv_special_defense,
      imported.iv_speed,
      imported.ev_hp,
      imported.ev_attack,
      imported.ev_defense,
      imported.ev_special_attack,
      imported.ev_special_defense,
      imported.ev_speed
    from pg_catalog.jsonb_to_recordset(p_pokemon) as imported(
      source_identity text,
      species text,
      form smallint,
      nickname text,
      level smallint,
      gender text,
      nature text,
      ability text,
      held_item text,
      is_shiny boolean,
      team_position smallint,
      origin_map_id integer,
      origin_name text,
      obtain_method smallint,
      captured_at timestamptz,
      iv_hp smallint,
      iv_attack smallint,
      iv_defense smallint,
      iv_special_attack smallint,
      iv_special_defense smallint,
      iv_speed smallint,
      ev_hp smallint,
      ev_attack smallint,
      ev_defense smallint,
      ev_special_attack smallint,
      ev_special_defense smallint,
      ev_speed smallint
    )
    on conflict (player_id, source_identity)
      where source_identity is not null
    do update set
      species = excluded.species,
      form = excluded.form,
      nickname = excluded.nickname,
      level = excluded.level,
      gender = excluded.gender,
      nature = excluded.nature,
      ability = excluded.ability,
      held_item = excluded.held_item,
      is_shiny = stored.is_shiny or excluded.is_shiny,
      status = case
        when stored.status in ('dead', 'released', 'traded')
          then stored.status
        else 'alive'
      end,
      team_position = case
        when stored.status = 'alive' then excluded.team_position
        else null
      end,
      origin_map_id = excluded.origin_map_id,
      origin_name = excluded.origin_name,
      obtain_method = excluded.obtain_method,
      captured_at = coalesce(stored.captured_at, excluded.captured_at),
      iv_hp = excluded.iv_hp,
      iv_attack = excluded.iv_attack,
      iv_defense = excluded.iv_defense,
      iv_special_attack = excluded.iv_special_attack,
      iv_special_defense = excluded.iv_special_defense,
      iv_speed = excluded.iv_speed,
      ev_hp = excluded.ev_hp,
      ev_attack = excluded.ev_attack,
      ev_defense = excluded.ev_defense,
      ev_special_attack = excluded.ev_special_attack,
      ev_special_defense = excluded.ev_special_defense,
      ev_speed = excluded.ev_speed
    returning id, source_identity, (xmax = 0) as was_inserted
  )
  select
    pg_catalog.count(*) filter (where was_inserted)::integer,
    pg_catalog.count(*) filter (where not was_inserted)::integer
  into inserted_count, updated_count
  from upserted;

  delete from public.pokemon_moves as moves
  using public.pokemon as pokemon,
    pg_catalog.jsonb_to_recordset(p_pokemon)     as imported(source_identity text)
  where pokemon.id = moves.pokemon_id
    and pokemon.player_id = p_player_id
    and pokemon.source_identity = imported.source_identity;

  insert into public.pokemon_moves (pokemon_id, slot, move)
  select
    pokemon.id,
    imported_move.ordinality::smallint,
    imported_move.move
  from public.pokemon as pokemon
  join pg_catalog.jsonb_to_recordset(p_pokemon) as imported(
    source_identity text,
    moves jsonb
  ) on imported.source_identity = pokemon.source_identity
  cross join lateral pg_catalog.jsonb_array_elements_text(
    coalesce(imported.moves, '[]'::jsonb)
  ) with ordinality as imported_move(move, ordinality)
  where pokemon.player_id = p_player_id
    and imported_move.ordinality <= 4
    and pg_catalog.length(pg_catalog.btrim(imported_move.move)) between 1 and 80
  on conflict (pokemon_id, slot) do update
    set move = excluded.move;

  insert into public.player_medals (player_id, medal_id)
  select distinct p_player_id, imported_medal.medal_id
  from pg_catalog.unnest(p_medal_ids) as imported_medal(medal_id)
  on conflict (player_id, medal_id) do nothing;
  get diagnostics medal_count = row_count;

  return pg_catalog.jsonb_build_object(
    'pokemonFound', pokemon_count,
    'pokemonAdded', inserted_count,
    'pokemonUpdated', updated_count,
    'medalsAdded', medal_count
  );
end;
$$;

revoke all on function public.import_player_save(uuid, jsonb, smallint[])
  from public, anon, authenticated;
grant execute on function public.import_player_save(uuid, jsonb, smallint[])
  to service_role;

comment on function public.import_player_save(uuid, jsonb, smallint[]) is
  'Atomically imports a Consonancia save for one authenticated player. Stable source identities and medal keys make repeated imports idempotent; terminal Pokémon statuses are preserved.';
