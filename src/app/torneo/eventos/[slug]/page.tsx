import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ArchaeologistParticipationButton, {
  type ArchaeologistPokemonOption,
} from "@/components/ArchaeologistParticipationButton";
import EndWeekTwoEventButton from "@/components/EndWeekTwoEventButton";
import PokemonSprite from "@/components/PokemonSprite";
import WeekTwoParticipationButton from "@/components/WeekTwoParticipationButton";
import { getCurrentPlayer } from "@/lib/auth";
import { getWeekTwoEvent } from "@/lib/week-two-events";
import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";
import { formatPokemonSpeciesName } from "@/lib/pokemon-name";

type OrganizerSubmission = {
  playerName: string;
  username: string;
  evidenceUrl: string | null;
  pokemon: ArchaeologistPokemonOption | null;
  submittedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseArchaeologistPokemonOptions(value: unknown): ArchaeologistPokemonOption[] {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned an invalid Gruta Sisma Pokémon response");
  }

  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.species !== "string" ||
      typeof item.form !== "number" ||
      !(typeof item.nickname === "string" || item.nickname === null) ||
      typeof item.is_shiny !== "boolean" ||
      (item.status !== "alive" && item.status !== "dead")
    ) {
      throw new Error("Supabase returned an invalid Gruta Sisma Pokémon record");
    }

    return {
      id: item.id,
      species: item.species,
      form: item.form,
      nickname: item.nickname,
      isShiny: item.is_shiny,
      status: item.status,
    };
  });
}

async function EventDetails({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const event = getWeekTwoEvent(slug);
  if (!event) notFound();

  let player: Awaited<ReturnType<typeof getCurrentPlayer>> = null;
  try {
    player = await getCurrentPlayer();
  } catch (error) {
    console.error("Failed to load player for event page:", error);
  }

  let initialEvidenceUrl = "";
  let initialPokemonId = "";
  let archaeologistPokemonOptions: ArchaeologistPokemonOption[] = [];
  let organizerSubmissions: OrganizerSubmission[] = [];
  let submissionLoadFailed = false;
  let pokemonLoadFailed = false;
  let eventEndedAt: string | null = null;
  let eventStatusLoadFailed = false;
  if (player) {
    const supabase = createSupabaseAdminClient();
    let submissionsQuery = supabase
      .from("week_two_event_submissions")
      .select("player_id,evidence_url,pokemon_id,submitted_at")
      .eq("event_slug", event.slug)
      .order("submitted_at", { ascending: false });
    if (player.role !== "organizer") {
      submissionsQuery = submissionsQuery.eq("player_id", player.id);
    }
    const submissionResponse = await submissionsQuery;

    if (submissionResponse.error) {
      console.error(
        "Failed to load week-two event submissions:",
        submissionResponse.error.message,
      );
      submissionLoadFailed = true;
    } else {
      const rows = submissionResponse.data ?? [];
      initialEvidenceUrl =
        rows.find((submission) => submission.player_id === player.id)
          ?.evidence_url ?? "";
      initialPokemonId =
        rows.find((submission) => submission.player_id === player.id)
          ?.pokemon_id ?? "";

      if (player.role === "organizer" && rows.length > 0) {
        const playersResponse = await supabase
          .from("players")
          .select("id,display_name,username")
          .in(
            "id",
            rows.map((submission) => submission.player_id),
          );
        if (playersResponse.error) {
          console.error(
            "Failed to load event participant names:",
            playersResponse.error.message,
          );
          submissionLoadFailed = true;
        } else {
          const participants = new Map(
            (playersResponse.data ?? []).map((participant) => [
              participant.id,
              {
                name: participant.display_name,
                username: participant.username,
              },
            ]),
          );
          let selectedPokemon = new Map<string, ArchaeologistPokemonOption>();
          const pokemonIds = rows.flatMap((submission) =>
            submission.pokemon_id ? [submission.pokemon_id] : [],
          );
          if (pokemonIds.length > 0) {
            const pokemonResponse = await supabase
              .from("pokemon")
              .select("id,species,form,nickname,is_shiny,status")
              .in("id", pokemonIds);
            if (pokemonResponse.error) {
              console.error(
                "Failed to load archaeologist event Pokémon:",
                pokemonResponse.error.message,
              );
              submissionLoadFailed = true;
            } else {
              try {
                selectedPokemon = new Map(
                  parseArchaeologistPokemonOptions(pokemonResponse.data).map((pokemon) => [
                    pokemon.id,
                    pokemon,
                  ]),
                );
              } catch (error) {
                console.error("Invalid organizer Pokémon response:", error);
                submissionLoadFailed = true;
              }
            }
          }
          organizerSubmissions = rows.flatMap((submission) => {
            const participant = participants.get(submission.player_id);
            return participant
              ? [{
                  playerName: participant.name,
                  username: participant.username,
                  evidenceUrl: submission.evidence_url,
                  pokemon: submission.pokemon_id
                    ? selectedPokemon.get(submission.pokemon_id) ?? null
                    : null,
                  submittedAt: submission.submitted_at,
                }]
              : [];
          });
        }
      }
    }

    if (event.slug === "arqueologo-novato") {
      const pokemonResponse = await supabase
        .from("pokemon")
        .select("id,species,form,nickname,is_shiny,status")
        .eq("player_id", player.id)
        .eq("route_id", 11)
        .eq("present_in_save", true)
        .in("status", ["alive", "dead"])
        .order("created_at", { ascending: true });

      if (pokemonResponse.error) {
        console.error(
          "Failed to load Gruta Sisma Pokémon for archaeologist event:",
          pokemonResponse.error.message,
        );
        pokemonLoadFailed = true;
      } else {
        try {
          archaeologistPokemonOptions = parseArchaeologistPokemonOptions(
            pokemonResponse.data,
          );
        } catch (error) {
          console.error("Invalid Gruta Sisma Pokémon response:", error);
          pokemonLoadFailed = true;
        }
      }
    }
  }

  const supabaseConfiguration = getSupabaseConfiguration();
  if (supabaseConfiguration.status === "not-configured") {
    eventStatusLoadFailed = true;
  } else {
    try {
      const eventStatusResponse = await createSupabaseAdminClient()
        .from("week_two_event_control")
        .select("ended_at")
        .eq("event_slug", event.slug)
        .maybeSingle();
      if (eventStatusResponse.error || !eventStatusResponse.data) {
        if (eventStatusResponse.error) {
          console.error(
            "Failed to load Week 2 event status:",
            eventStatusResponse.error.message,
          );
        }
        eventStatusLoadFailed = true;
      } else {
        eventEndedAt = eventStatusResponse.data.ended_at;
      }
    } catch (error) {
      console.error("Failed to load Week 2 event status:", error);
      eventStatusLoadFailed = true;
    }
  }

  const isHillEvent = event.slug === "el-loco-de-la-colina";
  const isArchaeologistEvent = event.slug === "arqueologo-novato";
  const eventOpen = !eventStatusLoadFailed && eventEndedAt === null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-2">
        <Link
          className="text-xs font-semibold text-amber-300 hover:text-amber-100"
          href="/torneo"
        >
          ← Competición
        </Link>
        <p className="pt-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
          Evento · Semana 2 · {event.dates}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white">
          {event.name}
        </h1>
      </header>

      <article className="relative isolate overflow-hidden rounded-2xl border border-amber-200/25 bg-zinc-950 p-5 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-cover bg-[center_42%]"
          style={{
            backgroundImage: `url('${event.backgroundImage}')`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/85 to-zinc-950/40"
        />
        <div className="relative z-10 space-y-4">
          <p className="text-base font-bold leading-7 text-zinc-100">
            {event.summary}
          </p>
          <p className="text-sm leading-6 text-zinc-200">{event.details}</p>
          {isHillEvent && (
            <div className="border-t border-white/10 pt-5">
              <WeekTwoParticipationButton
                eventName={event.name}
                initialEvidenceUrl={initialEvidenceUrl}
                isLoggedIn={Boolean(player)}
                isOpen={eventOpen}
              />
            </div>
          )}
          {isArchaeologistEvent && (
            <div className="border-t border-white/10 pt-5">
              <ArchaeologistParticipationButton
                eventName={event.name}
                initialPokemonId={initialPokemonId}
                isLoggedIn={Boolean(player)}
                isOpen={eventOpen}
                pokemonLoadFailed={pokemonLoadFailed}
                pokemonOptions={archaeologistPokemonOptions}
              />
            </div>
          )}
          {player?.role === "organizer" && (
            <div className="border-t border-white/10 pt-5">
              {eventStatusLoadFailed ? (
                <p className="text-sm text-rose-300" role="alert">
                  No se pudo comprobar el estado del evento; no es posible terminarlo ahora.
                </p>
              ) : eventEndedAt ? (
                <p className="text-sm font-bold text-rose-200">
                  Evento terminado por la organización.
                </p>
              ) : (
                <EndWeekTwoEventButton
                  eventName={event.name}
                  eventSlug={event.slug}
                />
              )}
            </div>
          )}
        </div>
      </article>

      {eventStatusLoadFailed && (
        <p className="rounded-md border border-rose-400/25 bg-rose-950/20 px-4 py-3 text-sm text-rose-200" role="alert">
          No se pudo comprobar si este evento sigue abierto. Comprueba que la
          migración de cierre manual esté aplicada.
        </p>
      )}
      {!eventStatusLoadFailed && eventEndedAt && (
        <p className="rounded-md border border-amber-300/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-100" role="status">
          Este evento ha sido terminado por la organización.
        </p>
      )}

      {pokemonLoadFailed && (
        <p className="rounded-xl border border-rose-400/25 bg-rose-950/20 px-4 py-3 text-sm text-rose-200" role="alert">
          No se pudieron cargar tus Pokémon de Gruta Sisma. Comprueba que la
          base de datos esté actualizada e inténtalo de nuevo.
        </p>
      )}

      {submissionLoadFailed && (
        <p className="rounded-xl border border-rose-400/25 bg-rose-950/20 px-4 py-3 text-sm text-rose-200" role="alert">
          No se pudieron cargar las participaciones. Comprueba que la migración
          del evento esté aplicada.
        </p>
      )}

      {player?.role === "organizer" && (
        <section className="space-y-3 rounded-2xl border border-violet-300/20 bg-slate-950/75 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
              Vista de organización · Privada
            </p>
            <h2 className="mt-1 text-lg font-black text-white">
              Participaciones recibidas
            </h2>
          </div>
          {organizerSubmissions.length > 0 ? (
            <ul className="divide-y divide-white/10">
              {organizerSubmissions.map((submission) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                  key={submission.username}
                >
                  <div>
                    <p className="font-semibold text-zinc-100">
                      {submission.playerName}
                    </p>
                    <p className="text-xs text-zinc-500">@{submission.username}</p>
                    {submission.pokemon && (
                      <p className="mt-1 text-sm text-zinc-300">
                        Participa con{" "}
                        {submission.pokemon.nickname ||
                          formatPokemonSpeciesName(submission.pokemon.species)}
                        {submission.pokemon.status === "dead" ? " · Muerto" : ""}
                      </p>
                    )}
                  </div>
                  {submission.evidenceUrl ? (
                    <a
                      className="rounded-lg border border-violet-300/30 px-3 py-2 text-sm font-bold text-violet-100 hover:bg-violet-300/10"
                      href={submission.evidenceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir enlace
                    </a>
                  ) : submission.pokemon ? (
                    <PokemonSprite
                      framed
                      form={submission.pokemon.form}
                      isShiny={submission.pokemon.isShiny}
                      size={48}
                      species={submission.pokemon.species}
                    />
                  ) : (
                    <span className="text-sm text-zinc-500">Pokémon no disponible</span>
                  )}
                </li>
              ))}
            </ul>
          ) : !submissionLoadFailed ? (
            <p className="text-sm text-zinc-400">Aún no hay participaciones.</p>
          ) : null}
        </section>
      )}
    </div>
  );
}

export default function WeekTwoEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div
          aria-label="Cargando evento"
          aria-busy="true"
          className="mx-auto h-72 w-full max-w-4xl animate-pulse rounded-2xl border border-zinc-800 bg-slate-950/60"
        />
      }
    >
      <EventDetails params={params} />
    </Suspense>
  );
}
