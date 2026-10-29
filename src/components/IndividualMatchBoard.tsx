"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import HistoryMatchReplays from "@/components/HistoryMatchReplays";
import MatchResultsModal from "@/components/MatchResultsModal";
import type { IndividualMatchSummary } from "@/components/TournamentManager";

type NamedPlayer = { id: string; displayName: string };

function nameOf(players: NamedPlayer[], playerId: string | null) {
  if (!playerId) return "Pendiente";
  return players.find((player) => player.id === playerId)?.displayName ?? "Jugador";
}

function statusLabel(status: IndividualMatchSummary["status"]) {
  if (status === "completed") return "Terminado";
  if (status === "forfeit") return "Abandono";
  if (status === "draft") return "Borrador";
  if (status === "cancelled") return "Cancelado";
  return "Pendiente";
}

export default function IndividualMatchBoard({
  matches,
  players,
  isOrganizer,
  currentPlayerId,
}: {
  matches: IndividualMatchSummary[];
  players: NamedPlayer[];
  isOrganizer: boolean;
  currentPlayerId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [resultsMatch, setResultsMatch] = useState<IndividualMatchSummary | null>(null);
  const visible = matches.filter(
    (match) => match.roundId === null && match.status !== "cancelled",
  );
  const pending = visible.filter(
    (match) => match.status === "pending" || match.status === "draft",
  );
  const finished = visible.filter(
    (match) => match.status === "completed" || match.status === "forfeit",
  );

  async function deleteMatch(match: IndividualMatchSummary) {
    if (
      !window.confirm(
        match.winnerPlayerId
          ? "¿Borrar este combate aunque ya tenga ganador?"
          : "¿Cancelar y borrar este combate pendiente?",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/organizer/tournaments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "individual-match", id: match.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo borrar.");
      router.refresh();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "No se pudo borrar.");
    } finally {
      setBusy(false);
    }
  }

  function MatchRow({ match }: { match: IndividualMatchSummary }) {
    const playerAName = nameOf(players, match.playerAId);
    const playerBName = nameOf(players, match.playerBId);
    const winnerName = match.winnerPlayerId ? nameOf(players, match.winnerPlayerId) : null;
    const canEditReplays = Boolean(
      isOrganizer ||
        currentPlayerId === match.playerAId ||
        currentPlayerId === match.playerBId,
    );

    return (
      <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm text-zinc-200">
            <span className={winnerName === playerAName ? "font-bold text-amber-100" : ""}>
              {playerAName}
            </span>
            <span className="px-2 text-zinc-600">vs</span>
            <span className={winnerName === playerBName ? "font-bold text-amber-100" : ""}>
              {playerBName}
            </span>
          </p>
          <p className="mt-1 text-[10px] text-zinc-500">
            {statusLabel(match.status)}
            {winnerName ? ` · Ganó ${winnerName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOrganizer && match.status !== "cancelled" && (
            <>
              <button
                className="rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 hover:bg-amber-400/20 disabled:opacity-50"
                disabled={busy}
                onClick={() => setResultsMatch(match)}
                type="button"
              >
                Meter resultados
              </button>
              <button
                className="rounded border border-rose-300/25 px-2 py-1.5 text-[10px] font-semibold text-rose-200 hover:bg-rose-300/10 disabled:opacity-50"
                disabled={busy}
                onClick={() => void deleteMatch(match)}
                type="button"
              >
                Borrar
              </button>
            </>
          )}
          <HistoryMatchReplays
            canEdit={canEditReplays}
            matchId={match.id}
            playerAId={match.playerAId}
            playerAName={playerAName}
            playerBId={match.playerBId}
            playerBName={playerBName}
            urls={match.replayUrls}
          />
        </div>
      </article>
    );
  }

  if (pending.length === 0 && finished.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-10 text-center text-sm text-zinc-500">
        Todavía no hay combates individuales.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-300">
          Pendientes
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay combates pendientes.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {pending.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
          Terminados
        </h2>
        {finished.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay combates terminados.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {finished.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
      {resultsMatch && (
        <MatchResultsModal
          busy={busy}
          initialUrls={resultsMatch.replayUrls}
          initialWinnerId={resultsMatch.winnerPlayerId}
          matchId={resultsMatch.id}
          playerAId={resultsMatch.playerAId}
          playerAName={nameOf(players, resultsMatch.playerAId)}
          playerBId={resultsMatch.playerBId}
          playerBName={nameOf(players, resultsMatch.playerBId)}
          winnerAction="individual-winner"
          onClose={() => setResultsMatch(null)}
          onSaveWinner={async (winnerPlayerId) => {
            const response = await fetch("/api/organizer/tournaments", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "individual-winner",
                matchId: resultsMatch.id,
                winnerPlayerId,
              }),
            });
            const result = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(result.error ?? "No se pudo guardar el ganador.");
          }}
        />
      )}
    </div>
  );
}
