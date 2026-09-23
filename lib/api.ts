/**
 * lib/api.ts — the app's data-access layer.
 *
 * Every Supabase read (views) and write (RPCs) the app makes lives here, in
 * one place, behind small typed functions. Pages and server actions call
 * these; nothing else talks to Supabase directly.
 *
 * Conventions:
 * - Functions take an already-created Supabase client (`db`) as the first
 *   argument, then the household id, then inputs. The caller owns auth and
 *   tenancy; this layer owns query shapes.
 * - Reads return rows (never invented data — only what the backend returns).
 * - Writes return `ApiResult`: `{ ok, message?, operationId?, ...extras }`.
 *   Backend `status` values like `already_processed` / `already_undone` are
 *   calm non-errors per the spec, never exceptions.
 * - This module is server-only by convention: client components must go
 *   through server actions in `lib/actions.ts`, never import this file.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedRecipeDraft } from "./types";

export type Db = SupabaseClient;

export interface ApiResult {
  ok: boolean;
  message?: string;
  operationId?: string;
  data?: unknown;
}

/* ---------- result helpers ---------- */

type RpcJson = {
  status?: string;
  operation_id?: string;
  reason?: string;
  message?: string;
  [key: string]: unknown;
};

function asJson(data: unknown): RpcJson {
  return (data ?? {}) as RpcJson;
}

/** Map a backend `{status, operation_id, reason}` payload to an ApiResult. */
function fromStatus(
  data: unknown,
  error: { message: string } | null,
  messages: {
    ok: (d: RpcJson) => string | undefined;
    calm?: (d: RpcJson) => string | undefined;
  }
): ApiResult {
  if (error) return { ok: false, message: error.message };
  const d = asJson(data);
  const status = d.status ?? "ok";
  const operationId = d.operation_id as string | undefined;

  if (["ok", "created", "resolved", "undone", "dismissed", "voided"].includes(status)) {
    return { ok: true, message: messages.ok(d), operationId, data: d };
  }
  if (["already_processed", "already_undone", "already_voided", "already_resolved"].includes(status)) {
    const calm = messages.calm?.(d) ?? "Already handled — nothing changed.";
    return { ok: true, message: calm, operationId, data: d };
  }
  const reason =
    (d.reason as string | undefined) ??
    (d.message as string | undefined) ??
    `Request returned status "${status}".`;
  return { ok: false, message: reason, operationId, data: d };
}

function queryError(error: { message: string } | null): ApiResult | null {
  return error ? { ok: false, message: error.message } : null;
}

/* ================================================================
 * Reads
 * ================================================================ */

export interface Household {
  id: string;
  name: string;
  currency: string;
}

export async function getHousehold(db: Db, hid: string): Promise<Household | null> {
  const { data, error } = await db
    .from("households")
    .select("id, name, currency")
    .eq("id", hid)
    .single();
  if (error || !data) return null;
  return {
    id: data.id as string,
    name: (data.name as string) ?? "My Kitchen",
    currency: (data.currency as string) ?? "USD",
  };
}

export async function getHouseholdMemberCount(db: Db, hid: string): Promise<number> {
  const { count } = await db
    .from("household_members")
    .select("user_id", { count: "exact", head: true })
    .eq("household_id", hid);
  return count ?? 0;
}

export async function getHouseholdMembers(
  db: Db,
  hid: string
): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("household_members")
    .select("user_id, role, joined_at")
    .eq("household_id", hid)
    .order("joined_at", { ascending: true });
  return (data ?? []) as Record<string, unknown>[];
}

export async function getPendingInvites(
  db: Db,
  hid: string
): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("household_invites")
    .select("code, created_at, expires_at, used_at")
    .eq("household_id", hid)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return (data ?? []) as Record<string, unknown>[];
}

export async function getCurrentInventory(db: Db): Promise<Record<string, unknown>[]> {
  const { data } = await db.from("v_current_inventory").select("*");
  return (data ?? []) as Record<string, unknown>[];
}

export async function getUseSoon(db: Db, limit = 50): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("v_use_soon")
    .select("*")
    .order("expires_on", { ascending: true, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as Record<string, unknown>[];
}

export async function getNeedsCheck(db: Db, limit = 100): Promise<Record<string, unknown>[]> {
  const { data } = await db.from("v_needs_check").select("lot_id").limit(limit);
  return (data ?? []) as Record<string, unknown>[];
}

export async function getShoppingList(db: Db, hid: string): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("v_shopping_list")
    .select("*")
    .eq("household_id", hid)
    .order("created_at", { ascending: true });
  return (data ?? []) as Record<string, unknown>[];
}

export interface OperationRow {
  id: string;
  kind: string;
  summary: string | null;
  created_at: string;
  undone_at: string | null;
}

/**
 * Recent activity for the household, newest first. Reads the `operations`
 * table directly: `v_recent_activity` is not granted to authenticated
 * clients, and the operations table carries the human summary plus the
 * operation id needed for per-row undo (UC-UNDO-04).
 */
export async function getRecentOperations(
  db: Db,
  hid: string,
  limit = 20
): Promise<OperationRow[]> {
  const { data } = await db
    .from("operations")
    .select("id, kind, summary, created_at, undone_at")
    .eq("household_id", hid)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as OperationRow[]).filter((o) => o.kind !== "undo");
}

export async function getWeekMeals(
  db: Db,
  hid: string,
  weekStart: string,
  weekEndExclusive: string
): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("planned_meals")
    .select(
      "id, day_date, state, cooked_at, meal_slots(name, sort_order), meal_components(kind, recipe_id, freeform_text, servings_planned, recipes(id, name))"
    )
    .eq("household_id", hid)
    .gte("day_date", weekStart)
    .lt("day_date", weekEndExclusive)
    .order("day_date", { ascending: true });
  return (data ?? []) as Record<string, unknown>[];
}

export async function getMealSlots(db: Db, hid: string): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("meal_slots")
    .select("id, name, sort_order")
    .eq("household_id", hid)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Record<string, unknown>[];
}

export async function getRecipes(db: Db, hid: string): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("v_recipes")
    .select("*")
    .eq("household_id", hid)
    .order("name", { ascending: true });
  return (data ?? []) as Record<string, unknown>[];
}

export async function getCatalogRecipes(db: Db): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("v_catalog_recipes")
    .select("*")
    .order("name", { ascending: true })
    .limit(200);
  return (data ?? []) as Record<string, unknown>[];
}

export async function getRecipeDetail(
  db: Db,
  hid: string,
  id: string
): Promise<{
  recipe: Record<string, unknown> | null;
  ingredients: Record<string, unknown>[];
}> {
  const [{ data: recipe }, { data: ingredients }] = await Promise.all([
    db.from("recipes").select("*").eq("household_id", hid).eq("id", id).single(),
    db
      .from("recipe_ingredients")
      .select("id, item_id, free_text_ingredient, quantity, unit, optional, ingredient_role, items(canonical_name)")
      .eq("recipe_id", id)
      .order("id", { ascending: true }),
  ]);
  return {
    recipe: (recipe ?? null) as Record<string, unknown> | null,
    ingredients: (ingredients ?? []) as Record<string, unknown>[],
  };
}

export async function checkRecipeAvailability(
  db: Db,
  hid: string,
  recipeId: string
): Promise<Record<string, unknown>[]> {
  const { data } = await db.rpc("check_recipe_availability", {
    p_household_id: hid,
    p_recipe_id: recipeId,
  });
  return (data ?? []) as Record<string, unknown>[];
}

export async function getItems(db: Db, hid: string): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("items")
    .select("id, canonical_name, category, canonical_unit, tracking_tier, aliases")
    .eq("household_id", hid)
    .order("canonical_name", { ascending: true });
  return (data ?? []) as Record<string, unknown>[];
}

/* ---------- receipts ---------- */

export async function getReceipts(db: Db, hid: string): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("receipts")
    .select("id, store, purchased_on, subtotal, tax, total, line_count, voided_at, created_at")
    .eq("household_id", hid)
    .order("purchased_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Record<string, unknown>[];
}

export async function getReceiptDetail(
  db: Db,
  hid: string,
  receiptId: string
): Promise<{
  receipt: Record<string, unknown> | null;
  lines: Record<string, unknown>[];
}> {
  const [{ data: receipt }, { data: lines }] = await Promise.all([
    db
      .from("receipts")
      .select("*")
      .eq("household_id", hid)
      .eq("id", receiptId)
      .single(),
    db
      .from("v_purchase_net")
      .select("*")
      .eq("household_id", hid)
      .eq("receipt_id", receiptId)
      .order("purchase_id", { ascending: true }),
  ]);
  return {
    receipt: (receipt ?? null) as Record<string, unknown> | null,
    lines: (lines ?? []) as Record<string, unknown>[],
  };
}

export async function getUnresolvedLines(db: Db, hid: string): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("v_unresolved_purchase_lines")
    .select("*")
    .eq("household_id", hid)
    .order("purchased_on", { ascending: false })
    .limit(100);
  return (data ?? []) as Record<string, unknown>[];
}

/* ---------- prices ---------- */

export async function getBestStores(db: Db, hid: string): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("v_best_store_for_item")
    .select("*")
    .eq("household_id", hid)
    .order("item_name", { ascending: true })
    .limit(100);
  return (data ?? []) as Record<string, unknown>[];
}

export async function getDiscountsByStore(db: Db, hid: string): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("v_discount_by_store")
    .select("*")
    .eq("household_id", hid)
    .order("total_saved", { ascending: false });
  return (data ?? []) as Record<string, unknown>[];
}

export async function getPriceObservations(
  db: Db,
  hid: string,
  itemId: string,
  limit = 20
): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("v_price_observations")
    .select("*")
    .eq("household_id", hid)
    .eq("item_id", itemId)
    .order("purchased_on", { ascending: false })
    .limit(limit);
  return (data ?? []) as Record<string, unknown>[];
}

export async function getRecentPriceObservations(
  db: Db,
  hid: string,
  limit = 25
): Promise<Record<string, unknown>[]> {
  const { data } = await db
    .from("v_price_observations")
    .select("*")
    .eq("household_id", hid)
    .order("purchased_on", { ascending: false })
    .limit(limit);
  return (data ?? []) as Record<string, unknown>[];
}

export async function suggestStoreSplit(db: Db, hid: string): Promise<ApiResult> {
  const { data, error } = await db.rpc("suggest_store_split", {
    p_household_id: hid,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, data };
}

/* ================================================================
 * Writes
 * ================================================================ */

export async function addStock(
  db: Db,
  hid: string,
  input: { itemName: string; quantity: number; unit: string }
): Promise<ApiResult> {
  const { data, error } = await db.rpc("add_stock", {
    p_household_id: hid,
    p_item_name: input.itemName,
    p_quantity: input.quantity,
    p_unit: input.unit,
  });
  return fromStatus(data, error, {
    ok: () => `Added ${input.quantity} ${input.unit} of ${input.itemName}`,
  });
}

export async function recordConsumption(
  db: Db,
  hid: string,
  input: {
    itemName: string;
    quantity?: number;
    unit?: string;
    event?: "Used" | "Discarded" | "Spoiled" | "Lost";
    consumeAll?: boolean;
    reason?: string;
  }
): Promise<ApiResult> {
  const { data, error } = await db.rpc("record_consumption", {
    p_household_id: hid,
    p_item_name: input.itemName,
    p_quantity: input.quantity ?? null,
    p_unit: input.unit || null,
    p_event: input.event ?? "Used",
    p_consume_all: input.consumeAll ?? false,
    p_reason: input.reason ?? null,
  });
  return fromStatus(data, error, {
    ok: (d) => {
      const shortfall = (d.shortfall as number | undefined) ?? 0;
      const what = input.consumeAll
        ? `Finished ${input.itemName}`
        : `Used ${input.quantity} ${input.unit} of ${input.itemName}`;
      return shortfall > 0 ? `${what} (short by ${shortfall})` : what;
    },
  });
}

export async function createItem(
  db: Db,
  hid: string,
  input: { name: string; category?: string; tier?: string; unit: string }
): Promise<ApiResult> {
  const { data, error } = await db.rpc("create_item", {
    p_household_id: hid,
    p_canonical_name: input.name,
    p_category: input.category || "Grocery",
    p_tracking_tier: input.tier || "Tier2_General",
    p_canonical_unit: input.unit,
  });
  return fromStatus(data, error, {
    ok: () => `Created ${input.name}`,
  });
}

/**
 * Undo one specific operation by id (UC-UNDO-02/03). There is intentionally
 * no "undo last" — without an id we would risk touching another member's
 * work, so callers surface the id (toast / activity screen) instead.
 */
export async function undoOperation(
  db: Db,
  hid: string,
  operationId: string,
  reason?: string
): Promise<ApiResult> {
  const { data, error } = await db.rpc("undo_operation", {
    p_household_id: hid,
    p_operation_id: operationId,
    p_reason: reason ?? null,
  });
  return fromStatus(data, error, {
    ok: () => "Undone",
    calm: () => "That change was already undone.",
  });
}

/* ---------- shopping ---------- */

export async function addShoppingItem(
  db: Db,
  hid: string,
  input: { name: string; quantity?: number; unit?: string }
): Promise<ApiResult> {
  const { data, error } = await db.rpc("add_grocery_shopping_item", {
    p_household_id: hid,
    p_item_name: input.name,
    p_quantity: input.quantity ?? null,
    p_unit: input.unit || null,
  });
  return fromStatus(data, error, {
    ok: () => `Added ${input.name} to the list`,
  });
}

export async function approveShoppingItems(db: Db, hid: string, ids: string[]): Promise<ApiResult> {
  const { data, error } = await db.rpc("approve_meal_shopping_items", {
    p_household_id: hid,
    p_ids: ids,
  });
  return fromStatus(data, error, {
    ok: (d) => {
      const n = (d.approved as number | undefined) ?? ids.length;
      return `Approved ${n} item${n === 1 ? "" : "s"}`;
    },
  });
}

export async function markPurchased(db: Db, hid: string, ids: string[]): Promise<ApiResult> {
  const { data, error } = await db.rpc("mark_purchased", {
    p_household_id: hid,
    p_ids: ids,
  });
  const failed = queryError(error);
  if (failed) return failed;
  const d = asJson(data);
  if (d.status === "partial") {
    return {
      ok: false,
      message: "Some items still need approval before they can be marked purchased.",
      operationId: d.operation_id as string | undefined,
      data: d,
    };
  }
  return fromStatus(data, error, {
    ok: (dd) => `Marked ${((dd.purchased as number | undefined) ?? ids.length)} as purchased`,
  });
}

export async function removeShoppingItem(db: Db, hid: string, id: string): Promise<ApiResult> {
  const { data, error } = await db.rpc("remove_shopping_item", {
    p_household_id: hid,
    p_id: id,
  });
  return fromStatus(data, error, { ok: () => "Removed from the list" });
}

/* ---------- receipts ---------- */

export interface ReceiptLineInput {
  original_text: string;
  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;
  total_price?: number | null;
  line_type?: "Item" | "Discount" | "Fee" | "Deposit" | "Bag";
  promo_text?: string | null;
  parent_line_index?: number | null;
}

export interface ReceiptInput {
  store: string;
  purchased_on: string; // YYYY-MM-DD
  subtotal: number;
  tax: number;
  total?: number | null;
  lines: ReceiptLineInput[];
}

export async function processReceipt(
  db: Db,
  hid: string,
  input: ReceiptInput
): Promise<ApiResult> {
  const { data, error } = await db.rpc("process_receipt", {
    p_household_id: hid,
    p_store: input.store,
    p_purchased_on: input.purchased_on,
    p_subtotal: input.subtotal,
    p_tax: input.tax,
    p_total: input.total ?? null,
    p_lines: input.lines,
  });
  const failed = queryError(error);
  if (failed) return failed;
  const d = asJson(data);
  const status = d.status as string | undefined;

  if (status === "already_processed") {
    return {
      ok: true,
      message: "This receipt was already processed — nothing new was created.",
      operationId: d.operation_id as string | undefined,
      data: d,
    };
  }
  if (status === "invalid_input") {
    return { ok: false, message: (d.reason as string) ?? "That receipt couldn't be processed.", data: d };
  }
  // status === "created": report honestly per UC-RCP-11 — never plain
  // success when something didn't reconcile.
  const unresolved = (d.unresolved as number) ?? 0;
  const failures = (d.inventory_failures as number) ?? 0;
  const diff = Number(d.reconciliation_difference ?? 0);
  const added = (d.inventory_added as number) ?? 0;
  const parts = [`${added} line${added === 1 ? "" : "s"} stocked`];
  if (unresolved > 0) parts.push(`${unresolved} need${unresolved === 1 ? "s" : ""} your review`);
  if (failures > 0) parts.push(`${failures} couldn't be stocked`);
  if (Math.abs(diff) >= 0.005) parts.push(`off by ${diff.toFixed(2)} vs the printed subtotal`);
  return {
    ok: true,
    message: `Receipt saved — ${parts.join(", ")}.`,
    operationId: d.operation_id as string | undefined,
    data: d,
  };
}

export async function resolvePurchaseLine(
  db: Db,
  hid: string,
  input: { purchaseId: string; itemName?: string; dismissNonfood?: boolean }
): Promise<ApiResult> {
  const { data, error } = await db.rpc("resolve_purchase_line", {
    p_household_id: hid,
    p_purchase_id: input.purchaseId,
    p_item_name: input.itemName ?? null,
    p_dismiss_nonfood: input.dismissNonfood ?? false,
  });
  return fromStatus(data, error, {
    ok: (d) =>
      d.status === "dismissed"
        ? "Line dismissed as non-food"
        : `Matched to ${input.itemName ?? "item"} — stock added`,
    calm: () => "That line was already resolved.",
  });
}

export async function voidReceipt(
  db: Db,
  hid: string,
  input: { receiptId: string; reason: string }
): Promise<ApiResult> {
  const { data, error } = await db.rpc("void_receipt", {
    p_household_id: hid,
    p_receipt_id: input.receiptId,
    p_reason: input.reason,
  });
  return fromStatus(data, error, {
    ok: () => "Receipt voided — its inventory was reversed",
    calm: () => "That receipt was already voided.",
  });
}

export async function voidPurchaseLine(
  db: Db,
  hid: string,
  input: { purchaseId: string; reason: string }
): Promise<ApiResult> {
  const { data, error } = await db.rpc("void_purchase_line", {
    p_household_id: hid,
    p_purchase_id: input.purchaseId,
    p_reason: input.reason,
  });
  return fromStatus(data, error, { ok: () => "Line voided" });
}

/* ---------- recipes ---------- */

export async function copyCatalogRecipe(
  db: Db,
  hid: string,
  catalogRecipeId: string
): Promise<ApiResult> {
  const { data, error } = await db.rpc("copy_catalog_recipe", {
    p_household_id: hid,
    p_catalog_recipe_id: catalogRecipeId,
  });
  return fromStatus(data, error, {
    ok: (d) => `Copied “${(d.recipe_name as string) ?? "recipe"}” to your library`,
  });
}

export type { ParsedRecipeDraft } from "./types";

/** Parse pasted recipe text into a structured draft for review (UC-REC-05). Saves nothing. */
export async function parseRecipeText(
  db: Db,
  text: string
): Promise<{ ok: boolean; draft?: ParsedRecipeDraft; message?: string }> {
  const { data, error } = await db.rpc("parse_recipe_text", { p_text: text });
  if (error) return { ok: false, message: error.message };
  const d = asJson(data);
  if (d.status !== "ok") {
    return { ok: false, message: (d.reason as string) ?? "Couldn't parse that text." };
  }
  return { ok: true, draft: d.draft as ParsedRecipeDraft };
}

export async function saveRecipe(
  db: Db,
  hid: string,
  input: {
    name: string;
    instructions?: string;
    servings?: number;
    ingredients: { free_text: string; quantity?: number | null; unit?: string | null }[];
  }
): Promise<ApiResult> {
  const { data, error } = await db.rpc("upsert_recipe", {
    p_household_id: hid,
    p_name: input.name,
    p_instructions: input.instructions || null,
    p_servings: input.servings ?? null,
    p_ingredients: input.ingredients,
  });
  return fromStatus(data, error, { ok: () => `Saved “${input.name}”` });
}

export async function setRecipeFavorite(
  db: Db,
  hid: string,
  recipeId: string,
  favorite: boolean
): Promise<ApiResult> {
  const { data, error } = await db.rpc("set_recipe_favorite", {
    p_household_id: hid,
    p_recipe_id: recipeId,
    p_favorite: favorite,
  });
  return fromStatus(data, error, {
    ok: () => (favorite ? "Marked as favourite" : "Removed from favourites"),
  });
}

/* ---------- meal planning ---------- */

function weekStartMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Find-or-create the week's meal plan, slot, and planned meal, then attach
 * one component (recipe | freeform). Planning never touches inventory.
 */
export async function addPlannedMeal(
  db: Db,
  hid: string,
  input: { dayDate: string; slotName: string; recipeId?: string; freeform?: string }
): Promise<ApiResult> {
  const freeform = input.freeform?.trim();
  if (!input.recipeId && !freeform) {
    return { ok: false, message: "Pick a recipe or describe the meal." };
  }
  const weekStart = weekStartMonday(input.dayDate);

  const { data: plans, error: planErr } = await db
    .from("meal_plans")
    .select("id")
    .eq("household_id", hid)
    .eq("week_start", weekStart)
    .limit(1);
  const failed = queryError(planErr);
  if (failed) return failed;
  let planId: string;
  if (plans && plans.length > 0) {
    planId = (plans[0] as { id: string }).id;
  } else {
    const { data: created, error: createErr } = await db
      .from("meal_plans")
      .insert({ household_id: hid, week_start: weekStart })
      .select("id")
      .single();
    const f2 = queryError(createErr);
    if (f2) return f2;
    planId = (created as { id: string }).id;
  }

  const { data: slots, error: slotErr } = await db
    .from("meal_slots")
    .select("id")
    .eq("household_id", hid)
    .ilike("name", input.slotName)
    .limit(1);
  const f3 = queryError(slotErr);
  if (f3) return f3;
  let slotId: string;
  if (slots && slots.length > 0) {
    slotId = (slots[0] as { id: string }).id;
  } else {
    const { data: maxSlot } = await db
      .from("meal_slots")
      .select("sort_order")
      .eq("household_id", hid)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = (((maxSlot?.[0] as { sort_order?: number } | undefined)?.sort_order ?? -1) + 1);
    const { data: createdSlot, error: createSlotErr } = await db
      .from("meal_slots")
      .insert({ household_id: hid, name: input.slotName, sort_order: nextOrder })
      .select("id")
      .single();
    const f4 = queryError(createSlotErr);
    if (f4) return f4;
    slotId = (createdSlot as { id: string }).id;
  }

  const { data: meal, error: mealErr } = await db
    .from("planned_meals")
    .insert({
      household_id: hid,
      meal_plan_id: planId,
      day_date: input.dayDate,
      slot_id: slotId,
      state: "accepted",
    })
    .select("id")
    .single();
  const f5 = queryError(mealErr);
  if (f5) return f5;
  const mealId = (meal as { id: string }).id;

  const component: {
    household_id: string;
    planned_meal_id: string;
    kind: string;
    recipe_id?: string | null;
    freeform_text?: string | null;
  } = input.recipeId
    ? { household_id: hid, planned_meal_id: mealId, kind: "recipe", recipe_id: input.recipeId }
    : { household_id: hid, planned_meal_id: mealId, kind: "freeform", freeform_text: freeform! };
  const { error: compErr } = await db.from("meal_components").insert(component);
  const f6 = queryError(compErr);
  if (f6) return f6;

  return { ok: true, message: "Meal added to the plan" };
}

export async function removePlannedMeal(db: Db, hid: string, mealId: string): Promise<ApiResult> {
  const { error: compErr } = await db
    .from("meal_components")
    .delete()
    .eq("planned_meal_id", mealId)
    .eq("household_id", hid);
  const f1 = queryError(compErr);
  if (f1) return f1;
  const { error } = await db
    .from("planned_meals")
    .delete()
    .eq("id", mealId)
    .eq("household_id", hid);
  return queryError(error) ?? { ok: true, message: "Meal removed from the plan" };
}

/**
 * "I cooked this": record consumption for each reviewed ingredient quantity
 * (the only thing that draws inventory down), then stamp the meal cooked.
 * Quantities are reviewed by the user before commit.
 */
export async function markMealCooked(
  db: Db,
  hid: string,
  input: {
    mealId: string;
    consumptions: { itemName: string; quantity: number | null; unit: string | null }[];
  }
): Promise<ApiResult> {
  const results: ApiResult[] = [];
  let skipped = 0;
  for (const c of input.consumptions) {
    if (!c.itemName) {
      skipped++;
      continue;
    }
    // No usable quantity (e.g. "salt to taste") — never invent one; skip
    // the line and say so rather than guessing.
    if (!c.quantity || c.quantity <= 0) {
      skipped++;
      continue;
    }
    const r = await recordConsumption(db, hid, {
      itemName: c.itemName,
      quantity: c.quantity,
      unit: c.unit ?? undefined,
      event: "Used",
      reason: "Cooked planned meal",
    });
    results.push(r);
    if (!r.ok) {
      return {
        ok: false,
        message: `Couldn't record ${c.itemName}: ${r.message}`,
        data: { completed: results.length - 1 },
      };
    }
  }
  const { error } = await db
    .from("planned_meals")
    .update({ cooked_at: new Date().toISOString() })
    .eq("id", input.mealId)
    .eq("household_id", hid);
  const failed = queryError(error);
  if (failed) return failed;
  const firstOp = results.find((r) => r.operationId)?.operationId;
  const cooked =
    results.length === 0
      ? "Marked as cooked."
      : `Cooked! Recorded ${results.length} ingredient${results.length === 1 ? "" : "s"}.`;
  return {
    ok: true,
    message: skipped > 0 ? `${cooked} ${skipped} line${skipped === 1 ? "" : "s"} had no quantity and ${skipped === 1 ? "was" : "were"} skipped.` : cooked,
    operationId: firstOp,
  };
}

/* ---------- household ---------- */

export async function createHousehold(
  db: Db,
  input: { name: string; currency: string }
): Promise<ApiResult> {
  const { data, error } = await db.rpc("create_household", {
    p_name: input.name.trim() || "My Kitchen",
    p_currency: input.currency,
  });
  return fromStatus(data, error, { ok: () => "Kitchen is ready" });
}

export async function createInvite(db: Db, hid: string): Promise<ApiResult> {
  const { data, error } = await db.rpc("create_invite", {
    p_household_id: hid,
  });
  const failed = queryError(error);
  if (failed) return failed;
  const d = asJson(data);
  return { ok: true, message: "Invite code created", data: d };
}
