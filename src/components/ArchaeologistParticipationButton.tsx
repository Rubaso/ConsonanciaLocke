"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { formatPokemonSpeciesName } from "@/lib/pokemon-name";
import PokemonSprite from "@/components/PokemonSprite";

export type ArchaeologistPokemonOption = {
  id: string;
  species: string;
  form: number;
  nickname: string | null;
  isShiny: boolean;
  status: "alive" | "dead";
};

type ArchaeologistParticipationButtonProps = {
  eventName: string;
  initialPokemonId: string;
  isLoggedIn: boolean;
  isOpen: boolean;
  pokemonLoadFailed: boolean;
  pokemonOptions: ArchaeologistPokemonOption[];
};

function responseError(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return "No se pudo guardar tu participación.";
}

export default function ArchaeologistParticipationButton({
  eventName,
  initialPokemonId,
  isLoggedIn,
  isOpen,
  pokemonLoadFailed,
  pokemonOptions,
}: ArchaeologistParticipationButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pokemonId, setPokemonId] = useState(initialPokemonId);
  const [hasSubmission, setHasSubmission] = useState(Boolean(initialPokemonId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submitParticipation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/player/week-two-event", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventSlug: "arqueologo-novato",
          pokemonId,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(payload));
      setHasSubmission(true);
      setNotice("Participación guardada.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar tu participación.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="rounded-lg bg-amber-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={
          !isOpen ||
          (isLoggedIn && (pokemonLoadFailed || pokemonOptions.length === 0))
        }
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {hasSubmission ? "Editar participación" : "Quiero participar"}
      </button>
      {!isOpen && (
        <p className="text-sm text-zinc-400">El plazo de participación terminó.</p>
      )}
      {isOpen && isLoggedIn && !pokemonLoadFailed && pokemonOptions.length === 0 && (
        <p className="mt-2 text-sm text-zinc-300">
          No tienes Pokémon disponibles capturados en Gruta Sisma.
        </p>
      )}
      <dialog
        aria-labelledby="archaeologist-participation-title"
        className="fixed inset-0 m-0 h-dvh w-screen max-w-none bg-transparent p-4 backdrop:bg-black/75"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        ref={dialogRef}
      >
        <div className="flex min-h-full items-center justify-center">
          <section className="w-full max-w-2xl rounded-2xl border border-amber-300/25 bg-[#11131c] p-5 shadow-2xl shadow-black/60">
            <header className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  Participación
                </p>
                <h2
                  className="mt-1 text-lg font-black text-white"
                  id="archaeologist-participation-title"
                >
                  {eventName}
                </h2>
              </div>
              <button
                className="rounded px-2 py-1 text-sm font-semibold text-zinc-300 transition hover:text-white"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                Cerrar
              </button>
            </header>
            {isLoggedIn ? (
              <form className="space-y-4" onSubmit={submitParticipation}>
                {pokemonLoadFailed ? (
                  <p className="text-sm leading-6 text-rose-300" role="alert">
                    No se pudieron cargar tus Pokémon de Gruta Sisma.
                  </p>
                ) : pokemonOptions.length > 0 ? (
                  <fieldset className="space-y-3">
                    <legend className="mb-2 text-sm font-semibold text-zinc-200">
                      Elige el Pokémon capturado en Gruta Sisma
                    </legend>
                    <div className="grid max-h-[50dvh] gap-2 overflow-y-auto sm:grid-cols-2">
                      {pokemonOptions.map((pokemon) => {
                        const speciesName = formatPokemonSpeciesName(pokemon.species);
                        return (
                          <label
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                              pokemonId === pokemon.id
                                ? "border-amber-300/70 bg-amber-300/10"
                                : "border-zinc-700 bg-zinc-950/70 hover:border-zinc-500"
                            }`}
                            key={pokemon.id}
                          >
                            <input
                              checked={pokemonId === pokemon.id}
                              className="accent-amber-300"
                              name="pokemonId"
                              onChange={() => setPokemonId(pokemon.id)}
                              required
                              type="radio"
                              value={pokemon.id}
                            />
                            <PokemonSprite
                              framed
                              form={pokemon.form}
                              isShiny={pokemon.isShiny}
                              size={48}
                              species={pokemon.species}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-white">
                                {pokemon.nickname || speciesName}
                              </span>
                              {pokemon.nickname && (
                                <span className="block truncate text-xs text-zinc-400">
                                  {speciesName}
                                </span>
                              )}
                              {pokemon.status === "dead" && (
                                <span className="block text-[10px] font-bold uppercase tracking-wide text-rose-300">
                                  Muerto
                                </span>
                              )}
                            </span>
                            {pokemon.isShiny && (
                              <span className="ml-auto text-xs text-amber-300" aria-label="Shiny">
                                ✦
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : (
                  <p className="text-sm leading-6 text-zinc-300">
                    No se encontraron Pokémon disponibles capturados en Gruta Sisma.
                  </p>
                )}
                <p className="text-xs leading-5 text-zinc-400">
                  Puedes cambiar tu elección mientras el evento esté abierto.
                </p>
                {error && (
                  <p className="text-sm text-rose-300" role="alert">
                    {error}
                  </p>
                )}
                {notice && (
                  <p className="text-sm text-teal-300" role="status">
                    {notice}
                  </p>
                )}
                <button
                  className="w-full rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-black uppercase text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
                  disabled={busy || pokemonOptions.length === 0 || !pokemonId}
                  type="submit"
                >
                  {busy ? "Guardando…" : "Enviar participación"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-zinc-300">
                  Inicia sesión para elegir tu Pokémon de Gruta Sisma y participar.
                </p>
                <Link
                  className="inline-flex rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-black uppercase text-slate-950 transition hover:bg-amber-200"
                  href="/login"
                >
                  Iniciar sesión
                </Link>
              </div>
            )}
          </section>
        </div>
      </dialog>
    </>
  );
}
