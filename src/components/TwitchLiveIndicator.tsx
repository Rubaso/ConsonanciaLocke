"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LivePlayer = {
  displayName: string;
  color: string;
  twitchUsername: string;
  url: string;
};

type LiveStatus =
  | { status: "loading" | "not-configured" | "error"; players: [] }
  | { status: "ready"; players: LivePlayer[] };

function isLivePlayer(value: unknown): value is LivePlayer {
  return (
    typeof value === "object" &&
    value !== null &&
    "displayName" in value &&
    typeof value.displayName === "string" &&
    "color" in value &&
    typeof value.color === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(value.color) &&
    "twitchUsername" in value &&
    typeof value.twitchUsername === "string" &&
    "url" in value &&
    typeof value.url === "string" &&
    value.url.startsWith("https://www.twitch.tv/")
  );
}

export default function TwitchLiveIndicator() {
  const [liveStatus, setLiveStatus] = useState<LiveStatus>({
    status: "loading",
    players: [],
  });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function refreshStatus() {
      try {
        const response = await fetch("/api/check-live");
        const payload: unknown = await response.json();
        if (!response.ok || typeof payload !== "object" || payload === null || !("status" in payload)) {
          throw new Error("Invalid Twitch live status response");
        }
        if (payload.status === "ready" && "players" in payload && Array.isArray(payload.players)) {
          if (!payload.players.every(isLivePlayer)) {
            throw new Error("Invalid Twitch live player record");
          }
          if (active) {
            setLiveStatus({ status: "ready", players: payload.players });
          }
        } else if (payload.status === "not-configured") {
          if (active) setLiveStatus({ status: "not-configured", players: [] });
        } else {
          throw new Error("Twitch live status is unavailable");
        }
      } catch {
        if (active) setLiveStatus((current) =>
          current.status === "ready" ? current : { status: "error", players: [] },
        );
      } finally {
        if (active) timer = setTimeout(refreshStatus, 60_000);
      }
    }

    void refreshStatus();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const livePlayers =
    liveStatus.status === "ready" ? liveStatus.players : [];

  return (
    <div
      aria-label={
        liveStatus.status === "error"
          ? "LIVE: no se pudo comprobar el estado"
          : `LIVE: ${livePlayers.length} canales en directo`
      }
      className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[10px] sm:gap-2 sm:text-xs"
      role="group"
    >
      <span className="shrink-0 font-bold uppercase tracking-wide text-zinc-500">
        LIVE:
      </span>
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {liveStatus.status === "ready" && livePlayers.length === 0 ? (
          <span className="text-[10px] font-semibold text-zinc-500 sm:text-xs">
            No hay nadie
          </span>
        ) : (
          livePlayers.map((player) => (
            <Link
              className="max-w-16 truncate text-[10px] font-semibold text-zinc-500 hover:text-cyan-200 hover:underline sm:max-w-24 sm:text-xs"
              href={player.url}
              key={player.twitchUsername}
              rel="noreferrer"
              target="_blank"
              title={`${player.displayName} está en directo en Twitch`}
            >
              {player.displayName}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
