import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import * as api from "@/lib/api";
import { PageHeader } from "@/components/ui";
import { PlanClient } from "@/components/PlanClient";
import type { PlannedMealRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function mondayOf(str?: string): string {
  const base = str ? new Date(str + "T12:00:00") : new Date();
  if (isNaN(base.getTime())) return mondayOf(undefined);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  return base.toISOString().slice(0, 10);
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const hid = await requireHouseholdId();
  const db = await createClient();

  const weekStart = mondayOf(week);
  const start = new Date(weekStart + "T12:00:00");
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const prevWeek = new Date(start);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(start);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [slots, recipes, rawMeals] = await Promise.all([
    api.getMealSlots(db, hid),
    api.getRecipes(db, hid),
    api.getWeekMeals(db, hid, weekStart, weekEnd.toISOString().slice(0, 10)),
  ]);

  const meals: PlannedMealRow[] = rawMeals.map((m) => ({
    id: m.id as string,
    day_date: m.day_date as string,
    state: m.state as string,
    cooked_at: (m.cooked_at as string | null) ?? null,
    slot_name: ((m.meal_slots as { name?: string } | null)?.name ?? "Meal") as string,
    slot_sort: ((m.meal_slots as { sort_order?: number } | null)?.sort_order ?? 0) as number,
    components: (((m.meal_components as Record<string, unknown>[]) ?? []) as {
      kind: string;
      recipe_id: string | null;
      freeform_text: string | null;
      recipes: { name?: string } | null;
    }[]).map((c) => ({
      kind: c.kind,
      recipe_id: c.recipe_id,
      recipe_name: c.recipes?.name ?? null,
      freeform_text: c.freeform_text,
    })),
  }));

  return (
    <div>
      <PageHeader
        title="Meal plan"
        subtitle={`Week of ${new Date(weekStart + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}`}
        action={
          <div className="flex gap-2">
            <Link
              href={`/plan?week=${prevWeek.toISOString().slice(0, 10)}`}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-bark-700 ring-1 ring-bark-900/15 hover:bg-cream-100"
            >
              ←
            </Link>
            <Link
              href="/plan"
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-bark-700 ring-1 ring-bark-900/15 hover:bg-cream-100"
            >
              This week
            </Link>
            <Link
              href={`/plan?week=${nextWeek.toISOString().slice(0, 10)}`}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-bark-700 ring-1 ring-bark-900/15 hover:bg-cream-100"
            >
              →
            </Link>
          </div>
        }
      />
      <PlanClient
        days={days}
        slots={slots.map((s) => s.name as string)}
        meals={meals}
        recipes={recipes.map((r) => ({ id: r.id as string, name: r.name as string }))}
        weekStart={weekStart}
      />
    </div>
  );
}
