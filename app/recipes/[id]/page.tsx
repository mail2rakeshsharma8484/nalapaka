import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import * as api from "@/lib/api";
import { Card, Badge, EmptyState, formatQty } from "@/components/ui";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { RecipeRow, RecipeIngredientRow, AvailabilityRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hid = await requireHouseholdId();
  const db = await createClient();

  const { recipe, ingredients } = await api.getRecipeDetail(db, hid, id);
  if (!recipe) notFound();
  const r = recipe as unknown as RecipeRow;

  const availability = await api.checkRecipeAvailability(db, hid, id);

  const ings = ingredients as unknown as (RecipeIngredientRow & {
    items?: { canonical_name?: string } | null;
  })[];
  const avail = availability as unknown as AvailabilityRow[];
  const missing = avail.filter((a) => !a.optional && a.sufficient === false);
  const totalMin = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);

  return (
    <div>
      <Link href="/recipes" className="mb-4 inline-block text-sm font-medium text-sage-700 hover:underline">
        ← All recipes
      </Link>

      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{r.name}</h1>
          <FavoriteButton recipeId={r.id} favorite={r.favorite} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.cuisine && <Badge tone="neutral">{r.cuisine}</Badge>}
          {totalMin > 0 && <Badge tone="neutral">⏱ {totalMin} min</Badge>}
          {r.servings && <Badge tone="neutral">Serves {r.servings}</Badge>}
          {r.effort_tag && <Badge tone="neutral">{r.effort_tag} effort</Badge>}
          {(r.tags ?? []).map((t) => (
            <Badge key={t} tone="green">{t}</Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display mb-3 text-xl font-semibold">Pantry check</h2>
          {avail.length === 0 ? (
            <EmptyState icon="🔍" title="No ingredient data" body="Add ingredients to this recipe to check availability." />
          ) : (
            <Card className="divide-y divide-bark-900/5">
              {avail.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {a.ingredient}
                      {a.optional && <span className="ml-2 text-xs font-normal text-bark-500">(optional)</span>}
                    </p>
                    <p className="text-xs text-bark-500">
                      Need {formatQty(a.required, a.required_unit)}
                      {a.available !== null && a.available_unit
                        ? ` · have ${formatQty(Math.round(a.available * 10) / 10, a.available_unit)}`
                        : ""}
                      {a.issue ? ` · ${a.issue}` : ""}
                    </p>
                  </div>
                  {a.sufficient ? (
                    <Badge tone="green">✓ on hand</Badge>
                  ) : a.optional ? (
                    <Badge tone="neutral">missing</Badge>
                  ) : (
                    <Badge tone="red">missing</Badge>
                  )}
                </div>
              ))}
            </Card>
          )}
          {missing.length > 0 && (
            <p className="mt-3 rounded-2xl bg-ember-50 px-4 py-3 text-sm text-ember-700 ring-1 ring-ember-500/20">
              🛒 {missing.length} required ingredient{missing.length === 1 ? "" : "s"} not on hand.
            </p>
          )}
        </div>

        <div>
          <h2 className="font-display mb-3 text-xl font-semibold">Ingredients</h2>
          {ings.length === 0 ? (
            <EmptyState icon="🥕" title="No ingredients listed" />
          ) : (
            <Card className="divide-y divide-bark-900/5">
              {ings.map((ing) => (
                <div key={ing.id} className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm font-medium">
                    {ing.items?.canonical_name ?? ing.free_text_ingredient ?? "—"}
                    {ing.optional && <span className="ml-2 text-xs font-normal text-bark-500">(optional)</span>}
                  </p>
                  <span className="text-sm text-bark-500">{formatQty(ing.quantity, ing.unit)}</span>
                </div>
              ))}
            </Card>
          )}

          {r.instructions && (
            <>
              <h2 className="font-display mb-3 mt-6 text-xl font-semibold">Method</h2>
              <Card className="p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-bark-700">{r.instructions}</p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
