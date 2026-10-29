"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function MatchReplayEditor({
  matchId,
  initialUrl,
  compact = false,
}: {
  matchId: string;
  initialUrl: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [savedUrl, setSavedUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/player/match-replay", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, content: url }),
      });
      const result = (await response.json()) as {
        error?: string;
        ok?: boolean;
        content?: string | null;
      };
      if (!response.ok || !result.ok) {
        setError(result.error ?? "No se pudo guardar el replay.");
        return;
      }
      setUrl(result.content ?? "");
      setSavedUrl(result.content ?? null);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={compact ? "mt-2 space-y-1.5" : "mt-2 space-y-2"} onSubmit={save}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Enlace del replay de Showdown"
          className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
          maxLength={400}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://psim.us/r/…"
          type="text"
          value={url}
        />
        <button
          className="rounded-md border border-cyan-300/30 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-300/10 disabled:opacity-50"
          disabled={saving}
          type="submit"
        >
          {saving ? "…" : savedUrl ? "Cambiar" : "Guardar"}
        </button>
        {savedUrl && (
          <a
            className="rounded-md border border-sky-300/30 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-sky-100 transition hover:bg-sky-300/10"
            href={savedUrl}
            rel="noreferrer"
            target="_blank"
          >
            Ver
          </a>
        )}
      </div>
      {error && (
        <p className="text-[10px] text-rose-300" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
