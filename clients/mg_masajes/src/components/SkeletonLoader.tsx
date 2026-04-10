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
    <div className="skeleton-loader-wrapper">
      <div className="skeleton skeleton-title" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card skeleton-card-wrapper">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-row" />
      <div className="skeleton skeleton-row skeleton-row-short" />
    </div>
  );
}
