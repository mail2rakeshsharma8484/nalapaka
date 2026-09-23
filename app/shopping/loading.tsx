import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading shopping list">
      <Skeleton className="mb-2 h-9 w-48 !rounded-xl" />
      <Skeleton className="mb-6 h-5 w-96" />
      <Skeleton className="mb-5 h-28 rounded-2xl" />
      <Skeleton className="mb-2 h-6 w-32" />
      <div className="rounded-2xl bg-white shadow-card ring-1 ring-bark-900/[0.06]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-bark-900/5 px-4 py-3 last:border-0">
            <Skeleton className="h-5 w-5 !rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-1.5 h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20 !rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
