"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { undoOperation } from "@/lib/actions";
import type { OperationRow } from "@/lib/api";
import {
  Card,
  Badge,
  EmptyState,
  PageHeader,
  actionNotice,
} from "@/components/ui";

function kindBadge(kind: string) {
  const map: Record<string, { tone: "green" | "red" | "amber" | "neutral"; label: string }> = {
    Purchase: { tone: "green", label: "Bought" },
    Consumption: { tone: "red", label: "Used" },
    Spoilage: { tone: "red", label: "Spoiled" },
    Adjustment: { tone: "amber", label: "Adjusted" },
    PlanExecution: { tone: "green", label: "Cooked" },
    Merge: { tone: "amber", label: "Merged" },
    ItemDelete: { tone: "red", label: "Deleted" },
  };
  return map[kind] ?? { tone: "neutral" as const, label: kind };
}

export function ActivityClient({ ops }: { ops: OperationRow[] }) {
  const router = useRouter();
  const [undoing, setUndoing] = useState<string | null>(null);

  async function handleUndo(operationId: string) {
    setUndoing(operationId);
    const r = await undoOperation(operationId);
    setUndoing(null);
    actionNotice(r);
    if (r.ok) router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle="Everything that changed your pantry — each with its own Undo."
      />
      {ops.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Nothing yet"
          body="Add stock, log a receipt, or plan a meal — it all shows up here."
        />
      ) : (
        <Card className="divide-y divide-bark-900/5">
          {ops.map((op) => {
            const b = kindBadge(op.kind);
            const undone = Boolean(op.undone_at);
            return (
              <div key={op.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={b.tone}>{b.label}</Badge>
                    {undone && <Badge tone="neutral">undone</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm text-bark-600">
                    {op.summary}
                  </p>
                  <p className="text-xs text-bark-400">
                    {new Date(op.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {op.undone_at ? (
                      <>
                        {" · undone "}
                        {new Date(op.undone_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </>
                    ) : null}
                  </p>
                </div>
                {!undone && (
                  <button
                    onClick={() => handleUndo(op.id)}
                    disabled={undoing !== null}
                    className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-sage-700 ring-1 ring-sage-600/30 transition hover:bg-sage-50 disabled:opacity-60 active:scale-95"
                  >
                    {undoing === op.id ? "Undoing…" : "Undo"}
                  </button>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
