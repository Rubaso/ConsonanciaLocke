create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete restrict,
  kind text not null check (kind in ('sell_item', 'buy_item', 'pokemon_for_item')),
  offer_label text check (offer_label is null or length(btrim(offer_label)) between 1 and 80),
  offer_item_slug text check (offer_item_slug is null or length(btrim(offer_item_slug)) between 1 and 80),
  want_label text check (want_label is null or length(btrim(want_label)) between 1 and 80),
  want_item_slug text check (want_item_slug is null or length(btrim(want_item_slug)) between 1 and 80),
  pokemon_id uuid references public.pokemon (id) on delete set null,
  pokemon_species text check (pokemon_species is null or length(btrim(pokemon_species)) between 1 and 80),
  pokemon_nickname text check (pokemon_nickname is null or length(btrim(pokemon_nickname)) between 1 and 80),
  pokemon_form integer check (pokemon_form is null or pokemon_form >= 0),
  pokemon_is_shiny boolean not null default false,
  note text check (note is null or length(btrim(note)) <= 280),
  photo_data text check (photo_data is null or length(photo_data) between 32 and 450000),
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_reason text check (
    closed_reason is null
    or closed_reason in ('traded', 'withdrawn')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_listings_sell_check check (
    kind <> 'sell_item'
    or (offer_label is not null and length(btrim(offer_label)) between 1 and 80)
  ),
  constraint market_listings_buy_check check (
    kind <> 'buy_item'
    or (want_label is not null and length(btrim(want_label)) between 1 and 80)
  ),
  constraint market_listings_pokemon_check check (
    kind <> 'pokemon_for_item'
    or (
      pokemon_species is not null
      and length(btrim(pokemon_species)) between 1 and 80
      and want_label is not null
      and length(btrim(want_label)) between 1 and 80
    )
  ),
  constraint market_listings_no_pkmn_for_pkmn check (
    kind <> 'pokemon_for_item' or offer_label is null
  ),
  constraint market_listings_status_closed_reason_check check (
    (status = 'open' and closed_reason is null)
    or (status = 'closed' and closed_reason is not null)
  )
);

create index market_listings_open_idx
  on public.market_listings (created_at desc)
  where status = 'open';

create index market_listings_player_idx
  on public.market_listings (player_id, status, created_at desc);

create unique index market_listings_open_pokemon_idx
  on public.market_listings (pokemon_id)
  where status = 'open' and pokemon_id is not null;

create table public.market_trades (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings (id) on delete restrict,
  seller_id uuid not null references public.players (id) on delete restrict,
  buyer_id uuid not null references public.players (id) on delete restrict,
  completed_at timestamptz not null default now(),
  constraint market_trades_distinct_players check (seller_id <> buyer_id)
);

create unique index market_trades_listing_unique
  on public.market_trades (listing_id);

create unique index market_trades_pair_unique
  on public.market_trades (least(seller_id, buyer_id), greatest(seller_id, buyer_id));

create index market_trades_recent_idx
  on public.market_trades (completed_at desc);

create trigger market_listings_set_updated_at
before update on public.market_listings
for each row execute function public.set_updated_at();

alter table public.market_listings enable row level security;
alter table public.market_trades enable row level security;

revoke all on table public.market_listings from public, anon, authenticated;
revoke all on table public.market_trades from public, anon, authenticated;
grant all privileges on table public.market_listings to service_role;
grant all privileges on table public.market_trades to service_role;

comment on table public.market_listings is
  'Mercado Rocket listings: item buy/sell or Pokémon-for-item. Pokémon-for-Pokémon is not allowed.';
comment on table public.market_trades is
  'Completed Mercado Rocket trades. Each pair of players may complete only one trade.';
