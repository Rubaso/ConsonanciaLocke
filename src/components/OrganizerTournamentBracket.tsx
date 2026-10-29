"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MatchResultsModal from "@/components/MatchResultsModal";
import TournamentBracket from "@/components/TournamentBracket";
import type { TournamentSummary } from "@/components/TournamentManager";

function playerName(tournament: TournamentSummary, playerId: string | null) {
  if (!playerId) return "Pendiente";
  return tournament.participants.find((player) => player.id === playerId)?.displayName ?? "Jugador";
}

export default function OrganizerTournamentBracket({
  tournament,
}: {
  tournament: TournamentSummary;
}) {
  const router = useRouter();
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resultsMatchId, setResultsMatchId] = useState<string | null>(null);

  async function setWinner(matchId: string, winnerPlayerId: string | null) {
    setBusyMatchId(matchId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/organizer/tournaments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: winnerPlayerId ? "winner" : "clear-winner",
          matchId,
          ...(winnerPlayerId ? { winnerPlayerId } : {}),
        }),
      });
      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new Error("El servidor respondió con datos no válidos.");
      }
      const result = payload as { error?: unknown };
      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "No se pudo guardar el resultado.",
        );
      }
      setNotice(
        winnerPlayerId
          ? "Resultado guardado; el ganador avanza a la siguiente ronda."
          : "Resultado eliminado; se han reiniciado las rondas posteriores.",
      );
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo guardar el resultado.";
      setError(message);
      throw new Error(message);
    } finally {
      setBusyMatchId(null);
    }
  }

  const resultsMatch = tournament.matches.find((match) => match.id === resultsMatchId);

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Pulsa el nombre para marcar ganador, o usa Meter resultados para el BO3 y los replays.
      </p>
      <TournamentBracket
        busy={busyMatchId !== null}
        onWinnerSelect={(matchId, winnerPlayerId) => {
          void setWinner(matchId, winnerPlayerId).catch(() => undefined);
        }}
        tournament={tournament}
      />
      <div className="space-y-2">
        {tournament.matches
          .filter((match) => match.status !== "bye" && match.playerAId && match.playerBId)
          .map((match) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2"
              key={match.id}
            >
              <p className="text-[10px] text-zinc-400">
                Ronda {match.roundNumber} · Cruce {match.matchNumber}
                {" · "}
                {playerName(tournament, match.playerAId)} vs {playerName(tournament, match.playerBId)}
              </p>
              <button
                className="rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 hover:bg-amber-400/20"
                onClick={() => setResultsMatchId(match.id)}
                type="button"
              >
                Meter resultados
              </button>
            </div>
          ))}
      </div>
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
      {resultsMatch?.playerAId && resultsMatch.playerBId && (
        <MatchResultsModal
          busy={busyMatchId !== null}
          initialUrls={resultsMatch.replayUrls}
          initialWinnerId={resultsMatch.winnerPlayerId}
          matchId={resultsMatch.id}
          playerAId={resultsMatch.playerAId}
          playerAName={playerName(tournament, resultsMatch.playerAId)}
          playerBId={resultsMatch.playerBId}
          playerBName={playerName(tournament, resultsMatch.playerBId)}
          winnerAction="winner"
          onClose={() => setResultsMatchId(null)}
          onSaveWinner={async (winnerPlayerId) => {
            await setWinner(resultsMatch.id, winnerPlayerId);
          }}
        />
      )}
    </div>
  );
}
