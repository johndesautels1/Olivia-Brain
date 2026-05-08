"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect, useRef, useTransition, useMemo, type ReactNode } from "react";

interface FilterOption {
  id: string;
  name: string;
  slug: string;
}

interface PackageOption {
  id: string;
  name: string;
}

interface DocumentFiltersProps {
  businessCollections: FilterOption[];
  generalCollections: FilterOption[];
  userPackages?: PackageOption[];
  resultCount?: number;
}

/* ── General Library collection metadata for tooltip cards ── */
interface CollectionMeta {
  icon: ReactNode;
  description: string;
}

const collectionMeta: Record<string, CollectionMeta> = {
  "cascade-research-reports": {
    icon: (
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="m9 10 2 2 4-4"/></svg>
    ),
    description: "Authoritative third-party reports from government bodies, VC firms, and industry organisations — DSIT, Atomico, BVCA, and more.",
  },
  "cascade-insights": {
    icon: (
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
    ),
    description: "In-depth AI-generated analyses of specific London tech topics — district rankings, policy impact, and sector landscapes.",
  },
  "cascade-insights-articles": {
    icon: (
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
    ),
    description: "Forward-looking AI analysis of funding flows, sector growth, and ecosystem rankings for London's tech landscape.",
  },
  "cascade-success-stories": {
    icon: (
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9Z"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9Z"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
    ),
    description: "Real founder journeys, funding milestones, and growth narratives from London's tech ecosystem.",
  },
};

const audienceTypes = [
  { value: "acquirer", label: "Acquirer" },
  { value: "enterprise_client", label: "Enterprise Client" },
  { value: "internal", label: "Internal" },
  { value: "investor", label: "Investor" },
  { value: "media", label: "Media" },
  { value: "reseller", label: "Reseller" },
  { value: "strategic_partner", label: "Strategic Partner" },
  { value: "white_label_partner", label: "White-Label Partner" },
];

const purposeTypes = [
  { value: "acquisition", label: "Acquisition" },
  { value: "diligence", label: "Diligence" },
  { value: "education", label: "Education" },
  { value: "fundraising", label: "Fundraising" },
  { value: "licensing", label: "Licensing" },
  { value: "outreach", label: "Outreach" },
  { value: "partnership", label: "Partnership" },
  { value: "pilot", label: "Pilot" },
];

const confidentialityLevels = [
  { value: "public_access", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "nda_required", label: "NDA Required" },
];

type ActiveCategory = "templates" | "ecosystem" | "packages";

export function DocumentFilters({
  businessCollections,
  generalCollections,
  userPackages = [],
  resultCount,
}: DocumentFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [, startFilterTransition] = useTransition();

  // Track which dropdown is open
  const [openDropdown, setOpenDropdown] = useState<ActiveCategory | null>(null);
  // Track which general-library row is hovered (for tooltip card)
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openDropdown && containerRef.current) {
        if (!containerRef.current.contains(e.target as Node)) {
          setOpenDropdown(null);
          setHoveredSlug(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openDropdown]);

  // Derive active tab and collection from URL
  const activeTab = (searchParams.get("tab") as ActiveCategory) || "templates";
  const selectedCollectionId = searchParams.get("collection") || "";

  // Build business and general ID sets for display logic
  const businessIds = useMemo(
    () => new Set(businessCollections.map((c) => c.id)),
    [businessCollections]
  );
  const generalIds = useMemo(
    () => new Set(generalCollections.map((c) => c.id)),
    [generalCollections]
  );

  // Determine the active label for each dropdown button
  const businessLabel = useMemo(() => {
    if (activeTab === "templates" && selectedCollectionId && businessIds.has(selectedCollectionId)) {
      const col = businessCollections.find((c) => c.id === selectedCollectionId);
      return col?.name || "Business Documents";
    }
    return "Business Documents";
  }, [activeTab, selectedCollectionId, businessIds, businessCollections]);

  const generalLabel = useMemo(() => {
    if (activeTab === "ecosystem" && selectedCollectionId && generalIds.has(selectedCollectionId)) {
      const col = generalCollections.find((c) => c.id === selectedCollectionId);
      return col?.name || "General Library";
    }
    return "General Library";
  }, [activeTab, selectedCollectionId, generalIds, generalCollections]);

  // Navigate helper — builds URL from tab + collection + existing sub-filters
  const navigate = useCallback(
    (tab: ActiveCategory, collectionId?: string) => {
      const params = new URLSearchParams();
      if (tab !== "templates") params.set("tab", tab);
      if (collectionId) params.set("collection", collectionId);
      // Preserve sub-filters
      const search = searchParams.get("search");
      const audience = searchParams.get("audience");
      const purpose = searchParams.get("purpose");
      const confidentiality = searchParams.get("confidentiality");
      if (search) params.set("search", search);
      if (audience) params.set("audience", audience);
      if (purpose) params.set("purpose", purpose);
      if (confidentiality) params.set("confidentiality", confidentiality);
      const qs = params.toString();
      startFilterTransition(() => {
        router.push(`/documents${qs ? `?${qs}` : ""}`);
      });
    },
    [router, searchParams, startFilterTransition]
  );

  // Sub-filter update — preserves tab and collection
  const updateSubFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startFilterTransition(() => {
        router.push(`/documents?${params.toString()}`);
      });
    },
    [router, searchParams, startFilterTransition]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateSubFilter("search", value);
      }, 300);
    },
    [updateSubFilter]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const hasActiveFilters =
    searchParams.get("search") ||
    searchParams.get("collection") ||
    searchParams.get("audience") ||
    searchParams.get("purpose") ||
    searchParams.get("confidentiality") ||
    searchParams.get("tab");

  const clearAll = () => {
    setSearchValue("");
    setOpenDropdown(null);
    startFilterTransition(() => {
      router.push("/documents");
    });
  };

  const selectClasses =
    "w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500";

  // Shared button styles for the 3 main category buttons
  const categoryBtnBase =
    "relative flex-1 min-w-0 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold transition-all duration-200 cursor-pointer select-none";

  type CategoryConfig = {
    id: ActiveCategory;
    label: string;
    activeLabel: string;
    color: string;
    borderColor: string;
    bgColor: string;
    icon: React.ReactNode;
  };

  const categories: CategoryConfig[] = [
    {
      id: "templates",
      label: "Business Documents",
      activeLabel: businessLabel,
      color: "rgba(196, 169, 106, 1)",
      borderColor: "rgba(196, 169, 106, 0.4)",
      bgColor: "rgba(196, 169, 106, 0.1)",
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M5 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H5Z" />
          <path d="M12 18v-6" />
          <path d="M9 15h6" />
        </svg>
      ),
    },
    {
      id: "ecosystem",
      label: "General Library",
      activeLabel: generalLabel,
      color: "rgba(129, 140, 248, 1)",
      borderColor: "rgba(99, 102, 241, 0.4)",
      bgColor: "rgba(99, 102, 241, 0.1)",
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      ),
    },
    {
      id: "packages",
      label: "My Packages",
      activeLabel: "My Packages",
      color: "rgba(52, 211, 153, 1)",
      borderColor: "rgba(52, 211, 153, 0.4)",
      bgColor: "rgba(52, 211, 153, 0.1)",
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 16h6" />
          <path d="M19 13v6" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M5 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H5Z" />
        </svg>
      ),
    },
  ];

  // Render dropdown content based on which category is open
  function renderDropdownContent() {
    if (!openDropdown) return null;

    const cat = categories.find((c) => c.id === openDropdown);
    if (!cat) return null;

    return (
      <div
        className="doc-dropdown-scroll rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl max-h-80 overflow-y-auto"
        style={{ backdropFilter: "blur(16px)" }}
      >
        {openDropdown === "templates" && (
          <>
            <button
              onClick={() => { navigate("templates"); setOpenDropdown(null); }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors ${
                activeTab === "templates" && !selectedCollectionId
                  ? "text-[var(--foreground)] bg-[rgba(196,169,106,0.08)]"
                  : "text-slate-300 hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              <span className="font-medium">All Business Documents</span>
            </button>
            <div className="mx-3 my-1 h-[1px] bg-[var(--card-border)]" />
            {businessCollections.map((col) => (
              <button
                key={col.id}
                onClick={() => { navigate("templates", col.id); setOpenDropdown(null); }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors ${
                  activeTab === "templates" && selectedCollectionId === col.id
                    ? "text-[var(--foreground)] bg-[rgba(196,169,106,0.08)]"
                    : "text-slate-300 hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                {col.name}
              </button>
            ))}
          </>
        )}

        {openDropdown === "ecosystem" && (
          <>
            <button
              onClick={() => { navigate("ecosystem"); setOpenDropdown(null); setHoveredSlug(null); }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors ${
                activeTab === "ecosystem" && !selectedCollectionId
                  ? "text-[var(--foreground)] bg-[rgba(99,102,241,0.08)]"
                  : "text-slate-300 hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)]"
              }`}
              onMouseEnter={() => setHoveredSlug(null)}
            >
              <span className="font-medium">All General Library</span>
            </button>
            <div className="mx-3 my-1 h-[1px] bg-[var(--card-border)]" />
            {generalCollections.length > 0 ? generalCollections.map((col) => {
              const meta = collectionMeta[col.slug];
              const isHovered = hoveredSlug === col.slug;
              const isSelected = activeTab === "ecosystem" && selectedCollectionId === col.id;

              return (
                <div key={col.id} className="relative">
                  <button
                    onClick={() => { navigate("ecosystem", col.id); setOpenDropdown(null); setHoveredSlug(null); }}
                    onMouseEnter={() => {
                      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                      hoverTimerRef.current = setTimeout(() => setHoveredSlug(col.slug), 120);
                    }}
                    onMouseLeave={() => {
                      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                      hoverTimerRef.current = setTimeout(() => setHoveredSlug(null), 200);
                    }}
                    onTouchStart={() => {
                      // Mobile: toggle tooltip on tap, navigate on second tap
                      if (isHovered) {
                        navigate("ecosystem", col.id);
                        setOpenDropdown(null);
                        setHoveredSlug(null);
                      } else {
                        setHoveredSlug(col.slug);
                      }
                    }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "text-[var(--foreground)] bg-[rgba(99,102,241,0.08)]"
                        : "text-slate-300 hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    {meta && (
                      <span className={`transition-colors ${isSelected ? "text-indigo-400" : "text-slate-500"}`}>
                        {meta.icon}
                      </span>
                    )}
                    <span className="flex-1">{col.name}</span>
                    {meta && (
                      <svg className="h-3.5 w-3.5 shrink-0 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                      </svg>
                    )}
                  </button>

                  {/* ── Tooltip card (inline, below item inside dropdown) ── */}
                  {meta && isHovered && (
                    <div
                      className="px-4 pb-2 pt-0.5"
                      onMouseEnter={() => {
                        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                      }}
                      onMouseLeave={() => {
                        hoverTimerRef.current = setTimeout(() => setHoveredSlug(null), 200);
                      }}
                    >
                      <div className="rounded-md border border-indigo-500/15 bg-[rgba(99,102,241,0.06)] p-3">
                        <p className="text-[11px] leading-relaxed text-amber-200/90">
                          {meta.description}
                        </p>
                        {/* Mobile hint */}
                        <p className="mt-1.5 text-[10px] font-medium text-indigo-400/70 sm:hidden">
                          Tap again to view
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <p className="px-4 py-3 text-xs text-[var(--muted)]">No general library collections yet.</p>
            )}
          </>
        )}

        {openDropdown === "packages" && (
          <>
            <button
              onClick={() => { navigate("packages"); setOpenDropdown(null); }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors ${
                activeTab === "packages"
                  ? "text-[var(--foreground)] bg-[rgba(52,211,153,0.08)]"
                  : "text-slate-300 hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              <span className="font-medium">All My Packages</span>
            </button>
            {userPackages.length > 0 && (
              <>
                <div className="mx-3 my-1 h-[1px] bg-[var(--card-border)]" />
                {userPackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => { navigate("packages"); setOpenDropdown(null); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                  >
                    {pkg.name}
                  </button>
                ))}
              </>
            )}
            {userPackages.length === 0 && (
              <p className="px-4 py-3 text-xs text-[var(--muted)]">
                No packages yet. Save documents to create packages.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5" ref={containerRef}>
      {/* ═══ ROW 1 — Three large dropdown-buttons ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {categories.map((cat) => {
          const isActive = activeTab === cat.id;
          const isOpen = openDropdown === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => {
                if (isOpen) {
                  setOpenDropdown(null);
                } else {
                  setOpenDropdown(cat.id);
                }
                // If not already on this tab, navigate to it
                if (!isActive) {
                  navigate(cat.id);
                }
              }}
              className={categoryBtnBase}
              style={isActive ? {
                borderColor: cat.color,
                borderWidth: "1.5px",
                background: `linear-gradient(to bottom, ${cat.bgColor} 0%, rgba(15, 23, 42, 0.85) 100%)`,
                color: cat.color,
                boxShadow: `0 6px 24px ${cat.bgColor}, 0 2px 0 rgba(0,0,0,0.4), 0 1px 0 ${cat.borderColor} inset, 0 -1px 0 rgba(0,0,0,0.3) inset`,
                textShadow: `0 0 12px ${cat.bgColor}`,
              } : {
                borderColor: "rgba(148, 163, 184, 0.3)",
                borderWidth: "1.5px",
                color: "var(--muted)",
                background: "linear-gradient(to bottom, rgba(30, 41, 59, 0.7) 0%, rgba(10, 14, 26, 0.9) 100%)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.35), 0 2px 0 rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.25) inset",
              }}
            >
              {cat.icon}
              <span className="truncate">{isActive ? cat.activeLabel : cat.label}</span>
              {/* Chevron */}
              <svg
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent 5%, ${cat.color} 50%, transparent 95%)` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ DROPDOWN PANEL — renders between Row 1 and Row 2, never covers sub-filters ═══ */}
      {openDropdown && renderDropdownContent()}

      {/* ═══ ROW 2 — Sub-filters (always visible, never covered) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            aria-label="Search documents"
            placeholder="Search titles, content, modules..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] py-2 pl-8 pr-8 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchValue && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Clear search"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        <select
          className={selectClasses}
          value={searchParams.get("audience") || ""}
          onChange={(e) => updateSubFilter("audience", e.target.value)}
          aria-label="Filter by audience"
        >
          <option value="">All Audiences</option>
          {audienceTypes.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        <select
          className={selectClasses}
          value={searchParams.get("purpose") || ""}
          onChange={(e) => updateSubFilter("purpose", e.target.value)}
          aria-label="Filter by purpose"
        >
          <option value="">All Purposes</option>
          {purposeTypes.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          className={selectClasses}
          value={searchParams.get("confidentiality") || ""}
          onChange={(e) => updateSubFilter("confidentiality", e.target.value)}
          aria-label="Filter by confidentiality"
        >
          <option value="">All Levels</option>
          {confidentialityLevels.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear All + Result count row */}
      <div className="flex items-center justify-between">
        {hasActiveFilters ? (
          <button
            onClick={clearAll}
            className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-indigo-500/50 transition-colors"
          >
            Clear All
          </button>
        ) : <div />}
      </div>

      {resultCount !== undefined && (
        <p className="text-xs text-[var(--muted)]" aria-live="polite">
          {resultCount} document{resultCount !== 1 ? "s" : ""} found
          {searchParams.get("search") && (
            <span> for &quot;{searchParams.get("search")}&quot;</span>
          )}
        </p>
      )}
    </div>
  );
}
