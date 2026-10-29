"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import TournamentBracket from "@/components/TournamentBracket";

type TournamentPlayer = {
  id: string;
  displayName: string;
  color: string;
};

type TournamentMatch = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  playerAId: string | null;
  playerBId: string | null;
  winnerPlayerId: string | null;
  status: "pending" | "completed" | "bye" | "forfeit";
};

export type TournamentSummary = {
  id: string;
  name: string;
  status: "draft" | "published" | "in_progress" | "completed" | "archived";
  formatKey: string | null;
  participants: TournamentPlayer[];
  matches: TournamentMatch[];
};

export type IndividualMatchSummary = {
  id: string;
  roundId: string | null;
  matchNumber: number | null;
  playerAId: string;
  playerBId: string;
  winnerPlayerId: string | null;
  status: "draft" | "pending" | "completed" | "forfeit" | "cancelled";
  replayUrl: string | null;
};

type ActivePlayer = TournamentPlayer;

type ApiResult = {
  ok?: boolean;
  id?: string;
  error?: string;
};

export type IndividualMatchRoundSummary = {
  id: string;
  roundNumber: number;
  name: string;
  status: "draft" | "published" | "completed" | "cancelled";
  restPlayerId: string | null;
  players: TournamentPlayer[];
  matches: IndividualMatchSummary[];
};

async function sendOrganizerRequest(
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
): Promise<ApiResult> {
  const response = await fetch("/api/organizer/tournaments", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    Array.isArray(result)
  ) {
    throw new Error("El servidor respondió con datos no válidos.");
  }
  const payload = result as ApiResult;
  if (!response.ok) throw new Error(payload.error ?? "No se pudo completar la operación.");
  return payload;
}

function getPlayerName(players: TournamentPlayer[], playerId: string | null) {
  if (!playerId) return "Pendiente";
  return players.find((player) => player.id === playerId)?.displayName ?? "Jugador";
}

export default function TournamentManager({
  activePlayers,
  individualMatches,
  individualRounds,
  initialMode,
  tournaments,
}: {
  activePlayers: ActivePlayer[];
  individualMatches: IndividualMatchSummary[];
  individualRounds: IndividualMatchRoundSummary[];
  initialMode: "individual" | "tournament";
  tournaments: TournamentSummary[];
}) {
  const router = useRouter();
  const mode = initialMode;
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [tournamentName, setTournamentName] = useState("");
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function createIndividualMatch() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await sendOrganizerRequest("POST", {
        kind: "individual",
        playerAId,
        playerBId,
        notes: null,
      });
      setNotice("Combate creado. Los dos jugadores lo verán en inicio mientras esté pendiente.");
      setPlayerAId("");
      setPlayerBId("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el combate.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await sendOrganizerRequest("POST", {
        kind: "tournament",
        name: tournamentName,
        playerIds: selectedPlayers,
      });
      setNotice("Borrador de torneo creado. Puedes revisar los cruces antes de publicarlo.");
      setTournamentName("");
      setSelectedPlayers([]);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el torneo.");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(body: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await sendOrganizerRequest("PATCH", body);
      setNotice(successMessage);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la operación.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAction(
    kind: "individual-match" | "individual-round" | "tournament",
    id: string,
    confirmation: string,
    successMessage: string,
  ) {
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await sendOrganizerRequest("DELETE", { kind, id });
      setNotice(successMessage);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo borrar.");
    } finally {
      setBusy(false);
    }
  }

  function toggleTournamentPlayer(playerId: string) {
    setSelectedPlayers((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 40) return current;
      return [...current, playerId];
    });
  }

  function toggleAllTournamentPlayers() {
    setSelectedPlayers((current) =>
      current.length === Math.min(activePlayers.length, 40)
        ? []
        : activePlayers.slice(0, 40).map((player) => player.id),
    );
  }

  function moveSelectedPlayer(index: number, direction: -1 | 1) {
    setSelectedPlayers((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  return (
    <section className="space-y-5 rounded-2xl border border-violet-300/20 bg-slate-950/75 p-4 sm:p-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
          Herramientas de organización
        </p>
        <h2 className="mt-1 text-xl font-black text-white">Gestionar combates</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Elige dos jugadores para un combate, o prepara un torneo de eliminación directa.
        </p>
      </header>

      {mode === "individual" ? (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-zinc-400">
            Elige dos jugadores y se crea un solo combate. Mientras esté pendiente, les saldrá en inicio. Al marcar el ganador deja de mostrarse.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold text-zinc-400">
              Jugador 1
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
                onChange={(event) => setPlayerAId(event.target.value)}
                value={playerAId}
              >
                <option value="">Seleccionar</option>
                {activePlayers
                  .filter((player) => player.id !== playerBId)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.displayName}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-semibold text-zinc-400">
              Jugador 2
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
                onChange={(event) => setPlayerBId(event.target.value)}
                value={playerBId}
              >
                <option value="">Seleccionar</option>
                {activePlayers
                  .filter((player) => player.id !== playerAId)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.displayName}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <button
            className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
            disabled={busy || !playerAId || !playerBId || playerAId === playerBId}
            onClick={() => void createIndividualMatch()}
            type="button"
          >
            Crear combate
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submitTournament}>
          <label className="block space-y-1 text-xs font-semibold text-zinc-400">
            Nombre del torneo
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
              maxLength={120}
              minLength={1}
              onChange={(event) => setTournamentName(event.target.value)}
              required
              value={tournamentName}
            />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-zinc-400">Participantes y orden inicial</p>
              <button
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-amber-300/40 hover:text-amber-100"
                onClick={toggleAllTournamentPlayers}
                type="button"
              >
                {selectedPlayers.length === Math.min(activePlayers.length, 40)
                  ? "Desmarcar todos"
                  : "Todos"}
              </button>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-zinc-800 p-2">
              {activePlayers.map((player) => (
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
                  key={player.id}
                >
                  <input
                    checked={selectedPlayers.includes(player.id)}
                    onChange={() => toggleTournamentPlayer(player.id)}
                    type="checkbox"
                  />
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: player.color }} />
                  {player.displayName}
                </label>
              ))}
              {activePlayers.length === 0 && (
                <p className="p-3 text-sm text-zinc-500">No hay jugadores activos disponibles.</p>
              )}
            </div>
            {selectedPlayers.length > 0 && (
              <ol className="space-y-1">
                {selectedPlayers.map((id, index) => {
                  const player = activePlayers.find((candidate) => candidate.id === id);
                  if (!player) return null;
                  return (
                    <li className="flex items-center gap-2 text-xs text-zinc-300" key={id}>
                      <span className="w-5 text-right text-zinc-600">{index + 1}.</span>
                      <span className="flex-1">{player.displayName}</span>
                      <button
                        aria-label={`Subir a ${player.displayName}`}
                        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => moveSelectedPlayer(index, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Bajar a ${player.displayName}`}
                        className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                        disabled={index === selectedPlayers.length - 1}
                        onClick={() => moveSelectedPlayer(index, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            Se generará un cuadro de eliminación directa como borrador. Puedes mover o quitar jugadores antes de publicarlo.
          </p>
          <button
            className="w-full rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
            disabled={busy || selectedPlayers.length < 2 || tournamentName.trim().length === 0}
            type="submit"
          >
            Crear borrador de torneo
          </button>
        </form>
      )}

      {(error || notice) && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            error
              ? "border-rose-400/25 bg-rose-950/30 text-rose-200"
              : "border-teal-400/25 bg-teal-950/30 text-teal-200"
          }`}
          role={error ? "alert" : "status"}
        >
          {error || notice}
        </p>
      )}

      {mode === "individual" && individualRounds.length > 0 && (
        <div className="space-y-3 border-t border-zinc-800 pt-5">
          <h3 className="text-sm font-bold text-zinc-200">Rondas individuales</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {individualRounds.map((round) => (
              <article
                className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4"
                key={round.id}
              >
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-zinc-100">{round.name}</h4>
                    <p className="text-xs text-zinc-500">
                      {round.status === "draft" ? "Borrador" : round.status === "published" ? "En curso" : round.status === "completed" ? "Finalizada" : "Cancelada"}
                      {" · "}{round.players.length} jugadores
                    </p>
                  </div>
                  {(
                    <div className="flex gap-2">
                      {round.status === "completed" &&
                        round.matches.length > 0 &&
                        round.matches.every((match) =>
                          match.status === "completed" || match.status === "forfeit",
                        ) && (
                          <button
                            className="rounded-lg border border-violet-300/30 px-3 py-2 text-xs font-bold text-violet-100 transition hover:bg-violet-300/10 disabled:opacity-50"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `¿Guardar ${round.name} en el historial? Los enlaces de Poképast.es se conservarán en el historial privado de cada jugador y se quitarán de los combates.`,
                                )
                              ) {
                                void runAction(
                                  { action: "archive-individual-round", roundId: round.id },
                                  "Ronda guardada en el historial.",
                                );
                              }
                            }}
                            type="button"
                          >
                            Guardar en historial
                          </button>
                        )}
                      <button
                        className="rounded-lg border border-rose-300/25 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-300/10 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void deleteAction(
                          "individual-round",
                          round.id,
                          `¿Borrar definitivamente ${round.name}? Se eliminarán todos sus combates y resultados. Esta acción no se puede deshacer.`,
                          "Ronda y sus combates borrados.",
                        )}
                        type="button"
                      >
                        Borrar ronda y combates
                      </button>
                      {round.status === "draft" && (
                        <button
                          className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/10 disabled:opacity-50"
                          disabled={busy || round.matches.length === 0}
                          onClick={() => void runAction(
                            { action: "publish-round", roundId: round.id },
                            "Ronda lanzada. Los jugadores ya pueden consultar sus combates.",
                          )}
                          type="button"
                        >
                          Lanzar ronda
                        </button>
                      )}
                    </div>
                  )}
                </header>

                {round.restPlayerId && (
                  <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
                    Descansa esta ronda: <strong className="text-zinc-200">{getPlayerName(round.players, round.restPlayerId)}</strong>
                  </p>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  {round.matches.map((match) => (
                    <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-2" key={match.id}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        Combate {match.matchNumber}
                      </p>
                      {round.status === "draft" ? (
                        ([1, 2] as const).map((slot) => {
                          const selectedId = slot === 1 ? match.playerAId : match.playerBId;
                          const opposingId = slot === 1 ? match.playerBId : match.playerAId;
                          return (
                            <select
                              aria-label={`${round.name}, combate ${match.matchNumber}, jugador ${slot}`}
                              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-200"
                              disabled={busy}
                              key={slot}
                              onChange={(event) => {
                                if (event.target.value) {
                                  void runAction(
                                    {
                                      action: "round-slot",
                                      matchId: match.id,
                                      slot,
                                      playerId: event.target.value,
                                    },
                                    "Cruce actualizado. Si había enlaces preparados en los puestos movidos, habrá que volver a guardarlos.",
                                  );
                                }
                              }}
                              value={selectedId}
                            >
                              {round.players
                                .filter((roundPlayer) => roundPlayer.id !== opposingId)
                                .map((roundPlayer) => (
                                  <option key={roundPlayer.id} value={roundPlayer.id}>
                                    {roundPlayer.displayName}
                                    {round.restPlayerId === roundPlayer.id ? " · descanso" : ""}
                                  </option>
                                ))}
                            </select>
                          );
                        })
                      ) : (
                        <>
                          <p className="text-xs text-zinc-300">
                            <span className={match.winnerPlayerId === match.playerAId ? "font-bold text-amber-100" : ""}>
                              {getPlayerName(round.players, match.playerAId)}
                            </span>
                            <span className="px-2 text-zinc-600">vs</span>
                            <span className={match.winnerPlayerId === match.playerBId ? "font-bold text-amber-100" : ""}>
                              {getPlayerName(round.players, match.playerBId)}
                            </span>
                          </p>
                          {match.status !== "cancelled" ? (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="flex min-w-0 flex-1 items-center gap-2 text-[10px] text-zinc-500">
                                Ganador
                                <select
                                  className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
                                  disabled={busy}
                                  value={match.winnerPlayerId ?? ""}
                                  onChange={(event) => {
                                    if (event.target.value) {
                                      void runAction(
                                        { action: "individual-winner", matchId: match.id, winnerPlayerId: event.target.value },
                                        match.winnerPlayerId
                                          ? "Ganador actualizado."
                                          : "Resultado guardado.",
                                      );
                                    }
                                  }}
                                >
                                  <option value="" disabled>Seleccionar ganador</option>
                                  <option value={match.playerAId}>{getPlayerName(round.players, match.playerAId)}</option>
                                  <option value={match.playerBId}>{getPlayerName(round.players, match.playerBId)}</option>
                                </select>
                              </label>
                              <button
                                className="rounded border border-rose-300/25 px-2 py-1.5 text-[10px] font-semibold text-rose-200 transition hover:bg-rose-300/10 disabled:opacity-50"
                                disabled={busy}
                                onClick={() => void deleteAction(
                                  "individual-match",
                                  match.id,
                                  match.winnerPlayerId
                                    ? "¿Borrar este combate aunque ya tenga ganador?"
                                    : "¿Cancelar y borrar este combate pendiente de la ronda?",
                                  "Combate borrado.",
                                )}
                                type="button"
                              >
                                Borrar
                              </button>
                            </div>
                          ) : (
                            <p className="text-[10px] font-semibold text-teal-300">
                              Cancelado
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {mode === "individual" && individualMatches.some((match) => match.roundId === null) && (
        <div className="space-y-3 border-t border-zinc-800 pt-5">
          <h3 className="text-sm font-bold text-zinc-200">Combates individuales sueltos</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {individualMatches.filter((match) => match.roundId === null).map((match) => (
              <article
                className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2"
                key={match.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-200">
                    {getPlayerName(activePlayers, match.playerAId)}
                    {" vs "}
                    {getPlayerName(activePlayers, match.playerBId)}
                  </p>
                  {match.replayUrl && (
                    <a
                      className="mt-1 inline-flex text-[10px] font-bold text-sky-300 hover:text-sky-100"
                      href={match.replayUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Ver partida
                    </a>
                  )}
                </div>
                {match.status !== "cancelled" ? (
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-[10px] text-zinc-500">
                      Ganador
                      <select
                        className="max-w-40 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
                        disabled={busy}
                        value={match.winnerPlayerId ?? ""}
                        onChange={(event) => {
                          if (event.target.value) {
                            void runAction(
                              { action: "individual-winner", matchId: match.id, winnerPlayerId: event.target.value },
                              match.winnerPlayerId
                                ? "Ganador actualizado."
                                : "Resultado del combate individual guardado.",
                            );
                          }
                        }}
                      >
                        <option value="" disabled>Seleccionar ganador</option>
                        <option value={match.playerAId}>{getPlayerName(activePlayers, match.playerAId)}</option>
                        <option value={match.playerBId}>{getPlayerName(activePlayers, match.playerBId)}</option>
                      </select>
                    </label>
                    <button
                      className="rounded border border-rose-300/25 px-2 py-1.5 text-[10px] font-semibold text-rose-200 transition hover:bg-rose-300/10 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void deleteAction(
                        "individual-match",
                        match.id,
                        match.winnerPlayerId
                          ? "¿Borrar este combate aunque ya tenga ganador?"
                          : "¿Cancelar y borrar este combate individual pendiente?",
                        "Combate borrado.",
                      )}
                      type="button"
                    >
                      Borrar
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-semibold text-teal-300">Cancelado</span>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {mode === "tournament" && tournaments.length > 0 && (
        <div className="space-y-3 border-t border-zinc-800 pt-5">
          <h3 className="text-sm font-bold text-zinc-200">Torneos y cuadros</h3>
          {tournaments.map((tournament) => {
            const canArchiveTournament =
              ["published", "in_progress", "completed"].includes(tournament.status) &&
              tournament.matches.length > 0 &&
              tournament.matches.every((match) =>
                match.status === "completed" ||
                match.status === "bye" ||
                match.status === "forfeit",
              );
            return (
              <article className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4" key={tournament.id}>
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-zinc-100">{tournament.name}</h4>
                    <p className="text-xs text-zinc-500">
                      {tournament.status === "draft" ? "Borrador" : tournament.status === "published" ? "Publicado" : tournament.status === "in_progress" ? "En curso" : "Finalizado"}
                      {" · "}{tournament.participants.length} participantes
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canArchiveTournament && (
                        <button
                          className="rounded-lg border border-violet-300/30 px-3 py-2 text-xs font-bold text-violet-100 transition hover:bg-violet-300/10 disabled:opacity-50"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Guardar "${tournament.name}" en el historial? Los enlaces de Poképast.es se conservarán en el historial privado de cada jugador y se quitarán de los combates.`,
                              )
                            ) {
                              void runAction(
                                { action: "archive-tournament", tournamentId: tournament.id },
                                "Torneo guardado en el historial.",
                              );
                            }
                          }}
                          type="button"
                        >
                          Guardar en historial
                        </button>
                      )}
                    {tournament.status === "draft" && (
                      <button
                        className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void runAction({ action: "publish", tournamentId: tournament.id }, "Torneo publicado.")}
                        type="button"
                      >
                        Publicar torneo
                      </button>
                    )}
                    <button
                      className="rounded-lg border border-rose-300/30 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-300/10 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void deleteAction(
                        "tournament",
                        tournament.id,
                        `¿Borrar definitivamente el torneo "${tournament.name}"? Se eliminarán también el cuadro, los participantes y todos los resultados. Esta acción no se puede deshacer.`,
                        "Torneo borrado.",
                      )}
                      type="button"
                    >
                      Borrar torneo
                    </button>
                  </div>
                </header>

                {tournament.status === "draft" && (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500">
                      Cambia los participantes directamente en los cruces del cuadro antes de publicar.
                    </p>
                    <TournamentBracket
                      busy={busy}
                      editable
                      onSlotChange={(matchId, slot, playerId) =>
                        void runAction(
                          { action: "slot", matchId, slot, playerId },
                          "Cruce actualizado. Si había enlaces preparados en los puestos movidos, habrá que volver a guardarlos.",
                        )
                      }
                      tournament={tournament}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
