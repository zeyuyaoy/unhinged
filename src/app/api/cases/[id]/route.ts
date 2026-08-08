import { NextResponse } from "next/server";
import { getDeviceIdentity } from "@/lib/session";
import { getCase, NotFoundError } from "@/lib/store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { ownerHash } = await getDeviceIdentity();
  try {
    return NextResponse.json({ state: await getCase(ownerHash, id) });
  } catch (error) {
    if (error instanceof NotFoundError) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    throw error;
  }
}
