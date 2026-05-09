"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import CompanyPanel from "./CompanyPanel";

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
};

const SECTIONS: Record<string, { color: string }> = {
  "B2B Software":     { color: "#3B82F6" },
  "FinTech":          { color: "#10B981" },
  "Consumer":         { color: "#F59E0B" },
  "Bio/Medical Tech": { color: "#EF4444" },
  "Security":         { color: "#8B5CF6" },
  "Energy":           { color: "#F97316" },
  "Marketplaces":     { color: "#EC4899" },
};

function sectionColor(section: string | null) {
  return section && SECTIONS[section] ? SECTIONS[section].color : "#6B7280";
}

type ScreenPoint = { x: number; y: number };

type CompanyFeatureProperties = {
  kind: "company";
  id: number;
  name: string;
  section: string | null;
  color: string;
  realLng: number;
  realLat: number;
};

type OverflowFeatureProperties = {
  kind: "overflow";
  hiddenCount: number;
  label: string;
  groupLng: number;
  groupLat: number;
};

type DisplayFeatureProperties = CompanyFeatureProperties | OverflowFeatureProperties;
type DisplayFeature = GeoJSON.Feature<GeoJSON.Point, DisplayFeatureProperties>;
type DisplayFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, DisplayFeatureProperties>;

const GROUP_RADIUS_PX = 42;
const MAX_VISIBLE_PER_GROUP = 10;
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function employeeRank(employees: string | null) {
  if (!employees) return null;

  const matches = employees.match(/\d[\d,]*(?:\.\d+)?\s*[kKmMbB]?/g);
  if (!matches?.length) return null;

  const values = matches
    .map((raw) => {
      const normalized = raw.replace(/,/g, "").trim();
      const suffix = normalized.at(-1)?.toLowerCase();
      const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
      const numeric = Number.parseFloat(multiplier === 1 ? normalized : normalized.slice(0, -1));
      return Number.isFinite(numeric) ? numeric * multiplier : null;
    })
    .filter((value): value is number => value != null);

  return values.length ? Math.max(...values) : null;
}

function compareCompaniesForDisplay(a: Company, b: Company) {
  const aRank = employeeRank(a.employees);
  const bRank = employeeRank(b.employees);

  if (aRank != null || bRank != null) {
    if (aRank == null) return 1;
    if (bRank == null) return -1;
    if (aRank !== bRank) return bRank - aRank;
  }

  const nameCompare = a.name.localeCompare(b.name);
  return nameCompare || a.id - b.id;
}

function displayOffset(index: number, total: number, center: ScreenPoint): ScreenPoint {
  if (total <= 1) return center;

  if (total <= 8) {
    const radius = 10 + total * 1.2;
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  }

  const angle = index * 2.399963229728653;
  const radius = 10 + Math.sqrt(index + 1) * 5.5;
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

function companyFeature(company: Company, coordinates: [number, number]): DisplayFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties: {
      kind: "company",
      id: company.id,
      name: company.name,
      section: company.section,
      color: sectionColor(company.section),
      realLng: company.lng,
      realLat: company.lat,
    },
  };
}

function overflowFeature(hiddenCount: number, coordinates: [number, number], groupCoordinates: [number, number]): DisplayFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties: {
      kind: "overflow",
      hiddenCount,
      label: hiddenCount < 100 ? `+${hiddenCount}` : "…",
      groupLng: groupCoordinates[0],
      groupLat: groupCoordinates[1],
    },
  };
}

function toGeoJSON(companies: Company[], map?: mapboxgl.Map): DisplayFeatureCollection {
  if (!map) {
    return {
      type: "FeatureCollection",
      features: companies.map((company) => companyFeature(company, [company.lng, company.lat])),
    };
  }

  const projected = companies.map((company) => ({ company, point: map.project([company.lng, company.lat]) }));
  const parent = projected.map((_, index) => index);
  const find = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const union = (a: number, b: number) => {
    const aRoot = find(a);
    const bRoot = find(b);
    if (aRoot !== bRoot) parent[bRoot] = aRoot;
  };
  const buckets = new Map<string, number[]>();
  const bucketKey = (x: number, y: number) => `${x}:${y}`;

  projected.forEach(({ point }, index) => {
    const bucketX = Math.floor(point.x / GROUP_RADIUS_PX);
    const bucketY = Math.floor(point.y / GROUP_RADIUS_PX);

    for (let x = bucketX - 1; x <= bucketX + 1; x += 1) {
      for (let y = bucketY - 1; y <= bucketY + 1; y += 1) {
        const neighborIndexes = buckets.get(bucketKey(x, y));
        if (!neighborIndexes) continue;

        for (const neighborIndex of neighborIndexes) {
          const neighborPoint = projected[neighborIndex].point;
          const distance = Math.hypot(point.x - neighborPoint.x, point.y - neighborPoint.y);
          if (distance <= GROUP_RADIUS_PX) union(index, neighborIndex);
        }
      }
    }

    const key = bucketKey(bucketX, bucketY);
    buckets.set(key, [...(buckets.get(key) ?? []), index]);
  });

  const groups = new Map<number, typeof projected>();
  projected.forEach((item, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  });

  const features: DisplayFeature[] = [];

  for (const group of groups.values()) {
    const center = group.reduce(
      (acc, item) => ({ x: acc.x + item.point.x / group.length, y: acc.y + item.point.y / group.length }),
      { x: 0, y: 0 },
    );
    const groupLngLat = map.unproject([center.x, center.y]);
    const groupCoordinates: [number, number] = [groupLngLat.lng, groupLngLat.lat];
    const ranked = [...group].sort((a, b) => compareCompaniesForDisplay(a.company, b.company));
    const visibleCompanies = ranked.slice(0, MAX_VISIBLE_PER_GROUP);
    const hiddenCount = ranked.length - visibleCompanies.length;
    const displayCount = visibleCompanies.length + (hiddenCount > 0 ? 1 : 0);

    visibleCompanies.forEach(({ company }, index) => {
      const displayPoint = displayOffset(index, displayCount, center);
      const displayLngLat = map.unproject([displayPoint.x, displayPoint.y]);
      features.push(companyFeature(company, [displayLngLat.lng, displayLngLat.lat]));
    });

    if (hiddenCount > 0) {
      const displayPoint = displayOffset(displayCount - 1, displayCount, center);
      const displayLngLat = map.unproject([displayPoint.x, displayPoint.y]);
      features.push(overflowFeature(hiddenCount, [displayLngLat.lng, displayLngLat.lat], groupCoordinates));
    }
  }

  return { type: "FeatureCollection", features };
}

export default function MapClient({ companies }: { companies: Company[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const companiesRef = useRef(companies);
  const visibleRef = useRef(companies);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(
    MAPBOX_ACCESS_TOKEN ? null : "Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
  );
  const [selected, setSelected] = useState<Company | null>(null);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Keep ref current so click handlers always see latest data without re-init
  useEffect(() => { companiesRef.current = companies; }, [companies]);

  const visible = useMemo(
    () => companies.filter(
      (c) =>
        (!activeSection || c.section === activeSection) &&
        (!search || c.name.toLowerCase().includes(search.toLowerCase())),
    ),
    [activeSection, companies, search],
  );

  const updateCompaniesSource = useCallback(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getSource("companies") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(toGeoJSON(visibleRef.current, mapRef.current));
  }, [mapReady]);

  const selectedVisible = selected && visible.some((c) => c.id === selected.id) ? selected : null;

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = MAPBOX_ACCESS_TOKEN;
    if (!token) return;
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-111.65, 39.5],
      zoom: 7,
      minZoom: 4,
      maxZoom: 18,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("error", (e) => setMapError(e.error?.message ?? "Map error"));

    map.on("load", () => {
      // ── Source ──────────────────────────────────────────────────────────────
      map.addSource("companies", {
        type: "geojson",
        data: toGeoJSON(companiesRef.current, map),
      });

      // ── Individual points ───────────────────────────────────────────────────
      map.addLayer({
        id: "points-glow",
        type: "circle",
        source: "companies",
        filter: ["==", ["get", "kind"], "company"],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 12, 14, 18],
          "circle-opacity": 0.2,
          "circle-blur": 0.5,
        },
      });

      map.addLayer({
        id: "overflow-glow",
        type: "circle",
        source: "companies",
        filter: ["==", ["get", "kind"], "overflow"],
        paint: {
          "circle-color": "#E5E7EB",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 12, 14, 16],
          "circle-opacity": 0.18,
          "circle-blur": 0.7,
        },
      });

      map.addLayer({
        id: "points",
        type: "circle",
        source: "companies",
        filter: ["==", ["get", "kind"], "company"],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 6, 14, 10],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.9)",
          "circle-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "overflow",
        type: "circle",
        source: "companies",
        filter: ["==", ["get", "kind"], "overflow"],
        paint: {
          "circle-color": "#18181B",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 9, 14, 12],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.75)",
          "circle-opacity": 0.96,
        },
      });

      map.addLayer({
        id: "overflow-label",
        type: "symbol",
        source: "companies",
        filter: ["==", ["get", "kind"], "overflow"],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 7, 10, 14, 12],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": "#ffffff" },
      });

      // ── Cursors ─────────────────────────────────────────────────────────────
      for (const layer of ["points", "overflow", "overflow-label"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }

      // ── Click: individual point ─────────────────────────────────────────────
      map.on("click", "points", (e) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const co = companiesRef.current.find((c) => c.id === Number(props.id));
        if (!co) return;
        setSelected(co);
        map.flyTo({
          center: [co.lng, co.lat],
          zoom: Math.max(map.getZoom(), 12),
          padding: { right: 400 },
          duration: 700,
        });
      });

      // ── Click: overflow → zoom toward group ─────────────────────────────────
      const zoomToOverflow = (e: mapboxgl.MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const lng = Number(props.groupLng);
        const lat = Number(props.groupLat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

        map.flyTo({
          center: [lng, lat],
          zoom: Math.min(map.getZoom() + 2, map.getMaxZoom()),
          duration: 500,
        });
      };

      map.on("click", "overflow", zoomToOverflow);
      map.on("click", "overflow-label", zoomToOverflow);

      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Sync filtered data → map source ────────────────────────────────────────
  useEffect(() => {
    visibleRef.current = visible;
    updateCompaniesSource();
  }, [updateCompaniesSource, visible]);

  // ── Recompute screen-space groups after completed map movement ─────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    map.on("moveend", updateCompaniesSource);
    map.on("zoomend", updateCompaniesSource);

    return () => {
      map.off("moveend", updateCompaniesSource);
      map.off("zoomend", updateCompaniesSource);
    };
  }, [mapReady, updateCompaniesSource]);

  return (
    <div className="fixed inset-0 bg-zinc-900">
      {/* Map fills everything */}
      <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

      {/* Map error state */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-red-800 rounded-2xl px-6 py-4 text-sm text-red-400 max-w-sm text-center">
            <p className="font-semibold mb-1">Map failed to load</p>
            <p className="text-red-500/80">{mapError}</p>
          </div>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 p-4 pointer-events-none">
        {/* Logo */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 rounded-2xl px-4 py-2.5 shadow-lg">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-semibold tracking-tight text-sm">Startupstate</span>
        </div>

        {/* Search */}
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

        {/* Count + CTA */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 rounded-2xl px-3.5 py-2.5 text-sm text-zinc-300 shadow-lg whitespace-nowrap">
            <span className="text-white font-semibold">{visible.length}</span>{" "}
            {visible.length === 1 ? "company" : "companies"}
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold rounded-2xl px-4 py-2.5 shadow-lg transition-colors whitespace-nowrap">
            + Add Company
          </button>
        </div>
      </header>

      {/* ── Section filter chips ─────────────────────────────────────────────── */}
      <div className="absolute top-[72px] left-4 z-10 flex flex-wrap gap-2">
        {Object.entries(SECTIONS).map(([name, { color }]) => {
          const active = activeSection === name;
          return (
            <button
              key={name}
              onClick={() => setActiveSection(active ? null : name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-all duration-150 ${
                active
                  ? "text-white scale-105 shadow-lg"
                  : "bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 text-zinc-300 hover:text-white"
              }`}
              style={active ? { backgroundColor: color } : {}}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {name}
            </button>
          );
        })}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      {!activeSection && !search && (
        <div className="absolute bottom-8 left-4 z-10 bg-zinc-900/85 backdrop-blur-md border border-zinc-700/50 rounded-2xl px-4 py-3 shadow-lg">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Sector</p>
          <div className="space-y-1.5">
            {Object.entries(SECTIONS).map(([name, { color }]) => (
              <button
                key={name}
                onClick={() => setActiveSection(name)}
                className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white transition-colors w-full text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Company panel ────────────────────────────────────────────────────── */}
      <CompanyPanel company={selectedVisible} onClose={() => setSelected(null)} />
    </div>
  );
}
