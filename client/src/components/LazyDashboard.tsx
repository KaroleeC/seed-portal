import { lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy components
const SalesInbox = lazy(() =>
  import("./SalesInbox").then((module) => ({ default: module.SalesInbox }))
);

// Loading skeleton for better perceived performance
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="max-w-5xl mx-auto px-6 pt-8">
        {/* Header skeleton */}
        <Skeleton className="h-20 w-64 mx-auto mb-8" />

        {/* Metrics cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white/10 backdrop-blur-sm">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <Skeleton className="h-8 w-8 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lazy wrapper for SalesInbox with fallback that matches the final design
export function LazySalesInbox(props: any) {
  return (
    <Suspense
      fallback={
        <Card className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl h-fit">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <div className="h-6 w-6 bg-orange-300/50 rounded" />
                </div>
                <div>
                  <div className="h-5 w-24 bg-white/30 rounded mb-1" />
                  <div className="h-3 w-40 bg-white/20 rounded" />
                </div>
              </div>
              <div className="h-8 w-20 bg-orange-500/30 rounded" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 bg-white/20 border border-white/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/30 rounded-full" />
                      <div>
                        <div className="h-4 w-32 bg-white/30 rounded mb-1" />
                        <div className="h-3 w-24 bg-white/20 rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-white/20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      }
    >
      <SalesInbox {...props} />
    </Suspense>
  );
}
