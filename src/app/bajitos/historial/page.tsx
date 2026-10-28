import { redirect } from "next/navigation";

export const metadata = {
  title: "Historial de bajitos | EKLOCKE",
  description: "Concursos de bajitos archivados de Pokémon Consonancia.",
};

export default function ShortHistoryPage() {
  redirect("/torneo/historial#concurso-bajitos");
}
