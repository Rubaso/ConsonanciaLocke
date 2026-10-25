"use client";

import { useEffect, useState } from "react";

const lockeStartTime = new Date("2026-10-25T23:00:00.000Z").getTime();

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  started: boolean;
};

function getCountdown(now: number): Countdown {
  const remaining = Math.max(0, lockeStartTime - now);
  const totalSeconds = Math.floor(remaining / 1000);

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    started: remaining === 0,
  };
}

const units = [
  { key: "days", label: "días" },
  { key: "hours", label: "horas" },
  { key: "minutes", label: "minutos" },
  { key: "seconds", label: "segundos" },
] as const;

export default function LockeCountdown() {
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    const update = () => setCountdown(getCountdown(Date.now()));
    update();
    const intervalId = window.setInterval(update, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section
      aria-label="Cuenta atrás para el inicio del Locke"
      className="relative isolate overflow-hidden rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-950/90 via-slate-950 to-violet-950/80 px-5 py-6 shadow-[0_20px_70px_rgba(8,145,178,0.12)] sm:px-8 sm:py-8"
    >
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"
      />
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-300">
          La aventura está a punto de empezar
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl">
          Cuenta atrás para el Locke
        </h2>
        <p className="mt-2 text-sm text-cyan-100/70">
          Lunes, 26 de octubre · 00:00 · Hora peninsular
        </p>

        {countdown?.started ? (
          <p className="mt-7 text-2xl font-black text-amber-200 sm:text-4xl">
            ¡El Locke ha comenzado! Que empiece la aventura
          </p>
        ) : (
          <div
            aria-label={
              countdown
                ? `${countdown.days} días, ${countdown.hours} horas, ${countdown.minutes} minutos y ${countdown.seconds} segundos`
                : "Calculando tiempo restante"
            }
            className="mt-7 grid grid-cols-4 gap-2 sm:gap-4"
            role="timer"
          >
            {units.map(({ key, label }) => (
              <div
                className="rounded-xl border border-white/10 bg-black/25 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-4"
                key={key}
              >
                <p className="font-mono text-3xl font-black tabular-nums text-white sm:text-5xl">
                  {countdown
                    ? String(countdown[key]).padStart(2, "0")
                    : "--"}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-cyan-100/60 sm:text-xs">
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
