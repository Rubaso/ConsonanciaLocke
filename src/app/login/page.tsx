import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Acceso | EKLOCKE",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Cuenta
        </p>
        <h1 className="text-3xl font-black tracking-tight text-zinc-100">
          Acceso de jugador
        </h1>
        <p className="text-sm text-zinc-400">
          Inicia sesión para gestionar tu partida.
        </p>
      </section>
      <LoginForm />
    </div>
  );
}
