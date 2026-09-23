import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading meal plan">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Skeleton className="h-9 w-44 !rounded-xl" />
          <Skeleton className="mt-2 h-5 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 !rounded-xl" />
          <Skeleton className="h-10 w-24 !rounded-xl" />
          <Skeleton className="h-10 w-10 !rounded-xl" />
        </div>
      </div>
      <Skeleton className="mb-6 h-64 rounded-2xl" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-bark-900/[0.06]">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-3 h-12 w-full !rounded-xl" />
            <Skeleton className="mt-2 h-12 w-full !rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
