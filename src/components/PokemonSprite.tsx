"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type PokemonSpriteProps = {
  species: string;
  form?: number;
  isShiny?: boolean;
  size?: number;
  framed?: boolean;
  animated?: boolean;
};

type PokemonSpeciesResponse = {
  varieties?: Array<{
    is_default?: unknown;
    pokemon?: { url?: unknown };
  }>;
};

const speciesRequests = new Map<
  string,
  Promise<PokemonSpeciesResponse | null>
>();

function speciesSlug(species: string) {
  return species
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function idFromUrl(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const id = Number(value.split("/").filter(Boolean).pop());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function resolvePokemonId(species: string, form: number) {
  const slug = speciesSlug(species);
  let request = speciesRequests.get(slug);
  if (!request) {
    request = fetch(
      `https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(slug)}`,
    ).then(async (response) => {
      if (!response.ok) return null;
      const payload: PokemonSpeciesResponse = await response.json();
      return payload;
    }).catch((error: unknown) => {
      console.error(`No se pudieron obtener las formas de ${species}:`, error);
      return null;
    });
    speciesRequests.set(slug, request);
  }

  const payload = await request;
  if (!Array.isArray(payload?.varieties)) return null;

  const defaultVariety = payload.varieties.find(
    (variety) => variety.is_default === true,
  );
  const selectedVariety =
    form <= 0 ? defaultVariety : payload.varieties[form] ?? defaultVariety;
  return idFromUrl(selectedVariety?.pokemon?.url);
}

export default function PokemonSprite({
  species,
  form = 0,
  isShiny = false,
  size = 48,
  framed = true,
  animated = true,
}: PokemonSpriteProps) {
  const requestKey = `${speciesSlug(species)}:${form}`;
  const [resolution, setResolution] = useState<{
    key: string;
    pokemonId: number | null;
    imageFormat: "gif" | "png";
    imageFailed: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    resolvePokemonId(species, form)
      .then((id) => {
        if (active) {
          setResolution({
            key: requestKey,
            pokemonId: id,
            imageFormat: animated ? "gif" : "png",
            imageFailed: false,
          });
        }
      })
      .catch(() => {
        if (active) {
          setResolution({
            key: requestKey,
            pokemonId: null,
            imageFormat: "png",
            imageFailed: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [animated, form, requestKey, species]);

  const initials = species.slice(0, 2).toUpperCase();
  const currentResolution =
    resolution?.key === requestKey ? resolution : null;
  const pokemonId = currentResolution?.pokemonId ?? null;
  const imageFailed = currentResolution?.imageFailed ?? false;
  const imageFormat = currentResolution?.imageFormat ?? "gif";
  const spriteUrl =
    imageFormat === "gif" && animated
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${isShiny ? "shiny/" : ""}${pokemonId}.gif`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isShiny ? "shiny/" : ""}${pokemonId}.png`;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${
        framed
          ? `rounded-lg ${
              isShiny
                ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                : "border border-zinc-800 bg-zinc-950 text-zinc-500"
            }`
          : "text-zinc-500"
      }`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {(pokemonId === null || imageFailed) && (
        <span className="text-[10px] font-black">{initials}</span>
      )}
      {pokemonId !== null && !imageFailed && (
        <Image
          src={spriteUrl}
          alt=""
          width={size}
          height={size}
          unoptimized
          onError={() => {
            setResolution((current) => {
              if (current?.key !== requestKey) return current;
              if (current.imageFormat === "gif" && animated) {
                return { ...current, imageFormat: "png" };
              }
              return { ...current, imageFailed: true };
            });
          }}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
    </span>
  );
}
