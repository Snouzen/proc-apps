import { ActivityDetailPage } from "@/components/ActivitySummary";

export default async function Page({ params, searchParams }: { params: Promise<{ activityId: string }>; searchParams: Promise<{ recordId?: string }> }) {
  const [{ activityId }, { recordId }] = await Promise.all([params, searchParams]);
  return <ActivityDetailPage activityId={activityId} recordId={typeof recordId === "string" ? recordId : undefined} />;
}
