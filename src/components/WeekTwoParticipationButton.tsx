"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

type WeekTwoParticipationButtonProps = {
  eventName: string;
  isLoggedIn: boolean;
  isOpen: boolean;
  initialEvidenceUrl: string;
};

function responseError(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return "No se pudo guardar tu participación.";
}

export default function WeekTwoParticipationButton({
  eventName,
  isLoggedIn,
  isOpen,
  initialEvidenceUrl,
}: WeekTwoParticipationButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [evidenceUrl, setEvidenceUrl] = useState(initialEvidenceUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submitParticipation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/player/week-two-event", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventSlug: "el-loco-de-la-colina",
          evidenceUrl,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(payload));
      setNotice("Enlace enviado. Solo tú y los organizadores podéis verlo.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar tu participación.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="rounded-lg bg-amber-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!isOpen}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {initialEvidenceUrl ? "Editar participación" : "Quiero participar"}
      </button>
      {!isOpen && (
        <p className="text-sm text-zinc-400">El plazo de participación terminó.</p>
      )}
      <dialog
        aria-labelledby="week-two-participation-title"
        className="fixed inset-0 m-0 h-dvh w-screen max-w-none bg-transparent p-4 backdrop:bg-black/75"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        ref={dialogRef}
      >
        <div className="flex min-h-full items-center justify-center">
          <section className="w-full max-w-lg rounded-2xl border border-amber-300/25 bg-[#11131c] p-5 shadow-2xl shadow-black/60">
            <header className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  Participación
                </p>
                <h2
                  className="mt-1 text-lg font-black text-white"
                  id="week-two-participation-title"
                >
                  {eventName}
                </h2>
              </div>
              <button
                className="rounded px-2 py-1 text-sm font-semibold text-zinc-300 transition hover:text-white"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                Cerrar
              </button>
            </header>
            {isLoggedIn ? (
              <form className="space-y-4" onSubmit={submitParticipation}>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-zinc-200">
                    Enlace de tu reto
                  </span>
                  <input
                    autoComplete="url"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-300"
                    maxLength={500}
                    onChange={(event) => setEvidenceUrl(event.target.value)}
                    placeholder="https://..."
                    required
                    type="url"
                    value={evidenceUrl}
                  />
                </label>
                <p className="text-xs leading-5 text-zinc-400">
                  El enlace será privado para ti y los organizadores.
                </p>
                {error && (
                  <p className="text-sm text-rose-300" role="alert">
                    {error}
                  </p>
                )}
                {notice && (
                  <p className="text-sm text-teal-300" role="status">
                    {notice}
                  </p>
                )}
                <button
                  className="w-full rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-black uppercase text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
                  disabled={busy || !evidenceUrl.trim()}
                  type="submit"
                >
                  {busy ? "Guardando…" : "Enviar participación"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-zinc-300">
                  Inicia sesión para adjuntar el enlace y participar.
                </p>
                <Link
                  className="inline-flex rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-black uppercase text-slate-950 transition hover:bg-amber-200"
                  href="/login"
                >
                  Iniciar sesión
                </Link>
              </div>
            )}
          </section>
        </div>
      </dialog>
    </>
  );
}
