import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import * as api from "@/lib/api";
import { Card, CardHover, Badge, EmptyState, formatQty } from "@/components/ui";
import type { InventoryRow, ShoppingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function mondayOfWeek(d: Date): string {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x.toISOString().slice(0, 10);
}

const URGENCY_TONE: Record<string, "red" | "amber" | "neutral"> = {
  Expired: "red",
  Urgent: "amber",
  Watch: "neutral",
};

export default async function Dashboard() {
  const hid = await requireHouseholdId();
  const db = await createClient();

  const weekStart = mondayOfWeek(new Date());
  const weekEnd = new Date(weekStart + "T12:00:00");
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const [inventory, useSoon, needsCheck, shopping, activity, meals] =
    await Promise.all([
      api.getCurrentInventory(db),
      api.getUseSoon(db, 6),
      api.getNeedsCheck(db),
      api.getShoppingList(db, hid),
      api.getRecentOperations(db, hid, 8),
      api.getWeekMeals(db, hid, weekStart, weekEndStr),
    ]);

  const inv = inventory as unknown as InventoryRow[];
  const soon = useSoon as unknown as (InventoryRow & { urgency?: string })[];
  const toBuy = (shopping as unknown as ShoppingRow[]).filter((r) => !r.purchased).slice(0, 6);

  const mealCount = meals.length;
  const itemCount = new Set(inv.map((r) => r.item_id)).size;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Items on hand", value: itemCount, icon: "🫙", href: "/inventory", tone: "text-sage-700" },
    { label: "Use soon", value: soon.length, icon: "⏰", href: "/#use-soon", tone: "text-ember-600" },
    { label: "Need a check", value: needsCheck.length, icon: "🔍", href: "/inventory", tone: "text-honey-500" },
    { label: "To buy", value: toBuy.length, icon: "🛒", href: "/shopping", tone: "text-sage-700" },
  ];

  return (
    <div>
      <div className="texture-dots relative mb-6 overflow-hidden rounded-3xl bg-sage-800 px-6 py-8 text-cream-50 shadow-card sm:px-8 sm:py-10">
        <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cream-200/70">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {greeting}, chef.
        </h1>
        <p className="mt-2.5 max-w-md text-[0.9375rem] leading-relaxed text-cream-200/90">
          {mealCount > 0
            ? `${mealCount} meal${mealCount === 1 ? "" : "s"} planned this week. `
            : "Nothing planned this week yet. "}
          {itemCount > 0
            ? `${itemCount} items in your pantry.`
            : "Your pantry is waiting to be stocked."}
        </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl">
            <CardHover className="p-4 sm:p-5">
              <div className="text-[1.625rem] leading-none">{s.icon}</div>
              <div className={`font-display mt-3 text-[2rem] font-semibold leading-none ${s.tone}`}>
                {s.value}
              </div>
              <div className="mt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-bark-500">
                {s.label}
              </div>
            </CardHover>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">This week&apos;s meals</h2>
            <Link href="/plan" className="text-sm font-medium text-sage-700 hover:underline">
              Open planner →
            </Link>
          </div>
          {mealCount === 0 ? (
            <EmptyState icon="🍽️" title="No meals planned yet" body="Head to the planner to sketch out the week." />
          ) : (
            <Card className="divide-y divide-bark-900/5">
              {meals.slice(0, 5).map((m) => {
                const comps = (m.meal_components ?? []) as {
                  kind: string;
                  freeform_text: string | null;
                  recipes: { name: string } | null;
                }[];
                return (
                  <div key={m.id as string} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date((m.day_date as string) + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <p className="text-xs text-bark-500">{(m.meal_slots as { name?: string } | null)?.name}</p>
                    </div>
                    <div className="text-right text-sm">
                      {comps.map((c, i) => (
                        <p key={i} className="font-medium">
                          {c.kind === "recipe" ? c.recipes?.name : c.freeform_text}
                          {(m.cooked_at as string | null) && (
                            <span className="ml-1.5 text-xs text-sage-600">✓ cooked</span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Recent activity</h2>
            <Link href="/activity" className="text-sm font-medium text-sage-700 hover:underline">
              All activity →
            </Link>
          </div>
          {activity.length === 0 ? (
            <EmptyState icon="📝" title="Quiet so far" body="Stock, cook, or shop and it'll show up here." />
          ) : (
            <Card className="divide-y divide-bark-900/5">
              {activity.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.summary ?? a.kind}</p>
                    <p className="text-xs text-bark-500">
                      {new Date(a.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  {a.undone_at && <Badge tone="neutral">undone</Badge>}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {soon.length > 0 && (
        <div className="mt-6" id="use-soon">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Use soon</h2>
            <Link href="/inventory" className="text-sm font-medium text-sage-700 hover:underline">
              All items →
            </Link>
          </div>
          <Card className="divide-y divide-bark-900/5">
            {soon.map((r) => (
              <div key={r.lot_id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{r.item_name}</p>
                  <p className="text-xs text-bark-500">
                    {r.expires_on
                      ? `Expires ${new Date((r.expires_on as string) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : "Expiring soon"}
                    {r.quantity_is_estimate ? " · estimated" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.urgency && (
                    <Badge tone={URGENCY_TONE[r.urgency as string] ?? "neutral"}>{r.urgency}</Badge>
                  )}
                  <Badge tone="green">{formatQty(r.display_quantity, r.display_unit)}</Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-display mb-3 text-xl font-semibold">More</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/receipts", label: "Receipts", icon: "🧾", desc: "Stock & prices" },
            { href: "/prices", label: "Prices", icon: "💰", desc: "Store compare" },
            { href: "/activity", label: "Activity", icon: "📋", desc: "History & undo" },
            { href: "/settings", label: "Settings", icon: "⚙️", desc: "Household" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="rounded-2xl">
              <CardHover className="p-4">
                <div className="text-2xl leading-none">{l.icon}</div>
                <p className="mt-2 text-sm font-semibold">{l.label}</p>
                <p className="text-xs text-bark-500">{l.desc}</p>
              </CardHover>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
