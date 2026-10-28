import FishingContestDeleteEntryButton from "@/components/FishingContestDeleteEntryButton";
import PokemonSprite from "@/components/PokemonSprite";
import {
  rankedStandings,
  type FishingContestStanding,
} from "@/lib/supabase/fishing-contest-data";

function formatWeight(weightKg: number) {
  return `${weightKg.toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  })} kg`;
}

export default function FishingContestRanking({
  standings,
  isOrganizer,
  emptyLabel,
}: {
  standings: FishingContestStanding[];
  isOrganizer: boolean;
  emptyLabel: string;
}) {
  const ranked = rankedStandings(standings);

  if (ranked.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-8 text-center text-sm text-zinc-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {ranked.map((entry, index) => (
        <li
          className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 sm:px-4"
          key={entry.id}
        >
          <span className="w-8 text-center text-lg font-black text-cyan-300">
            {index + 1}
          </span>
          <PokemonSprite
            species={entry.chosenSpecies}
            form={entry.form}
            isShiny={entry.isShiny}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-100">
              {entry.chosenSpecies}
              {entry.nickname && entry.nickname !== entry.sourceSpecies ? (
                <span className="ml-2 text-xs font-medium text-zinc-500">
                  {entry.nickname}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs">
              <span style={{ color: entry.playerColor }}>{entry.playerName}</span>
              <span className="text-zinc-600"> · </span>
              <span className="font-semibold text-cyan-200">
                {formatWeight(entry.weightKg)}
              </span>
            </p>
          </div>
          <a
            className="rounded-lg border border-cyan-300/30 px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/10"
            href={entry.clipUrl}
            rel="noreferrer"
            target="_blank"
          >
            Ver clip
          </a>
          {isOrganizer && (
            <FishingContestDeleteEntryButton
              entryId={entry.id}
              playerName={entry.playerName}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
