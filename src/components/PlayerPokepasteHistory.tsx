import type { PlayerPokepasteHistoryEntry } from "@/lib/supabase/player-pokepaste-history";

export default function PlayerPokepasteHistory({
  entries,
}: {
  entries: PlayerPokepasteHistoryEntry[];
}) {
  return (
    <section className="space-y-3 border-t border-zinc-800 pt-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-300">
          Historial de equipos
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Una copia por torneo o equipo, aunque lo hayas usado en varias rondas.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-zinc-500">Todavía no tienes equipos en el historial.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
              key={entry.id}
            >
              <p className="min-w-0 flex-1 text-xs text-zinc-400">
                <strong className="text-zinc-200">{entry.competitionName}</strong>
              </p>
              <a
                className="shrink-0 text-xs font-semibold text-cyan-300 underline decoration-cyan-300/30 underline-offset-2 hover:text-cyan-100"
                href={entry.pokepasteUrl}
                rel="noreferrer"
                target="_blank"
              >
                Abrir equipo
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
