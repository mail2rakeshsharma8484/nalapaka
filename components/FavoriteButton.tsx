"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setRecipeFavorite } from "@/lib/actions";
import { actionNotice } from "@/components/ui";

export function FavoriteButton({
  recipeId,
  favorite,
}: {
  recipeId: string;
  favorite: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [isFav, setIsFav] = useState(favorite);

  async function toggle() {
    setBusy(true);
    const r = await setRecipeFavorite(recipeId, !isFav);
    setBusy(false);
    actionNotice(r);
    if (r.ok) {
      setIsFav(!isFav);
      router.refresh();
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={isFav}
      aria-label={isFav ? "Remove from favourites" : "Mark as favourite"}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition active:scale-95 disabled:opacity-60 ${
        isFav
          ? "bg-honey-100 text-honey-700 ring-honey-500/30 hover:bg-honey-200/60"
          : "bg-white text-bark-500 ring-bark-900/15 hover:bg-cream-100"
      }`}
    >
      {isFav ? "⭐ Favourite" : "☆ Favourite"}
    </button>
  );
}
