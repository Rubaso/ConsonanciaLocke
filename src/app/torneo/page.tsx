import Link from "next/link";

export const metadata = {
  title: "Torneo | EKLOCKE",
  description: "Combates individuales y torneos de Pokémon Consonancia.",
};

const sections = [
  {
    href: "/torneo/individual",
    eyebrow: "Combates",
    title: "Individual",
    description: "Rondas, emparejamientos y resultados de los combates individuales.",
    tone: "cyan",
  },
  {
    href: "/torneo/cuadro",
    eyebrow: "Competición",
    title: "Torneo",
    description: "Eliminatorias, participantes y avance del torneo.",
    tone: "amber",
  },
] as const;

export default function TournamentHomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
          Pokémon Consonancia by EK esports
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Combates y torneo
        </h1>
        <p className="text-sm text-zinc-400">
          Elige la sección del evento que quieres consultar.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            className={`group rounded-2xl border bg-slate-950/70 p-6 transition duration-200 hover:-translate-y-1 hover:bg-slate-900/80 ${
              section.tone === "cyan"
                ? "border-cyan-300/20 hover:border-cyan-200/50 hover:shadow-[0_0_28px_rgba(34,211,238,0.12)]"
                : "border-amber-300/20 hover:border-amber-200/50 hover:shadow-[0_0_28px_rgba(251,191,36,0.12)]"
            }`}
            href={section.href}
            key={section.href}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                section.tone === "cyan" ? "text-cyan-300" : "text-amber-300"
              }`}
            >
              {section.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {section.title}
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
              {section.description}
            </p>
          </Link>
        ))}
      </div>

      <Link
        className="inline-flex rounded-lg border border-violet-300/25 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/10"
        href="/torneo/historial"
      >
        Ver historial de competiciones
      </Link>
    </main>
  );
}
