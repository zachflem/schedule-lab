import { MobileDocket } from "@/components/docket/MobileDocket";

// Normally, jobId would be passed as a path parameter (e.g. /docket/[id])
// but for this MVP view, we will just use a query param or mock ID.
export default async function DocketViewPage({
    searchParams,
}: {
    searchParams: Promise<{ jobId?: string }>;
}) {
    const { jobId } = await searchParams;
    const finalJobId = jobId || "DEMO-JOB-123456";

    return <MobileDocket jobId={finalJobId} />;
}
