"use client";

import { useEffect, useMemo, useState } from "react";
import { handleDatabaseError, OperationType, supabase } from "@/services/supabase/client";
import { ensureProfileAndSettings } from "@/services/supabase/data";
import { useAuthStore } from "@/stores/authStore";
import {
  Calendar,
  CheckSquare,
  Coins,
  Link as LinkIcon,
  MapPin,
  Plane,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import CustomMap from "@/components/maps/CustomMap";
import { AnimatePresence, motion } from "framer-motion";

type TripDestination = {
  name: string;
  lat: number | null;
  lng: number | null;
};

type TripChecklistItem = {
  text: string;
  done: boolean;
};

type TripForm = {
  destinations: TripDestination[];
  start_date: string;
  end_date: string;
  estimated_budget: string;
  daily_budget: string;
  meal_budget: string;
  links: string;
  notes: string;
  status: string;
  checklist: TripChecklistItem[];
};

const INITIAL_FORM: TripForm = {
  destinations: [{ name: "", lat: null, lng: null }],
  start_date: "",
  end_date: "",
  estimated_budget: "",
  daily_budget: "",
  meal_budget: "",
  links: "",
  notes: "",
  status: "planejando",
  checklist: [],
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return (Number(digits) / 100).toFixed(2);
}

function formatCurrencyInput(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return CURRENCY_FORMATTER.format(numeric);
}

function formatCurrencyValue(value: number) {
  if (!Number.isFinite(value)) return "R$ 0,00";
  return CURRENCY_FORMATTER.format(value);
}

function normalizeDestinations(raw: unknown, fallbackDestination?: string): TripDestination[] {
  if (Array.isArray(raw)) {
    const parsed = raw
      .map((item) => {
        const casted = item as Partial<TripDestination>;
        const name = String(casted.name ?? "").trim();
        if (!name) return null;
        return {
          name,
          lat: Number.isFinite(casted.lat as number) ? Number(casted.lat) : null,
          lng: Number.isFinite(casted.lng as number) ? Number(casted.lng) : null,
        };
      })
      .filter((item): item is TripDestination => Boolean(item));

    if (parsed.length > 0) return parsed;
  }

  const fallback = (fallbackDestination ?? "")
    .split(/,|->|\|/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((name) => ({ name, lat: null, lng: null }));

  if (fallback.length > 0) return fallback;
  return [{ name: "", lat: null, lng: null }];
}

function normalizeChecklist(raw: unknown): TripChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const casted = item as Partial<TripChecklistItem>;
      const text = String(casted.text ?? "").trim();
      if (!text) return null;
      return {
        text,
        done: Boolean(casted.done),
      };
    })
    .filter((item): item is TripChecklistItem => Boolean(item));
}

async function geocodeDestination(
  query: string,
  token: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
    const url = `${endpoint}?limit=1&language=pt&types=country,region,place,locality,address&access_token=${token}`;
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

export default function TripsPage() {
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TripForm>({ ...INITIAL_FORM });

  const resetTripForm = () => {
    setForm({ ...INITIAL_FORM });
    setEditingTripId(null);
  };

  const fetchTrips = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (!user) return;
      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setTrips(data ?? []);
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.LIST, "trips", user);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [user]);

  const resolveDestinationsWithCoordinates = async (input: TripDestination[]) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const output: TripDestination[] = [];

    for (const destination of input) {
      const name = destination.name.trim();
      if (!name) continue;

      if (Number.isFinite(destination.lat) && Number.isFinite(destination.lng)) {
        output.push({
          name,
          lat: destination.lat,
          lng: destination.lng,
        });
        continue;
      }

      if (!token) {
        output.push({ name, lat: null, lng: null });
        continue;
      }

      const resolved = await geocodeDestination(name, token);
      output.push({
        name,
        lat: resolved?.lat ?? null,
        lng: resolved?.lng ?? null,
      });
    }

    return output;
  };

  const handleSubmitTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      if (!form.start_date || !form.end_date) {
        setErrorMessage("Informe data de inicio e fim da viagem.");
        return;
      }

      if (form.end_date < form.start_date) {
        setErrorMessage("A data final nao pode ser antes da data inicial.");
        return;
      }

      const destinationsInput = form.destinations.map((destination) => ({
        name: destination.name.trim(),
        lat: destination.lat,
        lng: destination.lng,
      }));

      const validDestinations = destinationsInput.filter((destination) => destination.name);
      if (validDestinations.length === 0) {
        setErrorMessage("Adicione pelo menos um destino para a viagem.");
        return;
      }

      const destinations = await resolveDestinationsWithCoordinates(validDestinations);
      const checklist = form.checklist
        .map((item) => ({ text: item.text.trim(), done: Boolean(item.done) }))
        .filter((item) => item.text);

      const destinationSummary = destinations.map((destination) => destination.name).join(" -> ");

      const payload = {
        couple_id: profile.couple_id,
        destination: destinationSummary,
        destinations,
        checklist,
        start_date: form.start_date,
        end_date: form.end_date,
        estimated_budget: Number(form.estimated_budget) || 0,
        daily_budget: Number(form.daily_budget) || 0,
        meal_budget: Number(form.meal_budget) || 0,
        links: form.links.trim(),
        notes: form.notes.trim(),
        status: form.status,
      };

      const { error } = editingTripId
        ? await supabase.from("trips").update(payload).eq("id", editingTripId)
        : await supabase.from("trips").insert({
            ...payload,
            created_at: new Date().toISOString(),
          });

      if (error) throw error;

      setShowForm(false);
      resetTripForm();
      await fetchTrips();
    } catch (error) {
      const message = handleDatabaseError(
        error,
        editingTripId ? OperationType.UPDATE : OperationType.CREATE,
        "trips",
        user,
      );
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditTrip = (trip: any) => {
    setEditingTripId(trip.id);
    setSelectedTripId(trip.id);
    setForm({
      destinations: normalizeDestinations(trip.destinations, trip.destination),
      start_date: trip.start_date ? String(trip.start_date).slice(0, 10) : "",
      end_date: trip.end_date ? String(trip.end_date).slice(0, 10) : "",
      estimated_budget:
        Number.isFinite(Number(trip.estimated_budget)) && Number(trip.estimated_budget) > 0
          ? Number(trip.estimated_budget).toFixed(2)
          : "",
      daily_budget:
        Number.isFinite(Number(trip.daily_budget)) && Number(trip.daily_budget) > 0
          ? Number(trip.daily_budget).toFixed(2)
          : "",
      meal_budget:
        Number.isFinite(Number(trip.meal_budget)) && Number(trip.meal_budget) > 0
          ? Number(trip.meal_budget).toFixed(2)
          : "",
      links: trip.links ?? "",
      notes: trip.notes ?? "",
      status: trip.status ?? "planejando",
      checklist: normalizeChecklist(trip.checklist),
    });
    setShowForm(true);
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!user) return;
    if (!window.confirm("Deseja excluir esta viagem?")) return;

    try {
      setErrorMessage(null);
      const { error } = await supabase.from("trips").delete().eq("id", tripId);
      if (error) throw error;
      if (selectedTripId === tripId) setSelectedTripId(null);
      await fetchTrips();
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.DELETE, "trips", user);
      setErrorMessage(message);
    }
  };

  const updateDestination = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.destinations];
      next[index] = { ...next[index], name: value, lat: null, lng: null };
      return { ...prev, destinations: next };
    });
  };

  const addDestination = () => {
    setForm((prev) => ({
      ...prev,
      destinations: [...prev.destinations, { name: "", lat: null, lng: null }],
    }));
  };

  const removeDestination = (index: number) => {
    setForm((prev) => ({
      ...prev,
      destinations: prev.destinations.length <= 1 ? prev.destinations : prev.destinations.filter((_, i) => i !== index),
    }));
  };

  const updateChecklistItem = (index: number, key: keyof TripChecklistItem, value: string | boolean) => {
    setForm((prev) => {
      const next = [...prev.checklist];
      next[index] = {
        ...next[index],
        [key]: value,
      };
      return { ...prev, checklist: next };
    });
  };

  const addChecklistItem = () => {
    setForm((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { text: "", done: false }],
    }));
  };

  const removeChecklistItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index),
    }));
  };

  const activeTripForMap = useMemo(() => {
    if (!trips.length) return null;
    if (selectedTripId) {
      const selected = trips.find((trip) => trip.id === selectedTripId);
      if (selected) return selected;
    }
    return trips[0];
  }, [selectedTripId, trips]);

  const mapMarkers = useMemo(() => {
    return trips.flatMap((trip) => {
      const destinations = normalizeDestinations(trip.destinations, trip.destination);
      return destinations
        .filter(
          (destination) =>
            Number.isFinite(destination.lat) &&
            Number.isFinite(destination.lng) &&
            destination.lat !== null &&
            destination.lng !== null,
        )
        .map((destination, index) => ({
          id: `${trip.id}-${index}`,
          lat: destination.lat as number,
          lng: destination.lng as number,
          title: destination.name,
        }));
    });
  }, [trips]);

  const mapRoute = useMemo(() => {
    if (!activeTripForMap) return [];
    const destinations = normalizeDestinations(activeTripForMap.destinations, activeTripForMap.destination);
    return destinations
      .filter(
        (destination) =>
          Number.isFinite(destination.lat) &&
          Number.isFinite(destination.lng) &&
          destination.lat !== null &&
          destination.lng !== null,
      )
      .map((destination) => ({
        lat: destination.lat as number,
        lng: destination.lng as number,
      }));
  }, [activeTripForMap]);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const childVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 24 } },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12 w-full max-w-6xl mx-auto">
      <motion.header variants={childVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif mb-2 text-slate-900 dark:text-white">
            Nossas <span className="text-rose-500 italic">Viagens</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Planeje cada etapa da rota do casal.</p>
        </div>
        <button
          onClick={() => {
            const next = !showForm;
            setShowForm(next);
            if (!next) resetTripForm();
          }}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-2xl font-medium transition-all active:scale-95 shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-5 h-5" />
          {editingTripId ? "Editar Viagem" : "Nova Viagem"}
        </button>
      </motion.header>

      {errorMessage && (
        <motion.div
          variants={childVariants}
          className="rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {errorMessage}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            className="glass p-6 md:p-8 rounded-2xl border border-slate-200/60 dark:border-white/10 overflow-hidden"
          >
            <h3 className="text-xl font-serif mb-6 text-slate-900 dark:text-white">
              {editingTripId ? "Editar Viagem" : "Detalhes da Viagem"}
            </h3>
            <form onSubmit={handleSubmitTrip} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 font-bold">
                    Destinos da viagem
                  </label>
                  <button
                    type="button"
                    onClick={addDestination}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                  >
                    Adicionar destino
                  </button>
                </div>
                <div className="space-y-2">
                  {form.destinations.map((destination, index) => (
                    <div key={`destination-${index}`} className="flex gap-2">
                      <input
                        type="text"
                        required={index === 0}
                        placeholder={`Destino ${index + 1} (ex: Chile)`}
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        value={destination.name}
                        onChange={(e) => updateDestination(index, e.target.value)}
                      />
                      {form.destinations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDestination(index)}
                          className="px-3 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Inicio</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Fim</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-100 dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="planejando">planejando</option>
                    <option value="confirmada">confirmada</option>
                    <option value="concluida">concluida</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Orcamento total</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={formatCurrencyInput(form.estimated_budget)}
                    onChange={(e) => setForm({ ...form, estimated_budget: parseCurrencyInput(e.target.value) })}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Media por dia</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={formatCurrencyInput(form.daily_budget)}
                    onChange={(e) => setForm({ ...form, daily_budget: parseCurrencyInput(e.target.value) })}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-amber-500/50 transition-colors text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Media refeicao</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={formatCurrencyInput(form.meal_budget)}
                    onChange={(e) => setForm({ ...form, meal_budget: parseCurrencyInput(e.target.value) })}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">
                  Link util (hotel, passeio, passagens)
                </label>
                <input
                  type="url"
                  value={form.links}
                  onChange={(e) => setForm({ ...form, links: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-colors text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="roteiro, observacoes, reservas..."
                  className="w-full h-24 resize-none bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 font-bold">Checklist</label>
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                  >
                    Adicionar item
                  </button>
                </div>
                <div className="space-y-2">
                  {form.checklist.length === 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-2 border border-slate-200 dark:border-white/10">
                      Ainda sem checklist para esta viagem.
                    </div>
                  )}
                  {form.checklist.map((item, index) => (
                    <div key={`checklist-${index}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-rose-500"
                        checked={item.done}
                        onChange={(e) => updateChecklistItem(index, "done", e.target.checked)}
                      />
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateChecklistItem(index, "text", e.target.value)}
                        placeholder={`Item ${index + 1}`}
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(index)}
                        className="px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                {editingTripId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetTripForm();
                      setShowForm(false);
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    Cancelar Edicao
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition-all active:scale-95 shadow-lg shadow-rose-500/20 disabled:opacity-70"
                >
                  {saving ? "Salvando..." : editingTripId ? "Salvar Alteracoes" : "Salvar Planejamento"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <motion.div variants={childVariants} className="lg:col-span-2 space-y-4">
          {loading && (
            <motion.div variants={childVariants} className="glass p-12 rounded-2xl text-center border border-slate-200/50 dark:border-white/5">
              <p className="text-slate-500 dark:text-slate-400">Carregando viagens...</p>
            </motion.div>
          )}

          {!loading && trips.length === 0 && (
            <motion.div variants={childVariants} className="glass p-12 rounded-2xl text-center border border-slate-200/50 dark:border-white/5">
              <Plane className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Nenhuma viagem planejada ainda.</p>
            </motion.div>
          )}

          <AnimatePresence>
            {trips.map((trip) => {
              const destinations = normalizeDestinations(trip.destinations, trip.destination).filter((item) => item.name);
              const checklist = normalizeChecklist(trip.checklist);
              const doneChecklist = checklist.filter((item) => item.done).length;

              return (
                <motion.div
                  variants={childVariants}
                  key={trip.id}
                  className="glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all group relative overflow-hidden"
                >
                  <h4 className="text-xl font-serif mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                    <MapPin className="w-5 h-5 text-rose-500" />
                    {destinations.map((destination) => destination.name).join(" -> ")}
                  </h4>

                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      {new Date(`${trip.start_date}T00:00:00`).toLocaleDateString("pt-BR")} -{" "}
                      {new Date(`${trip.end_date}T00:00:00`).toLocaleDateString("pt-BR")}
                    </div>

                    {Number(trip.estimated_budget) > 0 && (
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        Orcamento total: <strong className="text-slate-800 dark:text-white">{formatCurrencyValue(Number(trip.estimated_budget))}</strong>
                      </div>
                    )}

                    {Number(trip.daily_budget) > 0 && (
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        Media diaria: <strong>{formatCurrencyValue(Number(trip.daily_budget))}</strong>
                      </div>
                    )}

                    {Number(trip.meal_budget) > 0 && (
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-rose-400" />
                        Media refeicao: <strong>{formatCurrencyValue(Number(trip.meal_budget))}</strong>
                      </div>
                    )}

                    {trip.links && (
                      <div className="flex items-start gap-2 pt-1 border-t border-slate-200/50 dark:border-white/5 mt-2">
                        <LinkIcon className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                        <a
                          href={String(trip.links).includes("http") ? String(trip.links) : `https://${String(trip.links)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline break-all truncate"
                        >
                          {trip.links}
                        </a>
                      </div>
                    )}

                    {checklist.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 dark:border-white/5 mt-2">
                        <CheckSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        Checklist: {doneChecklist}/{checklist.length}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-auto">
                    <span
                      className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border font-medium ${
                        trip.status === "planejando"
                          ? "border-amber-500/30 text-amber-600 dark:text-amber-500 bg-amber-500/10"
                          : trip.status === "confirmada"
                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-500 bg-emerald-500/10"
                            : "border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/10"
                      }`}
                    >
                      {trip.status}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTripId(trip.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                      >
                        Ver rota
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditTrip(trip)}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        <motion.aside variants={childVariants} className="space-y-4 lg:sticky lg:top-8">
          <h3 className="text-xl font-serif flex items-center gap-2 text-slate-900 dark:text-white">
            <MapPin className="w-5 h-5 text-rose-500" />
            Mapa da viagem
          </h3>
          <CustomMap
            className="w-full h-[320px] rounded-2xl border border-slate-200/50 dark:border-white/5"
            markers={mapMarkers}
            route={mapRoute}
            zoom={4}
          />
          <div className="glass p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 text-sm text-slate-600 dark:text-slate-400">
            Clique em "Ver rota" em uma viagem para destacar a rota principal no mapa.
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}
