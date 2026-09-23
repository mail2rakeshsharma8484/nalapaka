import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading recipes">
      <Skeleton className="mb-2 h-9 w-40 !rounded-xl" />
      <Skeleton className="mb-6 h-5 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-bark-900/[0.06]">
            <Skeleton className="h-6 w-3/4" />
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-6 w-16 !rounded-full" />
              <Skeleton className="h-6 w-20 !rounded-full" />
            </div>
            <Skeleton className="mt-4 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
