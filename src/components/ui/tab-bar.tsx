"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/program", label: "記録", icon: Dumbbell },
  { href: "/progress", label: "推移", icon: TrendingUp },
  { href: "/friends", label: "フレンド", icon: Users },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none pb-safe">
      <nav className="liquid-glass pointer-events-auto mb-3 flex items-center gap-1 rounded-full p-1.5 shadow-2xl">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-full px-4 py-2 transition-all duration-300 press",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              {/* Active pill highlight */}
              {active && (
                <span className="absolute inset-0 rounded-full bg-primary/15 ring-1 ring-primary/25 pop-in" />
              )}
              <Icon
                className="relative w-[22px] h-[22px]"
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={cn(
                  "relative text-[10px] tracking-tight leading-none",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
