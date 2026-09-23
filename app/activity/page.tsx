import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import { getRecentOperations } from "@/lib/api";
import { ActivityClient } from "@/components/ActivityClient";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const hid = await requireHouseholdId();
  const db = await createClient();
  const ops = await getRecentOperations(db, hid, 50);

  return <ActivityClient ops={ops} />;
}
