"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { notifyPlayerSessionChanged } from "@/lib/player-session";
import { trainerSpriteNames } from "@/lib/trainer-sprites";

type Props = {
  initialColor: string;
  initialTwitchUsername: string | null;
  initialTrainerSprite: string | null;
};

function spriteLabel(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PlayerSettingsForm({
  initialColor,
  initialTwitchUsername,
  initialTrainerSprite,
}: Props) {
  const router = useRouter();
  const [color, setColor] = useState(initialColor);
  const [twitchUsername, setTwitchUsername] = useState(initialTwitchUsername ?? "");
  const [trainerSprite, setTrainerSprite] = useState(initialTrainerSprite);
  const [spriteQuery, setSpriteQuery] = useState("");
  const [showSpriteGallery, setShowSpriteGallery] = useState(false);
  const [visibleSpriteCount, setVisibleSpriteCount] = useState(48);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipeError, setWipeError] = useState("");
  const [wipeComplete, setWipeComplete] = useState(false);

  const normalizedSpriteQuery = spriteQuery.trim().toLowerCase();
  const matchingSprites = trainerSpriteNames.filter((name) =>
    spriteLabel(name).toLowerCase().includes(normalizedSpriteQuery),
  );

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch("/api/player/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ color, twitchUsername, trainerSprite }),
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

  async function wipeGameData() {
    if (
      !window.confirm(
        "Se borrarán permanentemente todos tus Pokémon, medallas y eventos de actividad, y tu nombre de entrenador del save. Tu cuenta, ajustes y resultados del torneo no se borrarán. ¿Quieres continuar?",
      )
    ) {
      return;
    }

    setWiping(true);
    setWipeError("");
    setWipeComplete(false);

    try {
      const response = await fetch("/api/player/wipe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: "¡HE WIPEADO!" }),
      });
      const result = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !result.ok) {
        setWipeError(result.error ?? "No se pudo reiniciar tu partida.");
        return;
      }

      setWipeComplete(true);
      router.refresh();
    } catch {
      setWipeError("No se pudo conectar con el servidor. Prueba otra vez.");
    } finally {
      setWiping(false);
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

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Personaje</h2>
          <p className="mt-1 text-xs text-slate-500">
            Elige un sprite de entrenador del juego para tu perfil.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-28 w-24 shrink-0 items-center justify-center">
            {trainerSprite ? (
              <Image
                src={`/trainer-sprites/${encodeURIComponent(trainerSprite)}.png`}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-contain"
                height={112}
                width={96}
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-20 w-20 items-center justify-center rounded-full border border-violet-300/20 bg-slate-900 text-2xl text-slate-500"
              >
                ?
              </span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-expanded={showSpriteGallery}
              aria-controls="trainer-sprite-gallery"
              onClick={() => setShowSpriteGallery((open) => !open)}
              className="rounded-lg border border-violet-300/35 bg-violet-400/15 px-3 py-2 text-sm font-bold text-violet-100 transition hover:bg-violet-400/25"
            >
              {showSpriteGallery ? "Cerrar galería" : "Elegir personaje"}
            </button>
            {trainerSprite && (
              <button
                type="button"
                onClick={() => {
                  setTrainerSprite(null);
                  setSaved(false);
                }}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Quitar personaje
              </button>
            )}
            {trainerSprite && (
              <span className="self-center text-xs text-slate-400">
                {spriteLabel(trainerSprite)}
              </span>
            )}
          </div>
        </div>
        {showSpriteGallery && (
          <div
            id="trainer-sprite-gallery"
            className="space-y-3 rounded-xl border border-violet-300/15 bg-slate-900/70 p-3"
          >
            <label className="block">
              <span className="sr-only">Buscar personaje</span>
              <input
                type="search"
                value={spriteQuery}
                onChange={(event) => {
                  setSpriteQuery(event.target.value);
                  setVisibleSpriteCount(48);
                }}
                placeholder="Buscar personaje..."
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-300/50"
              />
            </label>
            <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {matchingSprites.slice(0, visibleSpriteCount).map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={trainerSprite === name}
                  aria-label={`Elegir ${spriteLabel(name)}`}
                  title={spriteLabel(name)}
                  onClick={() => {
                    setTrainerSprite(name);
                    setShowSpriteGallery(false);
                    setSaved(false);
                  }}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border p-2 transition hover:border-violet-300/50 hover:bg-violet-400/10 ${
                    trainerSprite === name
                      ? "border-violet-300/70 bg-violet-400/15"
                      : "border-white/10 bg-slate-950/70"
                  }`}
                >
                  <Image
                    src={`/trainer-sprites/${encodeURIComponent(name)}.png`}
                    alt=""
                    aria-hidden="true"
                    className="h-20 w-20 object-contain"
                    height={80}
                    width={80}
                  />
                  <span className="w-full truncate text-center text-[10px] text-slate-300">
                    {spriteLabel(name)}
                  </span>
                </button>
              ))}
            </div>
            {matchingSprites.length === 0 ? (
              <p className="text-center text-xs text-slate-500">
                No se encontraron personajes.
              </p>
            ) : visibleSpriteCount < matchingSprites.length ? (
              <button
                type="button"
                onClick={() => setVisibleSpriteCount((count) => count + 48)}
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Mostrar más ({matchingSprites.length - visibleSpriteCount} restantes)
              </button>
            ) : null}
          </div>
        )}
        <p className="text-xs text-slate-500">
          La selección se guarda al pulsar «Guardar ajustes».
        </p>
      </section>

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
          Se guarda el nombre del canal para mostrar cuándo estás en directo.
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
        disabled={saving || wiping}
        type="submit"
      >
        {saving ? "Guardando…" : "Guardar ajustes"}
      </button>

      <section className="space-y-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
        <div>
          <h2 className="text-sm font-bold text-rose-200">Reiniciar partida</h2>
          <p className="mt-1 text-xs leading-relaxed text-rose-100/70">
            Se borrarán todos tus Pokémon, medallas y eventos de actividad, y el nombre de entrenador importado del save. La cuenta, los ajustes del perfil y el historial del torneo se conservarán. Esta acción no se puede deshacer. (Esto significa que has perdido todos tus Pokémon, tanto del equipo como de la caja de vivos).
          </p>
        </div>
        {wipeError && (
          <p className="rounded-lg border border-rose-400/25 bg-rose-950/40 px-3 py-2 text-sm text-rose-200" role="alert">
            {wipeError}
          </p>
        )}
        {wipeComplete && (
          <p className="text-sm text-rose-100" role="status">
            Partida reiniciada.
          </p>
        )}
        <button
          type="button"
          onClick={wipeGameData}
          disabled={wiping || saving}
          className="rounded-lg border border-rose-400/50 bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {wiping ? "Reiniciando…" : "¡HE WIPEADO!"}
        </button>
      </section>
    </form>
  );
}
