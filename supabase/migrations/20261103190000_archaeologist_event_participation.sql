alter table public.week_two_event_submissions
  add column pokemon_id uuid references public.pokemon (id) on delete cascade;

alter table public.week_two_event_submissions
  alter column evidence_url drop not null;

alter table public.week_two_event_submissions
  drop constraint if exists week_two_event_submissions_event_slug_check,
  drop constraint if exists week_two_event_submissions_evidence_url_check;

alter table public.week_two_event_submissions
  add constraint week_two_event_submissions_event_slug_check
    check (event_slug in ('el-loco-de-la-colina', 'arqueologo-novato')),
  add constraint week_two_event_submissions_event_payload_check
    check (
      (
        event_slug = 'el-loco-de-la-colina'
        and evidence_url is not null
        and length(btrim(evidence_url)) between 8 and 500
        and evidence_url ~* '^https?://'
        and pokemon_id is null
      )
      or (
        event_slug = 'arqueologo-novato'
        and evidence_url is null
        and pokemon_id is not null
      )
    );

create index week_two_event_submissions_pokemon_idx
  on public.week_two_event_submissions (pokemon_id)
  where pokemon_id is not null;

comment on column public.week_two_event_submissions.pokemon_id is
  'The participant Pokémon for Arqueólogo novato; validated against ownership and Gruta Sisma origin by the server.';
