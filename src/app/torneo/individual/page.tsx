import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import TournamentManager from "@/components/TournamentManager";
import { getTournamentManagementData } from "@/lib/supabase/tournament-management-data";

export const metadata = {
  title: "Combates individuales | EKLOCKE",
  description: "Rondas y resultados de combates individuales.",
};

async function IndividualMatchesContent() {
  await connection();
  const data = await getTournamentManagementData();
  if (data.status === "not-configured") {
    return (
      <Notice>
        Faltan variables de servidor para cargar los combates ({data.missingVariables.join(", ")}).
      </Notice>
    );
  }
  if (data.status === "error") {
    return <Notice error>No se pudieron cargar los combates. Comprueba las migraciones y la conexión de Supabase.</Notice>;
  }

  const visibleRounds = data.individualRounds.filter(
    (round) =>
      data.isOrganizer ||
      round.status === "published" ||
      round.status === "completed",
  );
  const visibleIndividualMatches = data.individualMatches.filter(
    (match) =>
      data.isOrganizer ||
      (match.roundId === null &&
        (match.status === "pending" || match.status === "completed" || match.status === "forfeit")),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-100" href="/torneo">
          ← Competición
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          individuales · Rondas
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Combates individuales
        </h1>
      </header>

      {data.isOrganizer ? (
        <TournamentManager
          activePlayers={data.activePlayers}
          individualMatches={data.individualMatches}
          individualRounds={data.individualRounds}
          initialMode="individual"
          tournaments={[]}
        />
      ) : (
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-6">
          {visibleRounds.length === 0 && visibleIndividualMatches.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Todavía no hay combates individuales publicados.
            </p>
          ) : (
            <>
              {visibleRounds.map((round) => (
                <article className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4" key={round.id}>
                  <header className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-zinc-200">{round.name}</h2>
                    <span className="text-[10px] font-semibold text-zinc-500">
                      {round.status === "completed" ? "Finalizada" : "En curso"}
                    </span>
                  </header>
                  {round.restPlayerId && (
                    <p className="text-xs text-zinc-500">
                      Descansa: {round.players.find((player) => player.id === round.restPlayerId)?.displayName ?? "Jugador"}
                    </p>
                  )}
                  <div className="grid gap-2 md:grid-cols-2">
                    {round.matches.map((match) => (
                      <MatchCard
                        key={match.id}
                        leftName={round.players.find((player) => player.id === match.playerAId)?.displayName ?? "Jugador"}
                        rightName={round.players.find((player) => player.id === match.playerBId)?.displayName ?? "Jugador"}
                        winnerName={round.players.find((player) => player.id === match.winnerPlayerId)?.displayName ?? null}
                      />
                    ))}
                  </div>
                </article>
              ))}
              {visibleIndividualMatches.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-bold text-zinc-200">Combates individuales</h2>
                  <div className="grid gap-2 md:grid-cols-2">
                    {visibleIndividualMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        leftName={data.activePlayers.find((player) => player.id === match.playerAId)?.displayName ?? "Jugador"}
                        rightName={data.activePlayers.find((player) => player.id === match.playerBId)?.displayName ?? "Jugador"}
                        winnerName={data.activePlayers.find((player) => player.id === match.winnerPlayerId)?.displayName ?? null}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function MatchCard({
  leftName,
  rightName,
  winnerName,
}: {
  leftName: string;
  rightName: string;
  winnerName: string | null;
}) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
      <p className="text-sm text-zinc-300">
        <span className={winnerName === leftName ? "font-bold text-amber-100" : ""}>{leftName}</span>
        <span className="px-2 text-zinc-600">vs</span>
        <span className={winnerName === rightName ? "font-bold text-amber-100" : ""}>{rightName}</span>
      </p>
      <p className="mt-1 text-[10px] text-zinc-500">
        {winnerName ? `Ganador: ${winnerName}` : "Pendiente"}
      </p>
    </article>
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

export default function IndividualMatchesPage() {
  return (
    <Suspense
      fallback={
        <section
          aria-busy="true"
          aria-label="Cargando combates individuales"
          className="h-72 animate-pulse rounded-2xl border border-zinc-800 bg-slate-950/50"
        />
      }
    >
      <IndividualMatchesContent />
    </Suspense>
  );
}
