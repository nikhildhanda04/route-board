import { notFound } from "next/navigation";
import { verifyTrackingToken } from "@/lib/tracking-token";
import { getTrackingData } from "@/lib/tracking-data";
import LiveTrackClient from "./LiveTrackClient";

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claims = await verifyTrackingToken(token);
  if (!claims) notFound();

  const data = await getTrackingData(claims);
  if (!data) notFound();

  return <LiveTrackClient token={token} initialData={data} />;
}
