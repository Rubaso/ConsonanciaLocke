"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { normalizePlayerSearchText } from "@/lib/player-search";

export type PlayerFilterOption = {
  id: string;
  name: string;
  searchValues?: string[];
  secondaryLabel?: string;
};

export default function PlayerFilter({
  players,
  query,
  resetHref,
}: {
  players: PlayerFilterOption[];
  query: string;
  resetHref: string;
}) {
  const [value, setValue] = useState(query);
  const [isOpen, setIsOpen] = useState(false);
  const suggestions = useMemo(() => {
    const normalizedValue = normalizePlayerSearchText(value);
    if (!normalizedValue) return players;

    return players.filter((player) =>
      [player.name, ...(player.searchValues ?? [])].some((value) =>
        normalizePlayerSearchText(value).includes(normalizedValue),
      ),
    );
  }, [players, value]);

  return (
    <form
      action={resetHref}
      className="flex items-end gap-2"
      method="get"
    >
      <div className="relative min-w-0 max-w-sm flex-1">
        <label
          className="mb-1 block text-[11px] font-semibold text-zinc-400"
          htmlFor="player-filter"
        >
          Jugador
        </label>
        <input
          autoComplete="off"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-400"
          id="player-filter"
          name="player"
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setValue(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Escribe para buscar..."
          type="search"
          value={value}
        />
        {isOpen && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl shadow-black/40">
            {suggestions.map((player) => (
              <li key={player.id}>
                <Link
                  className="block rounded-md px-3 py-2 text-sm text-zinc-200 transition hover:bg-cyan-950/70 hover:text-cyan-100 focus-visible:bg-cyan-950/70 focus-visible:outline-none"
                  href={`${resetHref}?player=${encodeURIComponent(player.name)}`}
                  onClick={() => setIsOpen(false)}
                >
                  <span>{player.name}</span>
                  {player.secondaryLabel && (
                    <span className="ml-2 text-xs text-zinc-500">
                      {player.secondaryLabel}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          className="rounded-lg border border-cyan-400/30 bg-cyan-950/50 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-900/60"
          type="submit"
        >
          Buscar
        </button>
        {value && (
          <Link
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            href={resetHref}
            onClick={() => setValue("")}
          >
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
