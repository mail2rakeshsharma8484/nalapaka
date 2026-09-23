import { Skeleton, SkeletonCard } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading pantry">
      <Skeleton className="mb-2 h-9 w-56 !rounded-xl" />
      <Skeleton className="mb-6 h-5 w-80" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-11 flex-1 sm:max-w-sm" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
