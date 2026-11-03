import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const EVENT_SLUGS = ["el-loco-de-la-colina", "arqueologo-novato"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEventSlug(value: string): value is (typeof EVENT_SLUGS)[number] {
  return EVENT_SLUGS.some((eventSlug) => eventSlug === value);
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

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
  }
  if (
    !isRecord(body) ||
    typeof body.eventSlug !== "string" ||
    !isEventSlug(body.eventSlug)
  ) {
    return NextResponse.json({ error: "El evento no es válido." }, { status: 400 });
  }

  let player;
  try {
    player = await getCurrentPlayer();
  } catch {
    return NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 503 });
  }
  if (!player) {
    return NextResponse.json({ error: "Inicia sesión para terminar el evento." }, { status: 401 });
  }
  if (player.role !== "organizer") {
    return NextResponse.json({ error: "Solo la organización puede terminar eventos." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const updateResponse = await supabase
    .from("week_two_event_control")
    .update({ ended_at: new Date().toISOString() })
    .eq("event_slug", body.eventSlug)
    .is("ended_at", null)
    .select("ended_at")
    .maybeSingle();

  if (updateResponse.error) {
    console.error("Failed to end Week 2 event:", updateResponse.error.message);
    return NextResponse.json(
      { error: "No se pudo terminar el evento. Comprueba que la migración esté aplicada." },
      { status: 503 },
    );
  }

  if (updateResponse.data) {
    return NextResponse.json({ ok: true, endedAt: updateResponse.data.ended_at });
  }

  const currentResponse = await supabase
    .from("week_two_event_control")
    .select("ended_at")
    .eq("event_slug", body.eventSlug)
    .maybeSingle();

  if (currentResponse.error || !currentResponse.data) {
    if (currentResponse.error) {
      console.error("Failed to read Week 2 event status:", currentResponse.error.message);
    }
    return NextResponse.json(
      { error: "No se pudo comprobar el estado del evento. Comprueba que la migración esté aplicada." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, endedAt: currentResponse.data.ended_at });
}
