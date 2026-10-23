"use client";

import { useState, type FormEvent } from "react";
import { notifyPlayerSessionChanged } from "@/lib/player-session";

type Props = {
  initialColor: string;
  initialTwitchUsername: string | null;
};

export default function PlayerSettingsForm({
  initialColor,
  initialTwitchUsername,
}: Props) {
  const [color, setColor] = useState(initialColor);
  const [twitchUsername, setTwitchUsername] = useState(initialTwitchUsername ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch("/api/player/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ color, twitchUsername }),
      });
      const result = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "No se pudieron guardar los ajustes.");
        return;
      }

      notifyPlayerSessionChanged();
      setSaved(true);
    } catch {
      setError("No se pudo conectar con el servidor. Prueba otra vez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-6 rounded-2xl border border-violet-300/15 bg-slate-950/75 p-5 shadow-xl shadow-violet-950/15 sm:p-7"
      onSubmit={saveSettings}
    >
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-200">Color de tu nombre</span>
        <span className="flex items-center gap-3">
          <input
            aria-label="Color de tu nombre"
            className="h-11 w-16 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
          <span className="font-mono text-sm uppercase text-slate-400">{color}</span>
        </span>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-200">Canal de Twitch</span>
        <input
          autoComplete="url"
          className="w-full rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/60"
          maxLength={300}
          placeholder="tu_canal o https://www.twitch.tv/tu_canal"
          type="text"
          value={twitchUsername}
          onChange={(event) => setTwitchUsername(event.target.value)}
        />
        <span className="block text-xs text-slate-500">
          Se guarda el nombre del canal; la notificación de directo se conectará más adelante.
        </span>
      </label>

      {error && (
        <p className="rounded-lg border border-rose-400/25 bg-rose-950/30 px-3 py-2 text-sm text-rose-200" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg border border-teal-400/25 bg-teal-950/30 px-3 py-2 text-sm text-teal-200" role="status">
          Ajustes guardados.
        </p>
      )}

      <button
        className="rounded-lg border border-violet-300/35 bg-violet-400/15 px-4 py-2.5 text-sm font-bold text-violet-100 transition hover:bg-violet-400/25 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={saving}
        type="submit"
      >
        {saving ? "Guardando…" : "Guardar ajustes"}
      </button>
    </form>
  );
}
