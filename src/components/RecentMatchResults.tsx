import ShowdownReplayLink from "@/components/ShowdownReplayLink";
import type { RecentMatchResult } from "@/lib/supabase/recent-match-results";

export default function RecentMatchResults({ results }: { results: RecentMatchResult[] }) {
  if (results.length === 0) return null;

  return (
    <section
      aria-label="Resultados recientes"
      className="space-y-2 rounded-xl border border-amber-300/25 bg-amber-950/20 p-3"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
        Resultados
      </p>
      <ul className="space-y-2">
        {results.map((result) => (
          <li
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/10 bg-zinc-950/40 px-3 py-2"
            key={`${result.kind}-${result.id}`}
          >
            <p className="min-w-0 text-xs leading-5 text-zinc-200">
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
    </section>
  );
}
