"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import PokemonSprite from "@/components/PokemonSprite";
import type {
  FishingContestStanding,
  FishingEligiblePokemon,
} from "@/lib/fishing-contest-types";

export default function FishingContestPicker({
  eligiblePokemon,
  currentEntry,
}: {
  eligiblePokemon: FishingEligiblePokemon[];
  currentEntry: FishingContestStanding | null;
}) {
  const router = useRouter();
  const [pokemonId, setPokemonId] = useState(currentEntry?.pokemonId ?? "");
  const [chosenSpecies, setChosenSpecies] = useState(
    currentEntry?.chosenSpecies ?? "",
  );
  const [clipUrl, setClipUrl] = useState(currentEntry?.clipUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = useMemo(
    () => eligiblePokemon.find((pokemon) => pokemon.id === pokemonId) ?? null,
    [eligiblePokemon, pokemonId],
  );

  function selectPokemon(nextId: string) {
    setPokemonId(nextId);
    const next = eligiblePokemon.find((pokemon) => pokemon.id === nextId);
    if (!next) return;
    const keepCurrent = next.choices.some(
      (choice) => choice.species === chosenSpecies,
    );
    if (!keepCurrent) {
      setChosenSpecies(next.choices[0]?.species ?? "");
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/player/fishing-contest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pokemonId, chosenSpecies, clipUrl }),
      });
      const result: unknown = await response.json();
      const payload =
        typeof result === "object" && result !== null && !Array.isArray(result)
          ? (result as { error?: string })
          : {};
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo guardar tu pesca.");
      }
      setNotice("Pesca guardada. Puedes cambiarla mientras el concurso siga activo.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar tu pesca.");
    } finally {
      setBusy(false);
    }
  }

  if (eligiblePokemon.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-8 text-center text-sm text-zinc-500">
        No tienes Pokémon salvajes en el equipo o las cajas. Importa tu save y
        vuelve a intentarlo.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {eligiblePokemon.map((pokemon) => {
          const active = pokemon.id === pokemonId;
          return (
            <button
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-cyan-300/60 bg-cyan-950/40"
                  : "border-zinc-800 bg-zinc-950/70 hover:border-cyan-300/30"
              }`}
              key={pokemon.id}
              onClick={() => selectPokemon(pokemon.id)}
              type="button"
            >
              <span className="flex items-center gap-3">
                <PokemonSprite
                  species={pokemon.species}
                  form={pokemon.form}
                  isShiny={pokemon.isShiny}
                  size={56}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-zinc-100">
                    {pokemon.nickname || pokemon.species}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {pokemon.species}
                    {pokemon.level ? ` · Nv. ${pokemon.level}` : ""}
                    {pokemon.teamPosition ? " · Equipo" : " · Caja"}
                  </span>
                  {pokemon.originName && (
                    <span className="mt-0.5 block text-[11px] text-zinc-600">
                      {pokemon.originName}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <section className="space-y-3 rounded-xl border border-cyan-300/20 bg-slate-950/70 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Especie que pesas
          </p>
          <p className="text-sm text-zinc-400">
            Si evolucionó, puedes inscribir una preevolución. El ranking usa el
            peso oficial de esa especie.
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.choices.map((choice) => {
              const active = choice.species === chosenSpecies;
              return (
                <button
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-cyan-300 bg-cyan-300 text-slate-950"
                      : "border-zinc-700 text-zinc-200 hover:border-cyan-300/50"
                  }`}
                  key={choice.species}
                  onClick={() => setChosenSpecies(choice.species)}
                  type="button"
                >
                  {choice.displayName}
                  <span className={`ml-2 text-xs ${active ? "text-slate-800" : "text-zinc-500"}`}>
                    {choice.weightKg.toLocaleString("es-ES", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    kg
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-zinc-200">
          Sube aquí tu clip. (Clip de Twitch/YouTube/Discord/un gif, lo que sea pero que se vea la pesca)
        </span>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
          onChange={(event) => setClipUrl(event.target.value)}
          placeholder="https://"
          required
          type="url"
          value={clipUrl}
        />
      </label>

      <button
        className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
        disabled={busy || !pokemonId || !chosenSpecies || !clipUrl.trim()}
        onClick={() => void submit()}
        type="button"
      >
        {busy ? "Guardando…" : currentEntry ? "Actualizar mi pesca" : "Confirmar mi pesca"}
      </button>
      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-teal-200" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
