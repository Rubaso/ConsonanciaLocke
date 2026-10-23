export type RouteStage = {
  number: number;
  label: string;
  minMapId: number;
  maxMapId: number;
};

export const ROUTE_STAGES: readonly RouteStage[] = [
  { number: 1, label: "Hasta la medalla 2", minMapId: 1, maxMapId: 142 },
  { number: 2, label: "Hasta Norman · medalla 3", minMapId: 143, maxMapId: 175 },
  { number: 3, label: "Hasta Ela · medalla 5", minMapId: 176, maxMapId: 231 },
  { number: 4, label: "Hasta terminar la liga", minMapId: 232, maxMapId: 257 },
];
