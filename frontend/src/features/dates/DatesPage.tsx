"use client";

import { useEffect, useMemo, useState } from "react";
import { handleDatabaseError, OperationType, supabase } from "@/services/supabase/client";
import { ensureProfileAndSettings } from "@/services/supabase/data";
import { useAuthStore } from "@/stores/authStore";
import { CalendarHeart, Clock3, Heart, MapPin, Plus, Star, X } from "lucide-react";
import CustomMap from "@/components/maps/CustomMap";
import { AnimatePresence, motion } from "framer-motion";
import LocationAutocomplete from "./LocationAutocomplete";

const CATEGORY_OPTIONS = [
  "restaurante",
  "cinema",
  "aventura",
  "casa",
  "viagem",
  "surpresa",
  "show",
  "festival",
  "cultural",
];

type DateForm = {
  title: string;
  date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location_lat: number | null;
  location_lng: number | null;
  isMultiDay: boolean;
  location: string;
  category: string;
  custom_category: string;
  status: string;
  rating: number;
  suggested_by: string;
};

type DateRecord = {
  id: string;
  title: string;
  date: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location?: string | null;
  category?: string | null;
  status?: string | null;
  rating?: number | null;
  suggested_by?: string | null;
};

const INITIAL_FORM: DateForm = {
  title: "",
  date: "",
  end_date: "",
  start_time: "",
  end_time: "",
  location_lat: null,
  location_lng: null,
  isMultiDay: false,
  location: "",
  category: "restaurante",
  custom_category: "",
  status: "planejado",
  rating: 5,
  suggested_by: "ambos",
};

function parseUtcDay(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return Number.NaN;
  return Date.UTC(year, month - 1, day);
}

function getDurationDays(startDate: string, endDate?: string | null) {
  if (!startDate) return 1;
  const startUtc = parseUtcDay(startDate);
  const endUtc = parseUtcDay(endDate || startDate);
  if (!Number.isFinite(startUtc) || !Number.isFinite(endUtc)) return 1;
  return Math.max(1, Math.floor((endUtc - startUtc) / 86_400_000) + 1);
}

function formatDateRange(startDate: string, endDate?: string | null) {
  if (!startDate) return "-";
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${(endDate || startDate)}T00:00:00`);
  const sameDay = startDate === (endDate || startDate);

  if (sameDay) {
    return start.toLocaleDateString("pt-BR");
  }

  return `${start.toLocaleDateString("pt-BR")} - ${end.toLocaleDateString("pt-BR")}`;
}

function formatTimeValue(timeValue?: string | null) {
  if (!timeValue) return "";
  return timeValue.slice(0, 5);
}

function formatTimeRange(startTime?: string | null, endTime?: string | null) {
  const start = formatTimeValue(startTime);
  const end = formatTimeValue(endTime);

  if (!start && !end) return "";
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

async function geocodeAddress(
  query: string,
  token: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
    const url = `${endpoint}?limit=1&language=pt&types=address,place,locality,neighborhood,region,poi,postcode&access_token=${token}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      features?: Array<{ center?: [number, number] }>;
    };

    const center = payload.features?.[0]?.center;
    if (!center || center.length !== 2) return null;
    return { lng: center[0], lat: center[1] };
  } catch {
    return null;
  }
}

async function enrichDatesWithCoordinates(dates: DateRecord[]) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) return dates;

  return Promise.all(
    dates.map(async (dateItem) => {
      const existingLat = toNullableNumber(dateItem.location_lat);
      const existingLng = toNullableNumber(dateItem.location_lng);
      if (existingLat !== null && existingLng !== null) {
        return dateItem;
      }

      const location = String(dateItem.location ?? "").trim();
      if (location.length < 3) return dateItem;

      const resolved = await geocodeAddress(location, token);
      if (!resolved) return dateItem;

      return {
        ...dateItem,
        location_lat: resolved.lat,
        location_lng: resolved.lng,
      };
    }),
  );
}

export default function DatesPage() {
  const { user } = useAuthStore();
  const [dates, setDates] = useState<DateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DateForm>({ ...INITIAL_FORM });

  const resetDateForm = () => {
    setForm({ ...INITIAL_FORM });
    setEditingDateId(null);
  };

  const openNewDateForm = () => {
    setErrorMessage(null);
    resetDateForm();
    setShowForm(true);
  };

  const closeDateForm = () => {
    setShowForm(false);
    setErrorMessage(null);
    resetDateForm();
  };

  const fetchDates = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (!user) return;
      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      const { data, error } = await supabase
        .from("dates")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("date", { ascending: false });

      if (error) throw error;
      const records = (data ?? []) as DateRecord[];
      setDates(await enrichDatesWithCoordinates(records));
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.LIST, "dates", user);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDates();
  }, [user]);

  const handleSubmitDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      const categoryValue = form.category === "__custom__" ? form.custom_category.trim() : form.category;
      if (!categoryValue) {
        setErrorMessage("Informe uma categoria para o date.");
        return;
      }

      if (!form.date) {
        setErrorMessage("Informe a data de inicio.");
        return;
      }

      const endDate = form.isMultiDay ? form.end_date || form.date : form.date;
      if (endDate < form.date) {
        setErrorMessage("A data final nao pode ser antes da data inicial.");
        return;
      }

      if (endDate === form.date && form.start_time && form.end_time && form.end_time < form.start_time) {
        setErrorMessage("O horario final nao pode ser antes do horario inicial.");
        return;
      }

      const locationValue = form.location.trim();
      let locationLat = form.location_lat;
      let locationLng = form.location_lng;

      if (locationValue) {
        const hasCoordinates = Number.isFinite(locationLat) && Number.isFinite(locationLng);
        if (!hasCoordinates) {
          const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
          const resolved = token ? await geocodeAddress(locationValue, token) : null;
          locationLat = resolved?.lat ?? null;
          locationLng = resolved?.lng ?? null;
        }
      } else {
        locationLat = null;
        locationLng = null;
      }

      const payload = {
        couple_id: profile.couple_id,
        title: form.title.trim(),
        date: form.date,
        end_date: endDate,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: locationValue,
        location_lat: locationLat,
        location_lng: locationLng,
        category: categoryValue,
        status: form.status,
        rating: Math.max(1, Math.min(5, Number(form.rating) || 1)),
        suggested_by: form.suggested_by,
      };

      const { error } = editingDateId
        ? await supabase.from("dates").update(payload).eq("id", editingDateId)
        : await supabase.from("dates").insert({
            ...payload,
            created_at: new Date().toISOString(),
          });

      if (error) throw error;
      closeDateForm();
      await fetchDates();
    } catch (error) {
      const message = handleDatabaseError(
        error,
        editingDateId ? OperationType.UPDATE : OperationType.CREATE,
        "dates",
        user,
      );
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditDate = (dateItem: DateRecord) => {
    const rawCategory = String(dateItem.category ?? "").trim();
    const hasOptionCategory = CATEGORY_OPTIONS.includes(rawCategory);
    const startDate = dateItem.date ? String(dateItem.date).slice(0, 10) : "";
    const endDate = dateItem.end_date ? String(dateItem.end_date).slice(0, 10) : startDate;

    setErrorMessage(null);
    setEditingDateId(dateItem.id);
    setForm({
      title: dateItem.title ?? "",
      date: startDate,
      end_date: endDate,
      start_time: dateItem.start_time ? String(dateItem.start_time).slice(0, 5) : "",
      end_time: dateItem.end_time ? String(dateItem.end_time).slice(0, 5) : "",
      location_lat: toNullableNumber(dateItem.location_lat),
      location_lng: toNullableNumber(dateItem.location_lng),
      isMultiDay: Boolean(endDate && endDate !== startDate),
      location: dateItem.location ?? "",
      category: rawCategory ? (hasOptionCategory ? rawCategory : "__custom__") : "restaurante",
      custom_category: rawCategory && !hasOptionCategory ? rawCategory : "",
      status: dateItem.status ?? "planejado",
      rating: Number(dateItem.rating) || 5,
      suggested_by: dateItem.suggested_by ?? "ambos",
    });
    setShowForm(true);
  };

  const handleDeleteDate = async (dateId: string) => {
    if (!user) return;
    if (!window.confirm("Deseja excluir este date?")) return;

    try {
      setErrorMessage(null);
      const { error } = await supabase.from("dates").delete().eq("id", dateId);
      if (error) throw error;
      await fetchDates();
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.DELETE, "dates", user);
      setErrorMessage(message);
    }
  };

  const dateMarkers = useMemo(
    () =>
      dates.flatMap((dateItem) => {
        const lat = toNullableNumber(dateItem.location_lat);
        const lng = toNullableNumber(dateItem.location_lng);

        if (lat === null || lng === null) return [];

        return [
          {
            id: dateItem.id,
            lat,
            lng,
            title: dateItem.title,
          },
        ];
      }),
    [dates],
  );

  return (
    <div className="space-y-8 pb-12 w-full max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif mb-2 text-slate-900 dark:text-white">
            Nossos <span className="text-rose-500 italic">Dates</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400">Colecionando momentos e risadas.</p>
        </div>
        <button
          onClick={openNewDateForm}
          className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-5 h-5" />
          Novo Momento
        </button>
      </header>

      {errorMessage && (
        <div className="rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm sm:items-center"
            onClick={closeDateForm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              className="w-full max-w-7xl overflow-hidden rounded-[28px] border border-white/10 bg-[#131821]/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="date-form-title"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
                <div>
                  <h3 id="date-form-title" className="text-2xl font-serif text-white">
                    {editingDateId ? "Editar Momento" : "Novo Momento"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Preencha tudo em uma tela maior para organizar data, horario e local sem desalinhamento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDateForm}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Fechar formulario"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[calc(90vh-84px)] overflow-y-auto px-6 py-6 sm:px-8">
                <form onSubmit={handleSubmitDate} className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
                  <div className="space-y-6">
                    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-300">
                            O que vamos fazer?
                          </label>
                          <input
                            type="text"
                            required
                            className="h-14 w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-rose-500/50"
                            placeholder="Ex: Show no Allianz"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <LocationAutocomplete
                            label="Localizacao"
                            placeholder="Ex: Avenida Paulista, Sao Paulo"
                            required
                            value={form.location}
                            onChange={(location) =>
                              setForm((prev) => ({
                                ...prev,
                                location,
                                location_lat: null,
                                location_lng: null,
                              }))
                            }
                            onSelect={(suggestion) =>
                              setForm((prev) => ({
                                ...prev,
                                location: suggestion.place_name,
                                location_lat: suggestion.center?.[1] ?? null,
                                location_lng: suggestion.center?.[0] ?? null,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-300">
                            Categoria
                          </label>
                          <select
                            className="h-14 w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 text-slate-100 outline-none transition-colors focus:border-rose-500/50"
                            value={form.category}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                category: e.target.value,
                                custom_category: e.target.value === "__custom__" ? prev.custom_category : "",
                              }))
                            }
                          >
                            {CATEGORY_OPTIONS.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                            <option value="__custom__">outra categoria</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-300">
                            Status
                          </label>
                          <select
                            className="h-14 w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 text-slate-100 outline-none transition-colors focus:border-rose-500/50"
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                          >
                            <option value="planejado">planejado</option>
                            <option value="realizado">realizado</option>
                          </select>
                        </div>

                        {form.category === "__custom__" && (
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-300">
                              Categoria personalizada
                            </label>
                            <input
                              type="text"
                              required
                              className="h-14 w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-rose-500/50"
                              placeholder="Ex: feira gastronomica"
                              value={form.custom_category}
                              onChange={(e) => setForm({ ...form, custom_category: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a1f2a] px-4 py-3 text-sm font-medium text-slate-200">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-rose-500"
                            checked={form.isMultiDay}
                            onChange={(e) => {
                              const isMultiDay = e.target.checked;
                              setForm((prev) => ({
                                ...prev,
                                isMultiDay,
                                end_date: isMultiDay ? prev.end_date || prev.date : prev.date,
                              }));
                            }}
                          />
                          Date com mais de 1 dia
                        </label>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-300">
                            Inicio
                          </label>
                          <input
                            type="date"
                            required
                            className="h-14 w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 text-sm text-slate-100 outline-none transition-colors focus:border-rose-500/50"
                            value={form.date}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                date: e.target.value,
                                end_date: prev.isMultiDay ? prev.end_date || e.target.value : e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-300">
                            Fim
                          </label>
                          <input
                            type="date"
                            disabled={!form.isMultiDay}
                            className="h-14 w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 text-sm text-slate-100 outline-none transition-colors focus:border-rose-500/50 disabled:opacity-50"
                            value={form.end_date}
                            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-300">
                            Horario de entrada
                          </label>
                          <input
                            type="time"
                            className="h-14 w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 text-sm text-slate-100 outline-none transition-colors focus:border-rose-500/50"
                            value={form.start_time}
                            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-300">
                            Horario de saida
                          </label>
                          <input
                            type="time"
                            className="h-14 w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 text-sm text-slate-100 outline-none transition-colors focus:border-rose-500/50"
                            value={form.end_time}
                            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#1a1f2a] p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Resumo</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-300">
                          <div className="font-medium text-white">
                            {formatDateRange(form.date, form.isMultiDay ? form.end_date || form.date : form.date)}
                            {formatTimeRange(form.start_time, form.end_time) ? (
                              <span className="ml-2 inline-flex items-center gap-1 text-slate-300">
                                <Clock3 className="h-3.5 w-3.5" />
                                {formatTimeRange(form.start_time, form.end_time)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-start gap-2 text-slate-400">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="min-w-0 break-words">
                              {form.location || "Local ainda nao informado"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-300">
                            Nota (1-5)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            className="h-14 w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 text-slate-100 outline-none transition-colors focus:border-rose-500/50"
                            value={form.rating}
                            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) || 1 })}
                          />
                        </div>

                        <div className="flex items-end">
                          <div className="w-full rounded-xl border border-white/10 bg-[#1a1f2a] px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tempo</p>
                            <p className="mt-2 text-sm text-slate-200">
                              {formatDateRange(form.date, form.isMultiDay ? form.end_date || form.date : form.date)}
                              {formatTimeRange(form.start_time, form.end_time) ? ` - ${formatTimeRange(form.start_time, form.end_time)}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        disabled={saving}
                        className="h-14 flex-1 rounded-xl bg-rose-500 font-bold text-white shadow-lg shadow-rose-500/20 transition-all active:scale-95 hover:bg-rose-600 disabled:opacity-70"
                      >
                        {saving ? "Salvando..." : editingDateId ? "Salvar Alteracoes" : "Salvar Momento"}
                      </button>

                      <button
                        type="button"
                        onClick={closeDateForm}
                        className="h-14 flex-1 rounded-xl bg-white/10 font-medium text-slate-200 transition-colors hover:bg-white/15"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-xl font-serif flex items-center gap-2 text-slate-900 dark:text-white">
            <Heart className="w-5 h-5 text-rose-500" />
            Historico de Momentos
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {loading && (
              <div className="glass p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 text-center text-slate-600 dark:text-slate-400">
                Carregando dates...
              </div>
            )}

            {!loading && dates.length === 0 && (
              <div className="glass p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 text-center text-slate-600 dark:text-slate-400">
                Nenhum date registrado ainda.
              </div>
            )}

            {dates.map((dateItem) => {
              const startDate = dateItem.date ? String(dateItem.date).slice(0, 10) : "";
              const endDate = dateItem.end_date ? String(dateItem.end_date).slice(0, 10) : startDate;
              const durationDays = getDurationDays(startDate, endDate);
              const timeRange = formatTimeRange(dateItem.start_time, dateItem.end_time);

              return (
                <motion.div
                  key={dateItem.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass p-5 rounded-2xl border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0">
                      <CalendarHeart className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-slate-900 dark:text-slate-200 leading-tight">{dateItem.title}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-500">
                        <span>
                          {formatDateRange(startDate, endDate)} ({durationDays} {durationDays === 1 ? "dia" : "dias"})
                        </span>
                        {timeRange && (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {timeRange}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-500 mt-1 min-w-0">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{dateItem.location || "Local nao informado"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      {[...Array(5)].map((_, index) => (
                        <Star
                          key={index}
                          className={`w-3 h-3 ${
                            index < (Number(dateItem.rating) || 0)
                              ? "text-amber-500 dark:text-amber-400 fill-current"
                              : "text-slate-300 dark:text-slate-700"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex flex-wrap justify-end gap-1 mb-2">
                      <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300">
                        {dateItem.category || "categoria"}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          dateItem.status === "realizado"
                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/5"
                            : "border-amber-500/30 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/5"
                        }`}
                      >
                        {dateItem.status}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditDate(dateItem)}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDate(dateItem.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-serif flex items-center gap-2 text-slate-900 dark:text-white">
            <MapPin className="w-5 h-5 text-rose-500" />
            Onde vamos
          </h3>
          <CustomMap markers={dateMarkers} className="w-full h-[300px] rounded-2xl shadow-sm" />
        </div>
      </div>
    </div>
  );
}
