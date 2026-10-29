"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { MatchPaste } from "@/lib/supabase/player-match-data";

type Props = {
  matchId: string;
  tournamentName: string;
  phase: string;
  roundNumber: number;
  matchNumber: number;
  scheduledAt: string | null;
  opponentName: string;
  opponentColor: string;
  ownPaste: MatchPaste | null;
  opponentPaste: MatchPaste | null;
  ownPasteSubmitted: boolean;
  opponentPasteSubmitted: boolean;
  competitionLaunched: boolean;
  pasteLocked: boolean;
  showdownReplayUrl: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

export default function PlayerMatchPanel({
  matchId,
  tournamentName,
  phase,
  roundNumber,
  matchNumber,
  scheduledAt,
  opponentName,
  opponentColor,
  ownPaste: initialOwnPaste,
  opponentPaste,
  ownPasteSubmitted,
  opponentPasteSubmitted,
  competitionLaunched,
  pasteLocked,
  showdownReplayUrl: initialReplayUrl,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialOwnPaste?.content ?? "");
  const [ownPaste, setOwnPaste] = useState(initialOwnPaste);
  const [hasOwnPaste, setHasOwnPaste] = useState(ownPasteSubmitted);
  const [replayUrl, setReplayUrl] = useState(initialReplayUrl ?? "");
  const [savedReplayUrl, setSavedReplayUrl] = useState(initialReplayUrl);
  const [saving, setSaving] = useState(false);
  const [savingReplay, setSavingReplay] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function savePaste(nextContent: string) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/player/match-pokepaste", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, content: nextContent }),
      });
      const result = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "No se pudo guardar el Poképaste.");
        return;
      }

      const trimmedContent = nextContent.trim();
      setOwnPaste(trimmedContent ? { kind: "url", content: trimmedContent } : null);
      setHasOwnPaste(Boolean(trimmedContent));
      setContent(trimmedContent);
      setNotice(
        trimmedContent ? "Enlace de Poképast.es guardado para este combate." : "Enlace eliminado.",
      );
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Prueba otra vez.");
    } finally {
      setSaving(false);
    }
  }

  async function copyOpponentPaste() {
    if (!opponentPaste) return;
    setCopying(true);
    setError("");
    setNotice("");

    try {
      await navigator.clipboard.writeText(opponentPaste.content);
      setNotice("Enlace del Poképaste rival copiado.");
    } catch {
      setError("No se pudo acceder al portapapeles. Comprueba los permisos del navegador.");
    } finally {
      setCopying(false);
    }
  }

  async function saveReplay(nextContent: string) {
    setSavingReplay(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/player/match-replay", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, content: nextContent }),
      });
      const result = (await response.json()) as { error?: string; ok?: boolean; content?: string | null };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "No se pudo guardar el enlace de Showdown.");
        return;
      }

      const trimmed = nextContent.trim();
      setReplayUrl(trimmed);
      setSavedReplayUrl(trimmed || null);
      setNotice(trimmed ? "Enlace de la partida de Showdown guardado." : "Enlace de Showdown eliminado.");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Prueba otra vez.");
    } finally {
      setSavingReplay(false);
    }
  }

  const phaseLabel =
    phase.toLowerCase() === "main" ? `Ronda ${roundNumber}` : phase;

  return (
    <section
      aria-labelledby="match-panel-heading"
      className="match-pending-banner overflow-hidden rounded-2xl border-2 border-cyan-300/55 bg-slate-950/80"
    >
      <header className="border-b border-cyan-300/15 bg-cyan-950/30 px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
          Tu combate
        </p>
        <h2 id="match-panel-heading" className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          {tournamentName}
        </h2>
        <p className="mt-2 text-base text-zinc-200">
          {phaseLabel} · Combate {matchNumber} contra{" "}
          <strong style={{ color: opponentColor }}>{opponentName}</strong>
        </p>
        {scheduledAt && (
          <time
            className="mt-1 block text-xs text-zinc-500"
            dateTime={scheduledAt}
          >
            {dateFormatter.format(new Date(scheduledAt))}
          </time>
        )}
      </header>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Poképaste del rival
          </p>
          {opponentPaste ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-100 transition hover:bg-sky-400/20 disabled:opacity-50"
                disabled={copying}
                onClick={copyOpponentPaste}
                type="button"
              >
                {copying ? "Copiando…" : "Copiar Poképaste rival"}
              </button>
              <a
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                href={opponentPaste.content}
                rel="noreferrer"
                target="_blank"
              >
                Abrir Poképaste
              </a>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              {!competitionLaunched
                ? "El Poképaste rival se mostrará cuando se lance la competición y ambos hayáis enviado el enlace."
                : ownPasteSubmitted
                  ? "El enlace de ambos jugadores se mostrará cuando tu rival también lo haya enviado."
                  : opponentPasteSubmitted
                    ? "Tu rival ya ha enviado su enlace. Comparte el tuyo para que ambos podáis verlos."
                    : "Los enlaces se mostrarán cuando ambos jugadores hayan enviado el suyo."}
            </p>
          )}
        </div>

        {pasteLocked && hasOwnPaste ? (
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
              Tu Poképaste
            </p>
            {opponentPaste && ownPaste ? (
              <a
                className="inline-flex rounded-lg border border-teal-300/25 px-3 py-2 text-xs font-semibold text-teal-100 hover:bg-teal-300/10"
                href={ownPaste.content}
                rel="noreferrer"
                target="_blank"
              >
                Abrir tu Poképaste
              </a>
            ) : (
              <p className="text-xs text-zinc-500">
                Enlace enviado. Se mostrará cuando ambos jugadores lo hayan enviado.
              </p>
            )}
            <p className="text-xs text-zinc-500">
              El enlace queda bloqueado durante la competición y no se puede cambiar.
            </p>
          </div>
        ) : (
          <form
            className="space-y-3 border-t border-zinc-800 pt-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void savePaste(content);
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <label
                className="text-xs font-bold uppercase tracking-wide text-zinc-400"
                htmlFor="match-pokepaste"
              >
                Tu enlace de Poképast.es
              </label>
              {ownPaste && (
                <span className="text-[10px] font-semibold text-teal-300">
                  Enlace guardado
                </span>
              )}
            </div>
            <input
              autoComplete="url"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
              id="match-pokepaste"
              maxLength={120}
              onChange={(event) => setContent(event.target.value)}
              placeholder="https://pokepast.es/…"
              type="url"
              value={content}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] leading-4 text-zinc-600">
                {competitionLaunched
                  ? "Guarda el enlace de tu equipo en Poképast.es."
                  : "Puedes dejar tu equipo preparado; solo tú verás el enlace hasta que se lance."}
              </p>
              <div className="flex gap-2">
                {(ownPaste || ownPasteSubmitted) && !pasteLocked && (
                  <button
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:text-white disabled:opacity-50"
                    disabled={saving}
                    onClick={() => void savePaste("")}
                    type="button"
                  >
                    Borrar Poképaste
                  </button>
                )}
                <button
                  className="rounded-lg border border-cyan-300/35 bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </form>
        )}

        <form
          className="space-y-3 border-t border-zinc-800 pt-4"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void saveReplay(replayUrl);
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <label
              className="text-xs font-bold uppercase tracking-wide text-zinc-400"
              htmlFor="match-showdown-replay"
            >
              Partida de Showdown
            </label>
            {savedReplayUrl && (
              <a
                className="text-[10px] font-semibold text-sky-300 hover:text-sky-100"
                href={savedReplayUrl}
                rel="noreferrer"
                target="_blank"
              >
                Abrir replay
              </a>
            )}
          </div>
          <input
            autoComplete="url"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
            id="match-showdown-replay"
            maxLength={400}
            onChange={(event) => setReplayUrl(event.target.value)}
            placeholder="https://psim.us/r/…"
            type="text"
            value={replayUrl}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] leading-4 text-zinc-600">
              Cuando terminéis, pega aquí el enlace del replay. Quedará en el historial.
            </p>
            <button
              className="rounded-lg border border-cyan-300/35 bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={savingReplay}
              type="submit"
            >
              {savingReplay ? "Guardando…" : "Guardar replay"}
            </button>
          </div>
        </form>

        <p className="border-t border-zinc-800 pt-3 text-xs leading-5 text-zinc-500">
          ¿Aún no tienes equipo?{" "}
          <a
            className="font-semibold text-cyan-300 underline decoration-cyan-300/30 underline-offset-2 hover:text-cyan-100"
            href="https://pokepast.es/"
            rel="noreferrer"
            target="_blank"
          >
            Crea tu Poképaste en Poképast.es
          </a>
          .
        </p>

        {hasOwnPaste && (
          <p className="text-[10px] text-zinc-600">
            {competitionLaunched
              ? "Tu enlace se compartirá cuando ambos jugadores lo hayan enviado."
              : "Tu enlace está preparado y solo tú puedes verlo hasta que se lance la competición."}
          </p>
        )}
        {error && (
          <p
            className="rounded-lg border border-rose-400/25 bg-rose-950/30 px-3 py-2 text-xs text-rose-200"
            role="alert"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            className="rounded-lg border border-teal-400/25 bg-teal-950/30 px-3 py-2 text-xs text-teal-200"
            role="status"
          >
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}
