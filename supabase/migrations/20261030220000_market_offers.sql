begin;

create table public.market_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings (id) on delete restrict,
  from_player_id uuid not null references public.players (id) on delete restrict,
  to_player_id uuid not null references public.players (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  offer_kind text not null check (offer_kind in ('item', 'pokemon')),
  offer_label text not null check (length(btrim(offer_label)) between 1 and 80),
  offer_item_slug text check (
    offer_item_slug is null or length(btrim(offer_item_slug)) between 1 and 80
  ),
  offer_item_key text check (
    offer_item_key is null or length(btrim(offer_item_key)) between 1 and 80
  ),
  pokemon_id uuid references public.pokemon (id) on delete set null,
  pokemon_species text check (
    pokemon_species is null or length(btrim(pokemon_species)) between 1 and 80
  ),
  pokemon_nickname text check (
    pokemon_nickname is null or length(btrim(pokemon_nickname)) between 1 and 80
  ),
  pokemon_form integer check (pokemon_form is null or pokemon_form >= 0),
  pokemon_is_shiny boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint market_offers_distinct_players check (from_player_id <> to_player_id),
  constraint market_offers_item_shape check (
    offer_kind <> 'item'
    or (
      offer_item_key is not null
      and pokemon_id is null
    )
  ),
  constraint market_offers_pokemon_shape check (
    offer_kind <> 'pokemon'
    or (
      pokemon_species is not null
      and length(btrim(pokemon_species)) between 1 and 80
    )
  ),
  constraint market_offers_resolved_check check (
    (status = 'pending' and resolved_at is null)
    or (status <> 'pending' and resolved_at is not null)
  )
);

create unique index market_offers_pending_listing_from_idx
  on public.market_offers (listing_id, from_player_id)
  where status = 'pending';

create unique index market_offers_pending_pair_idx
  on public.market_offers (
    least(from_player_id, to_player_id),
    greatest(from_player_id, to_player_id)
  )
  where status = 'pending';

create index market_offers_inbox_idx
  on public.market_offers (to_player_id, created_at desc)
  where status = 'pending';

alter table public.market_offers enable row level security;
revoke all on table public.market_offers from public, anon, authenticated;
grant all privileges on table public.market_offers to service_role;

comment on table public.market_offers is
  'Pending Mercado Rocket offers. Rejected offers do not lock the player pair; only accepted trades do.';

commit;
