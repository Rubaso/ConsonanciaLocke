"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MarketItemIcon from "@/components/MarketItemIcon";
import PokemonSprite from "@/components/PokemonSprite";
import type { MarketPendingOffer } from "@/lib/market-types";

export default function PendingMarketOffers({ offers }: { offers: MarketPendingOffer[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (offers.length === 0) return null;

  async function respond(offerId: string, action: "accept" | "reject") {
    setBusyId(offerId);
    setError(null);
    const response = await fetch("/api/player/market/offer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, action }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error ?? "No se pudo responder.");
      return;
    }
    router.refresh();
  }

  const countLabel =
    offers.length === 1
      ? "Tienes 1 intercambio pendiente"
      : `Tienes ${offers.length} intercambios pendientes`;

  return (
    <aside
      className="rounded-[3px] border border-fuchsia-300/40 bg-fuchsia-950/40 p-4 shadow-lg shadow-fuchsia-950/20"
      role="status"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-300">
        Mercado Rocket
      </p>
      <h2 className="mt-1 text-lg font-black text-white">{countLabel}</h2>
      <p className="mt-1 text-sm text-fuchsia-100/80">
        Acepta o rechaza. Si rechazas, esa persona puede volver a ofrecerte algo.
      </p>
      {error ? <p className="mt-2 text-sm text-rose-200">{error}</p> : null}
      <ul className="mt-3 space-y-3">
        {offers.map((offer) => (
          <li
            key={offer.id}
            className="flex flex-wrap items-center gap-3 rounded-[3px] border border-white/10 bg-black/40 px-3 py-3"
          >
            {offer.pokemon ? (
              <PokemonSprite
                species={offer.pokemon.species}
                form={offer.pokemon.form}
                isShiny={offer.pokemon.isShiny}
                size={40}
                framed={false}
              />
            ) : (
              <MarketItemIcon slug={offer.offerItemSlug} size={40} alt={offer.offerLabel} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                <span style={{ color: offer.fromPlayerColor }}>{offer.fromPlayerName}</span>
                {" te ofrece "}
                {offer.offerLabel}
              </p>
              <p className="text-xs text-zinc-400">{offer.listingHeadline}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void respond(offer.id, "accept")}
                className="rounded-[3px] bg-fuchsia-300 px-3 py-1.5 text-xs font-black uppercase text-slate-950 disabled:opacity-50"
              >
                {busyId === offer.id ? "…" : "Aceptar"}
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void respond(offer.id, "reject")}
                className="rounded-[3px] border border-white/20 px-3 py-1.5 text-xs font-bold uppercase text-zinc-200 hover:bg-white/10 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/mercado"
        className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-fuchsia-200 hover:text-white"
      >
        Ir al Mercado Rocket
      </Link>
    </aside>
  );
}
