"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type BackgroundPokemon = {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
};

function createBackgroundPokemon(): BackgroundPokemon[] {
  const cells = Array.from({ length: 13 }, (_, index) => index);
  const pokemonIds = Array.from({ length: 151 }, (_, index) => index + 1);
  const columns = 4;
  const rows = Math.ceil(cells.length / columns);

  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cells[index], cells[swapIndex]] = [cells[swapIndex], cells[index]];
  }
  for (let index = pokemonIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pokemonIds[index], pokemonIds[swapIndex]] = [
      pokemonIds[swapIndex],
      pokemonIds[index],
    ];
  }

  return cells.map((cell, index) => {
    const column = cell % columns;
    const row = Math.floor(cell / columns);
    return {
      id: pokemonIds[index],
      left: `${(column + 0.15 + Math.random() * 0.7) * (100 / columns)}%`,
      top: `${(row + 0.12 + Math.random() * 0.76) * (100 / rows)}%`,
      size: 56 + Math.floor(Math.random() * 25),
      delay: `${-Math.floor(Math.random() * 40)}s`,
    };
  });
}

export default function AmbientGlyphs() {
  const [pokemon, setPokemon] = useState<BackgroundPokemon[]>([]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPokemon(createBackgroundPokemon());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="ambient-backdrop" aria-hidden="true">
      {pokemon.map((item, index) => (
        <span
          key={item.id}
          className={`ambient-pokemon ambient-pokemon-float-${index % 6}`}
          style={{
            left: item.left,
            top: item.top,
            width: item.size,
            height: item.size,
            animationDelay: item.delay,
          }}
        >
          <Image
            className="ambient-pokemon-sprite"
            src={`/FondoPokes/transparent/${item.id}.png`}
            alt=""
            fill
            sizes={`${item.size}px`}
            loading="eager"
            unoptimized
          />
        </span>
      ))}
    </div>
  );
}
