"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Transparent (background-removed) Calgary Tower line-art served from /public.
 * Rendered black on light surfaces and inverted to white in dark mode.
 * Falls back to the built-in glyph if the file is missing.
 */
const LOGO_SRC = "/calgarytower-mark.png";
const LOGO_RATIO = 66 / 250; // intrinsic width / height of the trimmed mark

interface BrandMarkProps {
  className?: string;
  /** Size of the square logo in pixels. */
  size?: number;
  withWordmark?: boolean;
  /** Tailwind text size class for the wordmark. */
  wordmarkClassName?: string;
}

/**
 * Brand logo: uses a custom image at {@link LOGO_SRC} when available, otherwise
 * falls back to the built-in Calgary Tower glyph in a gradient tile. Optionally
 * followed by the CalgaryGuessr wordmark.
 */
export function BrandMark({
  className,
  size = 36,
  withWordmark = false,
  wordmarkClassName,
}: BrandMarkProps) {
  // Default to the built-in glyph and only swap in the custom image once it has
  // verifiably loaded, so a missing file never flashes a broken-image icon.
  const [hasLogo, setHasLogo] = useState(false);

  useEffect(() => {
    const probe = new window.Image();
    probe.onload = () => setHasLogo(true);
    probe.onerror = () => setHasLogo(false);
    probe.src = LOGO_SRC;
  }, []);

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={LOGO_SRC}
          alt=""
          width={Math.round(size * LOGO_RATIO)}
          height={size}
          style={{ height: size, width: "auto" }}
          className="shrink-0 select-none object-contain dark:invert"
          aria-hidden="true"
        />
      ) : (
        <span
          className="relative grid shrink-0 place-items-center rounded-[30%] bg-gradient-to-br from-calgary-red to-calgary-gold text-white shadow-glow ring-1 ring-inset ring-white/20"
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <TowerGlyph className="h-[64%] w-[64%]" />
        </span>
      )}
      {withWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            wordmarkClassName ?? "text-lg",
          )}
        >
          Calgary<span className="text-calgary-red">Guessr</span>
        </span>
      )}
    </span>
  );
}

/**
 * Minimal stylized Calgary Tower mark (fallback when no logo image is given).
 *
 * The three features that make the tower readable at 20px are the flame on top,
 * the wide observation pod, and a shaft that FLARES toward the base. That last
 * one is what separates it from the CN Tower at a glance, so the two shaft
 * strokes deliberately splay outward rather than running parallel.
 */
export function TowerGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* cauldron flame */}
      <path
        d="M12 1.1c1.15 1.05 1.7 1.95 1.7 2.75a1.7 1.7 0 1 1-3.4 0c0-.8.55-1.7 1.7-2.75Z"
        fill="currentColor"
      />
      {/* mast between flame and pod */}
      <path
        d="M12 5.5v1.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* observation pod */}
      <path
        d="M7.9 8.9c0-1.15 1.84-2.05 4.1-2.05s4.1.9 4.1 2.05-1.84 2-4.1 2-4.1-.85-4.1-2Z"
        fill="currentColor"
      />
      {/* tapered shaft, flaring toward the base */}
      <path
        d="M10.5 10.9 9.3 21.9M13.5 10.9l1.2 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* base */}
      <path
        d="M8.4 22h7.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
