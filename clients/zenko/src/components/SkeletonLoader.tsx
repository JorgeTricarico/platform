import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SkeletonLoaderProps {
  rows?: number;
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="spinner-inline" />
  );
}

export function SkeletonLoader({ rows = 5 }: SkeletonLoaderProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Skeleton className="h-7 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}
