import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import * as api from "@/lib/api";
import { Card, Badge, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const hid = await requireHouseholdId();
  const db = await createClient();

  const [best, discounts, observations] = await Promise.all([
    api.getBestStores(db, hid),
    api.getDiscountsByStore(db, hid),
    api.getRecentPriceObservations(db, hid, 25),
  ]);

  const storeRows = (best ?? []) as Record<string, unknown>[];
  const discountRows = (discounts ?? []) as Record<string, unknown>[];
  const obsRows = (observations ?? []) as Record<string, unknown>[];

  // Group best-store rows by item.
  const byItem = new Map<string, Record<string, unknown>[]>();
  for (const r of storeRows) {
    const name = String(r.item_name ?? "?");
    if (!byItem.has(name)) byItem.set(name, []);
    byItem.get(name)!.push(r);
  }
  const itemNames = [...byItem.keys()].sort();

  return (
    <div>
      <PageHeader
        title="Price insights"
        subtitle="Where your money goes, per store — built from your receipts."
      />

      {obsRows.length === 0 ? (
        <EmptyState
          icon="💰"
          title="No price history yet"
          body="Add receipts and we'll compare stores, flag discounts, and watch prices."
        />
      ) : (
        <div className="space-y-8">
          {itemNames.length > 0 && (
            <section>
              <h2 className="font-display mb-3 text-xl font-semibold">Best store by item</h2>
              <Card className="divide-y divide-bark-900/5">
                {itemNames.map((name) => {
                  const rows = byItem.get(name)!;
                  return (
                    <div key={name} className="px-4 py-3">
                      <p className="font-medium">{name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {rows.map((r, i) => (
                          <span
                            key={i}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                              i === 0
                                ? "bg-sage-700 text-white ring-sage-700"
                                : "bg-white text-bark-600 ring-bark-900/15"
                            }`}
                            title={`${r.observation_count} observations`}
                          >
                            {i === 0 && "★ "}
                            {r.store as string} · ${Number(r.avg_effective_price ?? 0).toFixed(2)}/
                            {(r.canonical_unit as string) ?? ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </Card>
              <p className="mt-2 text-xs text-bark-500">
                Effective prices use your canonical units, so pack sizes compare fairly.
              </p>
            </section>
          )}

          {discountRows.length > 0 && (
            <section>
              <h2 className="font-display mb-3 text-xl font-semibold">Discounts by store</h2>
              <Card className="divide-y divide-bark-900/5">
                {discountRows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium">{r.store as string}</p>
                      <p className="text-xs text-bark-500">
                        {(r.receipts_with_discounts as number) ?? 0} of {(r.total_receipts as number) ?? 0} receipts
                      </p>
                    </div>
                    <Badge tone="amber">
                      avg −${Number(r.avg_discount ?? 0).toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {obsRows.length > 0 && (
            <section>
              <h2 className="font-display mb-3 text-xl font-semibold">Recent price observations</h2>
              <Card className="divide-y divide-bark-900/5">
                {obsRows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.item_name as string}</p>
                      <p className="text-xs text-bark-500">
                        {r.store as string} ·{" "}
                        {new Date((r.purchased_on as string) + "T12:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      ${Number(r.effective_price ?? 0).toFixed(2)}
                      <span className="font-normal text-bark-500">/{(r.canonical_unit as string) ?? ""}</span>
                    </p>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
