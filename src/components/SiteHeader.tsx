"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import PlayerSettingsDialog from "@/components/PlayerSettingsDialog";
import TrainerSpriteAvatar from "@/components/TrainerSpriteAvatar";
import TwitchLiveIndicator from "@/components/TwitchLiveIndicator";
import {
  PLAYER_SESSION_EVENT,
  notifyPlayerSessionChanged,
  type PublicPlayer,
} from "@/lib/player-session";

const navigation = [
  { href: "/", label: "Inicio" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/tramos", label: "Tramos" },
  { href: "/torneo", label: "Competición", aliases: ["/pesca", "/bajitos"] },
  {
    href: "https://docs.google.com/document/d/1KGtqzycVF-ue7uHrjDxIlUxUxm-KOnCyLWBNYpu51f4/edit?tab=t.0",
    label: "Normas",
    external: true,
  },
];

const subscribeToNothing = () => () => {};

function HeaderSession() {
  const pathname = usePathname();
  const [player, setPlayer] = useState<PublicPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let active = true;

    function loadSession() {
      fetch("/api/auth/session", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return { player: null };
          return (await response.json()) as { player: PublicPlayer | null };
        })
        .then(({ player: currentPlayer }) => {
          if (active) setPlayer(currentPlayer);
        })
        .catch(() => {
          if (active) setPlayer(null);
        })
        .finally(() => {
          if (active) setReady(true);
        });
    }

    loadSession();
    window.addEventListener(PLAYER_SESSION_EVENT, loadSession);

    return () => {
      active = false;
      window.removeEventListener(PLAYER_SESSION_EVENT, loadSession);
    };
  }, [pathname]);

  async function signOut() {
    setIsSigningOut(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        setPlayer(null);
        notifyPlayerSessionChanged();
      }
    } finally {
      setIsSigningOut(false);
    }
  }

  if (!ready) {
    return (
      <span
        className="inline-flex h-9 min-w-24 shrink-0 rounded-lg border border-cyan-300/20 bg-cyan-400/10"
        aria-hidden="true"
      />
    );
  }

  if (!player) {
    return (
      <Link
        href="/login"
        className="shrink-0 rounded-lg border border-cyan-300/40 bg-gradient-to-r from-teal-400/25 via-cyan-400/20 to-violet-400/25 px-4 py-2 text-xs font-bold text-cyan-100 shadow-lg shadow-cyan-950/40 transition hover:border-cyan-200/70 hover:from-teal-300/40 hover:via-cyan-300/30 hover:to-violet-300/40 hover:text-white"
      >
        Acceso
      </Link>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <PlayerSettingsDialog
        open={settingsOpen}
        color={player.color}
        twitchUsername={player.twitchUsername}
        trainerSprite={player.trainerSprite}
        onClose={() => setSettingsOpen(false)}
      />
      <Link
        href="/importar"
        aria-label="Importar save"
        title="Importar save"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-400/5 px-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-400/15 sm:px-2.5"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
          />
        </svg>
        <span className="hidden xl:inline">Importar save</span>
      </Link>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        aria-label="Ajustes"
        title="Ajustes"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-violet-300/25 bg-violet-400/5 text-violet-100 transition hover:border-violet-200/60 hover:bg-violet-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M19.14 12.94c.04-.3.06-.62.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.3 7.3 0 0 0-1.63-.94L14.37 2.8a.5.5 0 0 0-.49-.4h-3.84a.5.5 0 0 0-.49.4L9.19 5.32c-.59.23-1.14.55-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.64 8.84a.5.5 0 0 0 .12.64L4.79 11c-.05.31-.08.65-.08 1s.03.69.08 1l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.49.39 1.04.71 1.63.94l.36 2.52a.5.5 0 0 0 .49.4h3.84a.5.5 0 0 0 .49-.4l.36-2.52c.59-.23 1.14-.55 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
        </svg>
      </button>
      <Link
        href="/login"
        className="max-w-24 truncate rounded-lg px-1.5 py-2 text-sm font-semibold transition hover:text-white sm:max-w-40 sm:px-2"
        title={player.displayName}
        style={{ color: player.color }}
      >
        {player.trainerSprite && (
          <span className="mr-1.5 inline-flex h-10 w-8 shrink-0 items-center justify-center align-middle">
            <TrainerSpriteAvatar name={player.trainerSprite} size={40} />
          </span>
        )}
        {player.displayName}
      </Link>
      <button
        className="rounded-lg border border-white/15 px-2 py-2 text-xs font-bold text-slate-300 transition hover:border-rose-300/40 hover:bg-rose-500/10 hover:text-rose-100 disabled:opacity-50 sm:px-3"
        disabled={isSigningOut}
        onClick={signOut}
        type="button"
      >
        {isSigningOut ? "Saliendo…" : "Salir"}
      </button>
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const hasMounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const mercadoActive =
    hasMounted && (pathname === "/mercado" || pathname.startsWith("/mercado/"));

  return (
    <header
      className={`sticky top-0 z-40 border-b shadow-lg backdrop-blur-xl ${
        mercadoActive
          ? "border-rose-400/20 bg-black/25 shadow-rose-950/30"
          : "border-violet-300/15 bg-[#090d1b]/85 shadow-violet-950/20"
      }`}
    >
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="bg-gradient-to-r from-teal-300 via-cyan-300 to-violet-400 bg-clip-text text-lg font-black tracking-tight text-transparent"
        >
          EKLOCKE
        </Link>
        <TwitchLiveIndicator />
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <Link
            href="/mercado"
            aria-label="Mercado Rocket"
            title="Mercado Rocket"
            aria-current={
              hasMounted &&
              (pathname === "/mercado" || pathname.startsWith("/mercado/"))
                ? "page"
                : undefined
            }
            className={`flex shrink-0 items-center gap-2 overflow-hidden rounded-xl border px-2 py-1 text-xs font-black uppercase tracking-[0.14em] transition sm:px-2.5 ${
              hasMounted &&
              (pathname === "/mercado" || pathname.startsWith("/mercado/"))
                ? "border-rose-300 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-rose-500 text-white"
                : "border-rose-400/70 bg-gradient-to-r from-zinc-950 via-rose-950 to-fuchsia-950 text-rose-100 hover:border-rose-200 hover:from-rose-700 hover:via-fuchsia-700 hover:to-rose-600 hover:text-white"
            }`}
          >
            <Image
              src="/FondoMercado/team-rocket-r.png"
              alt=""
              width={36}
              height={36}
              className="h-8 w-8 rounded-[2px] object-contain sm:h-9 sm:w-9"
            />
            <span className="relative hidden leading-tight sm:block">
              Mercado
              <span className="block text-[10px] tracking-[0.22em] text-rose-200/90">
                Rocket
              </span>
            </span>
          </Link>
          <nav
          aria-label="Navegación principal"
          className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mx-auto flex w-max gap-1 rounded-xl border border-white/10 bg-slate-900/75 p-1 shadow-inner shadow-white/5">
            {navigation.map((item) => {
              if ("external" in item && item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </a>
                );
              }

              const prefixes = [item.href, ...(("aliases" in item && item.aliases) || [])];
              const active =
                hasMounted &&
                prefixes.some(
                  (href) =>
                    pathname === href ||
                    (href !== "/" && pathname.startsWith(`${href}/`)),
                );

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    active
                      ? "bg-gradient-to-r from-teal-300 via-cyan-300 to-violet-400 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        </div>
        <HeaderSession />
      </div>
    </header>
  );
}
