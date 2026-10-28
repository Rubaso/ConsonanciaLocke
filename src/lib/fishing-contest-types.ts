export type FishingContestStanding = {
  id: string;
  contestId: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  pokemonId: string | null;
  sourceSpecies: string | null;
  nickname: string | null;
  form: number;
  isShiny: boolean;
  chosenSpecies: string;
  weightKg: number;
  clipUrl: string;
  isDisqualified: boolean;
  updatedAt: string;
};

export type FishingEligibleChoice = {
  species: string;
  displayName: string;
  weightKg: number;
};

export type FishingEligiblePokemon = {
  id: string;
  species: string;
  form: number;
  nickname: string | null;
  level: number | null;
  isShiny: boolean;
  teamPosition: number | null;
  originName: string | null;
  choices: FishingEligibleChoice[];
};
