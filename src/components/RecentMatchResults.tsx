import ShowdownReplayLink from "@/components/ShowdownReplayLink";
import type { RecentMatchResult } from "@/lib/supabase/recent-match-results";

export default function RecentMatchResults({ results }: { results: RecentMatchResult[] }) {
  return (
    <section
      aria-label="Resultados recientes"
      className="space-y-2 rounded-xl border border-amber-300/35 bg-amber-950/30 p-3"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">
        Resultados
      </p>
      {results.length === 0 ? (
        <p className="text-xs leading-5 text-zinc-400">
          Todavía no hay combates cerrados en los últimos 3 días.
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map((result) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/15 bg-zinc-950/50 px-3 py-2"
              key={`${result.kind}-${result.id}`}
            >
              <p className="min-w-0 text-sm leading-5 text-zinc-100">
                <span className="font-semibold">{result.playerAName}</span>
                {" contra "}
                <span className="font-semibold">{result.playerBName}</span>
                {". Ganó "}
                <span className="font-bold text-amber-100">{result.winnerName}</span>
              </p>
              <ShowdownReplayLink url={result.replayUrl} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
