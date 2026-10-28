import { redirect } from "next/navigation";

export const metadata = {
  title: "Historial de pesca | EKLOCKE",
  description: "Concursos de pesca archivados de Pokémon Consonancia.",
};

export default function FishingHistoryPage() {
  redirect("/torneo/historial#concurso-pesca");
}
