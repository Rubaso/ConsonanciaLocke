export type ShortContestStanding = {
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
  heightM: number;
  clipUrl: string;
  updatedAt: string;
};

export type ShortEligibleChoice = {
  species: string;
  displayName: string;
  heightM: number;
};

export type ShortEligiblePokemon = {
  id: string;
  species: string;
  form: number;
  nickname: string | null;
  level: number | null;
  isShiny: boolean;
  teamPosition: number | null;
  originName: string | null;
  choices: ShortEligibleChoice[];
};
