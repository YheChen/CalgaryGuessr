"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useJsApiLoader,
  GoogleMap,
  MarkerF,
  OverlayView,
  OverlayViewF,
  PolylineF,
} from "@react-google-maps/api";
import { Sun, Moon } from "lucide-react";
import { Spinner } from "@/components/site/spinner";
import { useMapTheme } from "@/components/site/map-theme";
import { formatDistanceCompact } from "@/lib/format-distance";
import { midpoint } from "@/lib/map-geometry";
import type { LatLng } from "@/lib/types";

interface GameMapProps {
  onMapClick?: (lat: number, lng: number) => void;
  guessLocation: LatLng | null;
  actualLocation: LatLng | null;
  isGuessing: boolean;
  className?: string;
  /**
   * Changes once per new guessing round. The same map instance is reused across
   * guessing and results rather than remounted, so a change here has to return
   * the view to the Calgary overview explicitly; otherwise the next round would
   * start framed on the previous round's answer.
   */
  viewResetKey?: string | number;
  /**
   * Distance in km for the guess line's label. Omitted while guessing, when
   * there is no line and no answer yet.
   */
  guessDistanceKm?: number | null;
}

const CENTER_CALGARY: LatLng = { lat: 51.0447, lng: -114.0719 };

/**
 * Wide enough that "which part of Calgary" is still a real question.
 *
 * The playable area is only about 3.1 km across, so framing it exactly would
 * hand the player half the answer. Zoom 12 shows roughly 9.6 km at this
 * latitude, a bit over three times the target box, which is the same ratio
 * Toronto's overview uses.
 */
const OVERVIEW_ZOOM = 12;

function pinDataUri(fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C7 0 .5 6.4.5 14.3.5 24.6 15 40 15 40s14.5-15.4 14.5-25.7C29.5 6.4 23 0 15 0Z" fill="${fill}"/><circle cx="15" cy="14.3" r="5.4" fill="#fff"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Hex values chosen to track the --calgary-red / --success tokens per theme so
// the on-map pins match the legend swatches in the results card.
const GUESS_PIN_HEX = { light: "#c8102e", dark: "#eb2e4d" };
const ACTUAL_PIN_HEX = { light: "#1b7d50", dark: "#31b97a" };

// Minimal, de-cluttered map styles so the guess map reads as a clean UI
// surface rather than a busy reference map. POIs are off in both themes: a
// labelled restaurant is a free answer.
const MAP_STYLE_LIGHT: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

const MAP_STYLE_DARK: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#17140f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a89e93" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f0d0a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#10222e" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a251d" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#3b342a" }],
  },
];

/** Centres an overlay on its anchor point rather than hanging it below-right. */
function centerOverlay(width: number, height: number) {
  return { x: -(width / 2), y: -(height / 2) };
}

export function GameMap({
  onMapClick,
  guessLocation,
  actualLocation,
  isGuessing,
  className,
  viewResetKey,
  guessDistanceKm,
}: GameMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });
  const { mapTheme, toggle: toggleMapTheme } = useMapTheme();
  const mapRef = useRef<google.maps.Map | null>(null);
  const isDark = mapTheme === "dark";

  const guessPin = useMemo(
    () => pinDataUri(isDark ? GUESS_PIN_HEX.dark : GUESS_PIN_HEX.light),
    [isDark],
  );
  const actualPin = useMemo(
    () => pinDataUri(isDark ? ACTUAL_PIN_HEX.dark : ACTUAL_PIN_HEX.light),
    [isDark],
  );

  const guessDistanceLabel = useMemo(
    () => formatDistanceCompact(guessDistanceKm),
    [guessDistanceKm],
  );

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);
  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Frame both pins on a reveal, or just the answer when the round timed out.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isGuessing) return;

    const points: LatLng[] = [];
    if (actualLocation) points.push(actualLocation);
    if (guessLocation) points.push(guessLocation);

    if (points.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      for (const point of points) bounds.extend(point);
      map.fitBounds(bounds, 72);
    } else if (points.length === 1 && points[0]) {
      map.setCenter(points[0]);
      map.setZoom(15);
    }
  }, [isGuessing, guessLocation, actualLocation]);

  // Reset to the Calgary overview at the start of each new guessing round. A
  // remount used to do this for free; a reused instance must do it explicitly.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isGuessing) return;
    map.setCenter(CENTER_CALGARY);
    map.setZoom(OVERVIEW_ZOOM);
  }, [viewResetKey, isGuessing]);

  if (!isLoaded) {
    return (
      <div
        className={`flex min-h-[240px] items-center justify-center rounded-2xl border border-border/70 bg-muted/40 ${className ?? ""}`}
      >
        <Spinner size={26} />
      </div>
    );
  }

  return (
    <div
      data-testid="game-map"
      className={`relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-border/70 ${className ?? ""}`}
    >
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={CENTER_CALGARY}
        zoom={OVERVIEW_ZOOM}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={(event) => {
          if (isGuessing && onMapClick && event.latLng) {
            onMapClick(event.latLng.lat(), event.latLng.lng());
          }
        }}
        options={{
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          zoomControl: true,
          styles: isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
        }}
      >
        {guessLocation && (
          <MarkerF
            position={guessLocation}
            icon={{
              url: guessPin,
              scaledSize: new google.maps.Size(30, 40),
              anchor: new google.maps.Point(15, 40),
            }}
          />
        )}
        {actualLocation && (
          <MarkerF
            position={actualLocation}
            icon={{
              url: actualPin,
              scaledSize: new google.maps.Size(30, 40),
              anchor: new google.maps.Point(15, 40),
            }}
          />
        )}
        {guessLocation && actualLocation && (
          <PolylineF
            path={[guessLocation, actualLocation]}
            options={{
              strokeColor: isDark ? "#e7ded5" : "#3b342a",
              // Opacity 0 on the stroke itself: the dashes below are drawn as
              // repeated symbols, and a visible base stroke would fill the gaps.
              strokeOpacity: 0,
              icons: [
                {
                  icon: {
                    path: "M 0,-1 0,1",
                    strokeOpacity: 0.9,
                    strokeWeight: 2.5,
                    scale: 3,
                  },
                  offset: "0",
                  repeat: "12px",
                },
              ],
            }}
          />
        )}

        {/* How far off the guess was, written on its own line. The card beside
            the map says the same number, but reading it there means looking
            away from the two pins you are comparing. */}
        {guessLocation && actualLocation && guessDistanceLabel && (
          <OverlayViewF
            position={midpoint(guessLocation, actualLocation)}
            mapPaneName={OverlayView.FLOAT_PANE}
            getPixelPositionOffset={centerOverlay}
          >
            <span className="pointer-events-none select-none whitespace-nowrap rounded-full bg-card/95 px-2 py-0.5 text-[11px] font-semibold tabular text-foreground shadow-soft ring-1 ring-border/70 backdrop-blur">
              {guessDistanceLabel}
            </span>
          </OverlayViewF>
        )}
      </GoogleMap>

      <button
        type="button"
        onClick={toggleMapTheme}
        aria-label={`Switch map to ${isDark ? "light" : "dark"} appearance`}
        title={`Switch map to ${isDark ? "light" : "dark"} appearance`}
        className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-card/90 text-foreground shadow-soft ring-1 ring-border backdrop-blur transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </div>
  );
}
