alter table public.individual_matches
  drop constraint if exists individual_matches_showdown_replay_url_check;

alter table public.tournament_matches
  drop constraint if exists tournament_matches_showdown_replay_url_check;
