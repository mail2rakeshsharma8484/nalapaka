"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  processReceipt,
  resolvePurchaseLine,
} from "@/lib/actions";
import type { ReceiptInput, ReceiptLineInput } from "@/lib/api";
import {
  Card,
  Badge,
  EmptyState,
  Field,
  inputClass,
  PrimaryButton,
  GhostButton,
  actionNotice,
  formatQty,
} from "@/components/ui";

type Tab = "history" | "add" | "unresolved";

interface LineDraft extends ReceiptLineInput {
  key: number;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

function newLine(key: number, line_type: "Item" | "Discount" = "Item"): LineDraft {
  return { key, original_text: "", quantity: null, unit: "", total_price: null, line_type };
}

function ReceiptForm({ onDone }: { onDone: () => void }) {
  const [store, setStore] = useState("");
  const [date, setDate] = useState(todayStr());
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("0");
  const [total, setTotal] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine(1), newLine(2)]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    data?: Record<string, unknown>;
  } | null>(null);
  const [nextKey, setNextKey] = useState(3);

  function updateLine(key: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function itemLinesAbove(idx: number) {
    return lines.slice(0, idx).filter((l) => l.line_type === "Item" && l.original_text.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const cleanLines: ReceiptLineInput[] = [];
    const submittedItemIdx: number[] = []; // line-editor index -> cleanLines index
    lines.forEach((l, idx) => {
      if (!l.original_text.trim()) return;
      const entry: ReceiptLineInput = {
        original_text: l.original_text.trim(),
        line_type: l.line_type,
      };
      if (l.quantity != null && !isNaN(l.quantity)) entry.quantity = l.quantity;
      if (l.unit?.trim()) entry.unit = l.unit.trim();
      if (l.total_price != null && !isNaN(l.total_price)) entry.total_price = l.total_price;
      if (l.line_type === "Discount") {
        // Link the discount to the most recent item line above it.
        for (let j = idx - 1; j >= 0; j--) {
          if (lines[j].line_type === "Item" && lines[j].original_text.trim()) {
            if (submittedItemIdx[j] !== undefined) {
              entry.parent_line_index = submittedItemIdx[j];
            }
            break;
          }
        }
      }
      submittedItemIdx[idx] = cleanLines.length;
      cleanLines.push(entry);
    });

    if (!store.trim()) {
      actionNotice({ ok: false, message: "Enter the store name." });
      return;
    }
    if (cleanLines.length === 0) {
      actionNotice({ ok: false, message: "Add at least one line item." });
      return;
    }

    const input: ReceiptInput = {
      store: store.trim(),
      purchased_on: date,
      subtotal: parseFloat(subtotal) || 0,
      tax: parseFloat(tax) || 0,
      total: total.trim() ? parseFloat(total) : null,
      lines: cleanLines,
    };

    setBusy(true);
    const r = await processReceipt(input);
    setBusy(false);
    actionNotice(r);
    setResult({ message: r.message ?? "", data: r.data as Record<string, unknown> | undefined });
    if (r.ok) onDone();
  }

  const data = result?.data;
  const unresolved = (data?.unresolved as number) ?? 0;
  const diff = Number(data?.reconciliation_difference ?? 0);

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Store" htmlFor="rc-store">
              <input
                id="rc-store"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="e.g. Suvidha"
                className={inputClass}
                required
              />
            </Field>
            <Field label="Date" htmlFor="rc-date">
              <input
                id="rc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Subtotal (printed)" htmlFor="rc-subtotal">
              <input
                id="rc-subtotal"
                type="number"
                min="0"
                step="any"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                placeholder="0.00"
                className={inputClass}
                inputMode="decimal"
                required
              />
            </Field>
            <Field label="Tax (printed)" htmlFor="rc-tax">
              <input
                id="rc-tax"
                type="number"
                min="0"
                step="any"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className={inputClass}
                inputMode="decimal"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Total (printed, optional)" htmlFor="rc-total">
                <input
                  id="rc-total"
                  type="number"
                  min="0"
                  step="any"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                  inputMode="decimal"
                />
              </Field>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Line items</h3>
          <GhostButton
            type="button"
            onClick={() => {
              setNextKey((k) => k + 1);
              setLines((prev) => [...prev, newLine(nextKey)]);
            }}
            className="!py-2 text-xs"
          >
            + Add line
          </GhostButton>
        </div>

        <div className="space-y-2.5">
          {lines.map((l, idx) => (
            <Card key={l.key} className="p-3.5">
              <div className="flex gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <input
                    value={l.original_text}
                    onChange={(e) => updateLine(l.key, { original_text: e.target.value })}
                    placeholder={l.line_type === "Item" ? "Item as printed, e.g. GHEE 830ML" : "Discount description"}
                    className={inputClass}
                    aria-label="Line text"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={l.quantity ?? ""}
                      onChange={(e) =>
                        updateLine(l.key, {
                          quantity: e.target.value === "" ? null : parseFloat(e.target.value),
                        })
                      }
                      placeholder="Qty"
                      className={inputClass}
                      inputMode="decimal"
                      aria-label="Quantity"
                    />
                    <input
                      value={l.unit ?? ""}
                      onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                      placeholder="Unit"
                      className={inputClass}
                      aria-label="Unit"
                    />
                    <input
                      type="number"
                      step="any"
                      value={l.total_price ?? ""}
                      onChange={(e) =>
                        updateLine(l.key, {
                          total_price: e.target.value === "" ? null : parseFloat(e.target.value),
                        })
                      }
                      placeholder={l.line_type === "Discount" ? "-0.00" : "Price"}
                      className={inputClass}
                      inputMode="decimal"
                      aria-label="Line total"
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateLine(l.key, {
                        line_type: l.line_type === "Item" ? "Discount" : "Item",
                      })
                    }
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
                      l.line_type === "Discount"
                        ? "bg-ember-100 text-ember-700 ring-ember-500/30"
                        : "bg-white text-bark-500 ring-bark-900/15"
                    }`}
                    title="Toggle item / discount"
                  >
                    {l.line_type === "Item" ? "$" : "−%"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLine(l.key)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-bark-400 ring-1 ring-bark-900/10 hover:text-red-700"
                    aria-label="Remove line"
                  >
                    ×
                  </button>
                </div>
              </div>
              {l.line_type === "Discount" && itemLinesAbove(idx).length > 0 && (
                <p className="mt-1.5 text-[11px] text-bark-500">
                  Applies to: {itemLinesAbove(idx)[itemLinesAbove(idx).length - 1].original_text}
                </p>
              )}
            </Card>
          ))}
        </div>

        <PrimaryButton type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Processing…" : "Process receipt"}
        </PrimaryButton>
        <p className="text-xs text-bark-500">
          The printed size is the quantity (“GHEE 830ML” = 830 ml). Lines we
          can&apos;t match stay in a review queue — nothing is ever guessed.
        </p>
      </form>

      {result && (
        <Card className="mt-5 border-l-4 border-l-sage-600 p-5">
          <h3 className="font-display text-lg font-semibold">Receipt result</h3>
          <p className="mt-1.5 text-sm leading-relaxed">{result.message}</p>
          {data && (
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-cream-100 px-3 py-2">
                <dt className="text-xs text-bark-500">Lines stocked</dt>
                <dd className="font-semibold">{(data.inventory_added as number) ?? 0}</dd>
              </div>
              <div className="rounded-xl bg-cream-100 px-3 py-2">
                <dt className="text-xs text-bark-500">Need review</dt>
                <dd className="font-semibold">{unresolved}</dd>
              </div>
              <div className="rounded-xl bg-cream-100 px-3 py-2">
                <dt className="text-xs text-bark-500">Reconciliation</dt>
                <dd className={`font-semibold ${Math.abs(diff) >= 0.005 ? "text-ember-600" : "text-sage-700"}`}>
                  {Math.abs(diff) >= 0.005 ? `off by ${diff.toFixed(2)}` : "matches"}
                </dd>
              </div>
              <div className="rounded-xl bg-cream-100 px-3 py-2">
                <dt className="text-xs text-bark-500">Discount lines</dt>
                <dd className="font-semibold">{(data.discount_lines as number) ?? 0}</dd>
              </div>
            </dl>
          )}
          {unresolved > 0 && (
            <p className="mt-3 text-sm">
              <button
                onClick={() => onDone()}
                className="font-semibold text-sage-700 hover:underline"
              >
                Review the unmatched lines →
              </button>
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function UnresolvedQueue({
  lines,
  onChanged,
}: {
  lines: Record<string, unknown>[];
  onChanged: () => void;
}) {
  const router = useRouter();
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function resolve(purchaseId: string, itemName?: string, dismiss?: boolean) {
    setBusy(purchaseId);
    const r = await resolvePurchaseLine(purchaseId, itemName, dismiss);
    setBusy(null);
    actionNotice(r);
    if (r.ok) {
      onChanged();
      router.refresh();
    }
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="Queue is clear"
        body="Every receipt line is matched to an item or dismissed."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-bark-500">
        {lines.length} line{lines.length === 1 ? "" : "s"} we couldn&apos;t match. Match each to
        an item, or dismiss it as non-food — the queue empties as you go.
      </p>
      {lines.map((l) => {
        const pid = l.purchase_id as string;
        const suggestion = l.suggested_item_name as string | null;
        return (
          <Card key={pid} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{l.original_text as string}</p>
                <p className="mt-0.5 text-xs text-bark-500">
                  {l.store as string} ·{" "}
                  {new Date((l.purchased_on as string) + "T12:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  {(l.quantity as number | null) != null &&
                    ` · ${formatQty(l.quantity as number, l.unit as string | null)}`}
                  {(l.total_price as number | null) != null &&
                    ` · $${Number(l.total_price).toFixed(2)}`}
                </p>
              </div>
              {suggestion && (
                <Badge tone="amber">
                  <span title={`match score ${l.match_score}`}>maybe: {suggestion}</span>
                </Badge>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {suggestion && (
                <GhostButton
                  onClick={() => resolve(pid, suggestion)}
                  disabled={busy !== null}
                  className="!py-2 text-xs"
                >
                  {busy === pid ? "…" : `Use “${suggestion}”`}
                </GhostButton>
              )}
              <div className="flex flex-1 gap-2">
                <input
                  value={names[pid] ?? ""}
                  onChange={(e) => setNames((p) => ({ ...p, [pid]: e.target.value }))}
                  placeholder="Item name…"
                  className={`${inputClass} !py-2 text-sm`}
                  aria-label="Item name to match"
                />
                <PrimaryButton
                  onClick={() => {
                    const n = (names[pid] ?? "").trim();
                    if (n) resolve(pid, n);
                  }}
                  disabled={busy !== null || !(names[pid] ?? "").trim()}
                  className="!py-2 text-xs"
                >
                  Match
                </PrimaryButton>
              </div>
              <button
                onClick={() => resolve(pid, undefined, true)}
                disabled={busy !== null}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-bark-500 ring-1 ring-bark-900/10 hover:text-bark-800"
              >
                {busy === pid ? "…" : "Not food"}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function ReceiptsClient({
  receipts,
  unresolved,
  initialTab,
}: {
  receipts: Record<string, unknown>[];
  unresolved: Record<string, unknown>[];
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "history");
  const router = useRouter();

  const tabs: { id: Tab; label: string }[] = [
    { id: "history", label: `History (${receipts.length})` },
    { id: "add", label: "+ Add receipt" },
    { id: "unresolved", label: `Needs review (${unresolved.length})` },
  ];

  return (
    <div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Receipt sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-sage-700 text-white shadow-[0_2px_8px_rgb(65_86_54/0.3)]"
                : "bg-white text-bark-500 ring-1 ring-bark-900/10 hover:bg-cream-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "history" &&
        (receipts.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="No receipts yet"
            body="Add your first receipt and your pantry will stock itself — with prices tracked."
          />
        ) : (
          <Card className="divide-y divide-bark-900/5">
            {receipts.map((r) => (
              <Link
                key={r.id as string}
                href={`/receipts/${r.id as string}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-cream-100/60"
              >
                <div>
                  <p className="text-sm font-medium">
                    {r.store as string}
                    {(r.voided_at as string | null) && (
                      <Badge tone="neutral">voided</Badge>
                    )}
                  </p>
                  <p className="text-xs text-bark-500">
                    {new Date((r.purchased_on as string) + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {(r.line_count as number) ?? 0} lines
                  </p>
                </div>
                <p className="font-display text-lg font-semibold">
                  ${(r.total as number | null) != null ? Number(r.total).toFixed(2) : "—"}
                </p>
              </Link>
            ))}
          </Card>
        ))}

      {tab === "add" && <ReceiptForm onDone={() => { setTab("unresolved"); router.refresh(); }} />}

      {tab === "unresolved" && (
        <UnresolvedQueue lines={unresolved} onChanged={() => router.refresh()} />
      )}
    </div>
  );
}
