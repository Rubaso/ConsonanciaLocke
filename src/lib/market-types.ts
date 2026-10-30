export type MarketListingKind = "sell_item" | "buy_item" | "pokemon_for_item";

export type MarketListingStatus = "open" | "closed";

export type MarketTradePokemon = {
  id: string;
  species: string;
  nickname: string | null;
  form: number;
  isShiny: boolean;
};

export type MarketListing = {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  kind: MarketListingKind;
  offerLabel: string | null;
  offerItemSlug: string | null;
  wantLabel: string | null;
  wantItemSlug: string | null;
  pokemon: MarketTradePokemon | null;
  note: string | null;
  photoData: string | null;
  status: MarketListingStatus;
  createdAt: string;
};

export type MarketShop = {
  playerId: string;
  playerName: string;
  playerColor: string;
  listings: MarketListing[];
};

export type MarketTrade = {
  id: string;
  listingId: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  completedAt: string;
  summary: string;
};

export type MarketOwnedItem = {
  itemKey: string;
  name: string;
  slug: string | null;
  quantity: number;
  pocket: "usable" | "held" | "ball" | "berry";
};

export type MarketPendingOffer = {
  id: string;
  listingId: string;
  listingHeadline: string;
  fromPlayerId: string;
  fromPlayerName: string;
  fromPlayerColor: string;
  offerKind: "item" | "pokemon";
  offerLabel: string;
  offerItemSlug: string | null;
  pokemon: MarketTradePokemon | null;
  createdAt: string;
};

export type MarketOwnedPokemon = {
  id: string;
  species: string;
  nickname: string | null;
  form: number;
  isShiny: boolean;
  level: number;
  listed: boolean;
};
