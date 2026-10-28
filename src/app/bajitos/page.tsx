import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import ShortContestManager from "@/components/ShortContestManager";
import ShortContestRanking from "@/components/ShortContestRanking";
import { getShortContestPageData } from "@/lib/supabase/short-contest-data";

export const metadata = {
  title: "Concurso de bajitos | EKLOCKE",
  description: "Clasificación del concurso de Pokémon bajitos de Pokémon Consonancia.",
};

async function ShortContestContent() {
  await connection();
  const data = await getShortContestPageData();
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
        No se pudo cargar el concurso de bajitos. Comprueba la conexión y que la migración{" "}
        <code className="text-fuchsia-100">20261028030000_short_contests.sql</code> esté aplicada.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link className="text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-100" href="/torneo">
          ← Competición
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
          Competición · Bajitos
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Concurso de bajitos
        </h1>
        <p className="text-sm text-zinc-400">
          Gana el Pokémon más bajo según la Pokédex de la especie elegida.
        </p>
      </header>

      {data.isOrganizer && (
        <ShortContestManager activeContestId={data.activeContest?.id ?? null} />
      )}

      {data.activeContest ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
                En curso
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                {data.activeContest.name}
              </h2>
            </div>
            {data.player && (
              <Link
                className="rounded-lg bg-fuchsia-300 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-fuchsia-200"
                href="/bajitos/elegir"
              >
                Elige tu bajito
              </Link>
            )}
          </div>
          <div className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-950/20 px-4 py-5">
            <p className="text-sm font-semibold text-fuchsia-100">
              La clasificación se revelará al cerrar el concurso.
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Nadie verá los bajitos ni las alturas hasta que el organizador lo termine. El ranking
              se mostrará aquí al cerrarlo.
            </p>
            {data.currentEntry && (
              <p className="mt-3 text-xs text-fuchsia-200">
                Ya has enviado tu bajito. Puedes cambiarlo mientras el concurso siga abierto.
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
              <ShortContestRanking
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
              Terminado
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              {data.endedContest.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">Clasificación final.</p>
          </div>
          <ShortContestRanking
            emptyLabel="Este concurso no tuvo participaciones válidas."
            isOrganizer={data.isOrganizer}
            standings={data.revealedStandings}
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-10 text-center">
          <p className="text-lg font-bold text-zinc-200">Todavía no hay concurso de bajitos</p>
          <p className="mt-2 text-sm text-zinc-500">
            Cuando empiece, podrás enviar tu bajito. Al cerrarlo verás aquí la clasificación.
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

export default function ShortContestPage() {
  return (
    <Suspense
      fallback={
        <section
          aria-busy="true"
          aria-label="Cargando concurso de bajitos"
          className="h-96 animate-pulse rounded-2xl border border-zinc-800 bg-slate-950/50"
        />
      }
    >
      <ShortContestContent />
    </Suspense>
  );
}
