"use client";

import type { TournamentSummary } from "@/components/TournamentManager";

function roundName(roundNumber: number, roundCount: number) {
  const fromFinal = roundCount - roundNumber;
  if (fromFinal === 0) return "Final";
  if (fromFinal === 1) return "Semifinal";
  if (fromFinal === 2) return "Cuartos";
  if (fromFinal === 3) return "Octavos";
  if (fromFinal === 4) return "Dieciseisavos";
  return `Ronda ${roundNumber}`;
}

function TournamentMatchCard({
  tournament,
  match,
  editable,
  busy,
  onSlotChange,
  onWinnerSelect,
}: {
  tournament: TournamentSummary;
  match: TournamentSummary["matches"][number];
  editable: boolean;
  busy: boolean;
  onSlotChange?: (matchId: string, slot: 1 | 2, playerId: string | null) => void;
  onWinnerSelect?: (matchId: string, winnerPlayerId: string | null) => void;
}) {
  const getPlayer = (playerId: string | null) =>
    playerId
      ? tournament.participants.find((participant) => participant.id === playerId) ?? null
      : null;
  const players = [getPlayer(match.playerAId), getPlayer(match.playerBId)];
  const winnerIndex = players.findIndex(
    (player) => Boolean(player && player.id === match.winnerPlayerId),
  );

  return (
    <article
      aria-label={`Combate ${match.matchNumber}`}
      className={`w-44 overflow-hidden rounded-lg border bg-slate-900/55 shadow-lg shadow-black/20 backdrop-blur-sm ${
        winnerIndex >= 0
          ? "border-amber-300/60 shadow-amber-950/20"
          : "border-amber-300/25"
      }`}
    >
      {players.map((player, index) => {
          const rowClassName = `flex min-h-9 items-center gap-1.5 px-2 ${
            index === 0 ? "border-b border-white/10" : ""
          } ${
            winnerIndex === index
              ? "bg-teal-400/20 text-white"
              : player
                  ? "text-zinc-300"
                  : "bg-black/10 text-zinc-600"
          }`;
          const rowContent = (
            <>
              {player ? (
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-[8px] font-black text-white"
                  style={{ backgroundColor: player.color }}
                >
                  {player.displayName.slice(0, 1).toLocaleUpperCase("es-ES")}
                </span>
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[10px]">
                  {match.status === "bye" ? "↗" : "·"}
                </span>
              )}
              {editable && onSlotChange ? (
                <select
                  aria-label={`Cruce ${match.matchNumber}, posición ${index + 1}`}
                  className="min-w-0 flex-1 truncate bg-transparent text-[11px] font-semibold text-zinc-200 outline-none"
                  disabled={busy}
                  onChange={(event) =>
                    onSlotChange(match.id, (index + 1) as 1 | 2, event.target.value || null)
                  }
                  value={player?.id ?? ""}
                >
                  <option className="bg-slate-900" value="">
                    Vacante / bye
                  </option>
                  {tournament.participants
                    .filter((participant) => participant.id !== players[1 - index]?.id)
                    .map((participant) => (
                      <option className="bg-slate-900" key={participant.id} value={participant.id}>
                        {participant.displayName}
                      </option>
                    ))}
                </select>
              ) : (
                <span className="truncate text-[11px] font-semibold">
                  {player?.displayName ?? (match.status === "bye" ? "Pasa de ronda" : "Pendiente")}
                </span>
              )}
              {winnerIndex === index && (
                <span aria-label="Ganador" className="ml-auto text-[10px] text-amber-200">★</span>
              )}
            </>
          );

          const canSelectWinner =
            onWinnerSelect &&
            player &&
            (match.status === "pending" ||
              (match.status === "completed" && winnerIndex === index));
          if (canSelectWinner && player) {
            const isSelectedWinner = match.status === "completed" && winnerIndex === index;
            return (
              <button
                aria-label={
                  isSelectedWinner
                    ? `Quitar el resultado del combate ${match.matchNumber}`
                    : `Marcar a ${player.displayName} como ganador del combate ${match.matchNumber}`
                }
                className={`${rowClassName} w-full text-left transition-colors hover:bg-teal-400/20 focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal-200 disabled:cursor-wait disabled:opacity-60`}
                disabled={busy}
                key={index}
                onClick={() => onWinnerSelect(match.id, isSelectedWinner ? null : player.id)}
                title={isSelectedWinner ? "Quitar resultado" : `Marcar a ${player.displayName} como ganador`}
                type="button"
              >
                {rowContent}
              </button>
            );
          }

          return (
            <div className={rowClassName} key={index}>
              {rowContent}
            </div>
          );
      })}
    </article>
  );
}

export default function TournamentBracket({
  tournament,
  editable = false,
  busy = false,
  onSlotChange,
  onWinnerSelect,
}: {
  tournament: TournamentSummary;
  editable?: boolean;
  busy?: boolean;
  onSlotChange?: (matchId: string, slot: 1 | 2, playerId: string | null) => void;
  onWinnerSelect?: (matchId: string, winnerPlayerId: string | null) => void;
}) {
  const roundNumbers = [...new Set(tournament.matches.map((match) => match.roundNumber))].sort(
    (a, b) => a - b,
  );
  if (roundNumbers.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">El cuadro todavía no tiene combates.</p>;
  }

  const finalRound = roundNumbers[roundNumbers.length - 1];
  const firstRoundCount = tournament.matches.filter(
    (match) => match.roundNumber === roundNumbers[0],
  ).length;
  const bracketHeight = Math.max(460, firstRoundCount * 76);
  const leftRounds = roundNumbers.filter((round) => round < finalRound);
  const finalMatch = tournament.matches.find((match) => match.roundNumber === finalRound);

  function sideMatches(round: number, side: "left" | "right") {
    const allRoundMatches = tournament.matches
      .filter((match) => match.roundNumber === round)
      .sort((a, b) => a.matchNumber - b.matchNumber);
    const half = Math.ceil(allRoundMatches.length / 2);
    return side === "left"
      ? allRoundMatches.slice(0, half)
      : allRoundMatches.slice(half).reverse();
  }

  return (
    <div
      aria-label="Cuadro de eliminación directa"
      className="overflow-x-auto rounded-xl border border-zinc-800 bg-slate-900/45 p-4 backdrop-blur-sm sm:p-6"
      role="region"
      tabIndex={0}
    >
      <div className="flex min-w-max items-stretch gap-2 sm:gap-3">
        {leftRounds.map((round) => (
          <section
            aria-label={roundName(round, finalRound)}
            className="flex w-48 shrink-0 flex-col"
            key={`left-${round}`}
          >
            <h3 className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/80">
              {roundName(round, finalRound)}
            </h3>
            <div
              className="flex flex-1 flex-col justify-around gap-4"
              style={{ minHeight: `${bracketHeight}px` }}
            >
              {sideMatches(round, "left").map((match) => (
                <TournamentMatchCard
                  busy={busy}
                  editable={editable && round === roundNumbers[0]}
                  key={match.id}
                  match={match}
                  onSlotChange={onSlotChange}
                  onWinnerSelect={onWinnerSelect}
                  tournament={tournament}
                />
              ))}
            </div>
          </section>
        ))}

        <section
          aria-label="Final"
          className="flex w-48 shrink-0 flex-col"
        >
          <h3 className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
            Final
          </h3>
          <div
            className="flex flex-1 items-center justify-center"
            style={{ minHeight: `${bracketHeight}px` }}
          >
            {finalMatch ? (
              <TournamentMatchCard
                busy={busy}
                editable={editable && finalRound === roundNumbers[0]}
                match={finalMatch}
                onSlotChange={onSlotChange}
                onWinnerSelect={onWinnerSelect}
                tournament={tournament}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-700 px-4 py-6 text-xs text-zinc-600">
                Final pendiente
              </div>
            )}
          </div>
        </section>

        {[...leftRounds].reverse().map((round) => (
          <section
            aria-label={roundName(round, finalRound)}
            className="flex w-48 shrink-0 flex-col"
            key={`right-${round}`}
          >
            <h3 className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/80">
              {roundName(round, finalRound)}
            </h3>
            <div
              className="flex flex-1 flex-col justify-around gap-4"
              style={{ minHeight: `${bracketHeight}px` }}
            >
              {sideMatches(round, "right").map((match) => (
                <TournamentMatchCard
                  busy={busy}
                  editable={editable && round === roundNumbers[0]}
                  key={match.id}
                  match={match}
                  onSlotChange={onSlotChange}
                  onWinnerSelect={onWinnerSelect}
                  tournament={tournament}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
