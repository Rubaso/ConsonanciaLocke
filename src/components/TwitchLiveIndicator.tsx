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
      className="flex min-w-0 items-center gap-2 whitespace-nowrap rounded-full border border-rose-400/20 bg-rose-950/25 px-2.5 py-1.5 text-[10px] shadow-inner shadow-rose-950/20 sm:gap-2.5 sm:px-3 sm:text-xs"
      role="group"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span
          aria-hidden="true"
          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-50"
        />
        <span
          aria-hidden="true"
          className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
        />
      </span>
      <span className="shrink-0 font-black uppercase tracking-wide text-rose-200">
        LIVE
      </span>
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden border-l border-rose-300/20 pl-2">
        {liveStatus.status === "ready" && livePlayers.length === 0 ? (
          <span className="text-[10px] font-medium text-rose-100/65 sm:text-xs">
            No hay nadie
          </span>
        ) : (
          livePlayers.map((player) => (
            <Link
              className="max-w-16 truncate text-[10px] font-bold text-rose-100 transition hover:text-white hover:underline sm:max-w-24 sm:text-xs"
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
