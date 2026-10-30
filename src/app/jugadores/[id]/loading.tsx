function PokemonCardSkeleton() {
  return (
    <li
      aria-hidden="true"
      className="flex h-[142px] w-24 animate-pulse flex-col items-center rounded-lg border border-zinc-800 bg-zinc-900/70 p-2"
    >
      <span className="mt-1 h-[76px] w-[76px] rounded-lg bg-zinc-800/80" />
      <span className="mt-1 h-3 w-16 rounded bg-zinc-800" />
      <span className="mt-1 h-3 w-14 rounded bg-zinc-800/70" />
      <span className="mt-2 h-2 w-12 rounded bg-zinc-800/50" />
    </li>
  );
}

function PokemonSectionSkeleton({
  title,
  titleColor,
  count = 12,
}: {
  title: string;
  titleColor: string;
  count?: number;
}) {
  return (
    <section aria-hidden="true">
      <h2 className={`mb-2 text-xs font-black uppercase tracking-wide ${titleColor}`}>
        {title}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {Array.from({ length: count }, (_, index) => (
          <PokemonCardSkeleton key={index} />
        ))}
      </ul>
    </section>
  );
}

export default function PlayerBoxLoading() {
  return (
    <div aria-label="Cargando caja del jugador" aria-busy="true" className="space-y-6">
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-32 animate-pulse rounded bg-zinc-800"
      />
      <header className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-800 bg-slate-950/75 p-5">
        <span className="h-14 w-14 animate-pulse rounded-full bg-zinc-800" />
        <div className="min-w-0 flex-1 space-y-2">
          <span className="block h-3 w-24 animate-pulse rounded bg-zinc-800" />
          <span className="block h-6 w-40 animate-pulse rounded bg-zinc-800" />
          <span className="block h-4 w-24 animate-pulse rounded bg-zinc-900" />
        </div>
        <span className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
      </header>
      <div className="space-y-5">
        <PokemonSectionSkeleton title="Capturas" titleColor="text-teal-300" />
        <PokemonSectionSkeleton title="Caídos" titleColor="text-rose-400" count={6} />
      </div>
    </div>
  );
}
