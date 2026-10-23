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

  if (liveStatus.status === "loading" || liveStatus.status === "not-configured") {
    return null;
  }

  if (liveStatus.status === "error") {
    return (
      <span
        className="hidden shrink-0 rounded-lg border border-rose-300/20 px-2 py-1.5 text-[10px] font-semibold text-rose-200 lg:inline-flex"
        role="status"
        title="No se pudo comprobar el estado de Twitch."
      >
        Twitch no disponible
      </span>
    );
  }
  if (liveStatus.players.length === 0) return null;

  const shownPlayers = liveStatus.players.slice(0, 2);
  const remaining = liveStatus.players.length - shownPlayers.length;
  return (
    <div
      aria-label={`${liveStatus.players.length} canales de Twitch en directo`}
      className="flex min-w-0 shrink-0 items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-950/35 px-2 py-1.5"
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-400"
      />
      <span className="hidden text-[10px] font-black uppercase tracking-wide text-rose-200 md:inline">
        Directo
      </span>
      <div className="flex min-w-0 items-center gap-1">
        {shownPlayers.map((player) => (
          <Link
            className="max-w-20 truncate text-[10px] font-bold hover:underline sm:max-w-28"
            href={player.url}
            key={player.twitchUsername}
            rel="noreferrer"
            style={{ color: player.color }}
            target="_blank"
            title={`${player.displayName} está en directo en Twitch`}
          >
            {player.displayName}
          </Link>
        ))}
        {remaining > 0 && (
          <span className="text-[10px] font-semibold text-rose-100">+{remaining}</span>
        )}
      </div>
    </div>
  );
}
