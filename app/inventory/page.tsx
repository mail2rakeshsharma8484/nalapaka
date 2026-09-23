import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import * as api from "@/lib/api";
import { PageHeader } from "@/components/ui";
import { InventoryClient } from "@/components/InventoryClient";
import type { InventoryRow, ItemRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const hid = await requireHouseholdId();
  const db = await createClient();

  const [rows, items] = await Promise.all([
    api.getCurrentInventory(db),
    api.getItems(db, hid),
  ]);

  return (
    <div>
      <PageHeader
        title="Pantry"
        subtitle="Everything on your shelves, with honest quantities."
      />
      <InventoryClient
        rows={rows as unknown as InventoryRow[]}
        items={items as unknown as ItemRow[]}
      />
    </div>
  );
}
