create table public.players (
  id uuid primary key default gen_random_uuid(),
  username text not null check (username ~ '^[a-zA-Z0-9_.-]{3,32}$'),
  display_name text not null check (length(btrim(display_name)) between 1 and 60),
  pin text not null check (pin ~ '^[A-Za-z0-9]{5}$'),
  role text not null default 'player' check (role in ('player', 'organizer')),
  color text not null default '#5ec4a0' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  twitch_username text check (
    twitch_username is null or twitch_username ~ '^[A-Za-z0-9_]{1,25}$'
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index players_username_unique
  on public.players (lower(username));
create index players_active_display_name_idx
  on public.players (is_active, lower(display_name));

create table public.player_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint player_sessions_expiration_check check (expires_at > created_at)
);

create index player_sessions_player_expiry_idx
  on public.player_sessions (player_id, expires_at)
  where revoked_at is null;

create table public.authentication_limits (
  identifier_hash text not null check (identifier_hash ~ '^[0-9a-f]{64}$'),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 100),
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (identifier_hash, source_hash)
);

create table public.routes (
  id smallint primary key check (id > 0),
  name text not null unique check (length(btrim(name)) between 1 and 100),
  sort_order smallint not null unique check (sort_order > 0),
  is_outdoor boolean not null default false
);

create table public.route_map_ids (
  map_id integer primary key check (map_id > 0),
  route_id smallint not null references public.routes (id) on delete cascade
);

create index route_map_ids_route_idx on public.route_map_ids (route_id, map_id);

insert into public.routes (id, name, sort_order, is_outdoor) values
  (1, 'Playa Martremo', 1, true),
  (2, 'Pueblo Naski', 2, true),
  (3, 'Laboratorio Margarita', 3, false),
  (4, 'Ruta 1', 4, true),
  (5, 'Pueblo Vortaro', 5, true),
  (6, 'Centro Pokémon', 6, false),
  (7, 'Ruta 2', 7, true),
  (8, 'Centrópolis Sur', 8, true),
  (9, 'Panadería', 9, false),
  (10, 'Ruta 3', 10, true),
  (11, 'Gruta Sisma', 11, false),
  (12, 'Bosque Brilega', 12, true),
  (13, 'Ruta 4', 13, true),
  (14, 'Ciudad Printempo', 14, true),
  (15, 'Santuario Lilio (Ext.)', 15, true),
  (16, 'Ruta 5', 16, true),
  (17, 'Volcán Flamanta', 17, false),
  (18, 'Ruta 6', 18, true),
  (19, 'Cala Klifo', 19, true),
  (20, 'Lago Diluvo', 20, true),
  (21, 'Gimnasio Pokémon', 21, false),
  (22, 'Ruta 7', 22, true),
  (23, 'Ruta 8', 23, true),
  (24, 'Torre Karulina (Ext.)', 24, true),
  (25, 'Torre Karulina (Int.)', 25, false),
  (26, 'Ruta 9', 26, true),
  (27, 'Ruta 10', 27, true),
  (28, 'Pueblo Kosmaro', 28, true),
  (29, 'Alcantarillas Kosmaro', 29, false),
  (30, 'Ruta 11', 30, true),
  (31, 'Templo Cinaj', 31, false),
  (32, 'Ruta 12', 32, true),
  (33, 'Cueva Glacio', 33, false),
  (34, 'Monte Negostormo', 34, true),
  (35, 'Ruta 14', 35, true),
  (36, 'Isla Rokkenjima', 36, true),
  (37, 'Mansión Ushiromiya', 37, false),
  (38, 'Ruta 15', 38, true),
  (39, 'Bosque Mirago', 39, true),
  (40, 'Aldea Drako', 40, true),
  (41, 'Monte Viverno', 41, true),
  (42, 'Mina Crysolita', 42, false),
  (43, 'Ruta 16', 43, true),
  (44, 'Granja Bieno', 44, true),
  (45, 'Ruta 17', 45, true),
  (46, 'Puente Vecchio', 46, true),
  (47, 'Ciudad Rifo', 47, true),
  (48, 'Puente Giallo', 48, true),
  (49, 'Ronda 1 WPM', 49, false),
  (50, 'Ronda 2 WPM', 50, false),
  (51, 'Ronda 3 WPM', 51, false),
  (52, 'Ronda 4 WPM', 52, false),
  (53, 'Ronda 5 WPM', 53, false),
  (54, 'Ronda 6 WPM', 54, false),
  (55, 'Octavos WPM', 55, false),
  (56, 'Cuartos WPM', 56, false);

insert into public.route_map_ids (map_id, route_id) values
  (77, 1), (78, 2), (80, 3), (82, 4), (83, 5),
  (84, 6), (91, 6), (120, 6), (135, 6), (148, 6),
  (161, 6), (170, 6), (185, 6), (210, 6), (227, 6),
  (87, 7), (90, 8), (99, 9), (113, 10), (114, 11),
  (116, 12), (118, 13), (119, 14), (125, 15), (128, 16),
  (130, 17), (132, 18), (140, 19), (141, 20),
  (142, 21), (188, 21), (144, 22), (146, 23), (151, 24),
  (154, 25), (158, 26), (159, 27), (160, 28), (164, 29),
  (166, 30), (174, 31), (177, 32), (178, 33), (192, 34),
  (197, 35), (198, 36), (199, 37), (202, 37), (204, 38),
  (206, 39), (207, 39), (209, 40), (214, 41), (217, 42),
  (219, 43), (220, 44), (223, 45), (224, 46), (226, 47),
  (236, 48), (240, 49), (241, 50), (242, 51), (243, 52),
  (244, 53), (246, 54), (247, 55), (249, 56);

create table public.pokemon (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  source_identity text,
  species text not null check (length(btrim(species)) between 1 and 80),
  form smallint not null default 0 check (form >= 0),
  nickname text check (nickname is null or length(nickname) <= 80),
  level smallint check (level is null or level between 1 and 100),
  gender text check (gender is null or gender in ('male', 'female', 'genderless', 'unknown')),
  nature text check (nature is null or length(nature) <= 40),
  ability text check (ability is null or length(ability) <= 80),
  held_item text check (held_item is null or length(held_item) <= 100),
  is_shiny boolean not null default false,
  status text not null default 'alive'
    check (status in ('alive', 'dead', 'released', 'traded')),
  team_position smallint check (
    team_position is null or (team_position between 1 and 6 and status = 'alive')
  ),
  route_id smallint references public.routes (id),
  origin_map_id integer,
  origin_name text check (origin_name is null or length(origin_name) <= 120),
  obtain_method smallint check (obtain_method is null or obtain_method >= 0),
  captured_at timestamptz,
  died_at timestamptz,
  death_area text check (death_area is null or length(death_area) <= 120),
  iv_hp smallint check (iv_hp is null or iv_hp between 0 and 31),
  iv_attack smallint check (iv_attack is null or iv_attack between 0 and 31),
  iv_defense smallint check (iv_defense is null or iv_defense between 0 and 31),
  iv_special_attack smallint check (iv_special_attack is null or iv_special_attack between 0 and 31),
  iv_special_defense smallint check (iv_special_defense is null or iv_special_defense between 0 and 31),
  iv_speed smallint check (iv_speed is null or iv_speed between 0 and 31),
  ev_hp smallint check (ev_hp is null or ev_hp between 0 and 252),
  ev_attack smallint check (ev_attack is null or ev_attack between 0 and 252),
  ev_defense smallint check (ev_defense is null or ev_defense between 0 and 252),
  ev_special_attack smallint check (ev_special_attack is null or ev_special_attack between 0 and 252),
  ev_special_defense smallint check (ev_special_defense is null or ev_special_defense between 0 and 252),
  ev_speed smallint check (ev_speed is null or ev_speed between 0 and 252),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pokemon_ev_total_check check (
    coalesce(ev_hp, 0) + coalesce(ev_attack, 0) + coalesce(ev_defense, 0)
    + coalesce(ev_special_attack, 0) + coalesce(ev_special_defense, 0)
    + coalesce(ev_speed, 0) <= 510
  )
);

create unique index pokemon_player_source_identity_unique
  on public.pokemon (player_id, source_identity)
  where source_identity is not null;
create unique index pokemon_player_team_position_unique
  on public.pokemon (player_id, team_position)
  where team_position is not null;
create index pokemon_route_status_idx
  on public.pokemon (route_id, created_at);
create index pokemon_player_status_idx
  on public.pokemon (player_id, status, created_at desc);

create table public.pokemon_moves (
  pokemon_id uuid not null references public.pokemon (id) on delete cascade,
  slot smallint not null check (slot between 1 and 4),
  move text not null check (length(btrim(move)) between 1 and 80),
  primary key (pokemon_id, slot),
  constraint pokemon_moves_unique_move unique (pokemon_id, move)
);

create table public.medals (
  id smallint primary key check (id between 1 and 5),
  name text not null unique check (length(btrim(name)) between 1 and 60)
);

insert into public.medals (id, name) values
  (1, 'Medalla 1'),
  (2, 'Medalla 2'),
  (3, 'Medalla 3'),
  (4, 'Medalla 4'),
  (5, 'Medalla 5');

create table public.player_medals (
  player_id uuid not null references public.players (id) on delete cascade,
  medal_id smallint not null references public.medals (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (player_id, medal_id)
);

create index player_medals_medal_awarded_idx
  on public.player_medals (medal_id, awarded_at desc);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  pokemon_id uuid references public.pokemon (id) on delete cascade,
  medal_id smallint references public.medals (id) on delete cascade,
  route_id smallint references public.routes (id),
  event_type text not null check (
    event_type in ('capture', 'death', 'status_changed', 'medal_awarded')
  ),
  source_key text,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint activity_events_target_check check (
    (event_type in ('capture', 'death', 'status_changed')
      and pokemon_id is not null and medal_id is null)
    or (event_type = 'medal_awarded'
      and medal_id is not null and pokemon_id is null)
  )
);

create unique index activity_events_player_source_key_unique
  on public.activity_events (player_id, source_key)
  where source_key is not null;
create index activity_events_occurred_idx
  on public.activity_events (occurred_at desc);
create index activity_events_route_occurred_idx
  on public.activity_events (route_id, occurred_at desc)
  where route_id is not null;

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  format_key text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'in_progress', 'completed', 'archived')),
  participant_limit smallint not null default 40
    check (participant_limit between 2 and 40),
  created_by_player_id uuid references public.players (id) on delete set null,
  published_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tournaments_history_idx on public.tournaments (created_at desc);

create table public.tournament_participants (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  seed smallint check (seed is null or seed between 1 and 40),
  final_rank smallint check (final_rank is null or final_rank between 1 and 40),
  registered_at timestamptz not null default now(),
  primary key (tournament_id, player_id),
  constraint tournament_participants_seed_unique unique (tournament_id, seed)
);

create index tournament_participants_player_idx
  on public.tournament_participants (player_id, registered_at desc);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  phase text not null default 'main' check (length(btrim(phase)) between 1 and 40),
  round_number smallint not null check (round_number between 1 and 16),
  match_number smallint not null check (match_number between 1 and 64),
  player_a_id uuid,
  player_b_id uuid,
  winner_player_id uuid,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'bye', 'forfeit')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_matches_position_unique
    unique (tournament_id, phase, round_number, match_number),
  constraint tournament_matches_distinct_players_check
    check (player_a_id is null or player_b_id is null or player_a_id <> player_b_id),
  constraint tournament_matches_winner_check
    check (
      winner_player_id is null
      or coalesce(winner_player_id = player_a_id, false)
      or coalesce(winner_player_id = player_b_id, false)
    ),
  constraint tournament_matches_player_a_fk
    foreign key (tournament_id, player_a_id)
    references public.tournament_participants (tournament_id, player_id),
  constraint tournament_matches_player_b_fk
    foreign key (tournament_id, player_b_id)
    references public.tournament_participants (tournament_id, player_id),
  constraint tournament_matches_winner_fk
    foreign key (tournament_id, winner_player_id)
    references public.tournament_participants (tournament_id, player_id)
);

create index tournament_matches_round_status_idx
  on public.tournament_matches (tournament_id, round_number, status);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create trigger pokemon_set_updated_at
before update on public.pokemon
for each row execute function public.set_updated_at();

create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

create trigger tournament_matches_set_updated_at
before update on public.tournament_matches
for each row execute function public.set_updated_at();

create function public.set_pokemon_route_and_team()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.origin_map_id is not null then
    select route_map_ids.route_id
      into new.route_id
    from public.route_map_ids
    where route_map_ids.map_id = new.origin_map_id;
  end if;

  if new.status <> 'alive' then
    new.team_position = null;
  end if;

  if new.status = 'dead' and new.died_at is null then
    new.died_at = pg_catalog.now();
  end if;

  return new;
end;
$$;

create trigger pokemon_set_route_and_team
before insert or update of origin_map_id, route_id, status, team_position
on public.pokemon
for each row execute function public.set_pokemon_route_and_team();

create function public.enforce_player_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(20261021, 40);

  if (select count(*) from public.players) >= 40 then
    raise exception 'Consonancia admite como máximo 40 jugadores';
  end if;

  return new;
end;
$$;

create trigger players_enforce_limit
before insert on public.players
for each row execute function public.enforce_player_limit();

create function public.enforce_tournament_participant_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  configured_limit smallint;
begin
  select tournaments.participant_limit
    into configured_limit
  from public.tournaments
  where tournaments.id = new.tournament_id
  for update;

  if not found then
    raise exception 'El torneo no existe';
  end if;

  if tg_op = 'UPDATE' then
    if new.tournament_id <> old.tournament_id or new.player_id <> old.player_id then
      raise exception 'La identidad del participante no se puede cambiar';
    end if;
    return new;
  end if;

  if (select count(*) from public.tournament_participants
      where tournament_id = new.tournament_id) >= configured_limit then
    raise exception 'El torneo ha alcanzado su límite de participantes';
  end if;

  return new;
end;
$$;

create trigger tournament_participants_enforce_limit
before insert or update on public.tournament_participants
for each row execute function public.enforce_tournament_participant_limit();

create function public.log_pokemon_activity()
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

create trigger pokemon_log_activity
after insert or update of status on public.pokemon
for each row execute function public.log_pokemon_activity();

create function public.log_medal_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.activity_events (
    player_id, medal_id, event_type, source_key, occurred_at
  )
  values (
    new.player_id,
    new.medal_id,
    'medal_awarded',
    'player-medal:' || new.player_id::text || ':' || new.medal_id::text,
    new.awarded_at
  );

  return new;
end;
$$;

create trigger player_medals_log_activity
after insert on public.player_medals
for each row execute function public.log_medal_activity();

alter table public.players enable row level security;
alter table public.player_sessions enable row level security;
alter table public.authentication_limits enable row level security;
alter table public.routes enable row level security;
alter table public.route_map_ids enable row level security;
alter table public.pokemon enable row level security;
alter table public.pokemon_moves enable row level security;
alter table public.medals enable row level security;
alter table public.player_medals enable row level security;
alter table public.activity_events enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_matches enable row level security;

revoke all on table
  public.players,
  public.player_sessions,
  public.authentication_limits,
  public.routes,
  public.route_map_ids,
  public.pokemon,
  public.pokemon_moves,
  public.medals,
  public.player_medals,
  public.activity_events,
  public.tournaments,
  public.tournament_participants,
  public.tournament_matches
from public, anon, authenticated;

grant all privileges on table
  public.players,
  public.player_sessions,
  public.authentication_limits,
  public.routes,
  public.route_map_ids,
  public.pokemon,
  public.pokemon_moves,
  public.medals,
  public.player_medals,
  public.activity_events,
  public.tournaments,
  public.tournament_participants,
  public.tournament_matches
to service_role;

comment on table public.players is
  'Consonancia accounts. PINs are plaintext and must only be accessed by trusted server-side code.';
comment on column public.players.pin is
  'Five-character alphanumeric PIN. Plaintext is intentional; restrict access to trusted server-side code.';
comment on table public.player_sessions is
  'Server-managed sessions. Persist only a SHA-256 hash of a cryptographically random bearer token.';
comment on table public.authentication_limits is
  'Server-managed login throttling. Store keyed hashes of identifiers and limiter scopes, never raw values.';
comment on table public.pokemon is
  'Captured Pokémon and lifecycle. source_identity is a stable per-player key for idempotent imports.';
comment on table public.routes is
  'Consonancia capture zones derived from the supplied game save; repeated map names are grouped.';
