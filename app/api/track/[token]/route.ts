import { NextResponse } from "next/server";
import { verifyTrackingToken } from "@/lib/tracking-token";
import { getTrackingData } from "@/lib/tracking-data";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claims = await verifyTrackingToken(token);
  if (!claims) return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });

  const data = await getTrackingData(claims);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}
