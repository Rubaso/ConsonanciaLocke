function PlayerCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-zinc-800 border-l-4 border-l-cyan-300/20 bg-slate-950/75"
    >
      <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="h-16 w-14 shrink-0 rounded-lg bg-zinc-800/80" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-28 rounded bg-zinc-800" />
                <div className="h-5 w-20 rounded-sm bg-red-950/50" />
              </div>
              <div className="h-3 w-20 rounded bg-zinc-900" />
              <div className="h-5 w-24 rounded-full bg-rose-950/40" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-20 rounded bg-zinc-800" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className="h-10 w-10 rounded-full bg-zinc-900" />
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="h-3 w-16 rounded bg-zinc-800" />
            <div className="h-3 w-8 rounded bg-zinc-900" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <span
                key={index}
                className="aspect-square rounded-lg border border-zinc-800 bg-zinc-950/70"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayersLoading() {
  return (
    <section
      aria-label="Cargando jugadores"
      aria-busy="true"
      className="space-y-6"
    >
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Consonancia · Comunidad
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Jugadores
        </h1>
        <p className="text-sm text-zinc-400">Cargando jugadores…</p>
      </header>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <PlayerCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
