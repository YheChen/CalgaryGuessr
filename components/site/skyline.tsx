import { cn } from "@/lib/utils";

/**
 * Stylized Calgary skyline silhouette.
 *
 * Landmarks, left to right: a low-rise Beltline approach, the Calgary Tower
 * (flame, pod, flared shaft), The Bow with its signature west-facing crescent,
 * Brookfield Place and Suncor's slab towers, and Telus Sky tapering at the end.
 * Stylized, not traced: the shapes are chosen to be recognisable at 160px tall
 * and faded to a few percent opacity, not to be architecturally accurate.
 *
 * Fills with currentColor so callers can tint and fade it freely.
 */
export function Skyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 230"
      preserveAspectRatio="xMidYMax slice"
      fill="currentColor"
      className={cn("block w-full", className)}
      aria-hidden="true"
    >
      {/* west low-rise cluster */}
      <rect x="0" y="176" width="58" height="54" />
      <rect x="62" y="156" width="42" height="74" />
      <rect x="108" y="182" width="34" height="48" />
      <rect x="146" y="144" width="50" height="86" />
      <rect x="200" y="164" width="38" height="66" />
      <rect x="242" y="128" width="54" height="102" />
      <rect x="300" y="158" width="32" height="72" />

      {/* mid-rise approach into downtown */}
      <rect x="338" y="116" width="54" height="114" />
      <rect x="398" y="140" width="38" height="90" />
      <rect x="442" y="100" width="58" height="130" />
      <rect x="504" y="132" width="34" height="98" />

      {/* Calgary Tower. Three features carry the recognition: a flame on top,
          an observation pod about three times the shaft width, and a shaft that
          FLARES toward the base. Drawn deliberately oversized relative to the
          real proportions, because at a few percent opacity a faithful needle
          reads as a radio mast. */}
      <g>
        {/* cauldron flame */}
        <path d="M566 12c7 6.5 10.5 12 10.5 16.8a10.5 10.5 0 0 1-21 0c0-4.8 3.5-10.3 10.5-16.8Z" />
        {/* mast between flame and pod */}
        <rect x="562" y="32" width="8" height="14" />
        {/* observation pod: the widest thing on the tower */}
        <path d="M544 58c0-7.6 9.8-13.6 22-13.6s22 6 22 13.6-9.8 13.4-22 13.4-22-5.8-22-13.4Z" />
        {/* flared shaft: 16 wide at the pod, 38 at the base */}
        <path d="M558 68h16l11 162h-38l11-162Z" />
      </g>

      {/* The Bow. Its arc is the only reason it is worth drawing at all, so the
          west flank is a single sweeping curve up to a flat east wall. */}
      <path d="M600 230C600 128 630 50 692 14V230H600Z" />

      {/* Suncor Energy Centre twin slabs, stepped */}
      <rect x="702" y="52" width="40" height="178" />
      <rect x="746" y="76" width="34" height="154" />

      {/* Brookfield Place: the tallest flat-topped slab in the cluster */}
      <rect x="788" y="30" width="52" height="200" />
      <rect x="846" y="108" width="34" height="122" />

      {/* Telus Sky, tapering toward the top */}
      <path d="M890 230V96l44-38v172h-44Z" />

      {/* east low-rise falloff */}
      <rect x="944" y="130" width="46" height="100" />
      <rect x="996" y="158" width="40" height="72" />
      <rect x="1042" y="118" width="52" height="112" />
      <rect x="1100" y="166" width="36" height="64" />
      <rect x="1142" y="140" width="58" height="90" />
    </svg>
  );
}
