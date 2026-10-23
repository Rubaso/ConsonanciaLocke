create function public.is_authentication_blocked(
  p_identifier_hash text,
  p_source_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  blocked_until_value timestamptz;
begin
  if p_identifier_hash !~ '^[0-9a-f]{64}$'
    or p_source_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid authentication limit key';
  end if;

  select limits.blocked_until
    into blocked_until_value
  from public.authentication_limits as limits
  where limits.identifier_hash = p_identifier_hash
    and limits.source_hash = p_source_hash;

  return coalesce(blocked_until_value > pg_catalog.now(), false);
end;
$$;

create function public.record_authentication_failure(
  p_identifier_hash text,
  p_source_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  blocked_until_value timestamptz;
begin
  if p_identifier_hash !~ '^[0-9a-f]{64}$'
    or p_source_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid authentication limit key';
  end if;

  insert into public.authentication_limits (
    identifier_hash,
    source_hash,
    window_started_at,
    failed_attempts,
    blocked_until,
    updated_at
  )
  values (
    p_identifier_hash,
    p_source_hash,
    pg_catalog.now(),
    1,
    null,
    pg_catalog.now()
  )
  on conflict (identifier_hash, source_hash) do update
  set
    window_started_at = case
      when public.authentication_limits.window_started_at
        <= pg_catalog.now() - interval '15 minutes'
      then pg_catalog.now()
      else public.authentication_limits.window_started_at
    end,
    failed_attempts = case
      when public.authentication_limits.window_started_at
        <= pg_catalog.now() - interval '15 minutes'
      then 1
      else least(public.authentication_limits.failed_attempts + 1, 100)
    end,
    blocked_until = case
      when public.authentication_limits.blocked_until > pg_catalog.now()
      then public.authentication_limits.blocked_until
      when (
        case
          when public.authentication_limits.window_started_at
            <= pg_catalog.now() - interval '15 minutes'
          then 1
          else public.authentication_limits.failed_attempts + 1
        end
      ) >= 8
      then pg_catalog.now() + interval '15 minutes'
      else null
    end,
    updated_at = pg_catalog.now()
  returning public.authentication_limits.blocked_until
    into blocked_until_value;

  return coalesce(blocked_until_value > pg_catalog.now(), false);
end;
$$;

create function public.clear_authentication_limit(
  p_identifier_hash text,
  p_source_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_identifier_hash !~ '^[0-9a-f]{64}$'
    or p_source_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid authentication limit key';
  end if;

  delete from public.authentication_limits
  where identifier_hash = p_identifier_hash
    and source_hash = p_source_hash;
end;
$$;

revoke all on function public.is_authentication_blocked(text, text)
  from public, anon, authenticated;
revoke all on function public.record_authentication_failure(text, text)
  from public, anon, authenticated;
revoke all on function public.clear_authentication_limit(text, text)
  from public, anon, authenticated;

grant execute on function public.is_authentication_blocked(text, text)
  to service_role;
grant execute on function public.record_authentication_failure(text, text)
  to service_role;
grant execute on function public.clear_authentication_limit(text, text)
  to service_role;
