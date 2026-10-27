alter table public.players
  add column if not exists challenge_mode text;

update public.players
set challenge_mode = case
  when lower(username) in ('shiro', 'titosanti', 'evarathz', 'pokecartas')
    then 'BELLELOKE'
  else 'HARDLOCKE'
end;

alter table public.players
  alter column challenge_mode set default 'HARDLOCKE',
  alter column challenge_mode set not null;

alter table public.players
  drop constraint if exists players_challenge_mode_check;

alter table public.players
  add constraint players_challenge_mode_check
  check (challenge_mode in ('BELLELOKE', 'HARDLOCKE'));
