import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import ActivityFeed from "@/components/ActivityFeed";
import { getActivityPageData } from "@/lib/supabase/activity-data";
import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";
import PlayerMatchPanel from "@/components/PlayerMatchPanel";
import { getPlayerMatchData } from "@/lib/supabase/player-match-data";
import PlayerPokepasteHistory from "@/components/PlayerPokepasteHistory";
import { getPlayerPokepasteHistory } from "@/lib/supabase/player-pokepaste-history";
import PlayerPokepasteProfile from "@/components/PlayerPokepasteProfile";
import { getPlayerPokepasteProfile } from "@/lib/supabase/player-pokepaste-profile";
import PokemonSprite from "@/components/PokemonSprite";
import { getRecentShinyAnnouncements } from "@/lib/supabase/shiny-announcement";

async function ActivitySection() {
  await connection();
  const activity = await getActivityPageData();

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-slate-950/60">
      {activity.status === "ready" ? (
        <ActivityFeed initialData={activity} />
      ) : activity.status === "not-configured" ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500" role="status">
          La actividad no está disponible: faltan variables de servidor (
          {activity.missingVariables.join(", ")}).
        </p>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-rose-300" role="alert">
          No se pudo cargar la actividad. Revisa la conexión y el esquema de Supabase.
        </p>
      )}
    </div>
  );
}

async function ShinyAnnouncementSection() {
  await connection();
  const result = await getRecentShinyAnnouncements();

  if (result.status === "not-configured") {
    return null;
  }
  if (result.status === "error") {
    return (
      <p className="text-xs text-rose-300" role="alert">
        No se pudo comprobar si hay una captura shiny reciente.
      </p>
    );
  }
  if (result.announcements.length === 0) return null;

  const dateFormatter = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  });

  return (
    <div className="space-y-3">
      {result.announcements.map((announcement) => (
        <aside
          aria-label={`Captura shiny de ${announcement.pokemonName}`}
          className="flex items-center gap-4 rounded-xl border border-sky-300/40 bg-sky-950/45 px-4 py-3 shadow-lg shadow-sky-950/20"
          key={announcement.id}
          role="status"
        >
          <PokemonSprite
            species={announcement.species}
            form={announcement.form}
            isShiny
            size={64}
            framed={false}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-sky-300">
              ¡Captura shiny!
            </p>
            <p className="mt-1 text-sm font-semibold text-sky-50">
              {announcement.pokemonName} capturado por{" "}
              <strong style={{ color: announcement.playerColor }}>
                {announcement.playerName}
              </strong>
            </p>
            <p className="mt-1 text-xs text-sky-200/70">
              Capturado el {dateFormatter.format(new Date(announcement.occurredAt))}.
            </p>
          </div>
          <span
            aria-hidden="true"
            className="hidden shrink-0 text-2xl text-sky-300 sm:block"
          >
            ✦
          </span>
        </aside>
      ))}
    </div>
  );
}

function ShinyAnnouncementLoading() {
  return (
    <div
      aria-label="Comprobando capturas shiny"
      aria-busy="true"
      className="h-24 animate-pulse rounded-xl border border-sky-300/15 bg-sky-950/20"
    />
  );
}

function ActivityLoading() {
  return (
    <div
      aria-label="Cargando actividad"
      aria-busy="true"
      className="h-52 animate-pulse rounded-xl border border-zinc-800 bg-slate-950/60"
    />
  );
}

async function PlayerMatchSection() {
  await connection();

  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return (
      <MatchNotice>
        El espacio de combate no está disponible: faltan variables de servidor (
        {configuration.missingVariables.join(", ")}).
      </MatchNotice>
    );
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return (
      <MatchNotice>
        <p>Inicia sesión para consultar tu combate y compartir tu equipo.</p>
        <Link
          className="mt-3 inline-flex rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/10"
          href="/login"
        >
          Iniciar sesión
        </Link>
        <PokepasteHelp />
      </MatchNotice>
    );
  }

  const [match, pasteHistory, pokepasteProfile] = await Promise.all([
    getPlayerMatchData(player),
    getPlayerPokepasteHistory(player.id),
    getPlayerPokepasteProfile(player.id),
  ]);
  const pokepasteProfileSection =
    pokepasteProfile.status === "ready" ? (
      <PlayerPokepasteProfile initialUrl={pokepasteProfile.url} />
    ) : pokepasteProfile.status === "error" ? (
      <p className="text-xs text-rose-300" role="alert">
        No se pudo cargar tu Poképaste de perfil. Comprueba que la migración de perfil esté aplicada.
      </p>
    ) : null;
  const historySection =
    pasteHistory.status === "ready" ? (
      <PlayerPokepasteHistory entries={pasteHistory.entries} />
    ) : pasteHistory.status === "error" ? (
      <p className="text-xs text-rose-300" role="alert">
        No se pudo cargar tu historial de equipos. Comprueba que la migración de historial esté aplicada.
      </p>
    ) : null;
  if (match.status === "ready") {
    return (
      <div className="space-y-4">
        {pokepasteProfileSection}
        <PlayerMatchPanel {...match} />
        {historySection}
      </div>
    );
  }
  if (match.status === "no-match") {
    return (
      <div className="space-y-4">
        {pokepasteProfileSection}
        <MatchNotice>
          <p className="font-semibold text-zinc-300">No tienes un combate pendiente</p>
          <p className="mt-1">
            Puedes guardar tu Poképaste de perfil arriba. Se copiará a tus cruces nuevos.
          </p>
          <PokepasteHelp />
        </MatchNotice>
        {historySection}
      </div>
    );
  }
  if (match.status === "not-configured") {
    return (
      <div className="space-y-4">
        {pokepasteProfileSection}
        <MatchNotice>
          Faltan variables de servidor: {match.missingVariables.join(", ")}.
        </MatchNotice>
      </div>
    );
  }
  if (match.status === "migration-required") {
    return (
      <div className="space-y-4">
        {pokepasteProfileSection}
        <MatchNotice role="alert">
          Falta aplicar la migración{" "}
          <code className="text-cyan-100">20261023025000_repair_tournament_pokepastes.sql</code>{" "}
          en el SQL Editor del proyecto de Consonancia.
        </MatchNotice>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {pokepasteProfileSection}
      <MatchNotice role="alert">
        No se pudo cargar tu combate. Revisa la conexión y el esquema de Supabase.
      </MatchNotice>
    </div>
  );
}

function PokepasteHelp() {
  return (
    <p className="mt-4 border-t border-zinc-800 pt-3 text-xs leading-5 text-zinc-500">
      Puedes preparar y compartir tu equipo en{" "}
      <a
        className="font-semibold text-cyan-300 underline decoration-cyan-300/30 underline-offset-2 hover:text-cyan-100"
        href="https://pokepast.es/"
        rel="noreferrer"
        target="_blank"
      >
        Poképast.es
      </a>
      .
    </p>
  );
}

function MatchNotice({
  children,
  role = "status",
}: {
  children: ReactNode;
  role?: "status" | "alert";
}) {
  return (
    <section
      aria-labelledby="match-panel-heading"
      className="rounded-xl border border-cyan-300/20 bg-slate-950/75 p-4"
      role={role}
    >
      <p
        id="match-panel-heading"
        className="text-[10px] font-bold uppercase tracking-widest text-cyan-300"
      >
        Tu combate
      </p>
      <div className="mt-3 text-sm leading-5 text-zinc-400">{children}</div>
    </section>
  );
}

function MatchLoading() {
  return (
    <section
      aria-label="Cargando tu combate"
      aria-busy="true"
      className="h-80 animate-pulse rounded-xl border border-cyan-300/20 bg-slate-950/75"
    />
  );
}

async function TournamentBanner() {
  await connection();
  const configuration = getSupabaseConfiguration();
  let isActive = false;

  if (configuration.status === "configured") {
    const tournamentResponse = await createSupabaseAdminClient()
      .from("tournaments")
      .select("id")
      .in("status", ["published", "in_progress"])
      .limit(1);

    if (tournamentResponse.error) {
      console.error(
        "Failed to check active Consonancia tournament:",
        tournamentResponse.error.message,
      );
    } else {
      isActive = tournamentResponse.data.length > 0;
    }
  }

  if (!isActive) return null;

  return (
    <Link
      href="/torneo/cuadro"
      className="group relative isolate flex min-h-32 w-full max-w-3xl items-end overflow-hidden rounded-2xl border border-amber-300/50 bg-zinc-950 p-4 outline-none transition-all duration-300 hover:border-amber-200 hover:shadow-[0_0_22px_rgba(251,191,36,0.35)] focus-visible:ring-2 focus-visible:ring-amber-300 sm:min-h-36 sm:p-5"
      aria-label="Ir al cuadro del torneo de Consonancia"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110 group-focus-visible:scale-110"
        style={{
          backgroundImage: "url('/FondoTorneo/pokemon_gen_1.jpg')",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/65 to-zinc-950/10 transition-colors duration-300 group-hover:from-zinc-950/90 group-hover:via-zinc-950/55"
      />
      <div className="relative z-10 transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
          Consonancia · Torneo
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
          Torneo de Consonancia
        </h2>
        <p className="mt-1 text-xs font-medium text-zinc-200">Torneo activo</p>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Evento</p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Pokémon Consonancia Randomlocke
        </h1>
        <p className="text-sm text-zinc-400">Centro informativo de la partida.</p>
      </section>

      <Suspense fallback={<ShinyAnnouncementLoading />}>
        <ShinyAnnouncementSection />
      </Suspense>

      <Suspense fallback={null}>
        <TournamentBanner />
      </Suspense>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <Suspense fallback={<ActivityLoading />}>
          <ActivitySection />
        </Suspense>
        <Suspense fallback={<MatchLoading />}>
          <PlayerMatchSection />
        </Suspense>
      </div>
    </div>
  );
}
