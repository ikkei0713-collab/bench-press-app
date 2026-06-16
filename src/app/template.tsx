"use client";

// Re-mounts on every route change → gives each navigation a smooth enter animation.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
