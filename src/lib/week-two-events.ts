export const WEEK_TWO_EVENTS = [
  {
    slug: "el-loco-de-la-colina",
    name: "El loco de la colina",
    summary:
      "Completa un gimnasio o un jefe opcional de la lista de HARDLOCKE con solo 3 Pokémon en el equipo.",
    details:
      "El jugador o los jugadores que lo completen ganarán el reto y obtendrán una recompensa.",
    backgroundImage: "/FondoEventos/LocoDeLaColina.jpg",
    dates: "Tramo 2 · del 2 al 9 de noviembre de 2026",
  },
  {
    slug: "arqueologo-novato",
    name: "Arqueólogo novato",
    summary:
      "Vuelve a Gruta Sisma y captura como captura extra el primer Pokémon que aparezca.",
    details:
      "Después de capturarlo, puedes sacrificarlo para participar en el evento (déjalo en la Caja 5) o quedártelo. Las condiciones para ganar son sorpresa: podría ser el Pokémon con menos o más estadísticas totales, o con menos o más debilidades. Zigurath no puede participar en el reto; solo puede hacer la captura. La recompensa estará relacionada con Pokémon y capturas.",
    backgroundImage: "/FondoEventos/Plesiofosil.png",
    dates: "Tramo 2 · del 2 al 9 de noviembre de 2026",
  },
] as const;

export const MYSTERY_EVENT_TEASER = {
  name: "Enigma Carmesí",
  summary: "Pronto sabréis más.",
} as const;

export function getWeekTwoEvent(slug: string) {
  return WEEK_TWO_EVENTS.find((event) => event.slug === slug) ?? null;
}
