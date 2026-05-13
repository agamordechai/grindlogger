interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(90deg, #0d1b58 25%, #1438a8 50%, #0d1b58 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite',
        minHeight: 14,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      style={{
        background: '#0a1240',
        border: '2px solid #1c52d6',
        boxShadow: '4px 4px 0 #1438a8',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
