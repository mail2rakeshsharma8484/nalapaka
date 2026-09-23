"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addStock,
  recordConsumption,
  createItem,
} from "@/lib/actions";
import {
  CardHover,
  Badge,
  EmptyState,
  Field,
  inputClass,
  PrimaryButton,
  GhostButton,
  Modal,
  actionNotice,
  formatQty,
} from "@/components/ui";
import type { InventoryRow, ItemRow } from "@/lib/types";

interface GroupedItem {
  item_id: string;
  item_name: string;
  category: string | null;
  canonical_unit: string;
  lots: InventoryRow[];
  total: number;
  display_unit: string | null;
}

function QtyForm({
  label,
  defaultUnit,
  submitLabel,
  onSubmit,
}: {
  label: string;
  defaultUnit: string;
  submitLabel: string;
  onSubmit: (qty: number, unit: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState(defaultUnit);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const n = parseFloat(qty);
        if (!n || n <= 0) return;
        setBusy(true);
        const r = await onSubmit(n, unit.trim() || defaultUnit);
        setBusy(false);
        actionNotice(r);
        if (r.ok) {
          // handled by caller closing
        }
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={label}>
          <input type="number" min="0" step="any" required autoFocus value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className={inputClass} inputMode="decimal" />
        </Field>
        <Field label="Unit">
          <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <PrimaryButton type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : submitLabel}
      </PrimaryButton>
    </form>
  );
}

export function InventoryClient({
  rows,
  items,
}: {
  rows: InventoryRow[];
  items: ItemRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<null | { kind: "add" | "use" | "new"; item?: GroupedItem }>(null);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("g");
  const [newCategory, setNewCategory] = useState("Grocery");
  const [newBusy, setNewBusy] = useState(false);

  const grouped = useMemo<GroupedItem[]>(() => {
    const map = new Map<string, GroupedItem>();
    for (const r of rows) {
      let g = map.get(r.item_id);
      if (!g) {
        const item = items.find((i) => i.id === r.item_id);
        g = {
          item_id: r.item_id,
          item_name: r.item_name,
          category: r.category,
          canonical_unit: item?.canonical_unit ?? r.unit ?? "unit",
          lots: [],
          total: 0,
          display_unit: r.display_unit,
        };
        map.set(r.item_id, g);
      }
      g.lots.push(r);
      g.total += r.quantity ?? 0;
    }
    return [...map.values()].sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [rows, items]);

  const filtered = grouped.filter((g) =>
    g.item_name.toLowerCase().includes(query.trim().toLowerCase())
  );

  function closeAndRefresh() {
    setModal(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your pantry…"
          className={`${inputClass} sm:max-w-sm`}
        />
        <div className="flex gap-2">
          <GhostButton onClick={() => setModal({ kind: "new" })}>+ New item</GhostButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🫙"
          title={query ? "No matches" : "Pantry is empty"}
          body={query ? "Try a different search." : "Add stock or create an item to get started."}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((g) => (
            <CardHover key={g.item_id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-semibold">{g.item_name}</p>
                  <p className="text-xs text-bark-500">
                    {g.category ?? "Grocery"} · {g.lots.length} lot{g.lots.length === 1 ? "" : "s"}
                    {g.lots.some((l) => l.quantity_is_estimate) ? " · estimated" : ""}
                  </p>
                </div>
                <Badge tone="green">{formatQty(Math.round(g.total * 10) / 10, g.display_unit ?? g.canonical_unit)}</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <PrimaryButton className="flex-1 !py-2 text-xs" onClick={() => setModal({ kind: "add", item: g })}>
                  + Add stock
                </PrimaryButton>
                <GhostButton className="flex-1 !py-2 text-xs" onClick={() => setModal({ kind: "use", item: g })}>
                  Use
                </GhostButton>
              </div>
            </CardHover>
          ))}
        </div>
      )}

      {modal?.kind === "add" && modal.item && (
        <Modal title={`Add stock — ${modal.item.item_name}`} onClose={() => setModal(null)}>
          <QtyForm
            label="Quantity"
            defaultUnit={modal.item.canonical_unit}
            submitLabel="Add to pantry"
            onSubmit={async (qty, unit) => {
              const r = await addStock(modal.item!.item_name, qty, unit);
              if (r.ok) closeAndRefresh();
              return r;
            }}
          />
        </Modal>
      )}

      {modal?.kind === "use" && modal.item && (
        <Modal title={`Use — ${modal.item.item_name}`} onClose={() => setModal(null)}>
          <QtyForm
            label="Quantity used"
            defaultUnit={modal.item.canonical_unit}
            submitLabel="Record usage"
            onSubmit={async (qty, unit) => {
              const r = await recordConsumption(modal.item!.item_name, qty, unit);
              if (r.ok) closeAndRefresh();
              return r;
            }}
          />
          <p className="mt-3 text-xs text-bark-500">
            This permanently reduces your inventory. You can undo it right after from the Undo button.
          </p>
        </Modal>
      )}

      {modal?.kind === "new" && (
        <Modal title="New item" onClose={() => setModal(null)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              setNewBusy(true);
              const r = await createItem({ name: newName.trim(), category: newCategory, unit: newUnit.trim() || "unit" });
              setNewBusy(false);
              actionNotice(r);
              if (r.ok) {
                setNewName("");
                closeAndRefresh();
              }
            }}
          >
            <Field label="Item name">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="e.g. Basmati Rice" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Unit">
                <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className={inputClass} placeholder="g" />
              </Field>
            </div>
            <PrimaryButton type="submit" disabled={newBusy} className="w-full">
              {newBusy ? "Creating…" : "Create item"}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </div>
  );
}
