"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  PLAYER_SESSION_EVENT,
  notifyPlayerSessionChanged,
  type PublicPlayer,
} from "@/lib/player-session";

type Player = PublicPlayer;

export default function LoginForm() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    function loadSession() {
      fetch("/api/auth/session", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("No se pudo comprobar la sesión.");
          }
          return (await response.json()) as { player: Player | null };
        })
        .then(({ player: currentPlayer }) => {
          if (active) {
            setPlayer(currentPlayer);
            setError("");
          }
        })
        .catch(() => {
          if (active) setError("No se pudo comprobar la sesión.");
        })
        .finally(() => {
          if (active) setIsCheckingSession(false);
        });
    }

    loadSession();
    window.addEventListener(PLAYER_SESSION_EVENT, loadSession);

    return () => {
      active = false;
      window.removeEventListener(PLAYER_SESSION_EVENT, loadSession);
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "No se pudo iniciar sesión.");
        return;
      }

      setPin("");
      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      if (!sessionResponse.ok) {
        setError("Sesión iniciada, pero no se pudo cargar la cuenta.");
        return;
      }

      const session = (await sessionResponse.json()) as { player: Player | null };
      setPlayer(session.player);
      notifyPlayerSessionChanged();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "No se pudo cerrar la sesión.");
        return;
      }
      setPlayer(null);
      setUsername("");
      notifyPlayerSessionChanged();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6">
        <p className="text-sm text-zinc-400">Comprobando sesión…</p>
      </section>
    );
  }

  if (player) {
    return (
      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-400">
            Sesión iniciada
          </p>
          <h2 className="mt-2 text-xl font-bold text-zinc-100">
            {player.displayName}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            @{player.username} ·{" "}
            {player.role === "organizer" ? "Administrador" : "Jugador"}
          </p>
        </div>
        <button
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
          type="button"
          onClick={handleLogout}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Cerrando…" : "Cerrar sesión"}
        </button>
        {error && (
          <p className="text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900/70 p-6">
      <p className="text-sm leading-6 text-zinc-400">
        Accede con el usuario asignado y tu PIN personal de cinco caracteres.
      </p>
      <form className="mt-5 space-y-4" onSubmit={handleLogin}>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-200">Usuario</span>
          <input
            autoComplete="username"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-teal-500"
            maxLength={32}
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            required
            value={username}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-200">PIN</span>
          <input
            autoComplete="current-password"
            autoCapitalize="characters"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm tracking-[0.25em] text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-teal-500"
            maxLength={5}
            minLength={5}
            name="pin"
            onChange={(event) =>
              setPin(event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
            }
            pattern="[A-Za-z0-9]{5}"
            required
            type="password"
            value={pin}
          />
        </label>
        {error && (
          <p className="text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
        <button
          className="w-full rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Comprobando…" : "Iniciar sesión"}
        </button>
      </form>
    </section>
  );
}
