import trainerSprites from "@/lib/trainer-sprites.json";

export const trainerSpriteNames = trainerSprites;

export function isTrainerSpriteName(value: unknown): value is string {
  return typeof value === "string" && trainerSpriteNames.includes(value);
}
