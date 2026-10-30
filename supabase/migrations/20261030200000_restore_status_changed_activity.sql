create or replace function public.log_pokemon_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_events (
      player_id, pokemon_id, route_id, event_type, source_key, occurred_at
    )
    values (
      new.player_id,
      new.id,
      new.route_id,
      'capture',
      'pokemon:' || new.id::text || ':capture',
      coalesce(new.captured_at, pg_catalog.now())
    );

    if new.status = 'dead' then
      insert into public.activity_events (
        player_id, pokemon_id, route_id, event_type, source_key, occurred_at
      )
      values (
        new.player_id,
        new.id,
        new.route_id,
        'death',
        'pokemon:' || new.id::text || ':status:dead',
        coalesce(new.died_at, pg_catalog.now())
      );
    end if;
  elsif new.status is distinct from old.status then
    insert into public.activity_events (
      player_id, pokemon_id, route_id, event_type, source_key, details, occurred_at
    )
    values (
      new.player_id,
      new.id,
      new.route_id,
      case when new.status = 'dead' then 'death' else 'status_changed' end,
      'pokemon:' || new.id::text || ':status:' || new.status,
      pg_catalog.jsonb_build_object('from', old.status, 'to', new.status),
      coalesce(new.died_at, pg_catalog.now())
    );
  end if;

  return new;
end;
$$;
