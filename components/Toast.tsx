"use client";

import { useEffect, useState } from "react";
import { undoOperation } from "@/lib/actions";

interface ToastItem {
  id: number;
  ok: boolean;
  message: string;
  operationId?: string;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [undoBusy, setUndoBusy] = useState<number | null>(null);

  useEffect(() => {
    let id = 0;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ ok: boolean; message?: string; operationId?: string }>).detail;
      const item: ToastItem = {
        id: ++id,
        ok: detail.ok,
        message:
          detail.message ?? (detail.ok ? "Done" : "Something went wrong"),
        operationId: detail.operationId,
      };
      setToasts((prev) => [...prev.slice(-2), item]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 6000);
    };
    window.addEventListener("pantry-toast", handler);
    return () => window.removeEventListener("pantry-toast", handler);
  }, []);

  async function handleUndo(item: ToastItem) {
    if (!item.operationId) return;
    setUndoBusy(item.id);
    try {
      const r = await undoOperation(item.operationId);
      toast(r);
    } finally {
      setUndoBusy(null);
      setToasts((prev) => prev.filter((t) => t.id !== item.id));
    }
  }

  return (
    <>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-8"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-pop ${
              t.ok ? "bg-sage-800 text-cream-50" : "bg-bark-900 text-cream-50"
            }`}
          >
            <span aria-hidden className="text-base leading-none">
              {t.ok ? "✓" : "⚠️"}
            </span>
            <span>{t.message}</span>
            {t.ok && t.operationId && (
              <button
                onClick={() => handleUndo(t)}
                disabled={undoBusy === t.id}
                className="ml-1 shrink-0 rounded-full bg-cream-50/15 px-3 py-1.5 text-xs font-semibold text-cream-50 transition hover:bg-cream-50/25 disabled:opacity-60"
              >
                {undoBusy === t.id ? "Undoing…" : "Undo"}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/** Show a toast for a server-action result. Safe to call from anywhere client-side. */
export function toast(result: { ok: boolean; message?: string; operationId?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("pantry-toast", { detail: result }));
}
