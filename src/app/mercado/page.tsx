import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import MarketBoard from "@/components/MarketBoard";
import { getMarketPageData } from "@/lib/supabase/market-data";

export const metadata = {
  title: "Mercado Rocket | EKLOCKE",
  description: "Tienda e intercambios de objetos y Pokémon por objetos de Pokémon Consonancia.",
};

function Notice({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <div
      className={`rounded-[3px] border px-4 py-5 text-sm leading-6 ${
        error
          ? "border-rose-300/30 bg-rose-950/40 text-rose-100"
          : "border-fuchsia-300/20 bg-black/50 text-fuchsia-100"
      }`}
    >
      {children}
    </div>
  );
}

async function MarketContent() {
  await connection();
  const data = await getMarketPageData();
  if (data.status === "not-configured") {
    return (
      <Notice>
        Faltan variables de servidor para cargar el mercado ({data.missingVariables.join(", ")}).
      </Notice>
    );
  }
  if (data.status === "error") {
    return (
      <Notice error>
        No se pudo cargar el Mercado Rocket. Aplica la migración{" "}
        <code className="text-fuchsia-100">20261030170000_mercado_rocket.sql</code>.
      </Notice>
    );
  }

  return (
    <MarketBoard
      player={data.player}
      listings={data.listings}
      shops={data.shops}
      recentTrades={data.recentTrades}
      tradedWithIds={data.tradedWithIds}
      pendingOfferPlayerIds={data.pendingOfferPlayerIds}
      ownedPokemon={data.ownedPokemon}
      ownedBagItems={data.ownedBagItems}
    />
  );
}

export default function MercadoRocketPage() {
  return (
    <div className="relative min-h-[calc(100dvh-61px)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/FondoMercado/mercado-rocket-fondo.jpg')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-black/55 via-fuchsia-950/40 to-black/70"
      />
      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-fuchsia-300">
            Team Rocket
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(244,114,182,0.35)]">
            Mercado Rocket
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-fuchsia-50/80">
            Abre tu tienda: tengo X objeto, lo vendo · quiero X objeto, lo compro. También puedes
            cambiar un Pokémon por un objeto. No se permite Pokémon por Pokémon. Entre las mismas
            dos personas solo hay un intercambio cerrado. Si rechazan tu oferta, puedes volver a
            ofrecer.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="rounded-[3px] border border-fuchsia-300/20 bg-black/40 px-4 py-8 text-sm text-fuchsia-100">
              Cargando el mercado…
            </div>
          }
        >
          <MarketContent />
        </Suspense>
      </div>
    </div>
  );
}
