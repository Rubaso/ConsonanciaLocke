import Link from "next/link";
import {
  MYSTERY_EVENT_TEASER,
  WEEK_TWO_EVENTS,
} from "@/lib/week-two-events";

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
    <div className="mx-auto w-full max-w-5xl space-y-8">
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
            className={`group rounded-md border bg-slate-950/70 p-6 transition duration-200 hover:-translate-y-1 hover:bg-slate-900/80 ${toneClass[section.tone].card}`}
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

      <section className="space-y-3">
        <header className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
            Eventos activos
          </p>
          <h2 className="text-xl font-black text-white">
            Semana 2 · Tramo 2 · del 2 al 9 de noviembre de 2026
          </h2>
        </header>
        <div className="grid gap-5 md:grid-cols-3">
          {WEEK_TWO_EVENTS.map((event) => (
            <Link
              aria-label={`Ver evento ${event.name}`}
              className="group relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-md border-2 border-transparent p-4 transition duration-300 hover:-translate-y-1 hover:border-amber-200/80 hover:shadow-[0_0_30px_rgba(251,191,36,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
              href={`/torneo/eventos/${event.slug}`}
              key={event.slug}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('${event.backgroundImage}')` }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 z-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/55 to-zinc-950/10"
              />
              <div className="relative z-10">
                <h3 className="mt-2 text-xl font-black text-white">
                  {event.name}
                </h3>
                <p className="mt-2 text-sm leading-5 text-zinc-100/90">
                  {event.summary}
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-100">
                  Ver evento →
                </p>
              </div>
            </Link>
          ))}
          <div
            aria-label="Evento misterioso"
            className="group relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-md border-2 border-transparent p-4 transition duration-300 hover:-translate-y-1 hover:border-red-400/80 hover:shadow-[0_0_34px_rgba(239,68,68,0.4)] focus-within:border-red-400/80"
            role="group"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 bg-zinc-950 bg-[length:95%_auto] bg-[position:center_85%] bg-no-repeat transition-transform duration-700 group-hover:scale-[1.03]"
              style={{ backgroundImage: "url('/FondoEventos/EnigmaCarmesi.png')" }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#09090b_0%,transparent_18%,transparent_82%,#09090b_100%)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(248,113,113,0.3),rgba(220,38,38,0.12)_45%,transparent_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
            <div className="relative z-10">
              <h3 className="text-xl font-black tracking-[0.12em] text-white">
                {MYSTERY_EVENT_TEASER.name}
              </h3>
              <p className="mt-2 text-sm font-bold tracking-[0.18em] text-red-100">
                {MYSTERY_EVENT_TEASER.summary}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Link
        className="inline-flex rounded-lg border border-violet-300/25 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/10"
        href="/torneo/historial"
      >
        Historial de concursos
      </Link>
    </div>
  );
}
