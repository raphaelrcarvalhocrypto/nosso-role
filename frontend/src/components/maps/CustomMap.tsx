"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
};

interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapPoint[];
  route?: Array<{ lat: number; lng: number }>;
  className?: string;
}

function getBounds(points: Array<{ lat: number; lng: number }>) {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    if (point.lng < minLng) minLng = point.lng;
    if (point.lat < minLat) minLat = point.lat;
    if (point.lng > maxLng) maxLng = point.lng;
    if (point.lat > maxLat) maxLat = point.lat;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ] as [[number, number], [number, number]];
}

export default function CustomMap({
  center = { lat: -23.5505, lng: -46.6333 },
  zoom = 12,
  markers = [],
  route = [],
  className = "w-full h-[400px] rounded-2xl",
}: MapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const routeGeoJson = useMemo(() => {
    if (route.length < 2) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: route.map((point) => [point.lng, point.lat]),
          },
          properties: {},
        },
      ],
    };
  }, [route]);

  useEffect(() => {
    if (!mapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const points = (route.length > 0 ? route : markers).filter(
      (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
    );

    if (points.length === 0) return;

    if (points.length === 1) {
      map.flyTo({
        center: [points[0].lng, points[0].lat],
        zoom: 5,
        duration: 600,
      });
      return;
    }

    const bounds = getBounds(points);
    map.fitBounds(bounds, { padding: 60, duration: 700 });
  }, [mapReady, route, markers]);

  if (!mapboxToken) {
    return (
      <div
        className={`${className} bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10 relative overflow-hidden`}
      >
        <div className="text-center p-6 relative z-10">
          <p className="text-slate-600 dark:text-slate-400 mb-4">API token do Mapbox necessario</p>
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 max-w-xs mx-auto">
            Adicione <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> no arquivo .env
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden border border-slate-200/50 dark:border-white/10 shadow-lg relative`}>
      <Map
        ref={mapRef}
        onLoad={() => setMapReady(true)}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
      >
        <NavigationControl position="top-right" />

        {routeGeoJson && (
          <Source id="route-data" type="geojson" data={routeGeoJson as any}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#f43f5e",
                "line-opacity": 0.8,
                "line-width": 4,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
          </Source>
        )}

        {markers.map((marker) => (
          <Marker key={marker.id} longitude={marker.lng} latitude={marker.lat} anchor="bottom">
            <div
              title={marker.title ?? "Ponto"}
              className="h-4 w-4 rounded-full bg-rose-500 border-2 border-white shadow-md"
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}
