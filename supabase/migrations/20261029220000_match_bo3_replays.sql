alter table public.individual_matches
  add column if not exists showdown_replay_url_2 text;

alter table public.individual_matches
  add column if not exists showdown_replay_url_3 text;

alter table public.tournament_matches
  add column if not exists showdown_replay_url_2 text;

alter table public.tournament_matches
  add column if not exists showdown_replay_url_3 text;

comment on column public.individual_matches.showdown_replay_url is
  'Replay of game 1 in the BO3.';
comment on column public.individual_matches.showdown_replay_url_2 is
  'Replay of game 2 in the BO3.';
comment on column public.individual_matches.showdown_replay_url_3 is
  'Replay of game 3 in the BO3.';
comment on column public.tournament_matches.showdown_replay_url is
  'Replay of game 1 in the BO3.';
comment on column public.tournament_matches.showdown_replay_url_2 is
  'Replay of game 2 in the BO3.';
comment on column public.tournament_matches.showdown_replay_url_3 is
  'Replay of game 3 in the BO3.';
