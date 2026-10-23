import { NextResponse } from "next/server";
import {
  getActivityPageData,
  type ActivityFilter,
  type ActivityCursor,
} from "@/lib/supabase/activity-data";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const ACTIVITY_FILTERS = new Set<ActivityFilter>([
  "all",
  "capture",
  "death",
  "medal",
  "trade",
  "gacha",
  "shiny",
]);

function isActivityFilter(value: string): value is ActivityFilter {
  return ACTIVITY_FILTERS.has(value as ActivityFilter);
}

function parseCursor(value: string | null): ActivityCursor | null | undefined {
  if (value === null) return null;

  const separator = value.lastIndexOf("|");
  if (separator < 1) return undefined;

  const occurredAt = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (
    !TIMESTAMP_PATTERN.test(occurredAt) ||
    Number.isNaN(Date.parse(occurredAt)) ||
    !UUID_PATTERN.test(id)
  ) {
    return undefined;
  }

  return { occurredAt, id };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const cursor = parseCursor(searchParams.get("cursor"));
  if (cursor === undefined) {
    return NextResponse.json({ error: "Cursor de actividad no válido." }, { status: 400 });
  }
  const filterValue = searchParams.get("filter") ?? "all";
  if (!isActivityFilter(filterValue)) {
    return NextResponse.json({ error: "Filtro de actividad no válido." }, { status: 400 });
  }

  const result = await getActivityPageData(
    cursor ?? undefined,
    filterValue,
  );
  if (result.status !== "ready") {
    return NextResponse.json(
      {
        error:
          result.status === "not-configured"
            ? "La actividad no está configurada."
            : "No se pudo cargar la actividad.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      events: result.events,
      nextCursor: result.nextCursor,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
