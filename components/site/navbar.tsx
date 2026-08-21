"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/site/brand-mark";

/**
 * There is deliberately no hamburger menu here.
 *
 * Toronto's navbar collapses four links into a mobile sheet. Calgary has one
 * link, and a disclosure button that reveals a single item is worse than the
 * item. Every element below fits a 320px viewport once the wordmark drops out
 * (glyph 34 + About 64 + Play 88 + gaps is about 210px inside a 280px content
 * box). If a leaderboard or a second section ever lands, bring the sheet back
 * from the Toronto implementation rather than cramming a third pill in here.
 */
const NAV_LINKS = [{ href: "/about", label: "About" }] as const;

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-shadow duration-300",
        scrolled
          ? "glass-strong shadow-soft"
          : "border-b border-transparent bg-background/40 backdrop-blur-sm",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="group flex items-center rounded-lg outline-none"
          aria-label="CalgaryGuessr home"
        >
          <BrandMark
            withWordmark
            size={34}
            wordmarkClassName="hidden text-lg transition-colors group-hover:text-foreground sm:inline sm:text-xl"
          />
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-accent" />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}

          <Button
            asChild
            size="sm"
            className="ml-1 rounded-full px-4 shadow-glow sm:px-5"
          >
            <Link href="/game">
              <Play className="size-4" />
              Play
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
