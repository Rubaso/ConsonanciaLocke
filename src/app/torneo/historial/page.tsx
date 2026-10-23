import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getCompetitionHistoryData } from "@/lib/supabase/competition-history-data";

export const metadata = {
  title: "Historial de competiciones | EKLOCKE",
  description: "Resultados de los torneos y rondas individuales archivados.",
};

async function CompetitionHistoryContent() {
  await connection();
  const data = await getCompetitionHistoryData();
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

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-2">
        <Link className="text-xs font-semibold text-violet-300 hover:text-violet-100" href="/torneo">
          ← Combates y torneo
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
           Archivo
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Historial de competiciones
        </h1>
      </header>

      {data.competitions.length === 0 ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-10 text-center">
          <p className="text-sm text-zinc-400">Todavía no se ha guardado ninguna competición.</p>
        </section>
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
                  <h2 className="mt-1 text-lg font-black text-zinc-100">{competition.name}</h2>
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
    </main>
  );
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeZone: "Europe/Madrid",
});

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
