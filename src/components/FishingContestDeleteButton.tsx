"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FishingContestDeleteButton({
  contestId,
  contestName,
  apiPath = "/api/organizer/fishing-contests",
}: {
  contestId: string;
  contestName: string;
  apiPath?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (
      !window.confirm(
        `¿Borrar "${contestName}" del historial? Se eliminarán también las participaciones. Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(apiPath, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestId }),
      });
      const result: unknown = await response.json();
      const payload =
        typeof result === "object" && result !== null && !Array.isArray(result)
          ? (result as { error?: string })
          : {};
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo borrar el concurso.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo borrar el concurso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        className="rounded-lg border border-rose-400/40 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-50"
        disabled={busy}
        onClick={() => void remove()}
        type="button"
      >
        {busy ? "Borrando…" : "Borrar del historial"}
      </button>
      {error && (
        <p className="text-[11px] text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
