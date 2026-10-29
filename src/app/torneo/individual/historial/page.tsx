import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import MatchReplayEditor from "@/components/MatchReplayEditor";
import ShowdownReplayLink from "@/components/ShowdownReplayLink";
import { getCurrentPlayer } from "@/lib/auth";
import { getIndividualCombatHistoryData } from "@/lib/supabase/competition-history-data";

export const metadata = {
  title: "Historial individual | EKLOCKE",
  description: "Resultados de combates individuales de Pokémon Consonancia.",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeZone: "Europe/Madrid",
});

async function IndividualHistoryContent() {
  await connection();
  const [data, player] = await Promise.all([
    getIndividualCombatHistoryData(),
    getCurrentPlayer().catch(() => null),
  ]);
  if (data.status === "not-configured") {
    return (
      <Notice>
        Faltan variables de servidor para cargar el historial ({data.missingVariables.join(", ")}).
      </Notice>
    );
  }
  if (data.status === "error") {
    return (
      <Notice error>
        No se pudo cargar el historial de combates individuales.
      </Notice>
    );
  }

  const empty = data.matches.length === 0 && data.rounds.length === 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-2">
        <Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-100" href="/torneo/individual">
          ← Combates individuales
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          Individual · Archivo
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Historial individual
        </h1>
      </header>

      {empty ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-10 text-center">
          <p className="text-sm text-zinc-400">Todavía no hay combates individuales terminados.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {data.matches.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-300">
                Combates
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.matches.map((match) => (
                  <article
                    className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                    key={match.id}
                  >
                    <p className="text-sm text-zinc-200">
                      <span className={match.winnerName === match.playerAName ? "font-bold text-amber-100" : ""}>
                        {match.playerAName}
                      </span>
                      <span className="px-2 text-zinc-600">vs</span>
                      <span className={match.winnerName === match.playerBName ? "font-bold text-amber-100" : ""}>
                        {match.playerBName}
                      </span>
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-zinc-500">
                        {match.winnerName ? `Ganador: ${match.winnerName}` : "Sin ganador"}
                        {match.completedAt
                          ? ` · ${dateFormatter.format(new Date(match.completedAt))}`
                          : ""}
                      </p>
                      {player &&
                      (player.role === "organizer" ||
                        player.id === match.playerAId ||
                        player.id === match.playerBId) ? (
                        <MatchReplayEditor compact initialUrl={match.replayUrl} matchId={match.id} />
                      ) : (
                        <ShowdownReplayLink url={match.replayUrl} />
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {data.rounds.map((round) => (
            <article
              className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5"
              key={round.id}
            >
              <header>
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                  Ronda
                </p>
                <h2 className="mt-1 text-lg font-black text-zinc-100">{round.name}</h2>
                {round.archivedAt && (
                  <time className="mt-1 block text-xs text-zinc-500" dateTime={round.archivedAt}>
                    Guardado el {dateFormatter.format(new Date(round.archivedAt))}
                  </time>
                )}
              </header>
              <div className="grid gap-2 sm:grid-cols-2">
                {round.matches.map((match) => (
                  <div
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
                    key={`${match.roundNumber}-${match.matchNumber}`}
                  >
                    <p className="text-sm text-zinc-300">
                      <span className={match.winnerName === match.playerAName ? "font-bold text-amber-100" : ""}>
                        {match.playerAName}
                      </span>
                      <span className="px-2 text-zinc-600">vs</span>
                      <span className={match.winnerName === match.playerBName ? "font-bold text-amber-100" : ""}>
                        {match.playerBName}
                      </span>
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-zinc-500">
                        {match.winnerName ? `Ganador: ${match.winnerName}` : "Sin resultado"}
                      </p>
                      {player &&
                      (player.role === "organizer" ||
                        player.id === match.playerAId ||
                        player.id === match.playerBId) ? (
                        <MatchReplayEditor compact initialUrl={match.replayUrl} matchId={match.id} />
                      ) : (
                        <ShowdownReplayLink url={match.replayUrl} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <p
      className={`rounded-xl border px-4 py-5 text-sm ${
        error
          ? "border-rose-400/25 bg-rose-950/25 text-rose-200"
          : "border-amber-300/20 bg-amber-950/20 text-amber-100"
      }`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export default function IndividualHistoryPage() {
  return (
    <Suspense
      fallback={
        <section
          aria-busy="true"
          aria-label="Cargando historial individual"
          className="h-72 animate-pulse rounded-2xl border border-zinc-800 bg-slate-950/50"
        />
      }
    >
      <IndividualHistoryContent />
    </Suspense>
  );
}
