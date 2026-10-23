import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";

export async function GET() {
  try {
    return NextResponse.json({ player: await getCurrentPlayer() });
  } catch {
    return NextResponse.json(
      { error: "No se pudo validar la sesión." },
      { status: 503 },
    );
  }
}
