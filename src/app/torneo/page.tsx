import Link from "next/link";

export const metadata = {
  title: "Competición | EKLOCKE",
  description: "Combates, torneo y concursos de Pokémon Consonancia.",
};

const sections = [
  {
    href: "/torneo/individual",
    eyebrow: "Combates",
    title: "Individual",
    description: "Combates de uno contra uno y resultados.",
    tone: "cyan",
  },
  {
    href: "/torneo/cuadro",
    eyebrow: "Eliminatorias",
    title: "Torneo",
    description: "Cuadro, participantes y avance del torneo.",
    tone: "amber",
  },
  {
    href: "/pesca",
    eyebrow: "Concurso",
    title: "Concurso de pesca",
    description: "Clasificación por peso, clips y pesca activa de la partida.",
    tone: "teal",
  },
  {
    href: "/bajitos",
    eyebrow: "Concurso",
    title: "Concurso de bajitos",
    description: "Clasificación por altura, clips y Pokémon más bajos de la partida.",
    tone: "fuchsia",
  },
] as const;

const toneClass = {
  cyan: {
    card: "border-cyan-300/20 hover:border-cyan-200/50 hover:shadow-[0_0_28px_rgba(34,211,238,0.12)]",
    eyebrow: "text-cyan-300",
  },
  amber: {
    card: "border-amber-300/20 hover:border-amber-200/50 hover:shadow-[0_0_28px_rgba(251,191,36,0.12)]",
    eyebrow: "text-amber-300",
  },
  teal: {
    card: "border-teal-300/20 hover:border-teal-200/50 hover:shadow-[0_0_28px_rgba(45,212,191,0.12)]",
    eyebrow: "text-teal-300",
  },
  fuchsia: {
    card: "border-fuchsia-300/20 hover:border-fuchsia-200/50 hover:shadow-[0_0_28px_rgba(232,121,249,0.12)]",
    eyebrow: "text-fuchsia-300",
  },
} as const;

export default function TournamentHomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
          Pokémon Consonancia by EK esports
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Competición
        </h1>
        <p className="text-sm text-zinc-400">
          Combates, torneo y concursos.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            className={`group rounded-2xl border bg-slate-950/70 p-6 transition duration-200 hover:-translate-y-1 hover:bg-slate-900/80 ${toneClass[section.tone].card}`}
            href={section.href}
            key={section.href}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${toneClass[section.tone].eyebrow}`}
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
