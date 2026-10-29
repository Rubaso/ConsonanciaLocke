alter table public.individual_matches
  drop constraint if exists individual_matches_showdown_replay_url_check;

alter table public.individual_matches
  add constraint individual_matches_showdown_replay_url_check
  check (
    showdown_replay_url is null
    or (
      length(btrim(showdown_replay_url)) between 18 and 400
      and showdown_replay_url ~* '^https://(www\.)?(psim\.us/r/|replay\.pokemonshowdown\.com/|play\.pokemonshowdown\.com/)'
    )
  );

alter table public.tournament_matches
  drop constraint if exists tournament_matches_showdown_replay_url_check;

alter table public.tournament_matches
  add constraint tournament_matches_showdown_replay_url_check
  check (
    showdown_replay_url is null
    or (
      length(btrim(showdown_replay_url)) between 18 and 400
      and showdown_replay_url ~* '^https://(www\.)?(psim\.us/r/|replay\.pokemonshowdown\.com/|play\.pokemonshowdown\.com/)'
    )
  );
