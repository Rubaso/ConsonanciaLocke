import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { parseConsonanciaSave } from "@/lib/save-parser";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_SAVE_SIZE = 4 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_SAVE_SIZE + 64 * 1024;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json({ error: "Selecciona un archivo de partida." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "El save supera el límite de 4 MB." }, { status: 413 });
  }

  let player;
  try {
    player = await getCurrentPlayer();
  } catch {
    return NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 503 });
  }
  if (!player) {
    return NextResponse.json({ error: "Inicia sesión para importar tu save." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo enviado." }, { status: 400 });
  }

  const file = formData.get("save");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecciona un archivo de partida." }, { status: 400 });
  }
  if (file.size > MAX_SAVE_SIZE) {
    return NextResponse.json({ error: "El save supera el límite de 4 MB." }, { status: 413 });
  }
  if (!file.name.toLowerCase().endsWith(".rxdata")) {
    return NextResponse.json({ error: "El archivo debe tener extensión .rxdata." }, { status: 415 });
  }

  let save;
  try {
    save = parseConsonanciaSave(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo interpretar el save de Consonancia.",
      },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const importResponse = await supabase.rpc("import_player_save_with_dead_boxes", {
    p_player_id: player.id,
    p_pokemon: save.pokemon,
    p_medal_ids: save.medalIds,
    p_game_trainer_id: save.gameTrainerName,
  });

  if (importResponse.error) {
    console.error("Failed to import Consonancia save:", importResponse.error.message);
    return NextResponse.json(
      { error: "No se pudo guardar la importación. Comprueba que la migración de importación esté aplicada." },
      { status: 503 },
    );
  }

  const summary = importResponse.data;
  if (
    typeof summary !== "object" ||
    summary === null ||
    typeof summary.pokemonFound !== "number" ||
    typeof summary.pokemonAdded !== "number" ||
    typeof summary.pokemonUpdated !== "number" ||
    typeof summary.medalsAdded !== "number" ||
    typeof summary.pokemonInDeadBoxes !== "number"
  ) {
    console.error("Supabase returned an invalid save import summary.");
    return NextResponse.json({ error: "La importación terminó con una respuesta no válida." }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    trainerName: save.trainerName,
    ...summary,
    unknownMapIds: save.unknownMapIds,
    hasStorage: save.hasStorage,
  });
}
