alter table public.players
  add column pokepaste_url text
    check (
      pokepaste_url is null
      or pokepaste_url ~ '^https://(www\.)?pokepast\.es/[A-Za-z0-9_-]{4,80}$'
    );

create function public.set_match_pokepaste_from_player_profile()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_pokepaste_url text;
begin
  if tg_op = 'INSERT' then
    if new.player_a_id is not null then
      select pokepaste_url into v_pokepaste_url
      from public.players
      where id = new.player_a_id and is_active;
      new.player_a_pokepaste_url := coalesce(v_pokepaste_url, new.player_a_pokepaste_url);
    end if;
    if new.player_b_id is not null then
      select pokepaste_url into v_pokepaste_url
      from public.players
      where id = new.player_b_id and is_active;
      new.player_b_pokepaste_url := coalesce(v_pokepaste_url, new.player_b_pokepaste_url);
    end if;
  elsif new.player_a_id is distinct from old.player_a_id then
    if new.player_a_id is not null then
      select pokepaste_url into v_pokepaste_url
      from public.players
      where id = new.player_a_id and is_active;
      new.player_a_pokepaste_url := coalesce(v_pokepaste_url, new.player_a_pokepaste_url);
    end if;
  end if;

  if tg_op = 'UPDATE' and new.player_b_id is distinct from old.player_b_id then
    if new.player_b_id is not null then
      select pokepaste_url into v_pokepaste_url
      from public.players
      where id = new.player_b_id and is_active;
      new.player_b_pokepaste_url := coalesce(v_pokepaste_url, new.player_b_pokepaste_url);
    end if;
  end if;

  return new;
end;
$$;

create trigger tournament_matches_set_pokepaste_from_profile
before insert or update of player_a_id, player_b_id
on public.tournament_matches
for each row
execute function public.set_match_pokepaste_from_player_profile();

create trigger individual_matches_set_pokepaste_from_profile
before insert or update of player_a_id, player_b_id
on public.individual_matches
for each row
execute function public.set_match_pokepaste_from_player_profile();

create function public.sync_player_pokepaste_profile_to_matches()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.pokepaste_url is not distinct from old.pokepaste_url then
    return new;
  end if;

  update public.tournament_matches m
  set
    player_a_pokepaste_url = case
      when m.player_a_id = new.id and t.status = 'draft' then new.pokepaste_url
      when m.player_a_id = new.id then coalesce(m.player_a_pokepaste_url, new.pokepaste_url)
      else m.player_a_pokepaste_url
    end,
    player_b_pokepaste_url = case
      when m.player_b_id = new.id and t.status = 'draft' then new.pokepaste_url
      when m.player_b_id = new.id then coalesce(m.player_b_pokepaste_url, new.pokepaste_url)
      else m.player_b_pokepaste_url
    end
  from public.tournaments t
  where t.id = m.tournament_id
    and t.status in ('draft', 'published', 'in_progress')
    and (
      (m.player_a_id = new.id and (
        (t.status = 'draft' and m.player_a_pokepaste_url is distinct from new.pokepaste_url)
        or (t.status <> 'draft' and m.player_a_pokepaste_url is null and new.pokepaste_url is not null)
      ))
      or
      (m.player_b_id = new.id and (
        (t.status = 'draft' and m.player_b_pokepaste_url is distinct from new.pokepaste_url)
        or (t.status <> 'draft' and m.player_b_pokepaste_url is null and new.pokepaste_url is not null)
      ))
    );

  update public.individual_matches m
  set
    player_a_pokepaste_url = case
      when m.player_a_id = new.id and r.status = 'draft' then new.pokepaste_url
      when m.player_a_id = new.id then coalesce(m.player_a_pokepaste_url, new.pokepaste_url)
      else m.player_a_pokepaste_url
    end,
    player_b_pokepaste_url = case
      when m.player_b_id = new.id and r.status = 'draft' then new.pokepaste_url
      when m.player_b_id = new.id then coalesce(m.player_b_pokepaste_url, new.pokepaste_url)
      else m.player_b_pokepaste_url
    end
  from public.individual_match_rounds r
  where r.id = m.round_id
    and r.status in ('draft', 'published')
    and (
      (m.player_a_id = new.id and (
        (r.status = 'draft' and m.player_a_pokepaste_url is distinct from new.pokepaste_url)
        or (r.status = 'published' and m.player_a_pokepaste_url is null and new.pokepaste_url is not null)
      ))
      or
      (m.player_b_id = new.id and (
        (r.status = 'draft' and m.player_b_pokepaste_url is distinct from new.pokepaste_url)
        or (r.status = 'published' and m.player_b_pokepaste_url is null and new.pokepaste_url is not null)
      ))
    );

  update public.individual_matches m
  set
    player_a_pokepaste_url = case
      when m.player_a_id = new.id then new.pokepaste_url
      else m.player_a_pokepaste_url
    end,
    player_b_pokepaste_url = case
      when m.player_b_id = new.id then new.pokepaste_url
      else m.player_b_pokepaste_url
    end
  where m.round_id is null
    and m.status = 'pending'
    and new.pokepaste_url is not null
    and (
      (m.player_a_id = new.id and m.player_a_pokepaste_url is null)
      or (m.player_b_id = new.id and m.player_b_pokepaste_url is null)
    );

  return new;
end;
$$;

create trigger players_sync_pokepaste_profile
after update of pokepaste_url
on public.players
for each row
execute function public.sync_player_pokepaste_profile_to_matches();
