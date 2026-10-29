"use client";

import { useState } from "react";
import MatchReplayMenu from "@/components/MatchReplayMenu";
import MatchResultsModal from "@/components/MatchResultsModal";

export default function HistoryMatchReplays({
  matchId,
  playerAId,
  playerAName,
  playerBId,
  playerBName,
  urls,
  canEdit,
}: {
  matchId: string;
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  urls: readonly string[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        {canEdit && (
          <button
            className="rounded-md border border-zinc-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
            onClick={() => setOpen(true)}
            type="button"
          >
            Editar
          </button>
        )}
        <MatchReplayMenu urls={urls} />
      </div>
      {open && (
        <MatchResultsModal
          initialUrls={urls}
          initialWinnerId={null}
          matchId={matchId}
          playerAId={playerAId}
          playerAName={playerAName}
          playerBId={playerBId}
          playerBName={playerBName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
