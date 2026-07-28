"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";

interface MapSearchBarProps {
  onPlaceSelect: (lat: number, lng: number, name: string) => void;
  /** When provided and Google Places is unavailable, uses Mapbox Geocoding API instead */
  mapboxToken?: string;
}

// Greater London bounding box for biasing autocomplete results
const LONDON_BOUNDS = {
  south: 51.28,
  west: -0.51,
  north: 51.69,
  east: 0.34,
};

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  _center?: [number, number]; // [lng, lat] from Mapbox results
}

export function MapSearchBar({ onPlaceSelect, mapboxToken }: MapSearchBarProps) {
  const [placesReady, setPlacesReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Load Google Places library on mount (the Maps JS API is already configured by the map view)
  useEffect(() => {
    // If Google Places is already loaded (e.g. page had it cached), use it immediately
    if (typeof google !== "undefined" && google.maps?.places) {
      setPlacesReady(true);
      return;
    }
    // Otherwise dynamically import the places library
    importLibrary("places")
      .then(() => { setPlacesReady(true); })
      .catch(() => {
        // Google Maps not available — will fall back to Mapbox geocoding
        console.warn("[MapSearchBar] Google Places library not available, using Mapbox fallback");
      });
  }, []);

  // Initialize Google services lazily (only after placesReady)
  const getAutocomplete = useCallback(() => {
    if (!autocompleteRef.current && placesReady && typeof google !== "undefined" && google.maps?.places) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
    }
    return autocompleteRef.current;
  }, [placesReady]);

  const getGeocoder = useCallback(() => {
    if (!geocoderRef.current && typeof google !== "undefined" && google.maps) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    return geocoderRef.current;
  }, [placesReady]);

  // Auto-focus input when expanding on mobile
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Click-outside to close on mobile
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setPredictions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // Mapbox geocoding fallback
  const fetchMapboxPredictions = useCallback(async (input: string) => {
    if (!mapboxToken || input.length < 2) { setPredictions([]); return; }
    setLoading(true);
    try {
      const bbox = `${LONDON_BOUNDS.west},${LONDON_BOUNDS.south},${LONDON_BOUNDS.east},${LONDON_BOUNDS.north}`;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?access_token=${mapboxToken}&bbox=${bbox}&country=gb&limit=5&types=address,poi,place,neighborhood,locality`;
      const res = await fetch(url);
      if (!res.ok) { setPredictions([]); return; }
      const data = await res.json();
      setPredictions(
        (data.features || []).slice(0, 5).map((f: { id: string; place_name?: string; text: string; center?: [number, number] }) => {
          const parts = f.place_name?.split(",") || [f.text];
          return {
            placeId: f.id,
            description: f.place_name || f.text,
            mainText: parts[0]?.trim() || f.text,
            secondaryText: parts.slice(1).join(",").trim(),
            _center: f.center, // [lng, lat] — used for direct selection
          };
        }),
      );
      setActiveIndex(-1);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, [mapboxToken]);

  const fetchPredictions = useCallback((input: string) => {
    if (input.length < 2) { setPredictions([]); return; }

    // Try Google Places first when available
    const svc = placesReady ? getAutocomplete() : null;
    if (svc) {
      setLoading(true);
      svc.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: "gb" },
          locationBias: new google.maps.LatLngBounds(
            { lat: LONDON_BOUNDS.south, lng: LONDON_BOUNDS.west },
            { lat: LONDON_BOUNDS.north, lng: LONDON_BOUNDS.east },
          ),
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            setLoading(false);
            setPredictions(
              results.slice(0, 5).map((r) => ({
                placeId: r.place_id,
                description: r.description,
                mainText: r.structured_formatting.main_text,
                secondaryText: r.structured_formatting.secondary_text || "",
              })),
            );
            setActiveIndex(-1);
          } else {
            // Google returned no results — fall back to Mapbox
            if (mapboxToken) {
              fetchMapboxPredictions(input);
            } else {
              setLoading(false);
              setPredictions([]);
            }
          }
        },
      );
      return;
    }

    // No Google Places available — use Mapbox directly
    if (mapboxToken) {
      fetchMapboxPredictions(input);
    } else {
      setPredictions([]);
    }
  }, [placesReady, mapboxToken, getAutocomplete, fetchMapboxPredictions]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const handleSelect = (prediction: Prediction) => {
    // Mapbox results already include coordinates
    if (prediction._center) {
      const [lng, lat] = prediction._center;
      onPlaceSelect(lat, lng, prediction.mainText);
      setQuery(prediction.mainText);
      setPredictions([]);
      setExpanded(false);
      return;
    }

    // Google Places — geocode placeId to get coordinates
    const geocoder = getGeocoder();
    if (!geocoder) return;

    geocoder.geocode({ placeId: prediction.placeId }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        onPlaceSelect(loc.lat(), loc.lng(), prediction.mainText);
        setQuery(prediction.mainText);
        setPredictions([]);
        setExpanded(false);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setPredictions([]);
      setExpanded(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, predictions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0 && predictions[activeIndex]) {
      e.preventDefault();
      handleSelect(predictions[activeIndex]);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setPredictions([]);
    inputRef.current?.focus();
  };

  const glassStyle: React.CSSProperties = {
    background: "rgba(10, 14, 26, 0.88)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  return (
    <>
      {/* ── Desktop: always-visible centered bar (md+) ── */}
      <div
        ref={containerRef}
        className="absolute top-3 left-1/2 -translate-x-1/2 z-40 hidden md:block"
        style={{ width: "380px", maxWidth: "calc(100vw - 320px)" }}
      >
        <div className="relative rounded-xl shadow-lg" style={glassStyle}>
          {/* Search icon */}
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (query.length >= 2) fetchPredictions(query); }}
            placeholder="Search address in London..."
            className="w-full rounded-xl bg-transparent py-2.5 pl-9 pr-8 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
          />
          {/* Clear button */}
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {/* Loading indicator */}
          {loading && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          )}
        </div>

        {/* Predictions dropdown */}
        {predictions.length > 0 && (
          <div
            className="mt-1 rounded-xl shadow-xl overflow-hidden"
            style={glassStyle}
          >
            {predictions.map((p, i) => (
              <button
                key={p.placeId}
                onClick={() => handleSelect(p)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-brand-600/20 text-brand-400"
                    : "text-[var(--foreground)] hover:bg-white/[0.04]"
                }`}
              >
                <div className="font-medium truncate">{p.mainText}</div>
                {p.secondaryText && (
                  <div className="text-xs text-[var(--muted)] truncate">{p.secondaryText}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile: collapsible search (<md) ── */}
      {!expanded ? (
        /* Collapsed: search icon pill */
        <button
          onClick={() => setExpanded(true)}
          className="absolute top-3 right-3 z-40 flex md:hidden h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
          style={glassStyle}
          aria-label="Search address"
        >
          <svg className="h-4.5 w-4.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      ) : (
        /* Expanded: right-aligned search bar with constrained width */
        <div
          ref={containerRef}
          className="absolute top-3 right-4 z-40 md:hidden w-[280px] max-w-[calc(100vw-80px)]"
        >
          <div className="relative rounded-xl shadow-lg" style={glassStyle}>
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search address..."
              className="w-full rounded-xl bg-transparent py-2.5 pl-9 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
            />
            {/* Close / clear button */}
            <button
              onClick={() => { setExpanded(false); setPredictions([]); setQuery(""); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {loading && (
              <div className="absolute right-9 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
              </div>
            )}
          </div>

          {/* Predictions dropdown (mobile) */}
          {predictions.length > 0 && (
            <div
              className="mt-1 rounded-xl shadow-xl overflow-hidden max-h-[240px] overflow-y-auto"
              style={glassStyle}
            >
              {predictions.map((p, i) => (
                <button
                  key={p.placeId}
                  onClick={() => handleSelect(p)}
                  className={`w-full text-left px-3 py-3 text-sm transition-colors ${
                    i === activeIndex
                      ? "bg-brand-600/20 text-brand-400"
                      : "text-[var(--foreground)] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="font-medium truncate">{p.mainText}</div>
                  {p.secondaryText && (
                    <div className="text-xs text-[var(--muted)] truncate">{p.secondaryText}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
