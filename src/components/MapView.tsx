"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type MapViewProps = {
  className?: string;
};

export function MapView({ className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-98.5795, 39.8283],
      zoom: 3,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const missingToken = !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (missingToken) {
    return (
      <div
        className={
          className ??
          "flex h-[420px] w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        }
      >
        Set <code className="px-1">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in{" "}
        <code className="px-1">.env.local</code> to load the map.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className ?? "h-[420px] w-full overflow-hidden rounded-lg"}
    />
  );
}
