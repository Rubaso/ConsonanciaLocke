"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MatchReplayEditor from "@/components/MatchReplayEditor";
import TournamentBracket from "@/components/TournamentBracket";
import type { TournamentSummary } from "@/components/TournamentManager";

export default function OrganizerTournamentBracket({
  tournament,
}: {
  tournament: TournamentSummary;
}) {
  const router = useRouter();
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el resultado.");
    } finally {
      setBusyMatchId(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Pulsa el nombre para registrar el ganador. Vuelve a pulsar al ganador marcado para quitar el resultado.
      </p>
      <TournamentBracket
        busy={busyMatchId !== null}
        onWinnerSelect={setWinner}
        tournament={tournament}
      />
      <div className="space-y-2">
        {tournament.matches
          .filter((match) => match.status !== "bye" && match.playerAId && match.playerBId)
          .map((match) => (
            <div
              className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2"
              key={match.id}
            >
              <p className="text-[10px] text-zinc-500">
                Ronda {match.roundNumber} · Combate {match.matchNumber}
              </p>
              <MatchReplayEditor compact initialUrl={match.replayUrl} matchId={match.id} />
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
    </div>
  );
}
