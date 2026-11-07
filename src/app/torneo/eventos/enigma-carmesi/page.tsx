import Link from "next/link";

export const metadata = {
  title: "Enigma Carmesí | EKLOCKE",
  description: "Reglamento del desafío carmesí contra cRuina.",
};

const challengeTeams = ["Monotype", "Underdogs", "Speed Time", "The Abyss"];

export default function EnigmaCarmesiPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-3">
        <Link
          className="text-xs font-semibold text-red-300 transition hover:text-red-100"
          href="/torneo"
        >
          ← Competición
        </Link>
        <p className="pt-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300">
          Desafío especial
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Enigma Carmesí
        </h1>
      </header>

      <article className="relative isolate overflow-hidden rounded-md border border-red-400/30 bg-zinc-950 p-5 shadow-[0_0_40px_rgba(127,29,29,0.12)] sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-[url('/FondoEventos/EnigmaCarmesi.png')] bg-[length:95%_auto] bg-[position:center_85%] bg-no-repeat opacity-20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-950/95 via-zinc-950/90 to-red-950/60"
        />

        <div className="relative z-10 space-y-8">
          <section className="space-y-3">
            <p className="text-lg font-black text-red-100">
              Elige si te atreves a retar a cRuina.
            </p>
            <p className="text-sm leading-6 text-zinc-300">
              cRuina, administrador y creador de PkMVersus, es conocido por
              usar estrategias totalmente injustas, destructivas y
              particularmente asquerosas. Quedas avisado: el combate puede ser
              totalmente injusto. Solo cRuina sabe qué equipo usará; puede
              cambiarlo entre combates, adaptarlo o incluso mejorarlo.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
              Equipos retables
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {challengeTeams.map((team) => (
                <li
                  className="rounded-md border border-red-300/20 bg-black/35 px-4 py-3 text-sm font-black tracking-wide text-zinc-100"
                  key={team}
                >
                  {team}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
              Formato del combate
            </h2>
            <p className="text-sm leading-6 text-zinc-300">
              Irás a ciegas contra cRuina en un combate al mejor de uno.
              Se aplican las mismas normas que en los combates individuales de{" "}
              <Link
                className="font-bold text-red-200 underline decoration-red-300/50 underline-offset-4 hover:text-white"
                href="/torneo/individual"
              >
                Competición
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
              Si ganas
            </h2>
            <ul className="space-y-3 text-sm leading-6 text-zinc-300">
              <li className="rounded-md border border-white/10 bg-black/30 p-4">
                Robas un Pokémon del equipo de cRuina al que te enfrentaste.
                Recibirás ese Pokémon con sus habilidades, ataques y demás
                características aleatorizados.
              </li>
              <li className="rounded-md border border-white/10 bg-black/30 p-4">
                También puedes elegir un Pokémon de la caja de Saimus, «El
                baneado», vivo o muerto. Si varias personas eligen el mismo,
                se sorteará quién se lo lleva: podrías quedarte sin él. Podrás
                ver las elecciones de los demás antes de votar, pero el voto no
                se puede cambiar y debe emitirse justo después del combate.
              </li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
              Si pierdes
            </h2>
            <p className="rounded-md border border-red-400/25 bg-red-950/30 p-4 text-sm leading-6 text-red-100">
              Debes lanzar una vez la ruleta de cRuina. La ruleta se gestiona
              aparte; si sale «MUERTE», perderás un Pokémon aleatorio del equipo
              que usaste contra él.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
