import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHouseholdId } from "@/lib/household";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hid = await getHouseholdId();
  if (hid) redirect("/");

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-1">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-sage-700 text-4xl shadow-[0_4px_16px_rgb(65_86_54/0.35)]">
          🍳
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Set up your kitchen
        </h1>
        <p className="mt-2 text-bark-500">
          One quick step and you&apos;re ready to stock, shop, and cook.
        </p>
      </div>

      <OnboardingForm />

      <p className="mt-5 text-center text-xs text-bark-400">
        You can change these later — the important part is getting cooking.
      </p>
    </div>
  );
}
