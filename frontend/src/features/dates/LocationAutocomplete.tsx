"use client";

import { useEffect, useId, useState } from "react";
import { MapPin, Search } from "lucide-react";

export type LocationSuggestion = {
  id: string;
  place_name: string;
  text: string;
  center?: [number, number];
};

type LocationAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: LocationSuggestion) => void;
  placeholder?: string;
  required?: boolean;
};

async function searchLocationSuggestions(query: string, token: string, signal: AbortSignal) {
  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
  const url =
    `${endpoint}?autocomplete=true&limit=5&language=pt&types=address,place,locality,neighborhood,region,poi,postcode` +
    `&access_token=${token}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    features?: LocationSuggestion[];
  };

  return payload.features ?? [];
}

export default function LocationAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  placeholder = "Ex: Avenida Paulista, Sao Paulo",
  required = false,
}: LocationAutocompleteProps) {
  const inputId = useId();
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasTouched, setHasTouched] = useState(false);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    const query = value.trim();

    if (!hasTouched || !mapboxToken || query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const items = await searchLocationSuggestions(query, mapboxToken, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(items);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [hasTouched, mapboxToken, value]);

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-400"
      >
        {label}
      </label>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          id={inputId}
          type="text"
          required={required}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 pl-10 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setHasTouched(true);
            onChange(e.target.value);
          }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between gap-3 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
        <span>{mapboxToken ? "Digite 3 caracteres para buscar enderecos." : "Mapbox nao configurado para sugestoes."}</span>
        {loading && <span>Buscando...</span>}
      </div>

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#12151d]">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => {
                onSelect?.(suggestion);
                onChange(suggestion.place_name);
                setSuggestions([]);
                setHasTouched(false);
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-rose-500/5 dark:hover:bg-white/5"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {suggestion.text}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {suggestion.place_name}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
