"use client";

import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ id: string; lat: number; lng: number; title?: string }>;
  className?: string;
}

const DEFAULT_CENTER = { lat: -46.6333, lng: -23.5505 }; // São Paulo [lng, lat] for Mapbox

export default function CustomMap({ 
  center = { lat: -23.5505, lng: -46.6333 }, 
  zoom = 12, 
  markers = [], 
  className = "w-full h-[400px] rounded-2xl" 
}: MapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    return (
      <div className={`${className} bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10 relative overflow-hidden`}>
        <div className="text-center p-6 relative z-10">
          <p className="text-slate-600 dark:text-slate-400 mb-4">API Token do Mapbox necessário</p>
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 max-w-xs mx-auto">
            Adicione <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> ao seu arquivo .env
          </div>
        </div>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
           <div className="w-full h-full bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden border border-slate-200/50 dark:border-white/10 shadow-lg relative`}>
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: zoom
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
      >
        <NavigationControl position="top-right" />
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            longitude={marker.lng} 
            latitude={marker.lat}
            anchor="bottom"
          >
            <div className="text-3xl">📍</div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
