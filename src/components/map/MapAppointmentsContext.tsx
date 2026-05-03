"use client";

/**
 * MapAppointmentsContext
 *
 * Provides appointment data from the calendar to the map view.
 * When showAppointments is enabled, appointment markers appear on the map
 * at their respective locations.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface AppointmentMarker {
  id: string;
  entityName: string;      // Line 1: Company/Event name
  time: string;            // Line 2: "12:00 PM"
  location: string;        // Line 3: Address/Venue
  date: string;            // For display
  lat: number;
  lng: number;
  category: string;
}

interface MapAppointmentsContextType {
  showAppointments: boolean;
  appointments: AppointmentMarker[];
  setShowAppointments: (val: boolean) => void;
  setAppointments: (appointments: AppointmentMarker[]) => void;
  loadAppointments: (googleApiKey?: string) => Promise<void>;
  loading: boolean;
}

const MapAppointmentsContext = createContext<MapAppointmentsContextType | null>(null);

// Cache for geocoded addresses to avoid repeated API calls
const geocodeCache: Record<string, { lat: number; lng: number } | null> = {};

export function MapAppointmentsProvider({ children }: { children: ReactNode }) {
  const [showAppointments, setShowAppointments] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentMarker[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAppointments = useCallback(async (googleApiKey?: string) => {
    setLoading(true);
    try {
      // Fetch upcoming appointments (next 7 days)
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const start = now.toISOString();
      const end = weekLater.toISOString();

      const res = await fetch(`/api/calendar/entries?start=${start}&end=${end}`);
      if (!res.ok) {
        console.error("Calendar API returned error:", res.status);
        setAppointments([]);
        return;
      }

      const data = await res.json();
      // API returns personalEntries, not entries
      const entries = data.personalEntries || [];

      if (entries.length === 0) {
        setAppointments([]);
        return;
      }

      // Filter entries that have location data and convert to markers
      const markers: AppointmentMarker[] = [];

      for (const entry of entries) {
        // Skip if no location
        if (!entry.location) continue;

        // Try to geocode the location using Google Geocoding API
        const coords = await geocodeLocation(entry.location, googleApiKey);
        if (!coords) continue;

        const startDate = new Date(entry.startDatetime);
        const timeStr = startDate.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        }).toUpperCase();
        const dateStr = startDate.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short"
        });

        markers.push({
          id: entry.id,
          entityName: entry.title,
          time: timeStr,
          location: entry.location,
          date: dateStr,
          lat: coords.lat,
          lng: coords.lng,
          category: entry.category || "personal_event",
        });
      }

      setAppointments(markers);
    } catch (err) {
      console.error("Failed to load appointments:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <MapAppointmentsContext.Provider
      value={{
        showAppointments,
        appointments,
        setShowAppointments,
        setAppointments,
        loadAppointments,
        loading,
      }}
    >
      {children}
    </MapAppointmentsContext.Provider>
  );
}

export function useMapAppointments() {
  const ctx = useContext(MapAppointmentsContext);
  if (!ctx) {
    // Return a no-op version if not wrapped in provider
    return {
      showAppointments: false,
      appointments: [],
      setShowAppointments: () => {},
      setAppointments: () => {},
      loadAppointments: async () => {},
      loading: false,
    };
  }
  return ctx;
}

// Geocode location using Google Geocoding API with fallback to known locations
async function geocodeLocation(
  location: string,
  googleApiKey?: string
): Promise<{ lat: number; lng: number } | null> {
  const normalized = location.toLowerCase().trim();

  // Check cache first
  if (geocodeCache[normalized] !== undefined) {
    return geocodeCache[normalized];
  }

  // Known London locations for fast matching (fallback)
  const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number }> = {
    "shoreditch": { lat: 51.5246, lng: -0.0794 },
    "king's cross": { lat: 51.5308, lng: -0.1238 },
    "kings cross": { lat: 51.5308, lng: -0.1238 },
    "canary wharf": { lat: 51.5054, lng: -0.0235 },
    "soho": { lat: 51.5137, lng: -0.1337 },
    "mayfair": { lat: 51.5098, lng: -0.1458 },
    "clerkenwell": { lat: 51.5237, lng: -0.1050 },
    "farringdon": { lat: 51.5201, lng: -0.1050 },
    "stratford": { lat: 51.5410, lng: -0.0032 },
    "hackney": { lat: 51.5450, lng: -0.0553 },
    "islington": { lat: 51.5362, lng: -0.1033 },
    "camden": { lat: 51.5390, lng: -0.1426 },
    "westminster": { lat: 51.4975, lng: -0.1357 },
    "city of london": { lat: 51.5155, lng: -0.0922 },
    "the city": { lat: 51.5155, lng: -0.0922 },
    "bank": { lat: 51.5133, lng: -0.0886 },
    "moorgate": { lat: 51.5186, lng: -0.0886 },
    "liverpool street": { lat: 51.5178, lng: -0.0823 },
    "whitechapel": { lat: 51.5156, lng: -0.0589 },
    "old street": { lat: 51.5256, lng: -0.0875 },
    "angel": { lat: 51.5322, lng: -0.1058 },
    "the shard": { lat: 51.5045, lng: -0.0865 },
    "barbican": { lat: 51.5200, lng: -0.0940 },
    "excel london": { lat: 51.5085, lng: 0.0285 },
    "the o2": { lat: 51.5033, lng: 0.0032 },
    "wembley": { lat: 51.5560, lng: -0.2795 },
  };

  // Quick check for known locations first
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (normalized.includes(key)) {
      geocodeCache[normalized] = coords;
      return coords;
    }
  }

  // Use Google Geocoding API if key is available
  if (googleApiKey) {
    try {
      // Bias results towards London
      const encodedLocation = encodeURIComponent(location + ", London, UK");
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedLocation}&key=${googleApiKey}&bounds=51.28,-0.51|51.69,0.33`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const result = data.results[0];
          const coords = {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          };
          geocodeCache[normalized] = coords;
          return coords;
        }
      }
    } catch (err) {
      console.error("Google Geocoding API error:", err);
    }
  }

  // Fallback: Try to extract postcode
  const postcodeMatch = normalized.match(/([a-z]{1,2}\d{1,2}[a-z]?\s*\d[a-z]{2})/i);
  if (postcodeMatch) {
    const prefix = postcodeMatch[1].slice(0, 2).replace(/\d/g, "").toUpperCase();
    const POSTCODE_AREAS: Record<string, { lat: number; lng: number }> = {
      "EC": { lat: 51.5155, lng: -0.0922 },
      "WC": { lat: 51.5167, lng: -0.1246 },
      "W": { lat: 51.5100, lng: -0.1800 },
      "SW": { lat: 51.4700, lng: -0.1600 },
      "SE": { lat: 51.4800, lng: -0.0600 },
      "E": { lat: 51.5300, lng: -0.0500 },
      "N": { lat: 51.5500, lng: -0.1000 },
      "NW": { lat: 51.5400, lng: -0.1700 },
    };
    if (POSTCODE_AREAS[prefix]) {
      geocodeCache[normalized] = POSTCODE_AREAS[prefix];
      return POSTCODE_AREAS[prefix];
    }
  }

  // Cache null result to avoid repeated lookups
  geocodeCache[normalized] = null;
  return null;
}
