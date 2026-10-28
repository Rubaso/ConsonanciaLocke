import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import FishingContestPicker from "@/components/FishingContestPicker";
import { getFishingContestPageData } from "@/lib/supabase/fishing-contest-data";

export const metadata = {
  title: "Elige tu pesca | EKLOCKE",
  description: "Elige el Pokémon y el clip para el concurso de pesca.",
};

async function ChooseFishingContent() {
  await connection();
  const data = await getFishingContestPageData();
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
        No se pudo cargar tu pesca. Comprueba que la migración del concurso esté aplicada.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-100" href="/pesca">
          ← Concurso de pesca
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          Concurso de pesca
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Elige tu pesca
        </h1>
        <p className="text-sm text-zinc-400">
          Solo capturas salvajes del equipo y las cajas. Puedes cambiar tu elección mientras el concurso esté activo.
        </p>
      </header>

      {!data.player ? (
        <Notice>
          <p>Inicia sesión para elegir tu pesca.</p>
          <Link
            className="mt-3 inline-flex rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/10"
            href="/login"
          >
            Iniciar sesión
          </Link>
        </Notice>
      ) : !data.activeContest ? (
        <Notice>No hay un concurso de pesca activo ahora mismo.</Notice>
      ) : (
        <FishingContestPicker
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
          : "border-cyan-300/20 bg-cyan-950/20 text-cyan-100"
      }`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export default function ChooseFishingPage() {
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
      <ChooseFishingContent />
    </Suspense>
  );
}
