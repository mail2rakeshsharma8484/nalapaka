import { Skeleton, SkeletonCard } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="mb-6 h-44 rounded-3xl" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-bark-900/[0.06]">
            <Skeleton className="h-7 w-7 !rounded-lg" />
            <Skeleton className="mt-3 h-8 w-12" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
