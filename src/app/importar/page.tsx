import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import SaveImportForm from "@/components/SaveImportForm";
import { getCurrentPlayer } from "@/lib/auth";

export const metadata = {
  title: "Importar partida | EKLOCKE",
  description: "Importa Pokémon, equipo y medallas desde tu save de Consonancia.",
};

async function ImportSaveContent() {
  await connection();
  const player = await getCurrentPlayer();
  if (!player) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          {player.displayName}
        </p>
        <h1 className="text-3xl font-black text-white">Importar save</h1>
        <p className="text-sm text-slate-400">
          Carga tu partida de Pokémon Consonancia para importar tu equipo, las cajas, la mochila y las medallas.
        </p>
      </header>

      <aside className="space-y-2 rounded-xl border border-amber-300/20 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
        <p>
          El equipo activo se sincronizará con el grupo guardado en el archivo. Los Pokémon ya
          caídos, liberados o intercambiados conservarán ese estado.
        </p>
        <p className="text-amber-100/80">
          Los Pokémon de las dos últimas cajas del PC se importarán como caídos. El save no guarda
          una fecha o lugar de caída, así que la fecha registrada será la de importación y el lugar
          de caída quedará sin indicar. También se importa la mochila (usables y equipables; no
          objetos clave, cartas ni MTs). No se guarda el archivo bruto.
        </p>
      </aside>

      <aside className="rounded-xl border border-cyan-300/20 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
        <p className="font-semibold">¿Dónde está el archivo de guardado?</p>
        <p className="mt-1 text-cyan-100/80">
          En Windows, abre{" "}
          <kbd className="rounded border border-cyan-200/20 bg-slate-950/60 px-1.5 py-0.5 font-mono text-xs text-cyan-50">
            %APPDATA%\Pokemon Consonancia
          </kbd>{" "}
          —normalmente{" "}
          <span className="font-mono text-xs text-cyan-50">
            C:\Users\TuUsuario\AppData\Roaming\Pokemon Consonancia
          </span>
          — y selecciona ahí tu archivo de partida <code>.rxdata</code>.
        </p>
      </aside>

      <aside className="rounded-xl border border-rose-300/20 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
        Las dos últimas cajas del PC se consideran cajas de caídos. En este save corresponden a
        Caja 47 y Caja 48; cualquier Pokémon que esté ahí se marcará automáticamente como caído.
      </aside>

      <SaveImportForm />
    </div>
  );
}

function ImportSaveLoading() {
  return (
    <section
      aria-label="Cargando importador"
      className="mx-auto h-72 max-w-3xl animate-pulse rounded-2xl border border-cyan-300/15 bg-slate-950/50"
    />
  );
}

export default function ImportSavePage() {
  return (
    <Suspense fallback={<ImportSaveLoading />}>
      <ImportSaveContent />
    </Suspense>
  );
}
