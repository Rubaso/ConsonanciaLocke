create or replace function public.record_authentication_failure(
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
        <= pg_catalog.now() - interval '30 seconds'
      then pg_catalog.now()
      else public.authentication_limits.window_started_at
    end,
    failed_attempts = case
      when public.authentication_limits.window_started_at
        <= pg_catalog.now() - interval '30 seconds'
      then 1
      else least(public.authentication_limits.failed_attempts + 1, 100)
    end,
    blocked_until = case
      when public.authentication_limits.blocked_until > pg_catalog.now()
      then public.authentication_limits.blocked_until
      when (
        case
          when public.authentication_limits.window_started_at
            <= pg_catalog.now() - interval '30 seconds'
          then 1
          else public.authentication_limits.failed_attempts + 1
        end
      ) >= 8
      then pg_catalog.now() + interval '30 seconds'
      else null
    end,
    updated_at = pg_catalog.now()
  returning public.authentication_limits.blocked_until
    into blocked_until_value;

  return coalesce(blocked_until_value > pg_catalog.now(), false);
end;
$$;

update public.authentication_limits
set
  blocked_until = least(blocked_until, now() + interval '30 seconds'),
  updated_at = now()
where blocked_until > now();
