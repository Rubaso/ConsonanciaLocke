import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import FishingContestDeleteButton from "@/components/FishingContestDeleteButton";
import FishingContestRanking from "@/components/FishingContestRanking";
import PokemonSprite from "@/components/PokemonSprite";
import ShortContestRanking from "@/components/ShortContestRanking";
import { getCurrentPlayer } from "@/lib/auth";
import { getCompetitionHistoryData } from "@/lib/supabase/competition-history-data";
import {
  fishingContestWinner,
  getFishingContestHistoryData,
} from "@/lib/supabase/fishing-contest-data";
import {
  formatHeight,
  getShortContestHistoryData,
  shortContestWinner,
} from "@/lib/supabase/short-contest-data";

export const metadata = {
  title: "Historial de competiciones | EKLOCKE",
  description: "Resultados de torneos, rondas individuales y concursos archivados.",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeZone: "Europe/Madrid",
});

async function CompetitionHistoryContent() {
  await connection();
  const [data, fishing, shorts, player] = await Promise.all([
    getCompetitionHistoryData(),
    getFishingContestHistoryData(),
    getShortContestHistoryData(),
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
        No se pudo cargar el historial. Comprueba la conexión y que la migración de historial esté aplicada.
      </Notice>
    );
  }

  const isOrganizer = player?.role === "organizer";

  return (
    <main className="mx-auto w-full max-w-5xl space-y-10">
      <header className="space-y-2">
        <Link className="text-xs font-semibold text-violet-300 hover:text-violet-100" href="/torneo">
          ← Competición
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
          Archivo
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Historial de competiciones
        </h1>
      </header>

      <section className="space-y-4" aria-labelledby="tournament-history-heading">
        <h2
          id="tournament-history-heading"
          className="text-sm font-bold uppercase tracking-widest text-amber-300"
        >
          Torneos y combates
        </h2>
        {data.competitions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-10 text-center">
            <p className="text-sm text-zinc-400">Todavía no se ha guardado ningún torneo ni ronda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.competitions.map((competition) => (
              <article
                className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5"
                key={`${competition.kind}-${competition.id}`}
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
                      {competition.kind === "tournament" ? "Torneo" : "Ronda individual"}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-zinc-100">{competition.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {competition.participants.length} participantes · {competition.matches.length} combates
                    </p>
                  </div>
                  {competition.archivedAt && (
                    <time className="text-xs text-zinc-500" dateTime={competition.archivedAt}>
                      Guardado el {dateFormatter.format(new Date(competition.archivedAt))}
                    </time>
                  )}
                </header>

                <p className="text-xs leading-5 text-zinc-400">
                  {competition.participants.join(" · ")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {competition.matches.map((match) => (
                    <div
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
                      key={`${match.roundNumber}-${match.matchNumber}`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        Ronda {match.roundNumber} · Combate {match.matchNumber}
                      </p>
                      <p className="mt-1 text-sm text-zinc-300">
                        <span className={match.winnerName === match.playerAName ? "font-bold text-amber-100" : ""}>
                          {match.playerAName}
                        </span>
                        <span className="px-2 text-zinc-600">vs</span>
                        <span className={match.winnerName === match.playerBName ? "font-bold text-amber-100" : ""}>
                          {match.playerBName}
                        </span>
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {match.winnerName
                          ? `Ganador: ${match.winnerName}`
                          : match.status === "bye"
                            ? "Pasa de ronda"
                            : "Sin resultado"}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        className="space-y-4"
        aria-labelledby="fishing-history-heading"
        id="concurso-pesca"
      >
        <h2
          id="fishing-history-heading"
          className="text-sm font-bold uppercase tracking-widest text-cyan-300"
        >
          Concurso de pesca
        </h2>
        {fishing.status === "not-configured" ? (
          <Notice>
            Faltan variables de servidor para el historial de pesca ({fishing.missingVariables.join(", ")}).
          </Notice>
        ) : fishing.status === "error" ? (
          <Notice error>
            No se pudo cargar el historial de pesca. Comprueba que la migración{" "}
            <code className="text-cyan-100">20261028020000_fishing_contests.sql</code> esté aplicada.
          </Notice>
        ) : fishing.contests.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-10 text-center">
            <p className="text-sm text-zinc-400">Todavía no se ha archivado ningún concurso de pesca.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {fishing.contests.map(({ contest, standings }) => {
              const winner = fishingContestWinner(standings);
              return (
                <article
                  className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5"
                  key={contest.id}
                >
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                        Terminado
                      </p>
                      <h3 className="mt-1 text-lg font-black text-zinc-100">{contest.name}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {contest.endedAt && (
                        <time className="text-xs text-zinc-500" dateTime={contest.endedAt}>
                          Cerrado el {dateFormatter.format(new Date(contest.endedAt))}
                        </time>
                      )}
                      {isOrganizer && (
                        <FishingContestDeleteButton
                          contestId={contest.id}
                          contestName={contest.name}
                        />
                      )}
                    </div>
                  </header>

                  {winner ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/30 bg-amber-950/20 px-4 py-3">
                      <PokemonSprite
                        species={winner.chosenSpecies}
                        form={winner.form}
                        isShiny={winner.isShiny}
                        size={56}
                      />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                          Ganador
                        </p>
                        <p className="mt-1 text-sm font-black text-zinc-100">
                          <span style={{ color: winner.playerColor }}>{winner.playerName}</span>
                          {" · "}
                          {winner.chosenSpecies}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-100/80">
                          {winner.weightKg.toLocaleString("es-ES", {
                            maximumFractionDigits: 1,
                          })}{" "}
                          kg
                        </p>
                      </div>
                      <a
                        className="ml-auto rounded-lg border border-amber-300/30 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:bg-amber-300/10"
                        href={winner.clipUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ver clip
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">Este concurso no tuvo un ganador válido.</p>
                  )}

                  <FishingContestRanking
                    emptyLabel="Este concurso no tuvo participaciones válidas."
                    isOrganizer={isOrganizer}
                    standings={standings}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        className="space-y-4"
        aria-labelledby="short-history-heading"
        id="concurso-bajitos"
      >
        <h2
          id="short-history-heading"
          className="text-sm font-bold uppercase tracking-widest text-fuchsia-300"
        >
          Concurso de bajitos
        </h2>
        {shorts.status === "not-configured" ? (
          <Notice>
            Faltan variables de servidor para el historial de bajitos ({shorts.missingVariables.join(", ")}).
          </Notice>
        ) : shorts.status === "error" ? (
          <Notice error>
            No se pudo cargar el historial de bajitos. Comprueba que la migración{" "}
            <code className="text-fuchsia-100">20261028030000_short_contests.sql</code> esté aplicada.
          </Notice>
        ) : shorts.contests.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-10 text-center">
            <p className="text-sm text-zinc-400">Todavía no se ha archivado ningún concurso de bajitos.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {shorts.contests.map(({ contest, standings }) => {
              const winner = shortContestWinner(standings);
              return (
                <article
                  className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5"
                  key={contest.id}
                >
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
                        Terminado
                      </p>
                      <h3 className="mt-1 text-lg font-black text-zinc-100">{contest.name}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {contest.endedAt && (
                        <time className="text-xs text-zinc-500" dateTime={contest.endedAt}>
                          Cerrado el {dateFormatter.format(new Date(contest.endedAt))}
                        </time>
                      )}
                      {isOrganizer && (
                        <FishingContestDeleteButton
                          apiPath="/api/organizer/short-contests"
                          contestId={contest.id}
                          contestName={contest.name}
                        />
                      )}
                    </div>
                  </header>

                  {winner ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/30 bg-amber-950/20 px-4 py-3">
                      <PokemonSprite
                        species={winner.chosenSpecies}
                        form={winner.form}
                        isShiny={winner.isShiny}
                        size={56}
                      />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                          Ganador
                        </p>
                        <p className="mt-1 text-sm font-black text-zinc-100">
                          <span style={{ color: winner.playerColor }}>{winner.playerName}</span>
                          {" · "}
                          {winner.chosenSpecies}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-100/80">
                          {formatHeight(winner.heightM)}
                        </p>
                      </div>
                      <a
                        className="ml-auto rounded-lg border border-amber-300/30 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:bg-amber-300/10"
                        href={winner.clipUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ver clip
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">Este concurso no tuvo un ganador válido.</p>
                  )}

                  <ShortContestRanking
                    emptyLabel="Este concurso no tuvo participaciones válidas."
                    isOrganizer={isOrganizer}
                    standings={standings}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
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

export default function CompetitionHistoryPage() {
  return (
    <Suspense
      fallback={
        <section
          aria-busy="true"
          aria-label="Cargando historial de competiciones"
          className="h-72 animate-pulse rounded-2xl border border-zinc-800 bg-slate-950/50"
        />
      }
    >
      <CompetitionHistoryContent />
    </Suspense>
  );
}
