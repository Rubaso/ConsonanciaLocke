import { ROUTE_STAGES } from "@/lib/stage-catalog";

export default function StagesLoading() {
  return (
    <div
      aria-label="Cargando Pokémon de los tramos"
      aria-busy="true"
      className="space-y-6"
    >
      <section className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          eklocke · Progreso
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Tramos
        </h1>
      </section>
      <ol className="space-y-4">
        {ROUTE_STAGES.map((stage) => (
          <li
            key={stage.number}
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80"
          >
            <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-4">
              <span className="h-11 w-11 shrink-0 rounded-xl bg-zinc-800" />
              <div className="space-y-2">
                <span className="block h-3 w-16 rounded bg-zinc-800" />
                <span className="block h-4 w-36 rounded bg-zinc-800" />
              </div>
            </header>
            <div className="space-y-5 p-4">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Zonas
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from(
                    { length: stage.number === 1 ? 5 : 3 },
                    (_, index) => (
                      <span
                        key={index}
                        className="h-6 w-20 animate-pulse rounded-full bg-zinc-800/80"
                      />
                    ),
                  )}
                </div>
              </section>
              <section className="space-y-4 border-t border-zinc-800 pt-4">
                {["Vivos", "Caídos"].map((heading, groupIndex) => (
                  <div key={heading}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
                      {heading}
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                      {Array.from(
                        { length: groupIndex === 0 ? 8 : 3 },
                        (_, index) => (
                          <li
                            key={index}
                            aria-hidden="true"
                            className="h-[142px] w-24 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/70"
                          />
                        ),
                      )}
                    </ul>
                  </div>
                ))}
              </section>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
