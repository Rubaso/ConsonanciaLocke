import { connection } from "next/server";
import AbilityTooltip from "@/components/AbilityTooltip";
import PlayerFilter from "@/components/PlayerFilter";
import PokemonSprite from "@/components/PokemonSprite";
import { matchesPlayerSearch } from "@/lib/player-search";
import type { RouteCapture } from "@/lib/supabase/route-data";
import { ROUTE_STAGES } from "@/lib/stage-catalog";
import { getStagePageData } from "@/lib/supabase/route-data";

export const metadata = {
  title: "Tramos | EKLOCKE",
  description: "Pokémon vivos y caídos organizados por tramo de Consonancia.",
};

function statusLabel(status: RouteCapture["status"]) {
  switch (status) {
    case "alive":
      return "Vivo";
    case "dead":
      return "Caído";
    case "traded":
      return "Intercambiado";
    case "released":
      return "Liberado";
  }
}

function PokemonRow({
  pokemon,
  sourceLabel,
}: {
  pokemon: RouteCapture;
  sourceLabel?: string;
}) {
  const source = sourceLabel ?? pokemon.routeName;
  const captureName = pokemon.nickname || pokemon.species;

  return (
    <li
      className={`relative flex w-24 shrink-0 flex-col items-center rounded-lg border p-2 text-center ${
        pokemon.status === "dead"
          ? "border-rose-900/70 bg-rose-950/20"
          : pokemon.status === "alive"
            ? "border-zinc-700 bg-slate-950/80"
            : "border-violet-900/70 bg-violet-950/20"
      }`}
      title={`${captureName}${pokemon.nickname ? ` (${pokemon.species})` : ""} · ${pokemon.playerName} · ${source}${pokemon.originMapId !== null ? ` · mapa ${pokemon.originMapId}` : ""} · ${statusLabel(pokemon.status)}`}
    >
      {pokemon.isShiny && (
        <span
          className="absolute right-1.5 top-1 text-amber-300"
          aria-label="Variocolor"
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
        {pokemon.nickname || pokemon.playerName}
      </p>
      {pokemon.nickname && (
        <p className="w-full truncate text-[9px] text-zinc-500">
          {pokemon.playerName}
        </p>
      )}
      <AbilityTooltip ability={pokemon.ability} />
      <p
        className={`mt-1 line-clamp-2 min-h-7 w-full text-[9px] leading-3 ${
          sourceLabel ? "text-violet-300/80" : "text-zinc-600"
        }`}
      >
        {source}
      </p>
    </li>
  );
}

function PokemonRows({
  heading,
  captures,
  sourceLabels,
}: {
  heading: string;
  captures: readonly RouteCapture[];
  sourceLabels: ReadonlyMap<string, string>;
}) {
  return (
    <section aria-label={heading}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
        {heading} <span className="text-zinc-600">· {captures.length}</span>
      </h3>
      {captures.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {captures.map((pokemon) => (
            <PokemonRow
              key={pokemon.id}
              pokemon={pokemon}
              sourceLabel={sourceLabels.get(pokemon.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-xs text-zinc-600">
          Ningún Pokémon en esta categoría.
        </p>
      )}
    </section>
  );
}

function getSpecialSourceLabels(
  captures: readonly RouteCapture[],
  centerRouteId: number | undefined,
) {
  const labels = new Map<string, string>();
  if (centerRouteId === undefined) return labels;

  for (const [obtainMethod, label] of [
    [2, "Intercambio prodigioso"],
    [null, "Gachapon"],
  ] as const) {
    const matchingCaptures = captures.filter(
      (pokemon) =>
        pokemon.routeId === centerRouteId &&
        (obtainMethod === null ? pokemon.obtainMethod !== 2 : pokemon.obtainMethod === obtainMethod),
    );
    const mapIds = [
      ...new Set(
        matchingCaptures.flatMap((pokemon) =>
          pokemon.originMapId === null ? [] : [pokemon.originMapId],
        ),
      ),
    ].sort((left, right) => left - right);
    const mapOrder = new Map(mapIds.map((mapId, index) => [mapId, index + 1]));

    for (const pokemon of matchingCaptures) {
      const number =
        pokemon.originMapId === null
          ? null
          : mapOrder.get(pokemon.originMapId);
      labels.set(
        pokemon.id,
        number === null || number === undefined
          ? `${label} · mapa sin identificar`
          : `${label} ${number}`,
      );
    }
  }

  return labels;
}

async function StagesContent({ query }: { query: string }) {
  await connection();
  const data = await getStagePageData();

  if (data.status !== "ready") {
    return (
      <div className="space-y-6">
        <StagesHeader />
        <section
          className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-5 py-6"
          role={data.status === "not-configured" ? "status" : "alert"}
        >
          <h2 className="font-bold text-rose-100">
            No se pudieron cargar los Pokémon de los tramos
          </h2>
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
      </div>
    );
  }

  const centerRoute = data.routes.find((route) => route.name === "Centro Pokémon");
  const listedRoutes = data.routes.filter(
    (route) => route.name !== "Centro Pokémon",
  );
  const selectedPlayer =
    query
      ? data.players.find((player) =>
          matchesPlayerSearch(query, [
            player.gameTrainerName,
            player.displayName,
            player.username,
          ]),
        )
      : data.players.find((player) =>
          [player.gameTrainerName, player.displayName, player.username].some(
            (value) => value?.toLocaleLowerCase("es").startsWith("zigurath"),
          ),
        );
  const selectedQuery = query || selectedPlayer?.gameTrainerName || selectedPlayer?.displayName || "";
  const captures = selectedPlayer
    ? data.captures.filter((pokemon) => pokemon.playerId === selectedPlayer.id)
    : [];
  const assignedCaptureIds = new Set<string>();
  const renderedStages = ROUTE_STAGES.map((stage) => {
    const stageCaptures = captures
      .filter(
        (pokemon) =>
          pokemon.originMapId !== null &&
          pokemon.originMapId >= stage.minMapId &&
          pokemon.originMapId <= stage.maxMapId,
      )
      .sort(
        (left, right) =>
          (left.status === "alive" ? 0 : left.status === "dead" ? 1 : 2) -
            (right.status === "alive" ? 0 : right.status === "dead" ? 1 : 2) ||
          (left.originMapId ?? 0) - (right.originMapId ?? 0) ||
          left.species.localeCompare(right.species, "es") ||
          left.playerName.localeCompare(right.playerName, "es"),
      );
    for (const pokemon of stageCaptures) assignedCaptureIds.add(pokemon.id);

    const routes = listedRoutes
      .filter((route) =>
        route.mapIds.some(
          (mapId) => mapId >= stage.minMapId && mapId <= stage.maxMapId,
        ),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const alive = stageCaptures.filter((pokemon) => pokemon.status === "alive");
    const dead = stageCaptures.filter((pokemon) => pokemon.status === "dead");
    const otherStatuses = stageCaptures.filter(
      (pokemon) => pokemon.status !== "alive" && pokemon.status !== "dead",
    );
    const sourceLabels = getSpecialSourceLabels(stageCaptures, centerRoute?.id);

    return {
      stage,
      captures: stageCaptures,
      routes,
      alive,
      dead,
      otherStatuses,
      sourceLabels,
    };
  });
  const visibleStages = query
    ? renderedStages.filter(({ captures: stageCaptures }) => stageCaptures.length > 0)
    : renderedStages;
  const unassignedCaptures = captures.filter(
    (pokemon) => !assignedCaptureIds.has(pokemon.id),
  );
  const unassignedSourceLabels = getSpecialSourceLabels(
    unassignedCaptures,
    centerRoute?.id,
  );

  return (
    <div className="space-y-6">
      <StagesHeader />

      <PlayerFilter
        players={data.players.map((player) => ({
          id: player.id,
          name: player.gameTrainerName || player.displayName,
          searchValues: [player.displayName, player.username],
          secondaryLabel: `@${player.username}`,
        }))}
        query={selectedQuery}
        resetHref="/tramos"
      />

      {captures.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-5 py-8 text-center text-sm text-zinc-400">
          {selectedPlayer
            ? `${selectedPlayer.gameTrainerName || selectedPlayer.displayName} todavía no tiene Pokémon registrados.`
            : query
              ? `No se encontró ningún jugador que coincida con «${query}».`
              : "No se encontró el jugador Zigurath."}
        </p>
      ) : (
      <ol className="space-y-4">
        {visibleStages.map(({ stage, routes, alive, dead, otherStatuses, sourceLabels }) => (
          <li
            key={stage.number}
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/10 text-lg font-black text-amber-200">
                  {stage.number}
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Tramo {stage.number}
                  </p>
                  <h2 className="text-base font-bold text-zinc-100">
                    {stage.label}
                  </h2>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                <span className="text-emerald-200">{alive.length} vivos</span>
                <span className="mx-2 text-zinc-700">·</span>
                <span className="text-rose-200">{dead.length} caídos</span>
              </p>
            </header>

            <div className="space-y-5 p-4">
              <section aria-label={`Zonas del tramo ${stage.number}`}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Zonas
                </h3>
                {routes.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {routes.map((route) => (
                      <li
                        key={route.id}
                        className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300"
                      >
                        {route.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-zinc-600">
                    No hay zonas registradas en este tramo.
                  </p>
                )}
              </section>

              <section
                aria-label={`Pokémon del tramo ${stage.number}`}
                className="space-y-4 border-t border-zinc-800 pt-4"
              >
                <PokemonRows
                  heading="Vivos"
                  captures={alive}
                  sourceLabels={sourceLabels}
                />
                <PokemonRows
                  heading="Caídos"
                  captures={dead}
                  sourceLabels={sourceLabels}
                />
                {otherStatuses.length > 0 && (
                  <PokemonRows
                    heading="Intercambiados o liberados"
                    captures={otherStatuses}
                    sourceLabels={sourceLabels}
                  />
                )}
              </section>
            </div>
          </li>
        ))}
      </ol>
      )}

      {unassignedCaptures.length > 0 && (
        <section className="space-y-3" aria-labelledby="unassigned-heading">
          <div>
            <h2
              id="unassigned-heading"
              className="text-sm font-bold uppercase tracking-wide text-zinc-400"
            >
              Pokémon fuera de los tramos
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Incluye los que no tienen mapa de origen o proceden de mapas posteriores a la liga.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {unassignedCaptures.map((pokemon) => (
              <PokemonRow
                key={pokemon.id}
                pokemon={pokemon}
                sourceLabel={unassignedSourceLabels.get(pokemon.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StagesHeader() {
  return (
    <section className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        eklocke · Progreso
      </p>
      <h1 className="text-3xl font-black tracking-tight text-zinc-100">
        Tramos
      </h1>
    </section>
  );
}

export default async function StagesPage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = typeof params.player === "string" ? params.player.trim() : "";

  return <StagesContent query={query} />;
}
