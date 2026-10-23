"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function PlayerPokepasteProfile({ initialUrl }: { initialUrl: string | null }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [savedUrl, setSavedUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(nextUrl: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/player/pokepaste", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: nextUrl }),
      });
      const result = (await response.json()) as {
        error?: string;
        ok?: boolean;
        content?: string | null;
      };
      if (!response.ok || !result.ok) {
        setError(result.error ?? "No se pudo guardar tu Poképaste.");
        return;
      }

      setUrl(result.content ?? "");
      setSavedUrl(result.content ?? null);
      setNotice(result.content ? "Poképaste guardado en tu perfil." : "Poképaste borrado de tu perfil.");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Prueba otra vez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-violet-300/20 bg-slate-950/75 p-4">
      <div>
        <h2 className="text-sm font-bold text-zinc-100">Tu Poképaste</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Guárdalo aquí cuando quieras, aunque todavía no tengas combate. Se copiará a tus cruces
          cuando el organizador los cree; tu rival solo lo verá tras lanzarse la competición y
          cuando ambos hayáis enviado uno. Al archivar la competición, se borrará también de tu
          perfil y quedará una sola copia en tu historial de equipos.
        </p>
      </div>
      <form
        className="space-y-2"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void save(url);
        }}
      >
        <label className="sr-only" htmlFor="player-pokepaste-profile">
          Tu enlace de Poképast.es
        </label>
        <input
          autoComplete="url"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/50"
          id="player-pokepaste-profile"
          maxLength={120}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://pokepast.es/…"
          type="url"
          value={url}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {savedUrl && (
            <a
              className="text-xs font-semibold text-violet-200 underline decoration-violet-300/30 underline-offset-2 hover:text-white"
              href={savedUrl}
              rel="noreferrer"
              target="_blank"
            >
              Abrir mi Poképaste
            </a>
          )}
          <div className="ml-auto flex gap-2">
            {savedUrl && (
              <button
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:text-white disabled:opacity-50"
                disabled={saving}
                onClick={() => void save("")}
                type="button"
              >
                Borrar
              </button>
            )}
            <button
              className="rounded-lg border border-violet-300/35 bg-violet-400/15 px-3 py-2 text-xs font-bold text-violet-100 transition hover:bg-violet-400/25 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
              type="submit"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
      {error && (
        <p className="rounded-lg border border-rose-400/25 bg-rose-950/30 px-3 py-2 text-xs text-rose-200" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-teal-400/25 bg-teal-950/30 px-3 py-2 text-xs text-teal-200" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
