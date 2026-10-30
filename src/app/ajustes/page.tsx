import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import PlayerSettingsForm from "@/components/PlayerSettingsForm";
import { getCurrentPlayer } from "@/lib/auth";

export const metadata = {
  title: "Ajustes | EKLOCKE",
  description: "Personaliza tu perfil, elige tu personaje y vincula tu canal de Twitch.",
};

async function SettingsContent() {
  await connection();
  const player = await getCurrentPlayer();
  if (!player) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
          Cuenta de jugador
        </p>
        <h1 className="text-3xl font-black text-white">Ajustes</h1>
        <p className="text-sm text-slate-400">
          Personaliza el color y el personaje de tu perfil, y vincula tu canal de Twitch.
        </p>
      </header>
      <PlayerSettingsForm
        initialColor={player.color}
        initialTwitchUsername={player.twitchUsername}
        initialTrainerSprite={player.trainerSprite}
      />
    </div>
  );
}

function SettingsLoading() {
  return (
    <section
      aria-label="Cargando ajustes"
      className="mx-auto h-64 max-w-2xl animate-pulse rounded-2xl border border-violet-300/15 bg-slate-950/50"
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
    </Suspense>
  );
}
