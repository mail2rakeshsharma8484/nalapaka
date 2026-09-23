import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import * as api from "@/lib/api";
import { PageHeader } from "@/components/ui";
import { ReceiptsClient } from "@/components/ReceiptsClient";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const hid = await requireHouseholdId();
  const db = await createClient();

  const [receipts, unresolved] = await Promise.all([
    api.getReceipts(db, hid),
    api.getUnresolvedLines(db, hid),
  ]);

  return (
    <div>
      <PageHeader
        title="Receipts"
        subtitle="Snap in the totals and lines — your pantry stocks itself, and we track every price."
      />
      <ReceiptsClient
        receipts={receipts as Record<string, unknown>[]}
        unresolved={unresolved as Record<string, unknown>[]}
        initialTab={tab === "add" || tab === "unresolved" ? tab : undefined}
      />
    </div>
  );
}
