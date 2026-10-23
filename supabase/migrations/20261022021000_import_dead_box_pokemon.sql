create function public.import_player_save_with_dead_boxes(
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
  import_summary jsonb;
  dead_source_identities text[];
begin
  if pg_catalog.jsonb_typeof(p_pokemon) is distinct from 'array' then
    raise exception 'Datos de importación no válidos';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_pokemon) as imported(
      source_identity text,
      status text
    )
    where imported.source_identity is null
      or imported.status is null
      or imported.status not in ('alive', 'dead')
  ) then
    raise exception 'Los estados de Pokémon importados no son válidos';
  end if;

  import_summary := public.import_player_save(
    p_player_id,
    p_pokemon,
    p_medal_ids
  );

  select coalesce(
    pg_catalog.array_agg(imported.source_identity),
    array[]::text[]
  )
  into dead_source_identities
  from pg_catalog.jsonb_to_recordset(p_pokemon) as imported(
    source_identity text,
    status text
  )
  where imported.status = 'dead';

  update public.pokemon
  set status = 'dead', team_position = null
  where player_id = p_player_id
    and status = 'alive'
    and source_identity = any(dead_source_identities);

  return import_summary || pg_catalog.jsonb_build_object(
    'pokemonInDeadBoxes',
    pg_catalog.cardinality(dead_source_identities)
  );
end;
$$;

revoke all on function public.import_player_save_with_dead_boxes(uuid, jsonb, smallint[])
  from public, anon, authenticated;
grant execute on function public.import_player_save_with_dead_boxes(uuid, jsonb, smallint[])
  to service_role;

comment on function public.import_player_save_with_dead_boxes(uuid, jsonb, smallint[]) is
  'Imports a Consonancia save and marks Pokémon from its last two PC boxes as dead. This calls the atomic idempotent import RPC and records deaths in the same transaction.';
