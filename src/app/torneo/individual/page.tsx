import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import IndividualMatchBoard from "@/components/IndividualMatchBoard";
import TournamentManager from "@/components/TournamentManager";
import { getCurrentPlayer } from "@/lib/auth";
import { getTournamentManagementData } from "@/lib/supabase/tournament-management-data";

export const metadata = {
  title: "Combates individuales | EKLOCKE",
  description: "Combates de uno contra uno, pendientes y resultados.",
};

async function IndividualMatchesContent() {
  await connection();
  const [data, player] = await Promise.all([
    getTournamentManagementData(),
    getCurrentPlayer().catch(() => null),
  ]);
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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-100" href="/torneo">
          ← Competición
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          Competición · Individual
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Combates individuales
        </h1>
        <p className="text-sm text-zinc-400">
          Pendientes, terminados y replays de cada BO3.
        </p>
      </header>

      {data.isOrganizer && (
        <TournamentManager
          activePlayers={data.activePlayers}
          individualMatches={data.individualMatches}
          individualRounds={data.individualRounds}
          initialMode="individual"
          showIndividualLists={false}
          tournaments={[]}
        />
      )}

      <IndividualMatchBoard
        currentPlayerId={player?.id ?? null}
        isOrganizer={data.isOrganizer}
        matches={data.individualMatches}
        players={data.players}
      />
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
