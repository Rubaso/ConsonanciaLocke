"use client";

import { filledReplayUrls } from "@/lib/showdown-replay";

export default function MatchReplayMenu({
  urls,
}: {
  urls: readonly string[] | null | undefined;
}) {
  const games = filledReplayUrls(urls).map((url, index) => ({
    url,
    label: `Combate ${index + 1}`,
  }));
  if (games.length === 0) return null;

  return (
    <details className="relative shrink-0">
      <summary className="cursor-pointer list-none rounded-md border border-sky-300/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-100 transition hover:bg-sky-300/10 [&::-webkit-details-marker]:hidden">
        Replays
      </summary>
      <div className="absolute right-0 z-30 mt-1 min-w-36 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-xl shadow-black/40">
        {games.map((game) => (
          <a
            className="block px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-300/10"
            href={game.url}
            key={`${game.label}-${game.url}`}
            rel="noreferrer"
            target="_blank"
          >
            {game.label}
          </a>
        ))}
      </div>
    </details>
  );
}
