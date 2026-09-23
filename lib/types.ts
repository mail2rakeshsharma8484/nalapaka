export interface InventoryRow {
  lot_id: string;
  item_id: string;
  item_name: string;
  category: string | null;
  unit: string | null;
  tracking_tier: string | null;
  quantity: number | null;
  display_quantity: number | null;
  display_unit: string | null;
  storage_location: string | null;
  expires_on: string | null;
  inventory_confidence: string | null;
  quantity_is_estimate: boolean | null;
}

export interface ItemRow {
  id: string;
  canonical_name: string;
  category: string | null;
  canonical_unit: string;
  tracking_tier: string;
  aliases: string[];
}

export interface ShoppingRow {
  id: string;
  item_id: string | null;
  free_text_item: string | null;
  quantity: number | null;
  unit: string | null;
  priority: string;
  reason: string | null;
  source: string;
  user_approved: boolean;
  purchased: boolean;
  created_at: string;
}

export interface RecipeRow {
  id: string;
  name: string;
  cuisine: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  tags: string[] | null;
  favorite: boolean;
  family_rating: number | null;
  times_prepared: number;
  last_prepared: string | null;
  effort_tag: string | null;
  instructions: string | null;
}

export interface RecipeIngredientRow {
  id: string;
  item_id: string | null;
  free_text_ingredient: string | null;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
  ingredient_role: string;
}

export interface AvailabilityRow {
  ingredient: string;
  required: number | null;
  required_unit: string | null;
  available: number | null;
  available_unit: string | null;
  sufficient: boolean | null;
  optional: boolean;
  confidence: string | null;
  issue: string | null;
}

export interface ActivityRow {
  operation_id: string;
  created_at: string;
  kind: string;
  actor: string | null;
  what_happened: string;
  already_undone: boolean;
}

export interface PlannedMealRow {
  id: string;
  day_date: string;
  state: string;
  cooked_at: string | null;
  slot_name: string;
  slot_sort: number;
  components: {
    kind: string;
    recipe_id: string | null;
    recipe_name: string | null;
    freeform_text: string | null;
  }[];
}

export interface ParsedRecipeDraft {
  name_guess: string | null;
  ingredients: { free_text: string; quantity: number | null; unit: string | null }[];
  instructions: string | null;
}

export function displayName(row: { item_id: string | null; free_text_item: string | null }): string {
  return row.free_text_item ?? "Unnamed item";
}

export function formatQty(qty: number | null, unit: string | null): string {
  if (qty === null || qty === undefined) return "—";
  const rounded = Number.isInteger(qty) ? qty.toString() : qty.toFixed(1).replace(/\.0$/, "");
  return unit ? `${rounded} ${unit}` : rounded;
}
