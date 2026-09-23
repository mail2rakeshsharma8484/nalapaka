import { createClient } from "@/lib/supabase/server";
import { requireHouseholdId } from "@/lib/household";
import * as api from "@/lib/api";
import { PageHeader } from "@/components/ui";
import { RecipesClient } from "@/components/RecipesClient";
import type { RecipeRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const hid = await requireHouseholdId();
  const db = await createClient();

  const [recipes, catalog] = await Promise.all([
    api.getRecipes(db, hid),
    api.getCatalogRecipes(db),
  ]);

  // Hide catalog recipes the household already copied.
  const ownedCatalogIds = new Set(
    (recipes as unknown as { catalog_recipe_id?: string | null }[])
      .map((r) => r.catalog_recipe_id)
      .filter(Boolean)
  );
  const freshCatalog = (catalog as Record<string, unknown>[]).filter(
    (c) => !ownedCatalogIds.has(c.id as string)
  );

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle="Your household cookbook — plus a shared catalog to start from."
      />
      <RecipesClient
        recipes={(recipes ?? []) as unknown as RecipeRow[]}
        catalog={freshCatalog}
      />
    </div>
  );
}
