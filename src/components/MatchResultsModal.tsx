"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { BO3_SLOT_COUNT, padReplayUrls } from "@/lib/showdown-replay";

export default function MatchResultsModal({
  matchId,
  playerAId,
  playerAName,
  playerBId,
  playerBName,
  initialWinnerId,
  initialUrls,
  winnerAction,
  busy = false,
  onClose,
  onSaveWinner,
}: {
  matchId: string;
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  initialWinnerId: string | null;
  initialUrls: readonly string[] | null | undefined;
  winnerAction?: "individual-winner" | "winner";
  busy?: boolean;
  onClose: () => void;
  onSaveWinner?: (winnerPlayerId: string) => Promise<void>;
}) {
  const router = useRouter();
  const titleId = useId();
  const [winnerId, setWinnerId] = useState(initialWinnerId ?? "");
  const [urls, setUrls] = useState(() => padReplayUrls(initialUrls));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (winnerAction && winnerId && onSaveWinner) {
        await onSaveWinner(winnerId);
      }
      const response = await fetch("/api/player/match-replay", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, urls }),
      });
      const result = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok || !result.ok) {
        setError(result.error ?? "No se pudieron guardar los replays.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving || busy;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <form
        aria-labelledby={titleId}
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={save}
      >
        <header className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            BO3
          </p>
          <h2 className="text-lg font-black text-zinc-100" id={titleId}>
            Meter resultados
          </h2>
          <p className="text-sm text-zinc-400">
            {playerAName} vs {playerBName}
          </p>
        </header>

        {winnerAction && (
          <label className="block space-y-1.5 text-xs text-zinc-400">
            Ganador del enfrentamiento
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              disabled={disabled}
              onChange={(event) => setWinnerId(event.target.value)}
              required
              value={winnerId}
            >
              <option disabled value="">
                Seleccionar ganador
              </option>
              <option value={playerAId}>{playerAName}</option>
              <option value={playerBId}>{playerBName}</option>
            </select>
          </label>
        )}

        <div className="space-y-3">
          {urls.map((url, index) => (
            <label className="block space-y-1.5 text-xs text-zinc-400" key={index}>
              Combate {index + 1}
              {index === BO3_SLOT_COUNT - 1 ? " (si hay)" : ""}
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
                maxLength={400}
                onChange={(event) => {
                  const next = [...urls] as [string, string, string];
                  next[index] = event.target.value;
                  setUrls(next);
                }}
                placeholder="https://psim.us/r/…"
                type="text"
                value={url}
              />
            </label>
          ))}
        </div>

        {error && (
          <p className="text-xs text-rose-300" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
            disabled={disabled}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-400/25 disabled:opacity-50"
            disabled={disabled}
            type="submit"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
