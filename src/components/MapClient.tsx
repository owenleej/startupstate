"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import CompanyPanel from "./CompanyPanel";
import AddCompanyModal from "./AddCompanyModal";
import InvestorProfileModal from "./InvestorProfileModal";
import InvestorMatchesSidebar from "./InvestorMatchesSidebar";
import { createClient } from "@/lib/supabase/client";
import type { InvestorProfile, InvestorProfileInput } from "@/app/investor/actions";
import { matchCompaniesForInvestor, type InvestorMatch } from "@/app/investor/matchActions";
import { followCompany, unfollowCompany } from "@/app/investor/followActions";

// ── Filter dropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  renderOption,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  renderOption?: (o: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shadow-md transition-colors whitespace-nowrap ${
          value
            ? "bg-blue-600 text-white border border-blue-500"
            : "bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 text-zinc-300 hover:text-white"
        }`}
      >
        {value ?? label}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl overflow-hidden z-30 min-w-[140px]">
          {value && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border-b border-zinc-700/50"
            >
              Clear filter
            </button>
          )}
          {options.map((o) => (
            <button
              key={o}
              onClick={() => { onChange(o === value ? null : o); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                o === value
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-zinc-300 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {renderOption ? renderOption(o) : o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type Company = {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  linkedin_url: string | null;
  stage: string | null;
  employees: string | null;
  section: string | null;
  lat: number;
  lng: number;
  utah_county: string | null;
  product_type: string | null;
  owner_id: string | null;
  status?: string | null;
  member_verified?: boolean;
  seeking_funding?: boolean;
  investor_contact_email?: string | null;
};

const STAGES = [
  "Bootstrapped",
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D+",
] as const;

const EMPLOYEE_BUCKETS = [
  "2-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1K",
  "1K-5K",
] as const;

const SECTIONS: Record<string, { color: string }> = {
  "B2B Software":     { color: "#3B82F6" },
  "FinTech":          { color: "#10B981" },
  "Consumer":         { color: "#F59E0B" },
  "Bio/Medical Tech": { color: "#EF4444" },
  "Security":         { color: "#8B5CF6" },
  "Energy":           { color: "#F97316" },
  "Marketplaces":     { color: "#EC4899" },
};

const LOGODEV_TOKEN = process.env.NEXT_PUBLIC_LOGODEV_TOKEN ?? "";
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function sectionColor(section: string | null) {
  return section && SECTIONS[section] ? SECTIONS[section].color : "#6B7280";
}

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ── Jitter near-duplicate coordinates ────────────────────────────────────────
// Companies that share very similar lat/lng will always stack as individual
// markers at high zoom. We detect groups within ~100m and arrange them in a
// small circle (~30m radius) so they separate naturally when fully zoomed in
// while still clustering together at normal zoom levels.

function jitterCoords(companies: Company[]): Map<number, [number, number]> {
  const GRID = 3; // decimal places ≈ 111m per unit
  const RADIUS = 0.0003; // ~30m offset radius

  const buckets = new Map<string, Company[]>();
  for (const c of companies) {
    const key = `${c.lat.toFixed(GRID)},${c.lng.toFixed(GRID)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  }

  const out = new Map<number, [number, number]>();
  for (const group of buckets.values()) {
    if (group.length === 1) {
      out.set(group[0].id, [group[0].lng, group[0].lat]);
    } else {
      group.forEach((c, i) => {
        const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
        out.set(c.id, [c.lng + Math.cos(angle) * RADIUS, c.lat + Math.sin(angle) * RADIUS]);
      });
    }
  }
  return out;
}

// ── Logo marker element ───────────────────────────────────────────────────────

function createMarkerEl(company: Company, onClick: () => void): HTMLElement {
  const color = sectionColor(company.section);
  const domain = extractDomain(company.website);
  const initial = company.name.trim()[0]?.toUpperCase() ?? "?";
  const SIZE = 60;

  // Mapbox writes `transform: translate(x,y)` on whatever element it owns.
  // Use a zero-size wrapper so Mapbox controls positioning and we control appearance.
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, { width: "0", height: "0", overflow: "visible" });

  const circle = document.createElement("div");
  Object.assign(circle.style, {
    position: "absolute",
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    top: `${-SIZE / 2}px`,
    left: `${-SIZE / 2}px`,
    borderRadius: "12px",
    border: `2px solid ${color}`,
    backgroundColor: "white",
    overflow: "hidden",
    boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontFamily: "system-ui,-apple-system,sans-serif",
    cursor: "pointer",
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    willChange: "transform",
    userSelect: "none",
  });

  let usingFallback = false;
  function showFallback() {
    if (usingFallback) return;
    usingFallback = true;
    while (circle.firstChild) circle.removeChild(circle.firstChild);
    Object.assign(circle.style, { backgroundColor: color, color: "white", fontWeight: "bold" });
    circle.textContent = initial;
  }

  if (domain && LOGODEV_TOKEN) {
    const img = document.createElement("img");
    img.src = `https://img.logo.dev/${domain}?token=${LOGODEV_TOKEN}&size=64&format=webp`;
    img.alt = company.name;
    Object.assign(img.style, {
      width: "100%", height: "100%", objectFit: "contain",
      padding: "4px", pointerEvents: "none", display: "block",
    });
    img.addEventListener("error", showFallback);
    circle.appendChild(img);
  } else {
    showFallback();
  }

  circle.addEventListener("mouseenter", () => {
    circle.style.transform = "scale(1.25)";
    circle.style.boxShadow = `0 4px 18px ${color}90`;
  });
  circle.addEventListener("mouseleave", () => {
    circle.style.transform = "scale(1)";
    circle.style.boxShadow = "0 2px 10px rgba(0,0,0,0.45)";
  });
  circle.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });

  wrapper.appendChild(circle);
  return wrapper;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapClient({ companies, isAdmin = false, isLoggedIn = false, ownedCompanies = [], investorProfile = null, followedCompanyIds: initialFollowedIds = new Set() }: { companies: Company[]; isAdmin?: boolean; isLoggedIn?: boolean; ownedCompanies?: Company[]; investorProfile?: InvestorProfile | null; followedCompanyIds?: Set<number> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  // cluster_id → marker (HTML mosaic clusters)
  const clusterMarkersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());

  const [mapError, setMapError] = useState<string | null>(
    MAPBOX_ACCESS_TOKEN ? null : "Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
  );
  const [selected, setSelected] = useState<Company | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<Company[] | null>(null);
  const [myCompanySelected, setMyCompanySelected] = useState<Company | null>(null);
  const [showMyCompaniesDropdown, setShowMyCompaniesDropdown] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [currentInvestorProfile, setCurrentInvestorProfile] = useState<InvestorProfile | null>(investorProfile);
  const [investorMatches, setInvestorMatches] = useState<InvestorMatch[] | null>(null);
  const [investorMatchLoading, setInvestorMatchLoading] = useState(false);
  const [investorMatchError, setInvestorMatchError] = useState<string | null>(null);
  const [investorFilterActive, setInvestorFilterActive] = useState(false);
  const [showInvestorSidebar, setShowInvestorSidebar] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<number>>(initialFollowedIds);
  const myCompaniesDropdownRef = useRef<HTMLDivElement>(null);

  async function handleFollow(companyId: number, follow: boolean) {
    // Optimistic update
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (follow) next.add(companyId); else next.delete(companyId);
      return next;
    });
    const result = follow ? await followCompany(companyId) : await unfollowCompany(companyId);
    if (result.error) {
      // Revert on failure
      setFollowedIds((prev) => {
        const next = new Set(prev);
        if (follow) next.delete(companyId); else next.add(companyId);
        return next;
      });
    }
  }
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<string | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (myCompaniesDropdownRef.current && !myCompaniesDropdownRef.current.contains(e.target as Node)) {
        setShowMyCompaniesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const investorMatchIds = useMemo(
    () => (investorMatches && investorFilterActive ? new Set(investorMatches.map((m) => m.company_id)) : null),
    [investorMatches, investorFilterActive],
  );

  const visible = useMemo(
    () =>
      companies.filter(
        (c) =>
          (!investorMatchIds || investorMatchIds.has(c.id)) &&
          (!activeSection || c.section === activeSection) &&
          (!activeStage || c.stage === activeStage) &&
          (!activeSize || c.employees === activeSize) &&
          (!search || c.name.toLowerCase().includes(search.toLowerCase())),
      ),
    [investorMatchIds, activeSection, activeStage, activeSize, companies, search],
  );

  async function runInvestorMatch() {
    setInvestorMatchLoading(true);
    setInvestorMatchError(null);
    setShowInvestorSidebar(true);
    setInvestorMatches(null);
    const result = await matchCompaniesForInvestor();
    setInvestorMatchLoading(false);
    if (result.matches) {
      setInvestorMatches(result.matches);
      setInvestorFilterActive(true);
    } else {
      setInvestorMatchError(result.error ?? "Matching failed.");
    }
  }

  const visibleIds = useMemo(() => new Set(visible.map((c) => c.id)), [visible]);
  const visibleIdsRef = useRef(visibleIds);
  useEffect(() => { visibleIdsRef.current = visibleIds; }, [visibleIds]);

  const companyById = useMemo(() => {
    const m = new Map<number, Company>();
    companies.forEach((c) => m.set(c.id, c));
    return m;
  }, [companies]);

  // Computed once — jitter is stable for a fixed company list
  const coordsRef = useRef(jitterCoords(companies));

  const selectedVisible =
    selected && visibleIds.has(selected.id) ? selected : null;
  const selectedClusterVisible = selectedCluster ?? null;

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = MAPBOX_ACCESS_TOKEN;
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-111.65, 39.5],
      zoom: 7,
      minZoom: 4,
      maxZoom: 18,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("error", (e) => setMapError(e.error?.message ?? "Map error"));

    map.on("load", () => {
      // ── Clustered GeoJSON source ─────────────────────────────────────────
      const buildGeoJSON = (ids: Set<number>): GeoJSON.FeatureCollection => ({
        type: "FeatureCollection",
        features: companies
          .filter((c) => ids.has(c.id))
          .map((c) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: coordsRef.current.get(c.id) ?? [c.lng, c.lat] },
            properties: { id: c.id },
          })),
      });

      map.addSource("companies", {
        type: "geojson",
        data: buildGeoJSON(visibleIdsRef.current),
        cluster: true,
        clusterMaxZoom: 17,
        clusterRadius: 56,
      });

      // Invisible cluster layer — hit target for queryRenderedFeatures
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "companies",
        filter: ["has", "point_count"],
        paint: { "circle-radius": 1, "circle-opacity": 0 },
      });

      // Invisible unclustered layer — hit target for queryRenderedFeatures
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "companies",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 1, "circle-opacity": 0 },
      });

      // ── Background click → deselect ──────────────────────────────────────
      map.on("click", (e) => {
        const hit = map.queryRenderedFeatures(e.point, {
          layers: ["clusters", "unclustered-point"],
        });
        if (!hit.length) { setSelected(null); setSelectedCluster(null); }
      });

      // ── Build a mosaic cluster marker element ────────────────────────────
      function createClusterEl(
        count: number,
        leaves: GeoJSON.Feature[],
        onClick: () => void,
      ): HTMLElement {
        // Determine grid dimensions from count
        let cols: number, rows: number, CELL: number;
        if (count <= 2)      { cols = 2; rows = 1; CELL = 30; }
        else if (count <= 4) { cols = 2; rows = 2; CELL = 28; }
        else if (count <= 6) { cols = 3; rows = 2; CELL = 26; }
        else if (count <= 9) { cols = 3; rows = 3; CELL = 24; }
        else if (count <= 12) { cols = 4; rows = 3; CELL = 22; }
        else                 { cols = 4; rows = 4; CELL = 20; }

        const GAP = 2;
        const PAD = 2;
        const W = PAD * 2 + GAP * (cols - 1) + CELL * cols;
        const H = PAD * 2 + GAP * (rows - 1) + CELL * rows;

        // For 10+, the last cell (index 8) becomes an overflow indicator
        const totalCells = cols * rows;
        const showOverflow = count > totalCells;
        const logoCount = showOverflow ? totalCells - 1 : Math.min(count, totalCells);

        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, { width: "0", height: "0", overflow: "visible" });

        const bubble = document.createElement("div");
        Object.assign(bubble.style, {
          position: "absolute",
          width: `${W}px`,
          height: `${H}px`,
          top: `${-H / 2}px`,
          left: `${-W / 2}px`,
          borderRadius: "10px",
          backgroundColor: "#1e293b",
          border: "2px solid rgba(255,255,255,0.2)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: `${GAP}px`,
          padding: `${PAD}px`,
          cursor: "pointer",
          overflow: "hidden",
          transition: "transform 0.12s ease, box-shadow 0.12s ease",
          willChange: "transform",
          boxSizing: "border-box",
        });

        // Logo cells
        for (let i = 0; i < logoCount; i++) {
          const leaf = leaves[i];
          const id: number = leaf?.properties?.id;
          const company = companyById.get(id);

          const cell = document.createElement("div");
          const cellColor = company ? sectionColor(company.section) : "#6B7280";
          Object.assign(cell.style, {
            width: "100%",
            height: "100%",
            borderRadius: "4px",
            backgroundColor: "white",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1.5px solid ${cellColor}`,
            boxSizing: "border-box",
          });

          if (company) {
            const domain = extractDomain(company.website);
            const color = sectionColor(company.section);
            const initial = company.name.trim()[0]?.toUpperCase() ?? "?";

            if (domain && LOGODEV_TOKEN) {
              const img = document.createElement("img");
              img.src = `https://img.logo.dev/${domain}?token=${LOGODEV_TOKEN}&size=32&format=webp`;
              img.alt = company.name;
              Object.assign(img.style, {
                width: "100%", height: "100%", objectFit: "contain",
                padding: "2px", pointerEvents: "none", display: "block",
              });
              img.addEventListener("error", () => {
                img.remove();
                Object.assign(cell.style, { backgroundColor: color, color: "white", fontWeight: "bold", fontSize: "9px" });
                cell.textContent = initial;
              });
              cell.appendChild(img);
            } else {
              Object.assign(cell.style, { backgroundColor: color, color: "white", fontWeight: "bold", fontSize: "9px" });
              cell.textContent = initial;
            }
          }

          bubble.appendChild(cell);
        }

        // Overflow cell (only when count > grid capacity)
        if (showOverflow) {
          const overflow = count - logoCount;
          const cell = document.createElement("div");
          Object.assign(cell.style, {
            width: "100%",
            height: "100%",
            borderRadius: "4px",
            backgroundColor: "#2563EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "8px",
            fontWeight: "bold",
            fontFamily: "system-ui,-apple-system,sans-serif",
          });
          cell.textContent = `+${overflow}`;
          bubble.appendChild(cell);
        }

        bubble.addEventListener("mouseenter", () => {
          bubble.style.transform = "scale(1.1)";
          bubble.style.boxShadow = "0 6px 24px rgba(37,99,235,0.5)";
        });
        bubble.addEventListener("mouseleave", () => {
          bubble.style.transform = "scale(1)";
          bubble.style.boxShadow = "0 4px 16px rgba(0,0,0,0.5)";
        });
        bubble.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });

        wrapper.appendChild(bubble);
        return wrapper;
      }

      // ── Sync both cluster markers and logo markers on each render frame ───
      function syncMarkers() {
        const bounds = map.getBounds();
        if (!bounds) return;
        const sw = map.project(bounds.getSouthWest());
        const ne = map.project(bounds.getNorthEast());

        // ── Cluster HTML markers ─────────────────────────────────────────
        const renderedClusters = map.queryRenderedFeatures([sw, ne], { layers: ["clusters"] });
        const renderedClusterIds = new Set<number>();

        for (const f of renderedClusters) {
          const clusterId: number = f.properties?.cluster_id;
          if (!clusterId) continue;
          renderedClusterIds.add(clusterId);
          if (clusterMarkersRef.current.has(clusterId)) continue; // already built

          const count: number = f.properties?.point_count ?? 0;
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
          const source = map.getSource("companies") as mapboxgl.GeoJSONSource;

          // Reserve the slot immediately so concurrent render frames don't double-create
          clusterMarkersRef.current.set(clusterId, null as unknown as mapboxgl.Marker);

          source.getClusterLeaves(clusterId, 16, 0, (err, leaves) => {
            if (err || !leaves) return;
            // Check it's still needed (map may have moved)
            if (!clusterMarkersRef.current.has(clusterId)) return;

            const el = createClusterEl(count, leaves, () => {
              // Fetch all leaves for the list panel (not just the preview 16)
              source.getClusterLeaves(clusterId, 500, 0, (err2, allLeaves) => {
                if (err2 || !allLeaves) return;
                const clusterCompanies = allLeaves
                  .map((lf) => companyById.get(lf.properties?.id as number))
                  .filter((c): c is Company => c != null)
                  .sort((a, b) => a.name.localeCompare(b.name));
                setSelected(null);
                setSelectedCluster(clusterCompanies);
              });
            });

            const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
              .setLngLat(coords)
              .addTo(map);
            clusterMarkersRef.current.set(clusterId, marker);
          });
        }

        // Remove stale cluster markers
        clusterMarkersRef.current.forEach((marker, id) => {
          if (!renderedClusterIds.has(id)) {
            marker?.remove();
            clusterMarkersRef.current.delete(id);
          }
        });

        // ── Logo markers for unclustered points ──────────────────────────
        const rendered = map.queryRenderedFeatures([sw, ne], { layers: ["unclustered-point"] });
        const renderedIds = new Set<number>();

        for (const f of rendered) {
          const id: number = f.properties?.id;
          if (!id) continue;
          renderedIds.add(id);
          if (!visibleIdsRef.current.has(id)) continue;
          if (markersRef.current.has(id)) continue;

          const company = companyById.get(id);
          if (!company) continue;

          const el = createMarkerEl(company, () => selectCompany(company, map));
          const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat(coordsRef.current.get(company.id) ?? [company.lng, company.lat])
            .addTo(map);
          markersRef.current.set(id, marker);
        }

        markersRef.current.forEach((marker, id) => {
          if (!renderedIds.has(id) || !visibleIdsRef.current.has(id)) {
            marker.remove();
            markersRef.current.delete(id);
          }
        });
      }

      map.on("render", syncMarkers);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      clusterMarkersRef.current.forEach((m) => m?.remove());
      clusterMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When filter changes: update source data (re-clusters), clear all HTML markers
  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) {
      const source = map.getSource("companies") as mapboxgl.GeoJSONSource | undefined;
      source?.setData({
        type: "FeatureCollection",
        features: companies
          .filter((c) => visibleIds.has(c.id))
          .map((c) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: coordsRef.current.get(c.id) ?? [c.lng, c.lat] },
            properties: { id: c.id },
          })),
      });
    }
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    clusterMarkersRef.current.forEach((m) => m?.remove());
    clusterMarkersRef.current.clear();
  }, [visibleIds, companies]);

  function getPadding(sidebarOpen: boolean, panelOpen: boolean) {
    return {
      left: sidebarOpen ? 400 : 0,
      right: panelOpen ? 540 : 0,
      top: 0,
      bottom: 0,
    };
  }

  function selectCompany(company: Company, map: mapboxgl.Map) {
    setSelectedCluster(null);
    setSelected(company);
    map.flyTo({
      center: [company.lng, company.lat],
      zoom: Math.max(map.getZoom(), 12),
      padding: getPadding(showInvestorSidebar, true),
      duration: 700,
    });
  }

  return (
    <div className="fixed inset-0 bg-zinc-900">
      <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-red-800 rounded-2xl px-6 py-4 text-sm text-red-400 max-w-sm text-center">
            <p className="font-semibold mb-1">Map failed to load</p>
            <p className="text-red-500/80">{mapError}</p>
          </div>
        </div>
      )}

      {/* ── Top bar ───────────────────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 p-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5 bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 rounded-2xl px-4 py-2.5 shadow-lg">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-semibold tracking-tight text-sm">Startupstate</span>
        </div>

        <div className="pointer-events-auto flex-1 max-w-md">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies…"
              className="w-full bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 text-white placeholder-zinc-500 rounded-2xl pl-10 pr-4 py-2.5 text-sm shadow-lg focus:outline-none focus:border-blue-500/60 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 rounded-2xl px-3.5 py-2.5 text-sm text-zinc-300 shadow-lg whitespace-nowrap">
            <span className="text-white font-semibold">{visible.length}</span>{" "}
            {visible.length === 1 ? "company" : "companies"}
          </div>
          {isLoggedIn && (
            <button
              onClick={() => setShowAddCompany(true)}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold rounded-2xl px-4 py-2.5 shadow-lg transition-colors whitespace-nowrap"
            >
              + Add My Company
            </button>
          )}
          {isLoggedIn && !currentInvestorProfile && (
            <button
              onClick={() => setShowInvestorModal(true)}
              className="flex items-center gap-1.5 text-sm font-semibold rounded-2xl px-4 py-2.5 shadow-lg transition-colors whitespace-nowrap bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 text-zinc-300 hover:text-white hover:border-zinc-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              I&apos;m an Investor
            </button>
          )}
          {isLoggedIn && currentInvestorProfile && (
            <div className="flex items-center gap-1.5">
              {/* Edit profile */}
              <button
                onClick={() => setShowInvestorModal(true)}
                className="flex items-center gap-1.5 text-sm font-semibold rounded-2xl px-3.5 py-2.5 shadow-lg transition-colors whitespace-nowrap bg-violet-600 hover:bg-violet-500 text-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Investor Profile
              </button>
              {/* Find / show matches */}
              <button
                onClick={() => {
                  if (investorMatches || investorMatchLoading) {
                    setShowInvestorSidebar(true);
                  } else {
                    runInvestorMatch();
                  }
                }}
                className={`flex items-center gap-1.5 text-sm font-semibold rounded-2xl px-3.5 py-2.5 shadow-lg transition-colors whitespace-nowrap ${
                  showInvestorSidebar
                    ? "bg-violet-100 text-violet-700 border border-violet-300"
                    : "bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 text-zinc-300 hover:text-white hover:border-violet-500"
                }`}
              >
                {investorMatchLoading ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                )}
                {investorMatches ? "My Matches" : investorMatchLoading ? "Finding…" : "Find Matches"}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <div className={`absolute top-[72px] z-10 flex items-center gap-2 transition-all duration-300 ${showInvestorSidebar ? "left-[396px]" : "left-4"}`}>
        <FilterDropdown
          label="Sector"
          value={activeSection}
          options={Object.keys(SECTIONS)}
          onChange={setActiveSection}
          renderOption={(o) => (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SECTIONS[o].color }} />
              {o}
            </>
          )}
        />
        <FilterDropdown
          label="Stage"
          value={activeStage}
          options={[...STAGES]}
          onChange={setActiveStage}
        />
        <FilterDropdown
          label="Employees"
          value={activeSize}
          options={[...EMPLOYEE_BUCKETS]}
          onChange={setActiveSize}
          renderOption={(o) => `${o} employees`}
        />
        {investorMatches && (
          <button
            onClick={() => setInvestorFilterActive((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-md transition-colors whitespace-nowrap ${
              investorFilterActive
                ? "bg-violet-600 text-white border border-violet-500"
                : "bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 text-zinc-300 hover:text-white"
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            {investorFilterActive ? "Investor filter ON" : "Investor filter OFF"}
          </button>
        )}
      </div>


      {/* ── Login prompt ──────────────────────────────────────────────────────── */}
      {!isLoggedIn && (
        <a
          href="/login"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm rounded-2xl px-4 py-2.5 shadow-lg transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span><span className="text-white font-medium">Log in or create an account</span> to claim or add your company, or set up an investor profile</span>
          <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      )}

      {/* ── Top-right user controls ────────────────────────────────────────────── */}
      {isLoggedIn && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {ownedCompanies.length > 0 && (
            <div className="relative" ref={myCompaniesDropdownRef}>
              <button
                onClick={() => {
                  if (ownedCompanies.length === 1) {
                    setMyCompanySelected(ownedCompanies[0]);
                    setSelected(null);
                    setSelectedCluster(null);
                    setShowMyCompaniesDropdown(false);
                  } else {
                    setShowMyCompaniesDropdown((o) => !o);
                  }
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold rounded-2xl px-3.5 py-2.5 shadow-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {ownedCompanies.length === 1 ? "My Company" : "My Companies"}
                {ownedCompanies.length > 1 && (
                  <svg className={`w-3 h-3 transition-transform ${showMyCompaniesDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {showMyCompaniesDropdown && ownedCompanies.length > 1 && (
                <div className="absolute top-full right-0 mt-1.5 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl overflow-hidden z-30 min-w-[200px]">
                  {ownedCompanies.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setMyCompanySelected(c);
                        setSelected(null);
                        setSelectedCluster(null);
                        setShowMyCompaniesDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex-1 truncate font-medium">{c.name}</span>
                      {c.status === "pending" && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex-shrink-0">Pending</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-1.5 bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm font-medium rounded-2xl px-3.5 py-2.5 shadow-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </a>
          )}
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="flex items-center gap-1.5 bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm font-medium rounded-2xl px-3.5 py-2.5 shadow-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      )}

      {/* ── Add company modal ────────────────────────────────────────────────── */}
      {showAddCompany && <AddCompanyModal onClose={() => setShowAddCompany(false)} />}

      {/* ── Investor profile modal ───────────────────────────────────────────── */}
      {showInvestorModal && (
        <InvestorProfileModal
          existing={currentInvestorProfile}
          onClose={() => setShowInvestorModal(false)}
          onSaved={(input: InvestorProfileInput) => {
            setCurrentInvestorProfile((prev) => ({
              ...(prev ?? { id: 0, user_id: "", created_at: "", updated_at: "" }),
              ...input,
            }));
          }}
          onFindMatches={() => {
            setShowInvestorModal(false);
            runInvestorMatch();
          }}
        />
      )}

      {/* ── Investor matches sidebar ─────────────────────────────────────────── */}
      {showInvestorSidebar && (
        <InvestorMatchesSidebar
          matches={investorMatches}
          allCompanies={companies}
          loading={investorMatchLoading}
          error={investorMatchError}
          filterActive={investorFilterActive}
          selectedCompanyId={selected?.id ?? myCompanySelected?.id ?? null}
          visibleIds={visibleIds}
          onSelect={(company) => {
            setMyCompanySelected(null);
            setSelectedCluster(null);
            setSelected(company);
            const map = mapRef.current;
            if (map) {
              map.flyTo({
                center: [company.lng, company.lat],
                zoom: Math.max(map.getZoom(), 12),
                padding: getPadding(true, true),
                duration: 700,
              });
            }
          }}
          followedIds={followedIds}
          onFollowToggle={handleFollow}
          onClose={() => {
            setShowInvestorSidebar(false);
            setInvestorFilterActive(false);
          }}
          onRegenerate={runInvestorMatch}
          onToggleFilter={() => setInvestorFilterActive((v) => !v)}
        />
      )}

      {/* ── Company panel ─────────────────────────────────────────────────────── */}
      {(() => {
        const panelCompany = myCompanySelected ?? selectedVisible;
        const ownedRecord = panelCompany
          ? ownedCompanies.find((c) => c.id === panelCompany.id) ?? null
          : null;
        const isOwner = ownedRecord !== null;
        const memberVerified = ownedRecord?.member_verified ?? false;
        const isInvestor = !!currentInvestorProfile;
        const isFollowing = panelCompany ? followedIds.has(panelCompany.id) : false;
        return (
          <CompanyPanel
            company={panelCompany}
            cluster={myCompanySelected ? null : selectedClusterVisible}
            onSelectCompany={(c) => {
              setMyCompanySelected(null);
              setSelectedCluster(null);
              setSelected(c);
              const map = mapRef.current;
              if (map) map.flyTo({ center: [c.lng, c.lat], zoom: 16, padding: getPadding(showInvestorSidebar, true), duration: 700 });
            }}
            onClose={() => { setSelected(null); setSelectedCluster(null); setMyCompanySelected(null); }}
            isLoggedIn={isLoggedIn}
            isOwner={isOwner}
            memberVerified={memberVerified}
            isInvestor={isInvestor}
            isFollowing={isFollowing}
            onFollowToggle={(follow) => panelCompany && handleFollow(panelCompany.id, follow)}
          />
        );
      })()}
    </div>
  );
}
