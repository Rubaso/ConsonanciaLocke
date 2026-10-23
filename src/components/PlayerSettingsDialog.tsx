"use client";

import { useEffect, useRef } from "react";
import PlayerSettingsForm from "@/components/PlayerSettingsForm";

type PlayerSettingsDialogProps = {
  open: boolean;
  color: string;
  twitchUsername: string | null;
  onClose: () => void;
};

export default function PlayerSettingsDialog({
  open,
  color,
  twitchUsername,
  onClose,
}: PlayerSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="player-settings-title"
      className="fixed inset-0 m-0 h-dvh w-screen max-w-none bg-transparent p-4 backdrop:bg-black/75"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className="flex min-h-full items-center justify-center">
        <section className="w-full max-w-md rounded-2xl border border-violet-300/20 bg-[#11131c] p-5 shadow-2xl shadow-black/60">
          <header className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="player-settings-title"
              className="text-xs font-black uppercase tracking-wider text-teal-300"
            >
              Ajustes
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded px-1 text-sm text-slate-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300"
            >
              Cerrar
            </button>
          </header>
          <PlayerSettingsForm
            initialColor={color}
            initialTwitchUsername={twitchUsername}
          />
        </section>
      </div>
    </dialog>
  );
}
