import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_SIZE = 8 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function getOrganizer(request: Request) {
  if (!isSameOrigin(request)) {
    return { response: NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }) };
  }
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return { response: NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 }) };
    }
    if (player.role !== "organizer") {
      return {
        response: NextResponse.json(
          { error: "Solo la cuenta organizadora puede gestionar el concurso de bajitos." },
          { status: 403 },
        ),
      };
    }
    return { player };
  } catch {
    return { response: NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 503 }) };
  }
}

async function readBody(request: Request): Promise<unknown | NextResponse> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  }
  try {
    return await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const authorization = await getOrganizer(request);
  if (authorization.response) return authorization.response;

  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("short_contests")
    .select("id")
    .eq("status", "active")
    .maybeSingle();
  if (existing.error) {
    console.error("Failed to check active short contest:", existing.error.message);
    return NextResponse.json(
      { error: "No se pudo comprobar si hay un concurso activo. Aplica la migración de bajitos." },
      { status: 503 },
    );
  }
  if (existing.data) {
    return NextResponse.json(
      { error: "Ya hay un concurso de bajitos activo." },
      { status: 409 },
    );
  }

  const countResponse = await supabase
    .from("short_contests")
    .select("id", { count: "exact", head: true });
  if (countResponse.error) {
    console.error("Failed to number short contest:", countResponse.error.message);
    return NextResponse.json({ error: "No se pudo crear el concurso de bajitos." }, { status: 503 });
  }

  const insertResponse = await supabase
    .from("short_contests")
    .insert({
      name: `Concurso de bajitos ${(countResponse.count ?? 0) + 1}`,
      status: "active",
      created_by_player_id: authorization.player.id,
    })
    .select("id")
    .single();

  if (insertResponse.error) {
    console.error("Failed to start short contest:", insertResponse.error.message);
    const alreadyActive =
      insertResponse.error.code === "23505" ||
      insertResponse.error.message.toLowerCase().includes("unique");
    return NextResponse.json(
      {
        error: alreadyActive
          ? "Ya hay un concurso de bajitos activo."
          : "No se pudo empezar el concurso. Comprueba que la migración esté aplicada.",
      },
      { status: alreadyActive ? 409 : 503 },
    );
  }

  return NextResponse.json({ ok: true, id: insertResponse.data.id });
}

export async function PATCH(request: Request) {
  const authorization = await getOrganizer(request);
  if (authorization.response) return authorization.response;

  const body = await readBody(request);
  if (body instanceof NextResponse) return body;
  if (!isRecord(body) || typeof body.action !== "string") {
    return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (
    body.action === "end" &&
    typeof body.contestId === "string" &&
    UUID_PATTERN.test(body.contestId)
  ) {
    const response = await supabase
      .from("short_contests")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", body.contestId)
      .eq("status", "active")
      .select("id")
      .maybeSingle();
    if (response.error) {
      console.error("Failed to end short contest:", response.error.message);
      return NextResponse.json({ error: "No se pudo terminar el concurso de bajitos." }, { status: 503 });
    }
    if (!response.data) {
      return NextResponse.json(
        { error: "No hay un concurso activo con ese identificador." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "La operación no es válida." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const authorization = await getOrganizer(request);
  if (authorization.response) return authorization.response;

  const body = await readBody(request);
  if (body instanceof NextResponse) return body;
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (typeof body.entryId === "string" && UUID_PATTERN.test(body.entryId)) {
    const response = await supabase
      .from("short_contest_entries")
      .delete()
      .eq("id", body.entryId)
      .select("id")
      .maybeSingle();
    if (response.error) {
      console.error("Failed to delete short contest entry:", response.error.message);
      return NextResponse.json(
        { error: "No se pudo borrar la participación." },
        { status: 503 },
      );
    }
    if (!response.data) {
      return NextResponse.json({ error: "No se encontró esa participación." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  if (typeof body.contestId !== "string" || !UUID_PATTERN.test(body.contestId)) {
    return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });
  }

  const response = await supabase
    .from("short_contests")
    .delete()
    .eq("id", body.contestId)
    .eq("status", "ended")
    .select("id")
    .maybeSingle();

  if (response.error) {
    console.error("Failed to delete short contest:", response.error.message);
    return NextResponse.json(
      { error: "No se pudo borrar el concurso del historial." },
      { status: 503 },
    );
  }
  if (!response.data) {
    return NextResponse.json(
      { error: "Solo se pueden borrar concursos terminados del historial." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
