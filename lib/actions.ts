"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { requireHouseholdId, getHouseholdId } from "./household";
import * as api from "./api";

export type ActionResult = {
  ok: boolean;
  message?: string;
  /** When a write succeeds, the operation id — the client offers Undo with it. */
  operationId?: string;
  data?: unknown;
};

function toAction(r: api.ApiResult): ActionResult {
  return { ok: r.ok, message: r.message, operationId: r.operationId, data: r.data };
}

async function ctx() {
  const hid = await requireHouseholdId();
  const db = await createClient();
  return { hid, db };
}

function touch(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

/* ---------- inventory ---------- */

export async function addStock(
  itemName: string,
  quantity: number,
  unit: string
): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.addStock(db, hid, { itemName, quantity, unit }));
  if (r.ok) touch("/inventory", "/");
  return r;
}

export async function recordConsumption(
  itemName: string,
  quantity: number,
  unit: string
): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.recordConsumption(db, hid, { itemName, quantity, unit }));
  if (r.ok) touch("/inventory", "/");
  return r;
}

export async function createItem(input: {
  name: string;
  category?: string;
  tier?: string;
  unit: string;
}): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.createItem(db, hid, input));
  if (r.ok) touch("/inventory");
  return r;
}

/**
 * Undo one specific operation. There is no "undo last" — the caller passes
 * the operation id from the write's toast or the activity screen, so we
 * never risk undoing another member's work (UC-UNDO-03).
 */
export async function undoOperation(operationId: string, reason?: string): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.undoOperation(db, hid, operationId, reason));
  if (r.ok) touch("/inventory", "/shopping", "/receipts", "/plan", "/", "/activity");
  return r;
}

/* ---------- shopping ---------- */

export async function addShoppingItem(
  name: string,
  quantity?: number,
  unit?: string
): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.addShoppingItem(db, hid, { name, quantity, unit }));
  if (r.ok) touch("/shopping", "/");
  return r;
}

export async function approveShoppingItems(ids: string[]): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.approveShoppingItems(db, hid, ids));
  if (r.ok) touch("/shopping");
  return r;
}

export async function markPurchased(ids: string[]): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.markPurchased(db, hid, ids));
  if (r.ok) touch("/shopping", "/receipts");
  return r;
}

export async function removeShoppingItem(id: string): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.removeShoppingItem(db, hid, id));
  if (r.ok) touch("/shopping");
  return r;
}

/* ---------- receipts ---------- */

export async function processReceipt(input: api.ReceiptInput): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.processReceipt(db, hid, input));
  if (r.ok) touch("/receipts", "/inventory", "/shopping", "/prices", "/");
  return r;
}

export async function resolvePurchaseLine(
  purchaseId: string,
  itemName?: string,
  dismissNonfood?: boolean
): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(
    await api.resolvePurchaseLine(db, hid, {
      purchaseId,
      itemName,
      dismissNonfood,
    })
  );
  if (r.ok) touch("/receipts", "/inventory", "/");
  return r;
}

export async function voidReceipt(receiptId: string, reason: string): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.voidReceipt(db, hid, { receiptId, reason }));
  if (r.ok) touch("/receipts", "/inventory", "/");
  return r;
}

export async function voidPurchaseLine(purchaseId: string, reason: string): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.voidPurchaseLine(db, hid, { purchaseId, reason }));
  if (r.ok) touch("/receipts", "/inventory", "/");
  return r;
}

/* ---------- recipes ---------- */

export async function copyCatalogRecipe(catalogRecipeId: string): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.copyCatalogRecipe(db, hid, catalogRecipeId));
  if (r.ok) touch("/recipes");
  return r;
}

export async function parseRecipeText(
  text: string
): Promise<{ ok: boolean; draft?: api.ParsedRecipeDraft; message?: string }> {
  const db = await createClient();
  return api.parseRecipeText(db, text);
}

export async function saveRecipe(input: {
  name: string;
  instructions?: string;
  servings?: number;
  ingredients: { free_text: string; quantity?: number | null; unit?: string | null }[];
}): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.saveRecipe(db, hid, input));
  if (r.ok) touch("/recipes");
  return r;
}

export async function setRecipeFavorite(
  recipeId: string,
  favorite: boolean
): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.setRecipeFavorite(db, hid, recipeId, favorite));
  if (r.ok) touch("/recipes", `/recipes/${recipeId}`);
  return r;
}

/* ---------- meal planning ---------- */

export async function addPlannedMeal(input: {
  dayDate: string;
  slotName: string;
  recipeId?: string;
  freeform?: string;
}): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.addPlannedMeal(db, hid, input));
  if (r.ok) touch("/plan", "/");
  return r;
}

export async function removePlannedMeal(mealId: string): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.removePlannedMeal(db, hid, mealId));
  if (r.ok) touch("/plan", "/");
  return r;
}

/** "I cooked this" — quantities were reviewed in the UI before commit. */
export async function markMealCooked(
  mealId: string,
  consumptions: { itemName: string; quantity: number | null; unit: string | null }[]
): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.markMealCooked(db, hid, { mealId, consumptions }));
  if (r.ok) touch("/plan", "/inventory", "/");
  return r;
}

/**
 * Ingredient review sheet for the cook flow: resolved item names with the
 * recipe's quantities, editable before commit. Free-text ingredients with
 * no catalog item are listed so the user can map them to an item name.
 */
export async function getCookSheet(
  recipeId: string
): Promise<
  { ok: true; lines: { itemName: string; quantity: number | null; unit: string | null; note?: string }[] } |
  { ok: false; message: string }
> {
  const { hid, db } = await ctx();
  const { ingredients } = await api.getRecipeDetail(db, hid, recipeId);
  const lines = ingredients.map((ing) => {
    const items = ing.items as { canonical_name?: string } | null;
    const name = items?.canonical_name ?? (ing.free_text_ingredient as string | null) ?? "";
    return {
      itemName: name,
      quantity: (ing.quantity as number | null) ?? null,
      unit: (ing.unit as string | null) ?? null,
      note: items?.canonical_name ? undefined : "free text — check the item name",
    };
  });
  return { ok: true, lines };
}

/* ---------- onboarding ---------- */

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "CAD",
  "AUD",
  "JPY",
  "SGD",
] as const;

export async function createHouseholdAction(
  name: string,
  currency: string
): Promise<ActionResult> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in" };

  // Guard: don't create a second household if one already exists.
  const existing = await getHouseholdId();
  if (existing) redirect("/");

  const r = toAction(await api.createHousehold(db, { name, currency }));
  if (!r.ok) return r;
  revalidatePath("/");
  redirect("/");
}

/* ---------- household ---------- */

export async function createInvite(): Promise<ActionResult> {
  const { hid, db } = await ctx();
  const r = toAction(await api.createInvite(db, hid));
  if (r.ok) touch("/settings");
  return r;
}
