"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  copyCatalogRecipe,
  parseRecipeText,
  saveRecipe,
} from "@/lib/actions";
import type { ParsedRecipeDraft } from "@/lib/types";
import {
  Card,
  CardHover,
  Badge,
  EmptyState,
  Field,
  inputClass,
  PrimaryButton,
  GhostButton,
  actionNotice,
} from "@/components/ui";
import type { RecipeRow } from "@/lib/types";

type Tab = "mine" | "catalog" | "add";

function RecipeCard({ r }: { r: RecipeRow }) {
  const totalMin = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
  return (
    <Link href={`/recipes/${r.id}`} className="rounded-2xl">
      <CardHover className="h-full p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-snug">{r.name}</h3>
          {r.favorite && <span className="text-lg" aria-label="favourite">⭐</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.cuisine && <Badge tone="neutral">{r.cuisine}</Badge>}
          {totalMin > 0 && <Badge tone="neutral">⏱ {totalMin} min</Badge>}
          {r.servings && <Badge tone="neutral">Serves {r.servings}</Badge>}
          {r.effort_tag && <Badge tone="neutral">{r.effort_tag}</Badge>}
        </div>
        {r.times_prepared > 0 && (
          <p className="mt-3 text-xs text-bark-500">
            Made {r.times_prepared}×
            {r.last_prepared
              ? ` · last ${new Date(r.last_prepared + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : ""}
          </p>
        )}
      </CardHover>
    </Link>
  );
}

export function RecipesClient({
  recipes,
  catalog,
}: {
  recipes: RecipeRow[];
  catalog: Record<string, unknown>[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("mine");
  const [copying, setCopying] = useState<string | null>(null);

  // text-import state
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState<ParsedRecipeDraft | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftServings, setDraftServings] = useState("");
  const [draftInstructions, setDraftInstructions] = useState("");
  const [draftIngredients, setDraftIngredients] = useState<
    { free_text: string; quantity: number | null; unit: string | null }[]
  >([]);
  const [saving, setSaving] = useState(false);

  async function handleCopy(id: string) {
    setCopying(id);
    const r = await copyCatalogRecipe(id);
    setCopying(null);
    actionNotice(r);
    if (r.ok) router.refresh();
  }

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;
    setParsing(true);
    const r = await parseRecipeText(rawText);
    setParsing(false);
    if (!r.ok || !r.draft) {
      actionNotice({ ok: false, message: r.message ?? "Couldn't parse that text." });
      return;
    }
    setDraft(r.draft);
    setDraftName(r.draft.name_guess ?? "");
    setDraftServings("");
    setDraftInstructions(r.draft.instructions ?? "");
    setDraftIngredients(r.draft.ingredients ?? []);
  }

  function updateDraftIngredient(
    i: number,
    patch: Partial<{ free_text: string; quantity: number | null; unit: string | null }>
  ) {
    setDraftIngredients((prev) => prev.map((ing, j) => (j === i ? { ...ing, ...patch } : ing)));
  }

  async function handleSaveDraft() {
    if (!draftName.trim()) {
      actionNotice({ ok: false, message: "Give the recipe a name first." });
      return;
    }
    setSaving(true);
    const r = await saveRecipe({
      name: draftName.trim(),
      instructions: draftInstructions || undefined,
      servings: draftServings ? parseInt(draftServings, 10) : undefined,
      ingredients: draftIngredients
        .filter((ing) => ing.free_text.trim())
        .map((ing) => ({
          free_text: ing.free_text.trim(),
          quantity: ing.quantity,
          unit: ing.unit,
        })),
    });
    setSaving(false);
    actionNotice(r);
    if (r.ok) {
      setDraft(null);
      setRawText("");
      setTab("mine");
      router.refresh();
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "mine", label: `My recipes (${recipes.length})` },
    { id: "catalog", label: "Catalog" },
    { id: "add", label: "+ Add from text" },
  ];

  return (
    <div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Recipe sections">
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

      {tab === "mine" &&
        (recipes.length === 0 ? (
          <EmptyState
            icon="📖"
            title="No recipes yet"
            body="Copy a few from the Catalog tab, or paste one in with “Add from text”."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </div>
        ))}

      {tab === "catalog" && (
        <div>
          <p className="mb-4 text-sm text-bark-500">
            Shared starter recipes. Copying adds an editable copy to your library —
            the shared original never changes.
          </p>
          {catalog.length === 0 ? (
            <EmptyState icon="📚" title="Catalog is empty" body="Everything here is already in your library." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((c) => (
                <Card key={c.id as string} className="flex h-full flex-col p-5">
                  <h3 className="font-display text-lg font-semibold leading-snug">
                    {c.name as string}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(c.cuisine as string | null) && <Badge tone="neutral">{c.cuisine as string}</Badge>}
                    {(c.meal_type as string | null) && <Badge tone="neutral">{c.meal_type as string}</Badge>}
                    {(c.time_minutes as number | null) ? (
                      <Badge tone="neutral">⏱ {c.time_minutes as number} min</Badge>
                    ) : null}
                    {(c.effort_tag as string | null) && <Badge tone="neutral">{c.effort_tag as string}</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-bark-500">
                    {(c.ingredient_count as number) ?? 0} ingredients
                    {(c.servings as number | null) ? ` · serves ${c.servings as number}` : ""}
                  </p>
                  <div className="mt-auto pt-4">
                    <PrimaryButton
                      onClick={() => handleCopy(c.id as string)}
                      disabled={copying !== null}
                      className="w-full !py-2 text-xs"
                    >
                      {copying === c.id ? "Copying…" : "Copy to my recipes"}
                    </PrimaryButton>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "add" && (
        <div className="mx-auto max-w-2xl">
          {!draft ? (
            <Card className="p-5 sm:p-6">
              <h3 className="font-display mb-2 text-lg font-semibold">Paste a recipe</h3>
              <p className="mb-4 text-sm text-bark-500">
                Dictated or copied recipe text — name it, list the ingredients, then the
                steps. We&apos;ll structure it for your review before anything is saved.
              </p>
              <form onSubmit={handleParse} className="space-y-4">
                <Field label="Recipe text" htmlFor="recipe-text">
                  <textarea
                    id="recipe-text"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={10}
                    placeholder={"Weeknight dal\n\n2 cups red lentils\n1 onion, chopped\n1 tsp turmeric\n\nRinse the lentils. Simmer 20 minutes…"}
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <PrimaryButton type="submit" disabled={parsing || !rawText.trim()} className="w-full sm:w-auto">
                  {parsing ? "Reading…" : "Structure it for review"}
                </PrimaryButton>
              </form>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6">
              <h3 className="font-display mb-1 text-lg font-semibold">Review before saving</h3>
              <p className="mb-4 text-sm text-bark-500">
                Nothing is saved until you confirm. Unknown ingredients are kept as
                free text — never guessed into your catalog.
              </p>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                  <Field label="Name" htmlFor="draft-name">
                    <input
                      id="draft-name"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Servings" htmlFor="draft-servings">
                    <input
                      id="draft-servings"
                      type="number"
                      min="1"
                      value={draftServings}
                      onChange={(e) => setDraftServings(e.target.value)}
                      className={inputClass}
                      inputMode="numeric"
                    />
                  </Field>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-bark-500">
                    Ingredients
                  </p>
                  <div className="space-y-2">
                    {draftIngredients.map((ing, i) => (
                      <div key={i} className="grid grid-cols-[1fr_72px_64px] gap-2">
                        <input
                          value={ing.free_text}
                          onChange={(e) => updateDraftIngredient(i, { free_text: e.target.value })}
                          className={inputClass}
                          aria-label="Ingredient"
                        />
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={ing.quantity ?? ""}
                          onChange={(e) =>
                            updateDraftIngredient(i, {
                              quantity: e.target.value === "" ? null : parseFloat(e.target.value),
                            })
                          }
                          placeholder="qty"
                          className={inputClass}
                          inputMode="decimal"
                          aria-label="Quantity"
                        />
                        <input
                          value={ing.unit ?? ""}
                          onChange={(e) => updateDraftIngredient(i, { unit: e.target.value || null })}
                          placeholder="unit"
                          className={inputClass}
                          aria-label="Unit"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <Field label="Method" htmlFor="draft-instructions">
                  <textarea
                    id="draft-instructions"
                    value={draftInstructions}
                    onChange={(e) => setDraftInstructions(e.target.value)}
                    rows={6}
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <div className="flex gap-2">
                  <GhostButton onClick={() => setDraft(null)} className="flex-1">
                    Start over
                  </GhostButton>
                  <PrimaryButton onClick={handleSaveDraft} disabled={saving} className="flex-1">
                    {saving ? "Saving…" : "Save to my recipes"}
                  </PrimaryButton>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
