export function Skeleton({ className = "", width, height, circle = false }) {
  const style = {
    width,
    height,
    borderRadius: circle ? "999px" : undefined,
  };

  return <span className={`skeleton-shimmer ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`skeleton-text-group ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={`skeleton-line ${index === lines - 1 ? "skeleton-line--short" : ""}`.trim()}
        />
      ))}
    </div>
  );
}

export function SkeletonJobCard() {
  return (
    <article className="landing-job-card skeleton-card" aria-hidden="true">
      <div className="landing-job-head">
        <div className="skeleton-text-group">
          <Skeleton className="skeleton-pill" width="112px" height="26px" />
          <Skeleton className="skeleton-line" width="220px" height="24px" />
          <Skeleton className="skeleton-line skeleton-line--short" width="180px" height="16px" />
        </div>
        <Skeleton className="skeleton-pill" width="68px" height="24px" />
      </div>

      <SkeletonText lines={3} />

      <div className="landing-job-tags">
        <Skeleton className="skeleton-pill" width="88px" height="24px" />
        <Skeleton className="skeleton-pill" width="72px" height="24px" />
        <Skeleton className="skeleton-pill" width="96px" height="24px" />
      </div>

      <div className="landing-job-footer">
        <div className="salary-box salary-box--soft skeleton-salary-box">
          <Skeleton className="skeleton-line skeleton-line--short" width="74px" height="12px" />
          <Skeleton className="skeleton-line" width="140px" height="20px" />
        </div>
        <div className="landing-job-actions">
          <Skeleton className="skeleton-pill" width="116px" height="38px" />
          <Skeleton className="skeleton-pill" width="122px" height="38px" />
        </div>
      </div>
    </article>
  );
}
