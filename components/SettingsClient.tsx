"use client";

import { useState } from "react";
import { createInvite } from "@/lib/actions";
import {
  Card,
  PrimaryButton,
  PageHeader,
  actionNotice,
} from "@/components/ui";

export function SettingsClient({
  household,
  members,
  invites,
}: {
  household: Record<string, unknown>;
  members: Record<string, unknown>[];
  invites: Record<string, unknown>[];
}) {
  const [inviting, setInviting] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);

  async function handleInvite() {
    setInviting(true);
    const r = await createInvite();
    setInviting(false);
    actionNotice(r);
    if (r.ok) {
      setLastCode((r.data as { code?: string } | undefined)?.code ?? null);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your household, your people." />

      <div className="space-y-6">
        <Card className="p-5">
          <h3 className="font-display mb-3 text-lg font-semibold">Household</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-bark-500">Name</dt>
              <dd className="font-semibold">{household.name as string}</dd>
            </div>
            <div>
              <dt className="text-xs text-bark-500">Currency</dt>
              <dd className="font-semibold">{household.currency as string}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="font-display mb-3 text-lg font-semibold">
            Members ({members.length})
          </h3>
          <ul className="space-y-2">
            {members.map((m, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {(m.full_name as string) || (m.email as string) || "Member"}
                </span>
                <span className="text-xs text-bark-500">{m.role as string}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-display mb-2 text-lg font-semibold">Invite someone</h3>
          <p className="mb-4 text-sm text-bark-500">
            Each invite is a single-use code that expires after 14 days. It grants
            full access to this household — only share codes with people you trust.
          </p>
          <PrimaryButton onClick={handleInvite} disabled={inviting}>
            {inviting ? "Creating…" : "Create invite code"}
          </PrimaryButton>
          {lastCode && (
            <p className="mt-3 rounded-xl bg-sage-50 px-3 py-2 text-sm text-sage-800 ring-1 ring-sage-600/20">
              New invite code:{" "}
              <span className="font-mono font-bold tracking-widest">{lastCode}</span>
              {" "}— share it with them; it expires in 14 days.
            </p>
          )}
          {invites.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-bark-500">
                Pending invites
              </p>
              <ul className="space-y-1.5">
                {invites.map((inv) => (
                  <li key={inv.code as string} className="flex items-center justify-between text-sm">
                    <span className="font-mono tracking-widest">{inv.code as string}</span>
                    <span className="text-xs text-bark-500">
                      expires{" "}
                      {new Date(inv.expires_at as string).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
