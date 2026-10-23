import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import AbilityTooltip from "@/components/AbilityTooltip";
import PokemonSprite from "@/components/PokemonSprite";
import {
  getPlayerBoxPageData,
  type PlayerBoxPokemon,
} from "@/lib/supabase/player-data";

export const metadata = {
  title: "Caja del jugador | EKLOCKE",
  description: "Pokémon del jugador en Pokémon Consonancia.",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function PokemonCard({ pokemon }: { pokemon: PlayerBoxPokemon }) {
  return (
    <li
      className={`relative flex w-24 shrink-0 flex-col items-center rounded-lg border p-2 text-center ${
        pokemon.status === "dead"
          ? "border-rose-900/70 bg-rose-950/20"
          : "border-zinc-700 bg-slate-950/80"
      }`}
      title={`${pokemon.nickname || pokemon.species}${pokemon.ability ? ` · HAB. ${pokemon.ability}` : ""}`}
    >
      {pokemon.isShiny && (
        <span
          className="absolute right-1.5 top-1 text-amber-300"
          aria-label="Pokémon variocolor"
          title="Variocolor"
        >
          ✦
        </span>
      )}
      <div className="flex h-[76px] items-center justify-center">
        <PokemonSprite
          species={pokemon.species}
          form={pokemon.form}
          isShiny={pokemon.isShiny}
          size={72}
          framed={false}
        />
      </div>
      <p className="w-full truncate text-[11px] font-semibold text-zinc-100">
        {pokemon.species.toLowerCase()}
      </p>
      <p className="w-full truncate text-[10px] text-zinc-400">
        {pokemon.nickname || pokemon.species}
      </p>
      <AbilityTooltip ability={pokemon.ability} />
    </li>
  );
}

function PokemonSection({
  title,
  pokemon,
  status,
}: {
  title: string;
  pokemon: PlayerBoxPokemon[];
  status: PlayerBoxPokemon["status"];
}) {
  return (
    <section aria-label={title}>
      <h2
        className={`mb-2 text-xs font-black uppercase tracking-wide ${
          status === "dead" ? "text-rose-400" : "text-teal-300"
        }`}
      >
        {title} <span className="text-zinc-500">{pokemon.length}</span>
      </h2>
      {pokemon.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {pokemon.map((entry) => (
            <PokemonCard key={entry.id} pokemon={entry} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-600">Ningún Pokémon en esta categoría.</p>
      )}
    </section>
  );
}

async function PlayerBoxContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const data = await getPlayerBoxPageData(id);
  if (data.status === "not-found") notFound();

  if (data.status !== "ready") {
    return (
      <main className="space-y-5">
        <Link
          href="/jugadores"
          className="inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        >
          ← Volver a jugadores
        </Link>
        <section
          className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-5 py-6"
          role="alert"
        >
          <h1 className="font-bold text-rose-100">
            No se pudo cargar la caja
          </h1>
          {data.status === "not-configured" ? (
            <p className="mt-2 text-sm text-zinc-400">
              Faltan variables de servidor: {data.missingVariables.join(", ")}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              Revisa la conexión y el esquema de Supabase.
            </p>
          )}
        </section>
      </main>
    );
  }

  const { player } = data;
  const fallenCount = player.pokemon.filter(
    (pokemon) => pokemon.status === "dead",
  ).length;
  const captures = player.pokemon.filter((pokemon) => pokemon.status === "alive");
  const fallen = player.pokemon.filter((pokemon) => pokemon.status === "dead");
  const otherPokemon = player.pokemon.filter(
    (pokemon) => pokemon.status === "released" || pokemon.status === "traded",
  );

  return (
    <main className="space-y-6">
      <Link
        href="/jugadores"
        className="inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
      >
        ← Volver a jugadores
      </Link>

      <header className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-800 bg-slate-950/75 p-5">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 bg-zinc-900 text-xl font-black text-white"
          style={{ borderColor: player.color }}
          aria-hidden="true"
        >
          {(player.gameTrainerName || player.displayName)
            .slice(0, 1)
            .toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Caja de jugador
          </p>
          <h1
            className="truncate text-2xl font-black"
            style={{ color: player.color }}
          >
            {player.gameTrainerName || player.displayName}
          </h1>
          <p className="text-sm text-zinc-400">@{player.username}</p>
        </div>
        <p className="text-sm text-zinc-400">
          {player.pokemon.length} Pokémon
          {fallenCount > 0 && (
            <span className="ml-2 text-rose-300">· {fallenCount} caídos</span>
          )}
        </p>
      </header>

      {player.pokemon.length > 0 ? (
        <div className="space-y-5">
          {captures.length > 0 && (
            <PokemonSection title="Capturas" pokemon={captures} status="alive" />
          )}
          {fallen.length > 0 && (
            <PokemonSection title="Caídos" pokemon={fallen} status="dead" />
          )}
          {otherPokemon.length > 0 && (
            <section aria-label="Liberados e intercambiados">
              <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-400">
                Liberados e intercambiados <span className="text-zinc-500">{otherPokemon.length}</span>
              </h2>
              <ul className="flex flex-wrap gap-2">
                {otherPokemon.map((pokemon) => (
                  <PokemonCard key={pokemon.id} pokemon={pokemon} />
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-zinc-300">
            Este jugador todavía no tiene Pokémon registrados
          </p>
        </section>
      )}
    </main>
  );
}

export default function PlayerBoxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PlayerBoxContent params={params} />;
}
