alter table public.tournament_matches
  add column player_a_pokepaste_url text,
  add column player_a_pokepaste_text text,
  add column player_b_pokepaste_url text,
  add column player_b_pokepaste_text text,
  add constraint tournament_matches_player_a_pokepaste_url_check
    check (
      player_a_pokepaste_url is null
      or player_a_pokepaste_url ~ '^https://(www\.)?pokepast\.es/[A-Za-z0-9_-]{4,80}$'
    ),
  add constraint tournament_matches_player_a_pokepaste_text_check
    check (
      player_a_pokepaste_text is null
      or length(btrim(player_a_pokepaste_text)) between 1 and 20000
    ),
  add constraint tournament_matches_player_a_pokepaste_source_check
    check (
      player_a_pokepaste_url is null
      or player_a_pokepaste_text is null
    ),
  add constraint tournament_matches_player_b_pokepaste_url_check
    check (
      player_b_pokepaste_url is null
      or player_b_pokepaste_url ~ '^https://(www\.)?pokepast\.es/[A-Za-z0-9_-]{4,80}$'
    ),
  add constraint tournament_matches_player_b_pokepaste_text_check
    check (
      player_b_pokepaste_text is null
      or length(btrim(player_b_pokepaste_text)) between 1 and 20000
    ),
  add constraint tournament_matches_player_b_pokepaste_source_check
    check (
      player_b_pokepaste_url is null
      or player_b_pokepaste_text is null
    );

comment on column public.tournament_matches.player_a_pokepaste_url is
  'Poképast.es URL submitted by participant A for this match.';
comment on column public.tournament_matches.player_a_pokepaste_text is
  'Pokémon Showdown export submitted by participant A for this match.';
comment on column public.tournament_matches.player_b_pokepaste_url is
  'Poképast.es URL submitted by participant B for this match.';
comment on column public.tournament_matches.player_b_pokepaste_text is
  'Pokémon Showdown export submitted by participant B for this match.';
