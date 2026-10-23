create or replace function public.delete_individual_match_round(
  p_round_id uuid,
  p_organizer_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.players
    where id = p_organizer_player_id and role = 'organizer' and is_active
  ) then
    raise exception 'Solo una cuenta organizadora puede borrar rondas.' using errcode = '42501';
  end if;

  delete from public.individual_match_rounds
  where id = p_round_id;
  if not found then
    raise exception 'No se encontró la ronda que quieres borrar.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.delete_individual_match_round(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_individual_match_round(uuid, uuid)
  to service_role;
