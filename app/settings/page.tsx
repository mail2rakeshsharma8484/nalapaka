import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import { getHousehold, getHouseholdMembers, getPendingInvites } from "@/lib/api";
import { SettingsClient } from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const hid = await requireHouseholdId();
  const db = await createClient();

  const [household, members, invites] = await Promise.all([
    getHousehold(db, hid),
    getHouseholdMembers(db, hid),
    getPendingInvites(db, hid),
  ]);

  return (
    <SettingsClient
      household={(household ?? {}) as Record<string, unknown>}
      members={(members ?? []) as Record<string, unknown>[]}
      invites={(invites ?? []) as Record<string, unknown>[]}
    />
  );
}
