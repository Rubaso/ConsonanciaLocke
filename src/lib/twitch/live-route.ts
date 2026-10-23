import { NextResponse } from "next/server";
import {
  getLiveTwitchPlayers,
  hasTwitchCronSecret,
  isValidTwitchCronAuthorization,
  refreshTwitchLiveStatus,
} from "@/lib/twitch/live-status";

export async function handleTwitchLiveRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    if (!hasTwitchCronSecret()) {
      return NextResponse.json(
        { error: "Falta configurar el secreto del cronjob." },
        { status: 503 },
      );
    }
    if (!isValidTwitchCronAuthorization(authorization)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    try {
      const result = await refreshTwitchLiveStatus();
      if (result.status === "not-configured") {
        return NextResponse.json(
          { error: "Faltan las credenciales de la aplicación de Twitch." },
          { status: 503 },
        );
      }
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    } catch (error) {
      console.error(
        "Failed to refresh Twitch live status:",
        error instanceof Error ? error.message : error,
      );
      return NextResponse.json(
        { error: "No se pudo actualizar el estado de Twitch." },
        { status: 503 },
      );
    }
  }

  try {
    const result = await getLiveTwitchPlayers();
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error(
      "Failed to check Twitch live status:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { status: "error", players: [] },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
