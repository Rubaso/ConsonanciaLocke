"use client";

import { Fragment, useCallback, useRef, useState, type UIEvent } from "react";
import PokemonSprite from "@/components/PokemonSprite";
import type {
  ActivityFilter,
  ActivityEvent,
  ActivityPageData,
} from "@/lib/supabase/activity-data";

const activityDateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});
const activityDayFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "full",
  timeZone: "Europe/Madrid",
});

type ActivityPageResponse = {
  events: ActivityEvent[];
  nextCursor: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isActivityPageResponse(value: unknown): value is ActivityPageResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.events) &&
    value.events.every(
      (event) =>
        isRecord(event) &&
        typeof event.id === "string" &&
        (event.type === "capture" ||
          event.type === "death" ||
          event.type === "status_changed" ||
          event.type === "medal_awarded") &&
        (event.captureSource === "normal" ||
          event.captureSource === "trade" ||
          event.captureSource === "gacha") &&
        typeof event.occurredAt === "string" &&
        typeof event.playerName === "string" &&
        typeof event.playerColor === "string" &&
        (event.pokemonName === null || typeof event.pokemonName === "string") &&
        (event.species === null || typeof event.species === "string") &&
        typeof event.form === "number" &&
        typeof event.isShiny === "boolean" &&
        (event.location === null || typeof event.location === "string") &&
        (event.medalName === null || typeof event.medalName === "string") &&
        (event.statusFrom === null || typeof event.statusFrom === "string") &&
        (event.statusTo === null || typeof event.statusTo === "string"),
    ) &&
    (value.nextCursor === null || typeof value.nextCursor === "string")
  );
}

function statusName(status: string) {
  switch (status) {
    case "alive":
      return "vivo";
    case "dead":
      return "caído";
    case "released":
      return "liberado";
    case "traded":
      return "intercambiado";
    default:
      return status;
  }
}

function formatActivityEvent(event: ActivityEvent) {
  switch (event.type) {
    case "capture":
      return {
        icon: "↗",
        label:
          event.captureSource === "trade"
            ? "INTERCAMBIO"
            : event.captureSource === "gacha"
              ? "GACHA"
              : "",
        description: (
          <>
            <strong className="font-semibold text-teal-300">
              {event.playerName}
            </strong>{" "}
            {event.captureSource === "trade"
              ? "recibió a"
              : event.captureSource === "gacha"
                ? "obtuvo en Gacha a"
                : "capturó a"}{" "}
            <strong className="font-semibold text-zinc-200">
              {event.pokemonName ?? "Pokémon"}
            </strong>
          </>
        ),
      };
    case "death":
      return {
        icon: "✕",
        label: "BAJA",
        description: (
          <>
            <strong className="font-semibold text-teal-300">
              {event.playerName}
            </strong>
            {" perdió a "}
            <strong className="font-semibold text-rose-200">
              {event.pokemonName ?? "Pokémon"}
            </strong>
          </>
        ),
      };
    case "status_changed":
      return {
        icon: "↔",
        label: "Cambio de estado",
        description: (
          <>
            <strong className="font-semibold text-zinc-200">
              {event.pokemonName ?? "Pokémon"}
            </strong>{" "}
            de{" "}
            <strong className="font-semibold" style={{ color: event.playerColor }}>
              {event.playerName}
            </strong>{" "}
            cambió de estado
            {event.statusFrom && event.statusTo
              ? ` (${statusName(event.statusFrom)} → ${statusName(event.statusTo)})`
              : ""}
          </>
        ),
      };
    case "medal_awarded":
      return {
        icon: "✦",
        label: "Medalla",
        description: (
          <>
            <strong className="font-semibold" style={{ color: event.playerColor }}>
              {event.playerName}
            </strong>{" "}
            consiguió {event.medalName ?? "una medalla"}
          </>
        ),
      };
  }
}

function ActivityEventRow({ event }: { event: ActivityEvent }) {
  const presentation = formatActivityEvent(event);
  const eventAccent =
    event.type === "death"
      ? "border-l-2 border-l-rose-400 bg-rose-950/45"
        : event.type === "medal_awarded"
          ? "border-l-2 border-l-amber-400/70 bg-amber-950/25"
          : event.isShiny
            ? "border-l-2 border-l-sky-400/70 bg-sky-950/20"
            : "border-l-2 border-l-transparent";
  const labelTone =
      event.type === "death"
        ? "text-rose-300"
        : event.isShiny
          ? "text-sky-300"
          : event.type === "medal_awarded"
            ? "text-amber-300"
            : event.captureSource === "trade"
              ? "text-violet-300"
              : event.captureSource === "gacha"
                ? "text-fuchsia-300"
            : "text-zinc-500";

  const metadata = [
    event.location &&
    (event.type === "death" ||
      (event.type === "capture" && event.captureSource === "normal"))
      ? event.location
      : null,
    activityDateFormatter.format(new Date(event.occurredAt)),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 ${eventAccent}`}>
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center ${
          event.type === "death"
            ? "text-rose-300"
            : event.isShiny
              ? "text-sky-300"
              : event.type === "medal_awarded"
                ? "text-amber-300"
                : "text-teal-300"
        }`}
        aria-hidden="true"
      >
        {event.species ? (
          <PokemonSprite
            species={event.species}
            form={event.form}
            isShiny={event.isShiny}
            size={48}
            framed={false}
          />
        ) : (
          presentation.icon
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-[15px] leading-5 text-zinc-300">
          {presentation.label && (
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-black leading-4 tracking-wide ${labelTone} ${
                event.type === "death"
                  ? "bg-rose-400/15"
                  : event.captureSource === "trade"
                    ? "bg-violet-400/15"
                    : event.captureSource === "gacha"
                      ? "bg-fuchsia-400/15"
                      : ""
              }`}
            >
              {presentation.label}
            </span>
          )}
          <span>{presentation.description}</span>
        </p>
        {metadata && (
        <time
          className="mt-0.5 block truncate text-xs leading-4 text-zinc-500"
          dateTime={event.occurredAt}
        >
          {metadata}
        </time>
        )}
      </div>
    </li>
  );
}

function getErrorMessage(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "No se pudo cargar más actividad.";
}

function isActivityFilter(value: string): value is ActivityFilter {
  return (
    value === "all" ||
    value === "capture" ||
    value === "death" ||
    value === "medal" ||
    value === "trade" ||
    value === "gacha" ||
    value === "shiny"
  );
}

export default function ActivityFeed({
  initialData,
}: {
  initialData: Extract<ActivityPageData, { status: "ready" }>;
}) {
  const [events, setEvents] = useState(initialData.events);
  const [nextCursor, setNextCursor] = useState(initialData.nextCursor);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (selectedFilter: ActivityFilter, cursor?: string) => {
      const searchParams = new URLSearchParams({ filter: selectedFilter });
      if (cursor) searchParams.set("cursor", cursor);
      return fetch(`/api/activity?${searchParams.toString()}`, {
        cache: "no-store",
      });
    },
    [],
  );

  const updateFilters = useCallback(
    async (selectedFilter: ActivityFilter) => {
      const requestId = ++requestIdRef.current;
      loadingRef.current = true;
      setLoading(true);
      setError("");
      setEvents([]);
      setNextCursor(null);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;

      try {
        const response = await fetchPage(selectedFilter);
        const result: unknown = await response.json();
        if (requestId !== requestIdRef.current) return;
        if (!response.ok) {
          setError(getErrorMessage(result));
          return;
        }
        if (!isActivityPageResponse(result)) {
          setError("El servidor respondió con datos de actividad no válidos.");
          return;
        }

        setEvents(result.events);
        setNextCursor(result.nextCursor);
      } catch {
        if (requestId === requestIdRef.current) {
          setError("No se pudo conectar con el servidor. Prueba otra vez.");
        }
      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [fetchPage],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return;
    const requestId = requestIdRef.current;
    loadingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetchPage(filter, nextCursor);
      const result: unknown = await response.json();
      if (requestId !== requestIdRef.current) return;
      if (!response.ok) {
        setError(getErrorMessage(result));
        return;
      }
      if (!isActivityPageResponse(result)) {
        setError("El servidor respondió con datos de actividad no válidos.");
        return;
      }

      setEvents((current) => [...current, ...result.events]);
      setNextCursor(result.nextCursor);
    } catch {
      if (requestId === requestIdRef.current) {
        setError("No se pudo conectar con el servidor. Prueba otra vez.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [fetchPage, filter, nextCursor]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 180) {
      void loadMore();
    }
  }

  return (
    <section aria-labelledby="activity-heading">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div>
          <h2
            id="activity-heading"
            className="text-sm font-bold uppercase tracking-wide text-zinc-300"
          >
            Actividad
          </h2>
          <p className="mt-1 text-[10px] text-zinc-600">
            Del día más reciente hacia atrás
          </p>
        </div>
        <ActivityFilters
          filter={filter}
          loading={loading}
          onFilterChange={(nextFilter) => {
            setFilter(nextFilter);
            void updateFilters(nextFilter);
          }}
        />
      </header>
      <div
        ref={scrollRef}
        className="max-h-[42rem] overflow-y-auto overscroll-contain"
        onScroll={handleScroll}
        aria-label="Historial de actividad"
        role="region"
        tabIndex={0}
      >
        {loading && events.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-zinc-500" role="status">
            Cargando actividad…
          </p>
        ) : error && events.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-rose-300" role="alert">
            {error}
          </p>
        ) : events.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            No hay eventos para este filtro.
          </p>
        ) : (
          <ol className="divide-y divide-zinc-800">
            {events.map((event, index) => {
              const dayKey = activityDayFormatter.format(
                new Date(event.occurredAt),
              );
              const previousDayKey =
                index === 0
                  ? null
                  : activityDayFormatter.format(
                      new Date(events[index - 1].occurredAt),
                    );

              return (
                <Fragment key={event.id}>
                  {dayKey !== previousDayKey && (
                    <li className="sticky top-0 z-10 border-y border-zinc-800 bg-zinc-950/95 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 backdrop-blur">
                      {activityDayFormatter.format(new Date(event.occurredAt))}
                    </li>
                  )}
                  <ActivityEventRow event={event} />
                </Fragment>
              );
            })}
          </ol>
        )}
        {(loading || error || nextCursor) && (
          <div className="flex min-h-14 items-center justify-center px-4 py-3">
            {loading ? (
              <p className="text-xs text-zinc-500" role="status">
                Cargando más eventos…
              </p>
            ) : error ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <p className="text-xs text-rose-300" role="alert">
                  {error}
                </p>
                <button
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-100"
                  onClick={() => void loadMore()}
                  type="button"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <button
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                onClick={() => void loadMore()}
                type="button"
              >
                Cargar más eventos
              </button>
            )}
          </div>
        )}
        {!nextCursor && !loading && (
          <p className="px-4 py-4 text-center text-xs text-zinc-600">
            Fin del historial.
          </p>
        )}
      </div>
    </section>
  );
}

function ActivityFilters({
  filter,
  loading,
  onFilterChange,
}: {
  filter: ActivityFilter;
  loading: boolean;
  onFilterChange: (filter: ActivityFilter) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="activity-type-filter">
        Filtrar actividad por tipo
      </label>
      <select
        className="min-w-36 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-cyan-300/50"
        disabled={loading}
        id="activity-type-filter"
        onChange={(event) => {
          if (isActivityFilter(event.target.value)) {
            onFilterChange(event.target.value);
          }
        }}
        value={filter}
      >
        <option value="all">Todos los tipos</option>
        <option value="capture">Capturas</option>
        <option value="death">Bajas</option>
        <option value="medal">Medallas</option>
        <option value="trade">Intercambios</option>
        <option value="gacha">Gacha</option>
        <option value="shiny">Shinys</option>
      </select>
      {loading && (
        <span className="sr-only" role="status">
          Actualizando actividad…
        </span>
      )}
    </div>
  );
}
