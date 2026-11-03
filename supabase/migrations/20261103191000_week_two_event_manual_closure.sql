create table public.week_two_event_control (
  event_slug text primary key check (
    event_slug in ('el-loco-de-la-colina', 'arqueologo-novato')
  ),
  ended_at timestamptz
);

insert into public.week_two_event_control (event_slug, ended_at) values
  ('el-loco-de-la-colina', null),
  ('arqueologo-novato', null);

alter table public.week_two_event_control enable row level security;
revoke all on table public.week_two_event_control from public, anon, authenticated;
grant all privileges on table public.week_two_event_control to service_role;

create function public.ensure_week_two_event_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_ended_at timestamptz;
begin
  select control.ended_at
    into event_ended_at
  from public.week_two_event_control as control
  where control.event_slug = new.event_slug
  for update;

  if not found then
    raise exception 'WEEK_TWO_EVENT_NOT_CONFIGURED'
      using errcode = 'P0001';
  end if;

  if event_ended_at is not null then
    raise exception 'WEEK_TWO_EVENT_CLOSED'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.ensure_week_two_event_open() from public, anon, authenticated;
grant execute on function public.ensure_week_two_event_open() to service_role;

create trigger week_two_event_submission_requires_open_event
before insert or update on public.week_two_event_submissions
for each row execute function public.ensure_week_two_event_open();

comment on table public.week_two_event_control is
  'Manual close state for each Week 2 event; null ended_at means the event remains open until an organizer closes it.';

comment on function public.ensure_week_two_event_open() is
  'Serializes event submissions with organizer closure and rejects submissions after an event is ended.';
