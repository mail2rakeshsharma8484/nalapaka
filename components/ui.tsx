import { type ReactNode } from "react";
import { toast } from "./Toast";

export { formatQty, displayName } from "@/lib/types";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-card ring-1 ring-bark-900/[0.06] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHover({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-card ring-1 ring-bark-900/[0.06] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-bark-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-xl text-[0.9375rem] leading-relaxed text-bark-500">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-white/70 px-6 py-14 text-center ring-1 ring-dashed ring-bark-900/15">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100 text-3xl">
        {icon}
      </div>
      <p className="font-display mt-4 text-lg font-semibold text-bark-900">{title}</p>
      {body && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-bark-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-cream-200/80 text-bark-600",
    green: "bg-sage-100 text-sage-800",
    amber: "bg-ember-100 text-ember-700",
    red: "bg-red-100 text-red-800",
    blue: "bg-sky-100 text-sky-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="block">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-bark-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-bark-900/15 bg-white px-3.5 py-2.5 text-[0.9375rem] text-bark-900 shadow-[inset_0_1px_2px_rgb(44_38_32/0.04)] placeholder:text-bark-400/70 transition focus:border-sage-600 focus:outline-none focus:ring-[3px] focus:ring-sage-600/15";

export const selectClass = `${inputClass} appearance-none pr-9 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%236b5d4f%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat`;

const btnBase =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

export function PrimaryButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${btnBase} bg-sage-700 px-5 py-2.5 text-white shadow-[0_1px_2px_rgb(65_86_54/0.4)] hover:bg-sage-600 active:bg-sage-800 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${btnBase} bg-white px-4 py-2.5 text-bark-700 ring-1 ring-bark-900/15 hover:bg-cream-100 hover:ring-bark-900/25 active:bg-cream-200 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DangerGhostButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${btnBase} bg-white px-4 py-2.5 text-red-700 ring-1 ring-red-900/15 hover:bg-red-50 active:bg-red-100 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Skeleton block for loading states. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-bark-900/[0.06]">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </div>
  );
}

/** Bottom-sheet on mobile, centered dialog on desktop. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bark-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="animate-sheet-in max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-pop sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xl text-bark-500 hover:bg-cream-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Toast-backed feedback for server action results (replaces alert()). */
export function actionNotice(result: { ok: boolean; message?: string; operationId?: string }) {
  toast(result);
}
