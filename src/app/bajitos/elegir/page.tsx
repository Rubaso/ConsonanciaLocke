import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import ShortContestPicker from "@/components/ShortContestPicker";
import { getShortContestPageData } from "@/lib/supabase/short-contest-data";

export const metadata = {
  title: "Elige tu bajito | EKLOCKE",
  description: "Elige el Pokémon y el clip para el concurso de bajitos.",
};

async function ChooseShortContent() {
  await connection();
  const data = await getShortContestPageData();
  if (data.status === "not-configured") {
    return (
      <Notice>
        Faltan variables de servidor ({data.missingVariables.join(", ")}).
      </Notice>
    );
  }
  if (data.status === "error") {
    return (
      <Notice error>
        No se pudo cargar tu bajito. Comprueba que la migración del concurso esté aplicada.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link className="text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-100" href="/bajitos">
          ← Concurso de bajitos
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
          Concurso de bajitos
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Elige tu bajito
        </h1>
        <p className="text-sm text-zinc-400">
          Solo capturas salvajes del equipo y las cajas. Puedes cambiar tu elección mientras el concurso esté activo.
        </p>
      </header>

      {!data.player ? (
        <Notice>
          <p>Inicia sesión para elegir tu bajito.</p>
          <Link
            className="mt-3 inline-flex rounded-lg border border-fuchsia-300/30 px-3 py-2 text-xs font-bold text-fuchsia-100 transition hover:bg-fuchsia-300/10"
            href="/login"
          >
            Iniciar sesión
          </Link>
        </Notice>
      ) : !data.activeContest ? (
        <Notice>No hay un concurso de bajitos activo ahora mismo.</Notice>
      ) : (
        <ShortContestPicker
          currentEntry={data.currentEntry}
          eligiblePokemon={data.eligiblePokemon}
        />
      )}
    </div>
  );
}

function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-5 text-sm ${
        error
          ? "border-rose-400/25 bg-rose-950/25 text-rose-200"
          : "border-fuchsia-300/20 bg-fuchsia-950/20 text-fuchsia-100"
      }`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export default function ChooseShortPage() {
  return (
    <Suspense
      fallback={
        <section
          aria-busy="true"
          aria-label="Cargando Pokémon para el concurso"
          className="h-96 animate-pulse rounded-2xl border border-zinc-800 bg-slate-950/50"
        />
      }
    >
      <ChooseShortContent />
    </Suspense>
  );
}
