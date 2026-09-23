import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import * as api from "@/lib/api";
import { Card, Badge, EmptyState, formatQty } from "@/components/ui";
import { VoidReceiptButton } from "@/components/VoidReceiptButton";

export const dynamic = "force-dynamic";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hid = await requireHouseholdId();
  const db = await createClient();

  const detail = await api.getReceiptDetail(db, hid, id);
  if (!detail.receipt) notFound();
  const d = detail.receipt;
  const lines = detail.lines;
  const voided = Boolean(d.voided_at);

  return (
    <div>
      <Link href="/receipts" className="mb-4 inline-block text-sm font-medium text-sage-700 hover:underline">
        ← All receipts
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {d.store as string}
            {voided && (
              <span className="ml-3 align-middle text-lg font-sans font-medium text-bark-400">(voided)</span>
            )}
          </h1>
          <p className="mt-1 text-sm text-bark-500">
            {new Date((d.purchased_on as string) + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <p className="font-display text-3xl font-semibold">
          {(d.total as number | null) != null ? `$${Number(d.total).toFixed(2)}` : "—"}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="px-4 py-3">
          <p className="text-xs text-bark-500">Subtotal</p>
          <p className="font-display text-xl font-semibold">${Number(d.subtotal ?? 0).toFixed(2)}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs text-bark-500">Tax</p>
          <p className="font-display text-xl font-semibold">${Number(d.tax ?? 0).toFixed(2)}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs text-bark-500">Discounts</p>
          <p className="font-display text-xl font-semibold">−${Number(d.discount_total ?? 0).toFixed(2)}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs text-bark-500">Lines</p>
          <p className="font-display text-xl font-semibold">{lines.length}</p>
        </Card>
      </div>

      {lines.length === 0 ? (
        <EmptyState icon="🧾" title="No lines" body="This receipt has no recorded lines." />
      ) : (
        <Card className="divide-y divide-bark-900/5">
          {lines.map((l, i) => {
            const discount = Number(l.discount_total ?? 0);
            return (
              <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {(l.item_name as string) ?? (l.original_text as string)}
                  </p>
                  {Boolean(l.item_name) && l.original_text !== l.item_name && (
                    <p className="truncate text-xs text-bark-400">“{l.original_text as string}”</p>
                  )}
                  <p className="mt-0.5 text-xs text-bark-500">
                    {formatQty(Number(l.quantity ?? 0), l.unit as string | null)}
                    {discount > 0 && (
                      <span className="ml-2 font-medium text-ember-600">−${discount.toFixed(2)}</span>
                    )}
                    {Boolean(l.promo_kind) && <Badge tone="amber">{String(l.promo_kind).replace(/_/g, " ")}</Badge>}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  ${Number(l.net_price ?? 0).toFixed(2)}
                </p>
              </div>
            );
          })}
        </Card>
      )}

      <div className="mt-6">
        {!voided && <VoidReceiptButton receiptId={id} />}
        {voided && (
          <p className="rounded-2xl bg-cream-100 px-4 py-3 text-sm text-bark-500 ring-1 ring-bark-900/10">
            Voided on {new Date((d.voided_at as string)).toLocaleString()}.
            {d.void_reason ? ` Reason: ${d.void_reason as string}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
