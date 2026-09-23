"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addShoppingItem,
  approveShoppingItems,
  markPurchased,
} from "@/lib/actions";
import {
  Card,
  PageHeader,
  Badge,
  EmptyState,
  Field,
  inputClass,
  PrimaryButton,
  GhostButton,
  actionNotice,
  formatQty,
  displayName,
} from "@/components/ui";
import type { ShoppingRow } from "@/lib/types";

function RowCheck({
  row,
  checked,
  onToggle,
}: {
  row: ShoppingRow;
  checked: boolean;
  onToggle: () => void;
}) {
  const needsApproval = row.source === "MealPlanner" && !row.user_approved;
  return (
    <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-cream-100/60 has-checked:bg-sage-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Select ${displayName(row)}`}
        className="h-5 w-5 shrink-0 cursor-pointer accent-sage-700"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName(row)}</p>
        <p className="text-xs text-bark-500">
          {formatQty(row.quantity, row.unit)}
          {row.reason ? ` · ${row.reason}` : ""}
        </p>
      </div>
      {needsApproval ? (
        <Badge tone="amber">needs approval</Badge>
      ) : row.source === "MealPlanner" ? (
        <Badge tone="blue">meal plan</Badge>
      ) : null}
    </label>
  );
}

export function ShoppingClient({ rows }: { rows: ShoppingRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const pending = rows.filter((r) => !r.purchased);
  const purchased = rows.filter((r) => r.purchased);
  const needsApproval = pending.filter((r) => r.source === "MealPlanner" && !r.user_approved);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run(label: string, fn: () => Promise<{ ok: boolean; message?: string; operationId?: string }>) {
    setBusy(label);
    const r = await fn();
    setBusy(null);
    actionNotice(r);
    if (r.ok) {
      setSelected(new Set());
      router.refresh();
    }
  }

  return (
    <div>
      <PageHeader
        title="Shopping list"
        subtitle="Proposed items need your approval first — shopping never touches the pantry."
      />

      {/* add manually */}
      <Card className="mb-5 p-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            run("add", () =>
              addShoppingItem(name.trim(), qty ? parseFloat(qty) : undefined, unit.trim() || undefined)
            ).then(() => setName(""));
          }}
        >
          <div className="flex-1">
            <Field label="Item">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Milk" required className={inputClass} />
            </Field>
          </div>
          <div className="w-28">
            <Field label="Qty">
              <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="0" step="any" placeholder="1" className={inputClass} inputMode="decimal" />
            </Field>
          </div>
          <div className="w-28">
            <Field label="Unit">
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="L" className={inputClass} />
            </Field>
          </div>
          <PrimaryButton type="submit" disabled={busy !== null}>
            {busy === "add" ? "Adding…" : "Add"}
          </PrimaryButton>
        </form>
      </Card>

      {/* bulk actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-sage-100 px-4 py-3">
          <span className="text-sm font-medium text-sage-800">
            {selected.size} selected
          </span>
          <div className="ml-auto flex gap-2">
            <GhostButton
              className="!py-1.5 text-xs"
              disabled={busy !== null}
              onClick={() => run("approve", () => approveShoppingItems([...selected]))}
            >
              {busy === "approve" ? "Approving…" : "Approve"}
            </GhostButton>
            <PrimaryButton
              className="!py-1.5 text-xs"
              disabled={busy !== null}
              onClick={() => run("buy", () => markPurchased([...selected]))}
            >
              {busy === "buy" ? "Saving…" : "Mark purchased"}
            </PrimaryButton>
          </div>
        </div>
      )}

      <h2 className="font-display mb-2 text-lg font-semibold">
        To buy <span className="text-sm font-normal text-bark-500">({pending.length})</span>
      </h2>
      {pending.length === 0 ? (
        <EmptyState icon="🛒" title="List is clear" body="Add something above, or propose items from a meal plan." />
      ) : (
        <Card className="mb-6 divide-y divide-bark-900/5">
          {pending.map((r) => (
            <RowCheck key={r.id} row={r} checked={selected.has(r.id)} onToggle={() => toggle(r.id)} />
          ))}
        </Card>
      )}

      {needsApproval.length > 0 && (
        <p className="mb-6 rounded-2xl bg-ember-50 px-4 py-3 text-sm text-ember-700 ring-1 ring-ember-500/20">
          ⚠️ {needsApproval.length} meal-plan item{needsApproval.length === 1 ? "" : "s"} waiting for approval —
          they can&apos;t be marked purchased until you approve them.
        </p>
      )}

      {purchased.length > 0 && (
        <>
          <h2 className="font-display mb-2 text-lg font-semibold">
            Purchased <span className="text-sm font-normal text-bark-500">({purchased.length})</span>
          </h2>
          <Card className="divide-y divide-bark-900/5 opacity-70">
            {purchased.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-sm text-bark-500 line-through">{displayName(r)}</p>
                <span className="text-xs text-bark-500">{formatQty(r.quantity, r.unit)}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
