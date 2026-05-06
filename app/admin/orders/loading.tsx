import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOrdersLoading() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-md border p-3">
              <Skeleton className="mb-2 h-3 w-16" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <div className="flex items-end gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="flex flex-col gap-0 p-2">
            <div className="flex gap-2 border-b p-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, r) => (
              <div key={r} className="flex gap-2 border-b p-2 last:border-0">
                {Array.from({ length: 7 }).map((_, c) => (
                  <Skeleton key={c} className="h-5 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-16" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
