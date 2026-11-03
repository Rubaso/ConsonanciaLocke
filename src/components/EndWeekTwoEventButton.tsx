"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EndWeekTwoEventButtonProps = {
  eventName: string;
  eventSlug: string;
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
  return "No se pudo terminar el evento.";
}

export default function EndWeekTwoEventButton({
  eventName,
  eventSlug,
}: EndWeekTwoEventButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function endEvent() {
    if (!window.confirm(`¿Terminar ${eventName}? Los participantes ya no podrán enviar ni editar su participación.`)) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/organizer/week-two-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventSlug }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(payload));
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo terminar el evento.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        className="rounded-md border border-rose-300/40 px-4 py-2.5 text-sm font-bold text-rose-200 transition hover:border-rose-200 hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-50"
        disabled={busy}
        onClick={() => void endEvent()}
        type="button"
      >
        {busy ? "Terminando…" : "Terminar evento"}
      </button>
      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
