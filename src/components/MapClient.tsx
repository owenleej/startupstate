"use client";

import { useEffect, useRef, useState } from "react";
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

function toGeoJSON(companies: Company[]) {
  return {
    type: "FeatureCollection" as const,
    features: companies.map((c) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] as [number, number] },
      properties: {
        id: c.id,
        name: c.name,
        section: c.section,
        color: sectionColor(c.section),
      },
    })),
  };
}

export default function MapClient({ companies }: { companies: Company[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const companiesRef = useRef(companies);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Company | null>(null);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Keep ref current so click handlers always see latest data without re-init
  useEffect(() => { companiesRef.current = companies; }, [companies]);

  const visible = companies.filter(
    (c) =>
      (!activeSection || c.section === activeSection) &&
      (!search || c.name.toLowerCase().includes(search.toLowerCase())),
  );

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) { setMapError("Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"); return; }
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
        data: toGeoJSON(companiesRef.current),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 45,
      });

      // ── Cluster glow ────────────────────────────────────────────────────────
      map.addLayer({
        id: "cluster-glow",
        type: "circle",
        source: "companies",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#3B82F6",
          "circle-radius": ["step", ["get", "point_count"], 30, 10, 40, 50, 50],
          "circle-opacity": 0.15,
          "circle-blur": 0.8,
        },
      });

      // ── Cluster circle ──────────────────────────────────────────────────────
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "companies",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#3B82F6",
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 50, 36],
          "circle-opacity": 0.92,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(147,197,253,0.5)",
        },
      });

      // ── Cluster count ───────────────────────────────────────────────────────
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "companies",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 13,
        },
        paint: { "text-color": "#ffffff" },
      });

      // ── Individual points ───────────────────────────────────────────────────
      map.addLayer({
        id: "points-glow",
        type: "circle",
        source: "companies",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 12, 14, 18],
          "circle-opacity": 0.2,
          "circle-blur": 0.5,
        },
      });

      map.addLayer({
        id: "points",
        type: "circle",
        source: "companies",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 6, 14, 10],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.9)",
          "circle-opacity": 0.95,
        },
      });

      // ── Cursors ─────────────────────────────────────────────────────────────
      for (const layer of ["points", "clusters"]) {
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

      // ── Click: cluster → expand ─────────────────────────────────────────────
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;
        const source = map.getSource("companies") as mapboxgl.GeoJSONSource;
        const geom = features[0].geometry as GeoJSON.Point;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          map.flyTo({ center: geom.coordinates as [number, number], zoom, duration: 500 });
        });
      });

      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync filtered data → map source ────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getSource("companies") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(toGeoJSON(visible));
  }, [visible, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear selection if it's filtered out ───────────────────────────────────
  useEffect(() => {
    if (selected && !visible.find((c) => c.id === selected.id)) {
      setSelected(null);
    }
  }, [visible, selected]);

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
      <CompanyPanel company={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
