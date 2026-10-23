alter table public.tournament_matches
  drop column if exists player_a_pokepaste_text,
  drop column if exists player_b_pokepaste_text;

alter table public.individual_matches
  drop column if exists player_a_pokepaste_text,
  drop column if exists player_b_pokepaste_text;

create function public.prevent_tournament_pokepaste_changes_after_submission()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.tournaments
    where id = old.tournament_id
      and status in ('published', 'in_progress', 'completed')
  ) and (
    (old.player_a_pokepaste_url is not null
      and new.player_a_pokepaste_url is distinct from old.player_a_pokepaste_url)
    or
    (old.player_b_pokepaste_url is not null
      and new.player_b_pokepaste_url is distinct from old.player_b_pokepaste_url)
  ) then
    raise exception 'Los enlaces de Poképast.es no se pueden modificar después de enviarlos durante el torneo.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tournament_matches_lock_submitted_pokepastes
before update of player_a_pokepaste_url, player_b_pokepaste_url
on public.tournament_matches
for each row
execute function public.prevent_tournament_pokepaste_changes_after_submission();
