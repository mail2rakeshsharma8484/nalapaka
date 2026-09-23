import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

/**
 * Resolve the signed-in user's household id, or null when they don't have
 * one yet (new users go through /onboarding).
 */
export async function getHouseholdId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: memberships, error: memberError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1);

  if (memberError) throw new Error(memberError.message);
  if (memberships && memberships.length > 0) {
    return memberships[0].household_id as string;
  }
  return null;
}

/** Like getHouseholdId, but sends household-less users to onboarding. */
export async function requireHouseholdId(): Promise<string> {
  const hid = await getHouseholdId();
  if (!hid) redirect("/onboarding");
  return hid;
}
