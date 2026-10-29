import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import TournamentBracket from "@/components/TournamentBracket";
import OrganizerTournamentBracket from "@/components/OrganizerTournamentBracket";
import TournamentManager from "@/components/TournamentManager";
import { getTournamentManagementData } from "@/lib/supabase/tournament-management-data";

export const metadata = {
  title: "Cuadro del torneo | EKLOCKE",
  description: "Cuadro, participantes y resultados del torneo de Consonancia.",
};

async function TournamentBracketContent() {
  await connection();
  const data = await getTournamentManagementData();
  if (data.status === "not-configured") {
    return (
      <Notice>
        Faltan variables de servidor para cargar el torneo ({data.missingVariables.join(", ")}).
      </Notice>
    );
  }
  if (data.status === "error") {
    return <Notice error>No se pudo cargar el cuadro. Comprueba las migraciones y la conexión de Supabase.</Notice>;
  }

  const publicTournament = data.tournaments.find((tournament) => tournament.status !== "draft");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Link className="text-xs font-semibold text-amber-300 hover:text-amber-100" href="/torneo">
            ← Competición
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
            Torneo gordo · Competición
          </p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">
            Cuadro del torneo
          </h1>
        </div>
        <Link
          className="rounded-lg border border-amber-300/30 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/10"
          href="/torneo/cuadro/historial"
        >
          Historial
        </Link>
      </header>

      {data.isOrganizer && (
        <TournamentManager
          activePlayers={data.activePlayers}
          individualMatches={[]}
          individualRounds={[]}
          initialMode="tournament"
          tournaments={data.tournaments}
        />
      )}

      {publicTournament ? (
        <div className="space-y-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                {publicTournament.formatKey === "single_elimination" ? "Eliminación directa" : "Torneo"}
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                {publicTournament.name}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {publicTournament.participants.length} participantes
              </p>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1.5 text-xs font-semibold text-amber-100">
              {publicTournament.status === "published"
                ? "Publicado"
                : publicTournament.status === "in_progress"
                  ? "En curso"
                  : "Finalizado"}
            </span>
          </header>
          {data.isOrganizer ? (
            <OrganizerTournamentBracket tournament={publicTournament} />
          ) : (
            <TournamentBracket tournament={publicTournament} />
          )}
        </div>
      ) : !data.isOrganizer ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-10 text-center">
          <p className="text-lg font-bold text-zinc-200">Todavía no hay un torneo publicado</p>
          <p className="mt-2 text-sm text-zinc-500">
            Cuando el organizador publique un cuadro, aparecerá aquí.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">
            Publica un borrador desde las herramientas de organización para mostrarlo aquí.
          </p>
        </section>
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

export default function TournamentBracketPage() {
  return (
    <Suspense
      fallback={
        <section
          aria-busy="true"
          aria-label="Cargando cuadro del torneo"
          className="h-96 animate-pulse rounded-2xl border border-zinc-800 bg-slate-950/50"
        />
      }
    >
      <TournamentBracketContent />
    </Suspense>
  );
}
