"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function sendOrganizerRequest(
  method: "POST" | "PATCH",
  body?: Record<string, unknown>,
) {
  const response = await fetch("/api/organizer/short-contests", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    Array.isArray(result)
  ) {
    throw new Error("El servidor respondió con datos no válidos.");
  }
  const payload = result as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudo completar la operación.");
  }
}

export default function ShortContestManager({
  activeContestId,
}: {
  activeContestId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function startContest() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await sendOrganizerRequest("POST");
      setNotice("Concurso de bajitos empezado. Los jugadores ya pueden elegir.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo empezar el concurso.");
    } finally {
      setBusy(false);
    }
  }

  async function endContest() {
    if (!activeContestId) return;
    if (
      !window.confirm(
        "¿Terminar el concurso de bajitos? Se cerrarán los cambios y se publicará el ranking.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await sendOrganizerRequest("PATCH", {
        action: "end",
        contestId: activeContestId,
      });
      setNotice("Concurso terminado. El ranking ya está visible aquí.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo terminar el concurso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-fuchsia-300/20 bg-slate-950/75 p-4 sm:p-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
          Organización
        </p>
        <h2 className="mt-1 text-lg font-black text-white">Concurso de bajitos</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Solo puede haber un concurso activo. Gana el Pokémon más bajo según la Pokédex. Al terminarlo se revela el ranking en esta página.
        </p>
      </header>
      {activeContestId ? (
        <button
          className="w-full rounded-lg bg-rose-400 px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-rose-300 disabled:opacity-50"
          disabled={busy}
          onClick={() => void endContest()}
          type="button"
        >
          Terminar concurso de bajitos
        </button>
      ) : (
        <button
          className="w-full rounded-lg bg-fuchsia-300 px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-50"
          disabled={busy}
          onClick={() => void startContest()}
          type="button"
        >
          Empezar concurso de bajitos
        </button>
      )}
      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-fuchsia-200" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
