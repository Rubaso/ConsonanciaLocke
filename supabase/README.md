# Consonancia database

This is a fresh, standalone schema for Pokémon Consonancia. It does not reuse
LockeHub tables, credentials, or player data.

## Migrations

Apply these files in order to the **new Consonancia project**:

1. `20261021224500_initial_consonancia_schema.sql`
2. `20261022001000_authentication_limits.sql`
3. `20261022003500_plaintext_player_pins.sql`
4. `20261022010000_expand_capture_zone_catalog.sql`
5. `20261022020000_import_player_save.sql`
6. `20261022021000_import_dead_box_pokemon.sql`
7. `20261022022000_store_game_trainer_name.sql`
8. `20261022211500_tournament_match_pokepastes.sql`
9. `20261023015000_tournament_management.sql`
10. `20261023022000_individual_match_rounds.sql`
11. `20261023025000_repair_tournament_pokepastes.sql`
12. `20261023025500_include_organizers_as_participants.sql`
13. `20261023030000_allow_deleting_individual_rounds.sql`
14. `20261023031000_preserve_vacant_tournament_participants.sql`
15. `20261023032000_distribute_tournament_byes.sql`
16. `20261023033000_clear_tournament_match_result.sql`
17. `20261023034000_lock_and_gate_pokepastes.sql`
18. `20261023035000_archive_competitions_and_paste_history.sql`
19. `20261023040000_player_pokepaste_profile.sql`
20. `20261023041000_archive_finished_tournaments.sql`
21. `20261023042000_clear_archived_pokepaste_profiles.sql`
22. `20261023043000_name_individual_rounds.sql`
23. `20261023044000_change_individual_match_winner.sql`

The initial migration creates 13 tables for player accounts and sessions,
login throttling, the save-derived route catalog, Pokémon and moves, five
medals, activity, and tournaments with participants and matches. The route
seed contains 56 grouped zones and 68 unique map IDs. The second migration
adds server-only RPC functions for PIN login throttling. There are no seeded
players or PINs. The fourth migration expands the catalog to 59 zones and 80
map IDs, adding encounter maps and the Route 13, Gruta Ondego, and Route 18
areas found in the Consonancia game data.

The schema caps the event at 40 players and each tournament at 40 participants.
Tournaments use single elimination with automatically propagated byes. An
organizer creates a draft, can reorder or remove first-round participants, and
publishes the bracket when it is ready. Individual matches are stored
separately from tournament matches. The five medals are Calma,
Libertad, Temple, Unión, and Honra. `src/lib/stage-catalog.ts` groups imported
Pokémon by their game map IDs: Tramo 1 through map 142, Tramo 2 through map
175 (Norman), Tramo 3 through map 231 (Ela), and Tramo 4 through map 257
(the end of the WPM league). Pokémon from Centro Pokémon maps are not listed as
zones; Gachapon and Wonder Trade Pokémon remain visible in the tranche that
contains their origin map.

The eighth migration adds per-participant Poképast.es URL and legacy Pokémon
Showdown export fields to tournament matches. The ninth migration adds individual
matches, bracket feeder links, and server-only RPCs for atomic bracket creation,
editing draft slots, and advancing winners. The organizer APIs require an active organizer session and same-origin
requests. Players can prepare their own Poképaste for a draft or pending
individual and tournament match; the web app hides it from the opponent until
the competition is launched and both participants have submitted. The
migrations are prepared locally and have not been applied to Supabase. The
tenth migration adds organizer-created randomized rounds for all active player
accounts (one player rests if the count is odd), draft pairing edits,
publishing, and cancellation/deletion of pending individual matches.
The eleventh migration idempotently restores the tournament Poképaste columns
and their validation constraints if they are missing.
The twelfth migration includes active organizer accounts in tournament and
individual-round participant choices, except for the account with username
`rubaso`.
The thirteenth migration allows organizers to delete individual rounds in any
status; deleting a round also deletes all its matches and results.
The fourteenth migration keeps participants registered when a draft bracket
slot is set to vacant, so they can be selected again later.
The fifteenth migration places entrants into every first-round match before
leaving any bye slots empty and propagates those byes through the bracket.
The sixteenth migration lets organizers clear a recorded match result and
resets results and entrants in all subsequent rounds to keep the bracket
consistent. The seventeenth removes pasted Showdown text fields, reveals either
participant's Poképast.es URL only after both players submit, and prevents
changing or removing a tournament URL after its first submission. Players can
still submit their first URL after the tournament is published. Applying it
deletes any legacy pasted Showdown text stored in those columns.
The eighteenth migration adds organizer-only archiving for completed tournaments
and individual rounds. Archiving copies each submitted Poképast.es link and
opponent/event details into the participant's private team history, then clears
the live match links in the same database transaction. Players can prepare
links in draft competitions; opponents cannot see them until launch and both
players have submitted. Submitted links are locked after launch until
archiving. Changing participant slots in a draft clears any prepared links
attached to those slots, preventing another player from inheriting them.
The nineteenth migration adds a Poképast.es URL to each player profile, which
players can update even when they have no match. New match slots take a snapshot
of that player's profile link. Profile changes update that player's slots in
draft competitions and fill only empty slots in launched competitions; they do
not replace submitted links. Archived competitions remain unchanged.
The twentieth migration allows organizers to archive a tournament once every
match is complete, even if the tournament status was not advanced to
`completed` by an earlier bracket flow. The archive operation still verifies
that every match is terminal before moving it to the history.
The twenty-first migration clears the profile Poképaste for participants when
a tournament or individual round is archived. It also saves only one Poképaste
per participant and tournament/round; the player history consolidates repeated
individual-round entries for the same link instead of listing the identical
team once for every round. Clearing a profile does not erase snapshots in
other, still-active competitions.
The twenty-second migration lets organizers name each individual round/tournament
when creating it. The chosen name is retained on the round and shown in the
competition history.
The twenty-third migration lets organizers correct the winner of an individual
match after recording a result. It restricts changes to active, non-archived
matches and verifies that the selected winner is one of the participants.

## Security

- Row-level security is enabled on every application table. `anon` and
  `authenticated` have no table privileges or permissive policies.
- Database access must go through server-only handlers that validate the
  player's opaque `HttpOnly` session and role before using the Supabase
  `service_role` key. Never expose that key to the browser.
- Player PINs are intentionally stored as plaintext at the organizer's request.
  Anyone with database-admin access can read them; the app never sends them to
  the browser in API responses. The player submits their PIN to the server
  during login. Table access remains restricted to trusted server-side code.
  Login throttling identifiers and limiter scopes are stored as keyed hashes,
  not plaintext values.
- Session cookies must use secure settings, have a deliberate lifetime and
  revocation flow, and be protected against CSRF on state-changing requests.
- Save files are uploaded only for transient server-side parsing and are never
  stored. The per-player `source_identity` column and the import RPC make
  repeated Pokémon and medal imports idempotent.
- The app includes a minimal server-side login/session flow. Player
  settings can update a player's name color and Twitch channel; live-stream
  notifications and player administration are not implemented yet.
- Poképast.es URLs are stored on the player profile and snapshotted per match
  participant. The profile URL is returned only to its owner. Participants can
  prepare links while a tournament or individual round is a draft; only the
  participant can see their own match link before launch. After launch, either
  match URL is shown only to the two match participants after both submit.
  Database and API guards prevent changing a submitted link during a published
  competition; profile edits never replace a submitted match link.
  Standalone individual-match links remain editable by their owner. Creating,
  publishing, archiving, and managing competitions is restricted to active
  organizer accounts.
- The save parser imports party and storage Pokémon, moves, origin-map data,
  and the first five saved badges. Pokémon in the save's last two PC boxes
  are imported as dead by convention; the current save format does not record
  a death date or location, so the import date is used and the location stays
  unknown. Existing released or traded statuses remain unchanged.
- Save imports also store the in-game trainer name on the player's account so
  it can be displayed separately from the web login username. Existing players
  will see this name after their next save import.

## Applying manually in Supabase

If using the dashboard instead of the CLI:

1. Confirm the SQL Editor is open on the new, empty Consonancia project, not
   LockeHub and not the earlier test project.
2. Open each migration file in order, copy its full contents into a separate
   SQL Editor query, and run it once.
3. If the query reports an error, stop and share the error text before retrying;
   do not rerun the file blindly because earlier statements may have succeeded.
4. Confirm the tables and row counts: `routes` 59, `route_map_ids` 80, and
   `medals` 5. No player rows should exist yet.

If an existing database has applied the first *n* migrations, apply migrations
*n+1* through 23 in order. The route catalog migration (4) must precede
migration 5 on databases that have not applied it yet. Migration 3 adds a
nullable `pin` column and removes the old `pin_hash`; existing player records
remain, but you must assign them PINs before those players can log in. Their
old sessions are revoked. The migrations are prepared locally only and have
not been applied to any Supabase project from this workspace.

## Connecting the web app

The Rutas, Tramos, player, import, and settings pages access data through
server components or authenticated server handlers; the service key must never
use a `NEXT_PUBLIC_` variable.

1. Copy `.env.example` to `.env.local` in the project root.
2. In the Consonancia Supabase dashboard, copy the project URL from **Project
   Settings → API** into `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`).
3. Copy a backend-only secret/service-role key from **Project Settings → API
   Keys** into `SUPABASE_SERVICE_ROLE_KEY`. Never paste it in chat or commit
   `.env.local`.
4. Restart `npm run dev`. The Rutas page will report a connection/schema error
   if the project, permissions, or table structure do not match.

Because the migration intentionally grants no direct read access to
`anon`/`authenticated`, all public data access must remain on the server and
select only fields intended for display. Do not create a browser Supabase
client with the service key.

## Creating administrator accounts manually

After applying the migrations, insert the accounts in the Supabase SQL Editor
or Table Editor. Use a distinct five-character alphanumeric PIN for each and
set the role to `organizer`. Example SQL (replace both placeholders first):

```sql
insert into public.players (username, display_name, pin, role)
values
  ('rubaso', 'Rubaso', 'PIN_AQUI', 'organizer'),
  ('zigurathz', 'Zigurathz', 'PIN_AQUI', 'organizer');
```

PINs are case-insensitive at login. On an existing database, update existing
player rows by setting `pin` before they can log in. Because PINs are stored in
plaintext, anyone with database-admin access can read them; use the Supabase
dashboard only from a trusted account and do not paste PINs into chat or commit
them.
