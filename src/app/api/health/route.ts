import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = await checkDatabaseHealth();
    return NextResponse.json({ ok: true, database });
  } catch {
    return NextResponse.json(
      { ok: false, database: { configured: false, storage: "unavailable" } },
      { status: 503 },
    );
  }
}
