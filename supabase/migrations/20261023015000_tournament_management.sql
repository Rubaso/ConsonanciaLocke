alter table public.tournament_matches
  add column next_match_id uuid references public.tournament_matches (id) on delete set null,
  add column next_player_slot smallint check (next_player_slot is null or next_player_slot in (1, 2));

create table public.individual_matches (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references public.players (id) on delete restrict,
  player_b_id uuid not null references public.players (id) on delete restrict,
  winner_player_id uuid references public.players (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'forfeit', 'cancelled')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  notes text check (notes is null or length(notes) <= 1000),
  player_a_pokepaste_url text,
  player_a_pokepaste_text text,
  player_b_pokepaste_url text,
  player_b_pokepaste_text text,
  created_by_player_id uuid references public.players (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint individual_matches_distinct_players_check
    check (player_a_id <> player_b_id),
  constraint individual_matches_winner_check
    check (
      winner_player_id is null
      or winner_player_id = player_a_id
      or winner_player_id = player_b_id
    ),
  constraint individual_matches_player_a_pokepaste_url_check
    check (
      player_a_pokepaste_url is null
      or player_a_pokepaste_url ~ '^https://(www\.)?pokepast\.es/[A-Za-z0-9_-]{4,80}$'
    ),
  constraint individual_matches_player_a_pokepaste_text_check
    check (
      player_a_pokepaste_text is null
      or length(btrim(player_a_pokepaste_text)) between 1 and 20000
    ),
  constraint individual_matches_player_a_pokepaste_source_check
    check (player_a_pokepaste_url is null or player_a_pokepaste_text is null),
  constraint individual_matches_player_b_pokepaste_url_check
    check (
      player_b_pokepaste_url is null
      or player_b_pokepaste_url ~ '^https://(www\.)?pokepast\.es/[A-Za-z0-9_-]{4,80}$'
    ),
  constraint individual_matches_player_b_pokepaste_text_check
    check (
      player_b_pokepaste_text is null
      or length(btrim(player_b_pokepaste_text)) between 1 and 20000
    ),
  constraint individual_matches_player_b_pokepaste_source_check
    check (player_b_pokepaste_url is null or player_b_pokepaste_text is null)
);

create index individual_matches_player_a_status_idx
  on public.individual_matches (player_a_id, status, scheduled_at);
create index individual_matches_player_b_status_idx
  on public.individual_matches (player_b_id, status, scheduled_at);
create index individual_matches_history_idx
  on public.individual_matches (created_at desc);

create trigger individual_matches_set_updated_at
before update on public.individual_matches
for each row execute function public.set_updated_at();

alter table public.individual_matches enable row level security;
revoke all on table public.individual_matches from public, anon, authenticated;
grant all privileges on table public.individual_matches to service_role;

create function public.create_tournament_bracket(
  p_name text,
  p_player_ids uuid[],
  p_created_by_player_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tournament_id uuid;
  v_player_count integer;
  v_bracket_size integer := 1;
  v_round_count integer := 0;
  v_round integer;
  v_match_number integer;
  v_match_count integer;
  v_first_round_match_count integer;
  v_full_match_count integer;
  v_player_a_id uuid;
  v_player_b_id uuid;
begin
  if p_name is null or length(btrim(p_name)) not between 1 and 120 then
    raise exception 'El nombre debe tener entre 1 y 120 caracteres.' using errcode = '22023';
  end if;

  if p_player_ids is null then
    raise exception 'Selecciona entre 2 y 40 participantes.' using errcode = '22023';
  end if;

  v_player_count := cardinality(p_player_ids);
  if v_player_count < 2 or v_player_count > 40
    or (select count(distinct player_id) from unnest(p_player_ids) as player_id) <> v_player_count
  then
    raise exception 'Selecciona entre 2 y 40 participantes distintos.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.players
    where id = p_created_by_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede crear torneos.' using errcode = '42501';
  end if;

  if (
    select count(*)
    from public.players
    where id = any(p_player_ids) and is_active
  ) <> v_player_count then
    raise exception 'Todos los participantes deben tener una cuenta activa.' using errcode = '22023';
  end if;

  insert into public.tournaments (
    name,
    format_key,
    status,
    participant_limit,
    created_by_player_id
  )
  values (btrim(p_name), 'single_elimination', 'draft', 40, p_created_by_player_id)
  returning id into v_tournament_id;

  insert into public.tournament_participants (tournament_id, player_id, seed)
  select v_tournament_id, player_id, ordinal::smallint
  from unnest(p_player_ids) with ordinality as entrants(player_id, ordinal);

  while v_bracket_size < v_player_count loop
    v_bracket_size := v_bracket_size * 2;
    v_round_count := v_round_count + 1;
  end loop;

  for v_round in 1..v_round_count loop
    v_match_count := v_bracket_size / (2 ^ v_round);
    if v_round = 1 then
      v_first_round_match_count := v_match_count;
      v_full_match_count := greatest(v_player_count - v_first_round_match_count, 0);
    end if;
    for v_match_number in 1..v_match_count loop
      v_player_a_id := null;
      v_player_b_id := null;
      if v_round = 1 then
        if v_match_number <= v_full_match_count then
          v_player_a_id := p_player_ids[(v_match_number * 2) - 1];
          v_player_b_id := p_player_ids[v_match_number * 2];
        else
          v_player_a_id := p_player_ids[
            (v_full_match_count * 2) + (v_match_number - v_full_match_count)
          ];
        end if;
      end if;

      insert into public.tournament_matches (
        tournament_id,
        phase,
        round_number,
        match_number,
        player_a_id,
        player_b_id,
        winner_player_id,
        status
      )
      values (
        v_tournament_id,
        'main',
        v_round,
        v_match_number,
        v_player_a_id,
        v_player_b_id,
        case
          when v_round = 1 and v_player_a_id is null then v_player_b_id
          when v_round = 1 and v_player_b_id is null then v_player_a_id
          else null
        end,
        case
          when v_round = 1 and (v_player_a_id is null or v_player_b_id is null) then 'bye'
          else 'pending'
        end
      );
    end loop;
  end loop;

  update public.tournament_matches current_match
  set
    next_match_id = next_match.id,
    next_player_slot = case when current_match.match_number % 2 = 1 then 1 else 2 end
  from public.tournament_matches next_match
  where current_match.tournament_id = v_tournament_id
    and next_match.tournament_id = v_tournament_id
    and next_match.round_number = current_match.round_number + 1
    and next_match.match_number = (current_match.match_number + 1) / 2;

  for v_round in 2..v_round_count loop
    update public.tournament_matches next_match
    set player_a_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_tournament_id
      and next_match.round_number = v_round
      and previous_match.tournament_id = v_tournament_id
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 1
      and previous_match.status in ('bye', 'completed', 'forfeit');

    update public.tournament_matches next_match
    set player_b_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_tournament_id
      and next_match.round_number = v_round
      and previous_match.tournament_id = v_tournament_id
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 2
      and previous_match.status in ('bye', 'completed', 'forfeit');

    update public.tournament_matches next_match
    set
      status = 'bye',
      winner_player_id = coalesce(next_match.player_a_id, next_match.player_b_id)
    where next_match.tournament_id = v_tournament_id
      and next_match.round_number = v_round
      and (next_match.player_a_id is null or next_match.player_b_id is null)
      and coalesce(next_match.player_a_id, next_match.player_b_id) is not null
      and (
        select count(*) = 2
          and bool_and(previous_match.status in ('bye', 'completed', 'forfeit'))
        from public.tournament_matches previous_match
        where previous_match.next_match_id = next_match.id
      );
  end loop;

  return v_tournament_id;
end;
$$;

revoke all on function public.create_tournament_bracket(text, uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.create_tournament_bracket(text, uuid[], uuid)
  to service_role;

create function public.set_tournament_match_winner(
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
  v_match public.tournament_matches%rowtype;
  v_next_match public.tournament_matches%rowtype;
  v_auto_winner_id uuid;
  v_previous_count integer;
  v_previous_resolved boolean;
begin
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede gestionar el torneo.' using errcode = '42501';
  end if;

  select * into v_match
  from public.tournament_matches
  where id = p_match_id
  for update;

  if not found or v_match.status <> 'pending'
    or p_winner_player_id is null
    or not (
      p_winner_player_id = v_match.player_a_id
      or p_winner_player_id = v_match.player_b_id
    )
  then
    raise exception 'El combate ya no está pendiente o el ganador no participa.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.tournaments
    where id = v_match.tournament_id and status in ('published', 'in_progress')
  ) then
    raise exception 'El torneo no está publicado.' using errcode = '22023';
  end if;

  update public.tournament_matches
  set status = 'completed',
      winner_player_id = p_winner_player_id,
      completed_at = now()
  where id = p_match_id;

  v_auto_winner_id := p_winner_player_id;
  loop
    if v_match.next_match_id is null then
      update public.tournaments
      set status = 'completed', completed_at = now()
      where id = v_match.tournament_id
        and not exists (
          select 1
          from public.tournament_matches unfinished
          where unfinished.tournament_id = v_match.tournament_id
            and unfinished.next_match_id is null
            and unfinished.status not in ('completed', 'bye', 'forfeit')
        );
      exit;
    end if;

    update public.tournament_matches
    set player_a_id = case when v_match.next_player_slot = 1 then v_auto_winner_id else player_a_id end,
        player_b_id = case when v_match.next_player_slot = 2 then v_auto_winner_id else player_b_id end
    where id = v_match.next_match_id;

    select * into v_next_match
    from public.tournament_matches
    where id = v_match.next_match_id
    for update;

    select count(*), coalesce(bool_and(status in ('completed', 'bye', 'forfeit')), false)
    into v_previous_count, v_previous_resolved
    from public.tournament_matches
    where next_match_id = v_next_match.id;

    if v_previous_count = 2
      and v_previous_resolved
      and (v_next_match.player_a_id is null or v_next_match.player_b_id is null)
      and coalesce(v_next_match.player_a_id, v_next_match.player_b_id) is not null
    then
      v_auto_winner_id := coalesce(v_next_match.player_a_id, v_next_match.player_b_id);
      update public.tournament_matches
      set status = 'bye', winner_player_id = v_auto_winner_id
      where id = v_next_match.id;
      v_match := v_next_match;
      continue;
    end if;

    exit;
  end loop;
end;
$$;

revoke all on function public.set_tournament_match_winner(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_tournament_match_winner(uuid, uuid, uuid)
  to service_role;

create function public.set_tournament_bracket_slot(
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
  v_match public.tournament_matches%rowtype;
  v_source_match public.tournament_matches%rowtype;
  v_old_player_id uuid;
  v_round integer;
  v_round_count integer;
begin
  if p_slot not in (1, 2) then
    raise exception 'La posición del participante no es válida.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede gestionar el torneo.' using errcode = '42501';
  end if;

  select * into v_match
  from public.tournament_matches
  where id = p_match_id and round_number = 1
  for update;
  if not found or not exists (
    select 1 from public.tournaments
    where id = v_match.tournament_id and status = 'draft'
  ) then
    raise exception 'Solo se pueden editar los cruces de un borrador.' using errcode = '22023';
  end if;

  if p_player_id is not null and not exists (
    select 1 from public.tournament_participants
    where tournament_id = v_match.tournament_id and player_id = p_player_id
  ) then
    raise exception 'El participante no pertenece a este torneo.' using errcode = '22023';
  end if;

  v_old_player_id := case when p_slot = 1 then v_match.player_a_id else v_match.player_b_id end;
  if p_player_id is not null and (
    (p_slot = 1 and p_player_id = v_match.player_b_id)
    or (p_slot = 2 and p_player_id = v_match.player_a_id)
  ) then
    raise exception 'Un jugador no puede ocupar las dos posiciones de un cruce.' using errcode = '22023';
  end if;

  if v_old_player_id is distinct from p_player_id then
    if p_slot = 1 then
      update public.tournament_matches set player_a_id = null where id = v_match.id;
    else
      update public.tournament_matches set player_b_id = null where id = v_match.id;
    end if;

    if p_player_id is not null then
      select * into v_source_match
      from public.tournament_matches
      where tournament_id = v_match.tournament_id
        and round_number = 1
        and id <> v_match.id
        and (player_a_id = p_player_id or player_b_id = p_player_id)
      for update;

      if found then
        if v_source_match.player_a_id = p_player_id then
          update public.tournament_matches
          set player_a_id = v_old_player_id
          where id = v_source_match.id;
        else
          update public.tournament_matches
          set player_b_id = v_old_player_id
          where id = v_source_match.id;
        end if;
      elsif v_old_player_id is not null then
        update public.tournament_matches
        set winner_player_id = null
        where tournament_id = v_match.tournament_id;
        delete from public.tournament_participants
        where tournament_id = v_match.tournament_id and player_id = v_old_player_id;
      end if;

      if p_slot = 1 then
        update public.tournament_matches set player_a_id = p_player_id where id = v_match.id;
      else
        update public.tournament_matches set player_b_id = p_player_id where id = v_match.id;
      end if;
    elsif v_old_player_id is not null then
      update public.tournament_matches
      set winner_player_id = null
      where tournament_id = v_match.tournament_id;
      delete from public.tournament_participants
      where tournament_id = v_match.tournament_id and player_id = v_old_player_id;
    end if;
  end if;

  update public.tournament_matches
  set status = case when player_a_id is null or player_b_id is null then 'bye' else 'pending' end,
      winner_player_id = case
        when player_a_id is null then player_b_id
        when player_b_id is null then player_a_id
        else null
      end,
      completed_at = null
  where tournament_id = v_match.tournament_id and round_number = 1;

  update public.tournament_matches
  set player_a_id = null,
      player_b_id = null,
      winner_player_id = null,
      status = 'pending',
      completed_at = null
  where tournament_id = v_match.tournament_id and round_number > 1;

  select max(round_number) into v_round_count
  from public.tournament_matches
  where tournament_id = v_match.tournament_id;

  for v_round in 2..v_round_count loop
    update public.tournament_matches next_match
    set player_a_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_match.tournament_id
      and next_match.round_number = v_round
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 1
      and previous_match.status = 'bye';

    update public.tournament_matches next_match
    set player_b_id = previous_match.winner_player_id
    from public.tournament_matches previous_match
    where next_match.tournament_id = v_match.tournament_id
      and next_match.round_number = v_round
      and previous_match.next_match_id = next_match.id
      and previous_match.next_player_slot = 2
      and previous_match.status = 'bye';

    update public.tournament_matches next_match
    set
      status = 'bye',
      winner_player_id = coalesce(next_match.player_a_id, next_match.player_b_id)
    where next_match.tournament_id = v_match.tournament_id
      and next_match.round_number = v_round
      and (next_match.player_a_id is null or next_match.player_b_id is null)
      and coalesce(next_match.player_a_id, next_match.player_b_id) is not null
      and (
        select count(*) = 2 and bool_and(previous_match.status = 'bye')
        from public.tournament_matches previous_match
        where previous_match.next_match_id = next_match.id
      );
  end loop;
end;
$$;

revoke all on function public.set_tournament_bracket_slot(uuid, smallint, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_tournament_bracket_slot(uuid, smallint, uuid, uuid)
  to service_role;
