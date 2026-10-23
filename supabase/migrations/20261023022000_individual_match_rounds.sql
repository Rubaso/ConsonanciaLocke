create table public.individual_match_rounds (
  id uuid primary key default gen_random_uuid(),
  round_number smallint not null unique check (round_number between 1 and 100),
  name text not null check (length(btrim(name)) between 1 and 80),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'completed', 'cancelled')),
  rest_player_id uuid references public.players (id) on delete set null,
  created_by_player_id uuid references public.players (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.individual_matches
  add column round_id uuid references public.individual_match_rounds (id) on delete cascade,
  add column round_match_number smallint check (round_match_number is null or round_match_number between 1 and 40);

alter table public.individual_matches
  drop constraint if exists individual_matches_status_check;

alter table public.individual_matches
  add constraint individual_matches_status_check
  check (status in ('draft', 'pending', 'completed', 'forfeit', 'cancelled'));

create index individual_match_rounds_status_idx
  on public.individual_match_rounds (status, round_number desc);
create index individual_matches_round_idx
  on public.individual_matches (round_id, round_match_number);
create unique index individual_matches_round_position_unique
  on public.individual_matches (round_id, round_match_number)
  where round_id is not null;

create trigger individual_match_rounds_set_updated_at
before update on public.individual_match_rounds
for each row execute function public.set_updated_at();

alter table public.individual_match_rounds enable row level security;
revoke all on table public.individual_match_rounds from public, anon, authenticated;
grant all privileges on table public.individual_match_rounds to service_role;

create function public.create_individual_match_round(p_organizer_player_id uuid)
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
  where is_active and role = 'player';

  v_player_count := coalesce(cardinality(v_player_ids), 0);
  if v_player_count < 2 then
    raise exception 'Se necesitan al menos dos jugadores activos para crear una ronda.' using errcode = '22023';
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
    'Ronda ' || v_round_number,
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

revoke all on function public.create_individual_match_round(uuid)
  from public, anon, authenticated;
grant execute on function public.create_individual_match_round(uuid)
  to service_role;

create function public.set_individual_match_round_slot(
  p_match_id uuid,
  p_slot smallint,
  p_player_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.individual_matches%rowtype;
  v_source_match public.individual_matches%rowtype;
  v_round public.individual_match_rounds%rowtype;
  v_old_player_id uuid;
begin
  if p_slot not in (1, 2) then
    raise exception 'La posición del participante no es válida.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede editar rondas.' using errcode = '42501';
  end if;

  select round_id into v_match.round_id
  from public.individual_matches
  where id = p_match_id and round_id is not null;
  if not found then
    raise exception 'No se encontró el combate de la ronda.' using errcode = '22023';
  end if;

  select * into v_round
  from public.individual_match_rounds
  where id = v_match.round_id
  for update;
  if not found or v_round.status <> 'draft' then
    raise exception 'Solo se pueden editar los combates de una ronda en borrador.' using errcode = '22023';
  end if;

  select * into v_match
  from public.individual_matches
  where id = p_match_id and round_id = v_round.id
  for update;
  if not found then
    raise exception 'No se encontró el combate de la ronda.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.players where id = p_player_id and is_active) then
    raise exception 'El jugador seleccionado no está activo.' using errcode = '22023';
  end if;
  if (p_slot = 1 and p_player_id = v_match.player_b_id)
    or (p_slot = 2 and p_player_id = v_match.player_a_id)
  then
    raise exception 'Un jugador no puede ocupar las dos posiciones del mismo combate.' using errcode = '22023';
  end if;

  v_old_player_id := case when p_slot = 1 then v_match.player_a_id else v_match.player_b_id end;
  if v_old_player_id = p_player_id then
    return;
  end if;

  if p_slot = 1 then
    update public.individual_matches set player_a_id = p_player_id where id = v_match.id;
  else
    update public.individual_matches set player_b_id = p_player_id where id = v_match.id;
  end if;

  if v_round.rest_player_id = p_player_id then
    update public.individual_match_rounds
    set rest_player_id = v_old_player_id
    where id = v_round.id;
    return;
  end if;

  select * into v_source_match
  from public.individual_matches
  where round_id = v_round.id
    and id <> v_match.id
    and (player_a_id = p_player_id or player_b_id = p_player_id)
  for update;

  if not found then
    raise exception 'El jugador no pertenece a esta ronda.' using errcode = '22023';
  end if;

  if v_source_match.player_a_id = p_player_id then
    update public.individual_matches set player_a_id = v_old_player_id where id = v_source_match.id;
  else
    update public.individual_matches set player_b_id = v_old_player_id where id = v_source_match.id;
  end if;
end;
$$;

revoke all on function public.set_individual_match_round_slot(uuid, smallint, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_individual_match_round_slot(uuid, smallint, uuid, uuid)
  to service_role;

create function public.publish_individual_match_round(
  p_round_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_round public.individual_match_rounds%rowtype;
  v_match_count integer;
begin
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede publicar rondas.' using errcode = '42501';
  end if;

  select * into v_round
  from public.individual_match_rounds
  where id = p_round_id
  for update;
  if not found or v_round.status <> 'draft' then
    raise exception 'La ronda no está disponible para publicar.' using errcode = '22023';
  end if;

  select count(*) into v_match_count
  from public.individual_matches
  where round_id = p_round_id;
  if v_match_count = 0 or exists (
    select 1 from public.individual_matches
    where round_id = p_round_id
      and (player_a_id is null or player_b_id is null)
  ) then
    raise exception 'La ronda debe tener todos sus combates completos.' using errcode = '22023';
  end if;

  update public.individual_matches
  set status = 'pending'
  where round_id = p_round_id and status = 'draft';
  update public.individual_match_rounds
  set status = 'published'
  where id = p_round_id;
end;
$$;

revoke all on function public.publish_individual_match_round(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.publish_individual_match_round(uuid, uuid)
  to service_role;

create function public.delete_individual_match(
  p_match_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_round_id uuid;
begin
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede cancelar combates.' using errcode = '42501';
  end if;

  delete from public.individual_matches
  where id = p_match_id
    and status = 'pending'
  returning round_id into v_round_id;

  if not found then
    raise exception 'Solo se pueden borrar combates individuales pendientes.' using errcode = '22023';
  end if;

  update public.individual_match_rounds
  set status = 'completed'
  where id = v_round_id
    and status = 'published'
    and not exists (
      select 1 from public.individual_matches
      where round_id = public.individual_match_rounds.id and status = 'pending'
    );
end;
$$;

revoke all on function public.delete_individual_match(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_individual_match(uuid, uuid)
  to service_role;

create function public.delete_individual_match_round(
  p_round_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede borrar rondas.' using errcode = '42501';
  end if;

  delete from public.individual_match_rounds
  where id = p_round_id and status = 'draft';
  if not found then
    raise exception 'Solo se pueden borrar rondas en borrador.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.delete_individual_match_round(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_individual_match_round(uuid, uuid)
  to service_role;

create function public.update_individual_match_round_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.round_id is not null and new.status in ('completed', 'forfeit', 'cancelled') then
    update public.individual_match_rounds
    set status = 'completed'
    where id = new.round_id
      and status = 'published'
      and not exists (
        select 1 from public.individual_matches
        where round_id = new.round_id and status = 'pending'
      );
  end if;
  return new;
end;
$$;

create trigger individual_matches_update_round_status
after update of status on public.individual_matches
for each row execute function public.update_individual_match_round_status();
