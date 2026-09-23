import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import * as api from "@/lib/api";
import { ShoppingClient } from "@/components/ShoppingClient";
import type { ShoppingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const hid = await requireHouseholdId();
  const db = await createClient();

  const rows = await api.getShoppingList(db, hid);
  const sorted = [...rows].sort((a, b) => {
    const pa = a.purchased ? 1 : 0;
    const pb = b.purchased ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return (
      new Date(a.created_at as string).getTime() -
      new Date(b.created_at as string).getTime()
    );
  });

  return <ShoppingClient rows={sorted as unknown as ShoppingRow[]} />;
}
