import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import FishingContestManager from "@/components/FishingContestManager";
import FishingContestRanking from "@/components/FishingContestRanking";
import { getFishingContestPageData } from "@/lib/supabase/fishing-contest-data";

export const metadata = {
  title: "Concurso de pesca | EKLOCKE",
  description: "Clasificación del concurso de pesca de Pokémon Consonancia.",
};

async function FishingContestContent() {
  await connection();
  const data = await getFishingContestPageData();
  if (data.status === "not-configured") {
    return (
      <Notice>
        Faltan variables de servidor para cargar el concurso ({data.missingVariables.join(", ")}).
      </Notice>
    );
  }
  if (data.status === "error") {
    return (
      <Notice error>
        No se pudo cargar el concurso de pesca. Comprueba la conexión y que la migración{" "}
        <code className="text-cyan-100">20261028020000_fishing_contests.sql</code> esté aplicada.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-100" href="/torneo">
          ← Competición
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          Competición · Pesca
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Concurso de pesca
        </h1>
        <p className="text-sm text-zinc-400">
          Gana el Pokémon que más pesa según la Pokédex de la especie elegida.
        </p>
      </header>

      {data.isOrganizer && (
        <FishingContestManager activeContestId={data.activeContest?.id ?? null} />
      )}

      {data.activeContest ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                En curso
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                {data.activeContest.name}
              </h2>
            </div>
            {data.player && (
              <Link
                className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-200"
                href="/pesca/elegir"
              >
                Elige tu pesca
              </Link>
            )}
          </div>
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-950/20 px-4 py-5">
            <p className="text-sm font-semibold text-cyan-100">
              La clasificación se revelará al cerrar el concurso.
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Nadie verá las pescas ni los pesos hasta que el organizador lo termine. El ranking
              se mostrará aquí al cerrarlo.
            </p>
            {data.currentEntry && (
              <p className="mt-3 text-xs text-teal-200">
                Ya has enviado tu pesca. Puedes cambiarla mientras el concurso siga abierto.
              </p>
            )}
          </div>
          {data.isOrganizer && (
            <section className="space-y-3 rounded-2xl border border-violet-300/20 bg-slate-950/75 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                  Vista de organización
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  Participaciones en curso
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Solo tú ves esta lista. Revisa clips y borra una participación si no es legal.
                </p>
              </div>
              <FishingContestRanking
                emptyLabel="Todavía no hay participaciones."
                isOrganizer
                standings={data.organizerStandings}
              />
            </section>
          )}
        </section>
      ) : data.endedContest ? (
        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
              Terminado
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              {data.endedContest.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">Clasificación final.</p>
          </div>
          <FishingContestRanking
            emptyLabel="Este concurso no tuvo participaciones válidas."
            isOrganizer={data.isOrganizer}
            standings={data.revealedStandings}
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-10 text-center">
          <p className="text-lg font-bold text-zinc-200">Todavía no hay concurso de pesca</p>
          <p className="mt-2 text-sm text-zinc-500">
            Cuando empiece, podrás enviar tu pesca. Al cerrarlo verás aquí la clasificación.
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

export default function FishingContestPage() {
  return (
    <Suspense
      fallback={
        <section
          aria-busy="true"
          aria-label="Cargando concurso de pesca"
          className="h-96 animate-pulse rounded-2xl border border-zinc-800 bg-slate-950/50"
        />
      }
    >
      <FishingContestContent />
    </Suspense>
  );
}
