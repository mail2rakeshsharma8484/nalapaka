"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPlannedMeal, removePlannedMeal, markMealCooked, getCookSheet } from "@/lib/actions";
import {
  Card,
  Badge,
  EmptyState,
  Field,
  inputClass,
  PrimaryButton,
  Modal,
  GhostButton,
  actionNotice,
} from "@/components/ui";
import type { PlannedMealRow } from "@/lib/types";

export function PlanClient({
  days,
  slots,
  meals,
  recipes,
  weekStart,
}: {
  days: string[];
  slots: string[];
  meals: PlannedMealRow[];
  recipes: { id: string; name: string }[];
  weekStart: string;
}) {
  const router = useRouter();
  const [day, setDay] = useState(days[0] ?? weekStart);
  const [slot, setSlot] = useState(slots[0] ?? "Dinner");
  const [customSlot, setCustomSlot] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [freeform, setFreeform] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [cookMeal, setCookMeal] = useState<{ mealId: string; recipeId: string; recipeName: string } | null>(null);
  const [cookLines, setCookLines] = useState<{ itemName: string; quantity: number | null; unit: string | null; note?: string }[] | null>(null);
  const [cookBusy, setCookBusy] = useState(false);

  const mealsByDay = new Map<string, PlannedMealRow[]>();
  for (const m of meals) {
    const arr = mealsByDay.get(m.day_date) ?? [];
    arr.push(m);
    mealsByDay.set(m.day_date, arr);
  }
  for (const arr of mealsByDay.values()) {
    arr.sort((a, b) => a.slot_sort - b.slot_sort);
  }

  const slotName = slot === "__custom" ? customSlot.trim() : slot;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!slotName) return;
    if (!recipeId && !freeform.trim()) return;
    setBusy(true);
    const r = await addPlannedMeal({
      dayDate: day,
      slotName,
      recipeId: recipeId || undefined,
      freeform: freeform.trim() || undefined,
    });
    setBusy(false);
    actionNotice(r);
    if (r.ok) {
      setFreeform("");
      setRecipeId("");
      router.refresh();
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    const r = await removePlannedMeal(id);
    setRemoving(null);
    actionNotice(r);
    if (r.ok) router.refresh();
  }

  async function openCookSheet(mealId: string, recipeId: string, recipeName: string) {
    setCookMeal({ mealId, recipeId, recipeName });
    setCookLines(null);
    const r = await getCookSheet(recipeId);
    if (r.ok) {
      setCookLines(r.lines);
    } else {
      actionNotice(r);
      setCookMeal(null);
    }
  }

  async function handleCooked() {
    if (!cookMeal || !cookLines) return;
    setCookBusy(true);
    const r = await markMealCooked(cookMeal.mealId, cookLines);
    setCookBusy(false);
    actionNotice(r);
    if (r.ok) {
      setCookMeal(null);
      setCookLines(null);
      router.refresh();
    }
  }

  function updateCookLine(i: number, patch: Partial<{ itemName: string; quantity: number | null; unit: string | null }>) {
    setCookLines((prev) => (prev ?? []).map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  const usedSlots = [...new Set(meals.map((m) => m.slot_name))];
  const allSlots = [...new Set([...slots, ...usedSlots])];

  return (
    <div>
      <Card className="mb-6 p-5">
        <h3 className="font-display mb-4 text-lg font-semibold">Add a meal</h3>
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Day">
            <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
              {days.map((d) => (
                <option key={d} value={d}>
                  {new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Meal">
            <select value={slot} onChange={(e) => setSlot(e.target.value)} className={inputClass}>
              {allSlots.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__custom">Custom…</option>
            </select>
          </Field>
          {slot === "__custom" && (
            <Field label="Custom meal name">
              <input value={customSlot} onChange={(e) => setCustomSlot(e.target.value)} placeholder="e.g. Brunch" className={inputClass} />
            </Field>
          )}
          <Field label="Recipe (optional)">
            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} className={inputClass}>
              <option value="">— pick a recipe —</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Or free text">
            <input value={freeform} onChange={(e) => setFreeform(e.target.value)} placeholder="e.g. Leftovers" className={inputClass} />
          </Field>
          <div className="flex items-end sm:col-span-2 lg:col-span-5">
            <PrimaryButton type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? "Adding…" : "Add to plan"}
            </PrimaryButton>
          </div>
        </form>
        <p className="mt-3 text-xs text-bark-500">
          Planning never changes your pantry — it only sketches the week.
        </p>
      </Card>

      {days.every((d) => !(mealsByDay.get(d) ?? []).length) ? (
        <EmptyState icon="🗓️" title="A blank week" body="Add your first meal above to start planning." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {days.map((d) => {
            const dayMeals = mealsByDay.get(d) ?? [];
            const date = new Date(d + "T12:00:00");
            const isToday = new Date().toISOString().slice(0, 10) === d;
            return (
              <Card key={d} className={`p-4 ${isToday ? "ring-2 ring-sage-600/40" : ""}`}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-display font-semibold">
                    {date.toLocaleDateString("en-US", { weekday: "long" })}
                  </p>
                  <span className="text-xs text-bark-500">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {isToday && <Badge tone="green" >today</Badge>}
                  </span>
                </div>
                {dayMeals.length === 0 ? (
                  <p className="py-2 text-sm text-bark-500/70">—</p>
                ) : (
                  <ul className="space-y-2">
                    {dayMeals.map((m) => {
                      const recipeComp = m.components.find((c) => c.kind === "recipe" && c.recipe_id);
                      return (
                      <li key={m.id} className="rounded-xl bg-cream-100 px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-bark-500">{m.slot_name}</p>
                            {m.components.map((c, i) => (
                              <p key={i} className="truncate text-sm font-medium">
                                {c.kind === "recipe" ? c.recipe_name : c.freeform_text}
                              </p>
                            ))}
                          </div>
                          <button
                            onClick={() => handleRemove(m.id)}
                            disabled={removing === m.id}
                            className="rounded-lg px-1.5 text-lg text-bark-500/60 hover:bg-white hover:text-red-700"
                            aria-label="Remove meal"
                          >
                            ×
                          </button>
                        </div>
                        <div className="mt-1.5">
                          {m.cooked_at ? (
                            <Badge tone="green">✓ cooked</Badge>
                          ) : recipeComp?.recipe_id ? (
                            <button
                              onClick={() => openCookSheet(m.id, recipeComp.recipe_id!, recipeComp.recipe_name ?? "Meal")}
                              className="rounded-full bg-sage-700/10 px-3 py-1.5 text-xs font-semibold text-sage-800 transition hover:bg-sage-700/20 active:scale-95"
                            >
                              🍳 Cooked it
                            </button>
                          ) : null}
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {cookMeal && (
        <Modal title={`Cooked — ${cookMeal.recipeName}`} onClose={() => setCookMeal(null)}>
          {cookLines === null ? (
            <p className="py-6 text-center text-sm text-bark-500">Loading ingredients…</p>
          ) : cookLines.length === 0 ? (
            <div>
              <p className="text-sm text-bark-600">
                This recipe has no ingredient quantities to draw down. Marking it cooked won&apos;t change your pantry.
              </p>
              <PrimaryButton onClick={handleCooked} disabled={cookBusy} className="mt-4 w-full">
                {cookBusy ? "Saving…" : "Mark as cooked"}
              </PrimaryButton>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-bark-600">
                Review the amounts — this draws them from your pantry.
              </p>
              <div className="space-y-2.5">
                {cookLines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_72px_64px] items-center gap-2">
                    <div>
                      <input
                        value={l.itemName}
                        onChange={(e) => updateCookLine(i, { itemName: e.target.value })}
                        className={inputClass}
                        aria-label="Ingredient item"
                      />
                      {l.note && <p className="mt-0.5 text-[11px] text-honey-600">{l.note}</p>}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={l.quantity ?? ""}
                      onChange={(e) =>
                        updateCookLine(i, { quantity: e.target.value === "" ? null : parseFloat(e.target.value) })
                      }
                      placeholder="qty"
                      className={inputClass}
                      inputMode="decimal"
                      aria-label="Quantity"
                    />
                    <input
                      value={l.unit ?? ""}
                      onChange={(e) => updateCookLine(i, { unit: e.target.value || null })}
                      placeholder="unit"
                      className={inputClass}
                      aria-label="Unit"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-bark-500">
                Lines with no quantity are skipped — we never guess amounts.
              </p>
              <div className="mt-4 flex gap-2">
                <GhostButton onClick={() => setCookMeal(null)} className="flex-1">
                  Cancel
                </GhostButton>
                <PrimaryButton onClick={handleCooked} disabled={cookBusy} className="flex-1">
                  {cookBusy ? "Saving…" : "Confirm & draw down"}
                </PrimaryButton>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
