import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import PlayerFilter from "@/components/PlayerFilter";
import PokemonSprite from "@/components/PokemonSprite";
import TrainerSpriteAvatar from "@/components/TrainerSpriteAvatar";
import { getCurrentPlayer } from "@/lib/auth";
import { getSupabaseConfiguration } from "@/lib/supabase/admin";
import { matchesPlayerSearch } from "@/lib/player-search";
import type { PlayerCardData } from "@/lib/supabase/player-data";
import { playerBoxPath } from "@/lib/player-box-path";
import { getPlayersPageData } from "@/lib/supabase/player-data";

export const metadata = {
  title: "Jugadores | EKLOCKE",
  description: "Jugadores, equipos y medallas de Pokémon Consonancia.",
};

const teamPositions = Array.from({ length: 6 }, (_, index) => index + 1);

function brightenColor(color: string) {
  const channels = color.slice(1).match(/.{2}/g);
  if (!channels) return color;
  return `#${channels
    .map((channel) =>
    Math.round(parseInt(channel, 16) * 0.68 + 255 * 0.32)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function PlayerCard({
  player,
  isCurrentPlayer,
}: {
  player: PlayerCardData;
  isCurrentPlayer: boolean;
}) {
  const pokemonByPosition = new Map(
    player.team.map((pokemon) => [pokemon.position, pokemon]),
  );
  const accentColor = isCurrentPlayer
    ? brightenColor(player.color)
    : player.color;

  return (
    <Link
      href={playerBoxPath(player.username)}
      className="group block rounded-xl transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
    >
      <article
        className={`h-full overflow-hidden rounded-xl border border-zinc-800 border-l-4 transition group-hover:border-cyan-300/30 ${
          isCurrentPlayer
            ? "border-cyan-300/30 bg-cyan-950/30 shadow-lg shadow-cyan-950/40"
            : "bg-slate-950/75"
        }`}
        style={{ borderLeftColor: accentColor }}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {player.trainerSprite ? (
              <span className="flex h-16 w-14 shrink-0 items-center justify-center" aria-hidden="true">
                <TrainerSpriteAvatar name={player.trainerSprite} size={64} />
              </span>
            ) : (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-zinc-800 text-sm font-black text-white"
                style={{ borderColor: accentColor }}
                aria-hidden="true"
              >
                {(player.gameTrainerName || player.displayName)
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3
                  className="truncate font-semibold"
                  style={{ color: player.color }}
                >
                  {player.gameTrainerName || player.displayName}
                </h3>
                <span
                  className={`inline-flex shrink-0 rounded-sm border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                    player.challengeMode === "BELLELOKE"
                      ? "border-violet-300/30 bg-violet-400/10 text-violet-200"
                      : "border-red-300/30 bg-red-400/10 text-red-200"
                  }`}
                >
                  {player.challengeMode}
                </span>
              </div>
              <p className="truncate text-xs text-zinc-500">@{player.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {player.isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-950/35 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-200">
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                En directo
              </span>
            )}
            <span className="hidden text-xs font-semibold text-cyan-300 opacity-0 transition group-hover:opacity-100 sm:inline">
              Ver caja →
            </span>
          </div>
        </header>

        <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section aria-label={`Medallas de ${player.gameTrainerName || player.displayName}`}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                Medallas
              </h4>
              <span className="text-xs text-zinc-500">
                {player.medals.filter((medal) => medal.earned).length} /{" "}
                {player.medals.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {player.medals.map((medal) => (
                <span
                  key={medal.id}
                  title={medal.name}
                  aria-label={`${medal.name}: ${medal.earned ? "obtenida" : "pendiente"}`}
                  className={`medal-slot flex h-10 w-10 items-center justify-center rounded-full border ${
                    medal.earned
                      ? "medal-slot-earned border-amber-300/40 bg-amber-400/15"
                      : "border-zinc-700 bg-zinc-950"
                  }`}
                >
                  <Image
                    src={`/medals/medal-clean-${medal.id}.png`}
                    alt=""
                    width={40}
                    height={40}
                    aria-hidden="true"
                    className={medal.earned ? "relative z-10" : ""}
                    style={medal.earned ? undefined : { filter: "brightness(0)" }}
                  />
                </span>
              ))}
            </div>
          </section>

          <section aria-label={`Equipo de ${player.gameTrainerName || player.displayName}`}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                Equipo
              </h4>
              <span className="text-xs text-zinc-500">
                {player.team.length} / 6
              </span>
            </div>
            <ol className="grid grid-cols-3 gap-2">
              {teamPositions.map((position) => {
                const pokemon = pokemonByPosition.get(position);

                return (
                  <li
                    className={`flex aspect-square min-w-0 flex-col items-center justify-center gap-0 rounded-lg border p-0 text-center ${
                      pokemon
                        ? "border-teal-500/20 bg-teal-950/30"
                        : "border-dashed border-zinc-800 bg-zinc-950/60"
                    }`}
                    key={position}
                    aria-label={
                      pokemon
                        ? `Posición ${position}: ${pokemon.nickname || pokemon.species}`
                        : `Posición ${position} vacía`
                    }
                    title={
                      pokemon
                        ? pokemon.species
                        : undefined
                    }
                  >
                    {pokemon ? (
                      <>
                        <PokemonSprite
                          species={pokemon.species}
                          form={pokemon.form}
                          isShiny={pokemon.isShiny}
                          size={112}
                          framed={false}
                        />
                        <span className="max-w-full truncate text-[10px] font-semibold text-zinc-200">
                          {pokemon.nickname || pokemon.species}
                        </span>
                        {pokemon.nickname && (
                          <span className="max-w-full truncate text-[9px] text-zinc-500">
                            {pokemon.species}
                          </span>
                        )}
                        {pokemon.isShiny && (
                          <span className="text-[9px] text-amber-300" aria-label="Shiny">
                            ✦
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] font-medium text-zinc-700">
                        {position}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </article>
    </Link>
  );
}

async function PlayersContent({ query }: { query: string }) {
  await connection();
  const [data, currentPlayer] = await Promise.all([
    getPlayersPageData(),
    getSupabaseConfiguration().status === "configured"
      ? getCurrentPlayer()
      : Promise.resolve(null),
  ]);
  const players = data.status === "ready"
    ? [...data.players].sort((left, right) => {
        const leftIsCurrentPlayer = left.id === currentPlayer?.id;
        const rightIsCurrentPlayer = right.id === currentPlayer?.id;
        if (leftIsCurrentPlayer !== rightIsCurrentPlayer) {
          return leftIsCurrentPlayer ? -1 : 1;
        }
        if (left.isLive !== right.isLive) return left.isLive ? -1 : 1;
        return (left.gameTrainerName || left.displayName).localeCompare(
          right.gameTrainerName || right.displayName,
          "es",
          { sensitivity: "base" },
        );
      })
    : [];
  const filteredPlayers = query
    ? players.filter((player) =>
        matchesPlayerSearch(query, [
          player.gameTrainerName,
          player.displayName,
          player.username,
        ]),
      )
    : players;

  return (
    <div className="space-y-6">
      <section>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Eklocke · Comunidad
          </p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">
            Jugadores
          </h1>
          <p className="text-sm text-zinc-400">
            Equipos, Pokémon y medallas de la partida.
          </p>
          {data.status === "ready" && data.twitchStatus === "not-configured" && (
            <p className="text-xs text-zinc-500">
              El estado de Twitch aparecerá cuando se configuren las credenciales de la integración.
            </p>
          )}
          {data.status === "ready" && data.twitchStatus === "error" && (
            <p className="text-xs text-amber-200" role="status">
              No se pudo comprobar en este momento quién está en directo en Twitch.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="player-list-heading">
        <h2
          id="player-list-heading"
          className="text-sm font-bold uppercase tracking-wide text-zinc-400"
        >
          Lista de jugadores
        </h2>

        {data.status === "ready" && players.length > 0 && (
          <div className="space-y-4">
            <PlayerFilter
              players={players.map((player) => ({
                id: player.id,
                name: player.gameTrainerName || player.displayName,
              }))}
              query={query}
              resetHref="/jugadores"
            />
            {filteredPlayers.length > 0 ? (
              <>
                {query && (
                  <p className="text-xs text-zinc-500">
                    {filteredPlayers.length} de {players.length} jugadores
                  </p>
                )}
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredPlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      isCurrentPlayer={player.id === currentPlayer?.id}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-8 text-center text-sm text-zinc-400">
                No hay jugadores que coincidan con «{query}».
              </p>
            )}
          </div>
        )}

        {data.status === "ready" && players.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-8 text-center">
            <span
              className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-lg text-zinc-500"
              aria-hidden="true"
            >
              ◉
            </span>
            <p className="text-sm font-semibold text-zinc-300">
              Aún no hay jugadores registrados
            </p>
          </div>
        ) : data.status !== "ready" ? (
          <div
            className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-5 py-6 text-center"
            role="alert"
          >
            <p className="text-sm font-semibold text-rose-100">
              No se pudieron cargar los jugadores
            </p>
            {data.status === "not-configured" && (
              <p className="mt-2 text-xs text-zinc-400">
                Faltan variables de servidor: {data.missingVariables.join(", ")}.
              </p>
            )}
            {data.status === "error" && (
              <p className="mt-2 text-xs text-zinc-400">
                Revisa la conexión y el esquema de Supabase.
              </p>
            )}
          </div>
        ) : null}
      </section>

    </div>
  );
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = typeof params.player === "string" ? params.player.trim() : "";

  return <PlayersContent query={query} />;
}
