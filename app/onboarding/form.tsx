"use client";

import { useState } from "react";
import {
  Card,
  Field,
  inputClass,
  PrimaryButton,
  selectClass,
} from "@/components/ui";
import {
  createHouseholdAction,
  SUPPORTED_CURRENCIES,
} from "@/lib/actions";

export function OnboardingForm() {
  const [name, setName] = useState("My Kitchen");
  const [currency, setCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await createHouseholdAction(name, currency);
      if (!result.ok) {
        setError(result.message ?? "Something went wrong setting up your kitchen. Please try again.");
        setLoading(false);
      }
      // On success the action redirects to "/".
    } catch {
      setError("Something went wrong setting up your kitchen. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Household name" htmlFor="household-name">
          <input
            id="household-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Kitchen"
            maxLength={80}
            className={inputClass}
            autoComplete="off"
          />
        </Field>
        <Field label="Currency" htmlFor="household-currency">
          <select
            id="household-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={selectClass}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        {error && (
          <p role="alert" className="rounded-xl bg-ember-50 px-3.5 py-2.5 text-sm text-ember-700 ring-1 ring-ember-500/20">
            {error}
          </p>
        )}

        <PrimaryButton type="submit" disabled={loading} className="w-full">
          {loading ? "Setting up…" : "Start using Nalapaka"}
        </PrimaryButton>
      </form>
    </Card>
  );
}
