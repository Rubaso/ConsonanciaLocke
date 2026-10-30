"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviveFallenButton({
  pokemonId,
  label,
}: {
  pokemonId: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function revive() {
    if (!window.confirm(`¿Quitar a ${label} de caídos? Volverá a capturas.`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/player/revive-pokemon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pokemonId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        window.alert(result.error ?? "No se pudo quitar de caídos.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="mt-1 rounded border border-rose-300/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-100 hover:bg-rose-300/10 disabled:opacity-50"
      disabled={busy}
      onClick={() => void revive()}
      type="button"
    >
      {busy ? "…" : "Quitar"}
    </button>
  );
}
