"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidReceipt } from "@/lib/actions";
import { Field, inputClass, PrimaryButton, actionNotice } from "@/components/ui";

export function VoidReceiptButton({ receiptId }: { receiptId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleVoid() {
    if (!reason.trim()) {
      actionNotice({ ok: false, message: "Give a reason for the void — it becomes the audit note." });
      return;
    }
    setBusy(true);
    const r = await voidReceipt(receiptId, reason.trim());
    setBusy(false);
    actionNotice(r);
    if (r.ok) {
      setConfirming(false);
      router.refresh();
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-xl bg-ember-50 px-4 py-2.5 text-sm font-semibold text-ember-700 ring-1 ring-ember-500/30 transition hover:bg-ember-100"
      >
        Void receipt
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-ember-50 p-4 ring-1 ring-ember-500/30 sm:max-w-md">
      <p className="text-sm font-medium text-ember-800">
        Voiding reverses everything this receipt stocked. Undone if it fails.
      </p>
      <div className="mt-3">
        <Field label="Reason" htmlFor="void-reason">
          <input
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. duplicate entry"
            className={`${inputClass} bg-white`}
          />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-bark-600 ring-1 ring-bark-900/15 hover:bg-white"
        >
          Cancel
        </button>
        <PrimaryButton onClick={handleVoid} disabled={busy} className="flex-1 !bg-ember-600 hover:!bg-ember-700">
          {busy ? "Voiding…" : "Confirm void"}
        </PrimaryButton>
      </div>
    </div>
  );
}
