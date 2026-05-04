"use client";

import { useEffect, useMemo, useState } from "react";
import { handleDatabaseError, OperationType, supabase } from "@/services/supabase/client";
import { ensureProfileAndSettings } from "@/services/supabase/data";
import { useAuthStore } from "@/stores/authStore";
import {
  Calendar,
  CheckSquare,
  Coins,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  MapPin,
  Plane,
  Plus,
  Route,
  Trash2,
  Wallet,
} from "lucide-react";
import CustomMap from "@/components/maps/CustomMap";
import { AnimatePresence, motion } from "framer-motion";

type TripDestination = {
  name: string;
  lat: number | null;
  lng: number | null;
  arrival_date: string;
  arrival_time: string;
  departure_date: string;
  departure_time: string;
  notes: string;
};

type TripChecklistItem = {
  text: string;
  done: boolean;
};

type TripExpense = {
  destination_index: string;
  amount: string;
  category: string;
  paid_by: string;
  spent_at: string;
  notes: string;
  created_by: string | null;
};

type TripAlert = {
  destination_index: string;
  title: string;
  alert_at: string;
  alert_type: string;
  notes: string;
  dismissed_at: string | null;
  created_by: string | null;
};

type TripAttachment = {
  destination_index: string;
  scope_type: string;
  reference_index: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  notes: string;
  created_by: string | null;
  created_at: string | null;
};

type TripLink = {
  title: string;
  url: string;
  category: string;
  destination_index: string;
  notes: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
};

type TripItineraryItem = {
  destination_index: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  location: string;
  category: string;
  notes: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
};

type TripRecord = {
  id: string;
  destination: string;
  destinations: unknown;
  checklist: unknown;
  start_date: string;
  end_date: string;
  couple_budget?: number | null;
  individual_budget?: number | null;
  estimated_budget: number;
  daily_budget: number;
  meal_budget: number;
  links: unknown;
  notes: unknown;
  status: string;
  created_at?: string;
  normalized_stops?: TripDestination[];
  normalized_links?: TripLink[];
  normalized_itinerary?: TripItineraryItem[];
  normalized_notes?: string;
  normalized_expenses?: TripExpense[];
  normalized_alerts?: TripAlert[];
  normalized_attachments?: TripAttachment[];
};

type TripForm = {
  destinations: TripDestination[];
  start_date: string;
  end_date: string;
  couple_budget: string;
  individual_budget: string;
  estimated_budget: string;
  daily_budget: string;
  meal_budget: string;
  links: TripLink[];
  notes: string;
  status: string;
  checklist: TripChecklistItem[];
  itinerary: TripItineraryItem[];
  expenses: TripExpense[];
  alerts: TripAlert[];
};

const INITIAL_FORM: TripForm = {
  destinations: [createBlankDestination()],
  start_date: "",
  end_date: "",
  couple_budget: "",
  individual_budget: "",
  estimated_budget: "",
  daily_budget: "",
  meal_budget: "",
  links: [],
  notes: "",
  status: "planejando",
  checklist: [],
  itinerary: [],
  expenses: [],
  alerts: [],
};

const LINK_CATEGORIES = [
  { value: "hotel", label: "Hotel / hospedagem" },
  { value: "transporte", label: "Transporte" },
  { value: "passeio", label: "Passeio / tour" },
  { value: "passagem", label: "Passagem" },
  { value: "restaurante", label: "Restaurante" },
  { value: "documento", label: "Documento" },
  { value: "outro", label: "Outro" },
];

const ITINERARY_CATEGORIES = [
  { value: "chegada", label: "Chegada" },
  { value: "transporte", label: "Transporte" },
  { value: "passeio", label: "Passeio" },
  { value: "refeicao", label: "Refeicao" },
  { value: "hospedagem", label: "Hospedagem" },
  { value: "livre", label: "Tempo livre" },
  { value: "outro", label: "Outro" },
];

const EXPENSE_CATEGORIES = [
  { value: "transporte", label: "Transporte" },
  { value: "hospedagem", label: "Hospedagem" },
  { value: "alimentacao", label: "Alimentacao" },
  { value: "passeio", label: "Passeio" },
  { value: "compras", label: "Compras" },
  { value: "outro", label: "Outro" },
];

const PAID_BY_OPTIONS = [
  { value: "casal", label: "Casal" },
  { value: "pessoa_1", label: "Pessoa 1" },
  { value: "pessoa_2", label: "Pessoa 2" },
];

const ALERT_TYPES = [
  { value: "saida", label: "Saida" },
  { value: "checkin", label: "Check-in" },
  { value: "passeio", label: "Passeio" },
  { value: "reserva", label: "Reserva" },
  { value: "outro", label: "Outro" },
];

const ATTACHMENT_SCOPE_OPTIONS = [
  { value: "trip", label: "Viagem" },
  { value: "stop", label: "Parada" },
  { value: "link", label: "Link" },
  { value: "itinerary", label: "Roteiro" },
];

const ATTACHMENT_MAX_SIZE_BYTES = 20 * 1024 * 1024;
const ATTACHMENT_ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "txt", "zip"]);
const ATTACHMENT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/zip",
]);
const ATTACHMENT_MIME_MAP_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  zip: "application/zip",
};
const ATTACHMENT_MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "application/x-zip-compressed": "application/zip",
};

const COUNTRY_FLAGS = [
  { flag: "🇧🇴", aliases: ["bolivia", "bolívia"] },
  { flag: "🇨🇱", aliases: ["chile"] },
  { flag: "🇧🇷", aliases: ["brasil", "brazil"] },
  { flag: "🇵🇪", aliases: ["peru"] },
  { flag: "🇦🇷", aliases: ["argentina"] },
  { flag: "🇺🇾", aliases: ["uruguai", "uruguay"] },
  { flag: "🇵🇾", aliases: ["paraguai", "paraguay"] },
  { flag: "🇨🇴", aliases: ["colombia", "colômbia"] },
];

function createBlankDestination(): TripDestination {
  return {
    name: "",
    lat: null,
    lng: null,
    arrival_date: "",
    arrival_time: "",
    departure_date: "",
    departure_time: "",
    notes: "",
  };
}

const createBlankLink = (): TripLink => ({
  title: "",
  url: "",
  category: "hotel",
  destination_index: "general",
  notes: "",
  created_by: null,
  updated_by: null,
  created_at: null,
});

const createBlankItineraryItem = (): TripItineraryItem => ({
  destination_index: "general",
  date: "",
  start_time: "",
  end_time: "",
  title: "",
  location: "",
  category: "passeio",
  notes: "",
  created_by: null,
  updated_by: null,
  created_at: null,
});

const createBlankExpense = (): TripExpense => ({
  destination_index: "general",
  amount: "",
  category: "outro",
  paid_by: "casal",
  spent_at: "",
  notes: "",
  created_by: null,
});

const createBlankAlert = (): TripAlert => ({
  destination_index: "general",
  title: "",
  alert_at: "",
  alert_type: "outro",
  notes: "",
  dismissed_at: null,
  created_by: null,
});

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

function resolveAttachmentMimeType(file: File, extension: string): string | null {
  const rawMime = String(file.type || "").trim().toLowerCase();
  const normalizedMime = ATTACHMENT_MIME_ALIASES[rawMime] ?? rawMime;
  if (ATTACHMENT_ALLOWED_MIME_TYPES.has(normalizedMime)) return normalizedMime;
  return ATTACHMENT_MIME_MAP_BY_EXTENSION[extension] ?? null;
}

function calculateTotalBudget(coupleBudget: number, individualBudgetPerPerson: number) {
  const safeCouple = Number.isFinite(coupleBudget) && coupleBudget > 0 ? coupleBudget : 0;
  const safeIndividual = Number.isFinite(individualBudgetPerPerson) && individualBudgetPerPerson > 0 ? individualBudgetPerPerson : 0;
  return safeCouple + safeIndividual * 2;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeDestinationIndex(value: unknown) {
  const text = String(value ?? "general").trim();
  if (!text || text === "-1" || text === "null" || text === "undefined") return "general";
  return /^\d+$/.test(text) ? text : "general";
}

function getDestinationDisplayName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "";

  const normalized = normalizeSearchText(trimmed);
  const matchedCountry = COUNTRY_FLAGS.find((country) =>
    country.aliases.some((alias) => new RegExp(`(^|[^a-z])${normalizeSearchText(alias)}([^a-z]|$)`).test(normalized)),
  );

  if (!matchedCountry) return trimmed;

  const aliasesPattern = matchedCountry.aliases
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const countryNamePattern = new RegExp(`\\s*(,|-|/)?\\s*\\b(${aliasesPattern})\\b\\s*`, "gi");
  const withoutCountry = trimmed
    .replace(countryNamePattern, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*$/g, "")
    .trim();

  return withoutCountry ? `${matchedCountry.flag} ${withoutCountry}` : matchedCountry.flag;
}

function getDestinationOptionLabel(destinations: TripDestination[], indexValue: string) {
  if (indexValue === "general") return "Geral da viagem";
  const index = Number(indexValue);
  const destination = destinations[index];
  if (!destination?.name) return `Parada ${index + 1}`;
  return `Parada ${index + 1}: ${getDestinationDisplayName(destination.name)}`;
}

function getItemsForDestination<T extends { destination_index: string }>(items: T[], index: number) {
  return items.filter((item) => normalizeDestinationIndex(item.destination_index) === String(index));
}

function getGeneralItems<T extends { destination_index: string }>(items: T[]) {
  return items.filter((item) => normalizeDestinationIndex(item.destination_index) === "general");
}

function getDestinationIndexFromStopId(stopId: string | null | undefined, stops: Array<{ id: string }>) {
  if (!stopId) return "general";
  const index = stops.findIndex((stop) => stop.id === stopId);
  return index >= 0 ? String(index) : "general";
}

function normalizeLinksFromRows(
  rows: Array<Record<string, unknown>>,
  stops: Array<{ id: string }>,
): TripLink[] {
  return rows
    .map((row) => {
      const url = String(row.url ?? "").trim();
      if (!url) return null;
      return {
        title: String(row.title ?? "").trim(),
        url,
        category: String(row.category ?? "outro").trim() || "outro",
        destination_index: getDestinationIndexFromStopId(
          (row.stop_id as string | null | undefined) ?? null,
          stops,
        ),
        notes: String(row.notes ?? "").trim(),
        created_by: (row.created_by as string | null | undefined) ?? null,
        updated_by: (row.updated_by as string | null | undefined) ?? null,
        created_at: (row.created_at as string | null | undefined) ?? null,
      };
    })
    .filter((item): item is TripLink => Boolean(item));
}

function normalizeItineraryFromRows(
  rows: Array<Record<string, unknown>>,
  stops: Array<{ id: string }>,
): TripItineraryItem[] {
  return rows
    .map((row) => {
      const title = String(row.title ?? "").trim();
      if (!title) return null;
      return {
        destination_index: getDestinationIndexFromStopId(
          (row.stop_id as string | null | undefined) ?? null,
          stops,
        ),
        date: String(row.event_date ?? "").slice(0, 10),
        start_time: String(row.start_time ?? "").slice(0, 5),
        end_time: String(row.end_time ?? "").slice(0, 5),
        title,
        location: String(row.location ?? "").trim(),
        category: String(row.category ?? "outro").trim() || "outro",
        notes: String(row.notes ?? "").trim(),
        created_by: (row.created_by as string | null | undefined) ?? null,
        updated_by: (row.updated_by as string | null | undefined) ?? null,
        created_at: (row.created_at as string | null | undefined) ?? null,
      };
    })
    .filter((item): item is TripItineraryItem => Boolean(item));
}

function normalizeExpensesFromRows(
  rows: Array<Record<string, unknown>>,
): TripExpense[] {
  return rows
    .map((row) => {
      const amount = Number(row.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const destinationIndex = normalizeDestinationIndex(row.destination_index);
      return {
        destination_index: destinationIndex,
        amount: amount.toFixed(2),
        category: String(row.category ?? "outro").trim() || "outro",
        paid_by: String(row.paid_by ?? "casal").trim() || "casal",
        spent_at: String(row.spent_at ?? "").slice(0, 16),
        notes: String(row.notes ?? "").trim(),
        created_by: (row.created_by as string | null | undefined) ?? null,
      };
    })
    .filter((item): item is TripExpense => Boolean(item));
}

function normalizeAlertsFromRows(
  rows: Array<Record<string, unknown>>,
): TripAlert[] {
  return rows
    .map((row) => {
      const title = String(row.title ?? "").trim();
      const alertAt = String(row.alert_at ?? "").slice(0, 16);
      if (!title || !alertAt) return null;
      return {
        destination_index: normalizeDestinationIndex(row.destination_index),
        title,
        alert_at: alertAt,
        alert_type: String(row.alert_type ?? "outro").trim() || "outro",
        notes: String(row.notes ?? "").trim(),
        dismissed_at: row.dismissed_at ? String(row.dismissed_at) : null,
        created_by: (row.created_by as string | null | undefined) ?? null,
      };
    })
    .filter((item): item is TripAlert => Boolean(item));
}

function normalizeAttachmentsFromRows(
  rows: Array<Record<string, unknown>>,
): TripAttachment[] {
  return rows
    .map((row) => ({
      destination_index: normalizeDestinationIndex(row.destination_index),
      scope_type: String(row.scope_type ?? "trip").trim() || "trip",
      reference_index: String(row.reference_index ?? ""),
      file_name: String(row.file_name ?? "").trim(),
      file_path: String(row.file_path ?? "").trim(),
      mime_type: row.mime_type ? String(row.mime_type) : null,
      size_bytes: Number.isFinite(Number(row.size_bytes)) ? Number(row.size_bytes) : null,
      notes: String(row.notes ?? "").trim(),
      created_by: (row.created_by as string | null | undefined) ?? null,
      created_at: row.created_at ? String(row.created_at) : null,
    }))
    .filter((item) => item.file_name && item.file_path);
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
          arrival_date: String(casted.arrival_date ?? "").slice(0, 10),
          arrival_time: String(casted.arrival_time ?? "").slice(0, 5),
          departure_date: String(casted.departure_date ?? "").slice(0, 10),
          departure_time: String(casted.departure_time ?? "").slice(0, 5),
          notes: String(casted.notes ?? "").trim(),
        };
      })
      .filter((item): item is TripDestination => Boolean(item));

    if (parsed.length > 0) return parsed;
  }

  const fallback = (fallbackDestination ?? "")
    .split(/,|->|\|/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((name) => ({ ...createBlankDestination(), name }));

  if (fallback.length > 0) return fallback;
  return [createBlankDestination()];
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

function normalizeLinks(raw: unknown): TripLink[] {
  if (!raw) return [];

  const parseArray = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        const casted = item as Partial<TripLink>;
        const url = String(casted.url ?? "").trim();
        if (!url) return null;
        return {
          title: String(casted.title ?? "").trim(),
          url,
          category: String(casted.category ?? "outro").trim() || "outro",
          destination_index: normalizeDestinationIndex(casted.destination_index),
          notes: String(casted.notes ?? "").trim(),
          created_by: (casted.created_by as string | null | undefined) ?? null,
          updated_by: (casted.updated_by as string | null | undefined) ?? null,
          created_at: (casted.created_at as string | null | undefined) ?? null,
        };
      })
      .filter((item): item is TripLink => Boolean(item));
  };

  if (Array.isArray(raw)) return parseArray(raw);

  const text = String(raw).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as unknown;
    const links = Array.isArray(parsed) ? parseArray(parsed) : parseArray((parsed as { links?: unknown })?.links);
    if (links.length > 0) return links;
  } catch {
    // Legacy trips stored a single plain URL in this text column.
  }

  return [
    {
      title: "Link util",
      url: text,
      category: "outro",
      destination_index: "general",
      notes: "",
      created_by: null,
      updated_by: null,
      created_at: null,
    },
  ];
}

function normalizeTripNotes(raw: unknown): { notes: string; itinerary: TripItineraryItem[] } {
  const empty = { notes: "", itinerary: [] };
  if (!raw) return empty;

  const text = String(raw).trim();
  if (!text) return empty;

  try {
    const parsed = JSON.parse(text) as {
      notes?: unknown;
      itinerary?: unknown;
    };

    if (parsed && (typeof parsed.notes !== "undefined" || Array.isArray(parsed.itinerary))) {
      const itinerary = Array.isArray(parsed.itinerary)
        ? parsed.itinerary
            .map((item) => {
              const casted = item as Partial<TripItineraryItem>;
              const title = String(casted.title ?? "").trim();
              const location = String(casted.location ?? "").trim();
              const notes = String(casted.notes ?? "").trim();
              const date = String(casted.date ?? "").slice(0, 10);
              if (!title && !location && !notes && !date) return null;
              return {
                destination_index: normalizeDestinationIndex(casted.destination_index),
                date,
                start_time: String(casted.start_time ?? "").slice(0, 5),
                end_time: String(casted.end_time ?? "").slice(0, 5),
                title,
                location,
                category: String(casted.category ?? "outro").trim() || "outro",
                notes,
                created_by: (casted.created_by as string | null | undefined) ?? null,
                updated_by: (casted.updated_by as string | null | undefined) ?? null,
                created_at: (casted.created_at as string | null | undefined) ?? null,
              };
            })
            .filter((item): item is TripItineraryItem => Boolean(item))
        : [];

      return {
        notes: String(parsed.notes ?? "").trim(),
        itinerary,
      };
    }
  } catch {
    // Plain text notes from existing trips remain valid.
  }

  return { notes: text, itinerary: [] };
}

function serializeLinks(links: TripLink[]) {
  const validLinks = links
    .map((link) => ({
      title: link.title.trim(),
      url: link.url.trim(),
      category: link.category.trim() || "outro",
      destination_index: normalizeDestinationIndex(link.destination_index),
      notes: link.notes.trim(),
    }))
    .filter((link) => link.url);

  return validLinks.length > 0 ? JSON.stringify({ version: 1, links: validLinks }) : "";
}

function serializeTripNotes(notes: string, itinerary: TripItineraryItem[]) {
  const validItinerary = itinerary
    .map((item) => ({
      destination_index: normalizeDestinationIndex(item.destination_index),
      date: item.date,
      start_time: item.start_time,
      end_time: item.end_time,
      title: item.title.trim(),
      location: item.location.trim(),
      category: item.category.trim() || "outro",
      notes: item.notes.trim(),
    }))
    .filter((item) => item.title || item.location || item.notes || item.date);

  const trimmedNotes = notes.trim();
  if (validItinerary.length === 0) return trimmedNotes;

  return JSON.stringify({
    version: 1,
    notes: trimmedNotes,
    itinerary: validItinerary,
  });
}

function normalizeExternalUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "#";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getCategoryLabel(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? "Outro";
}

function formatTimeRange(start: string, end: string) {
  if (start && end) return `${start} - ${end}`;
  return start || end || "Horario livre";
}

function getDestinationDateRange(destinations: TripDestination[], fallbackStart = "", fallbackEnd = "") {
  const datedStops = destinations
    .flatMap((destination) => [destination.arrival_date, destination.departure_date])
    .filter(Boolean)
    .sort();

  return {
    start_date: datedStops[0] ?? fallbackStart,
    end_date: datedStops[datedStops.length - 1] ?? fallbackEnd,
  };
}

function formatDateLabel(date: string) {
  if (!date) return "Sem data";
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTimeLabel(date: string, time: string) {
  if (!date && !time) return "Nao informado";
  if (!date) return time;
  return `${formatDateLabel(date)}${time ? ` as ${time}` : ""}`;
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
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [memberDirectory, setMemberDirectory] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TripForm>({ ...INITIAL_FORM });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentScopeType, setAttachmentScopeType] = useState("trip");
  const [attachmentDestinationIndex, setAttachmentDestinationIndex] = useState("general");
  const [attachmentReferenceIndex, setAttachmentReferenceIndex] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");

  const resetTripForm = () => {
    setForm({ ...INITIAL_FORM });
    setEditingTripId(null);
    setAttachmentScopeType("trip");
    setAttachmentDestinationIndex("general");
    setAttachmentReferenceIndex("");
    setAttachmentNotes("");
  };

  const fetchTrips = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (!user) return;
      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      const { data: coupleMembers } = await supabase
        .from("profiles")
        .select("id,email")
        .eq("couple_id", profile.couple_id);
      const membersMap = Object.fromEntries(
        (coupleMembers ?? []).map((member) => [member.id as string, String(member.email ?? "").trim() || "parceiro"]),
      );
      setMemberDirectory(membersMap);

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("start_date", { ascending: true });

      if (error) throw error;

      const baseTrips = (data ?? []) as TripRecord[];
      if (baseTrips.length === 0) {
        setTrips([]);
        return;
      }

      const tripIds = baseTrips.map((trip) => trip.id);
      const [
        { data: stopsData, error: stopsError },
        { data: linksData, error: linksError },
        { data: itineraryData, error: itineraryError },
        { data: expensesData, error: expensesError },
        { data: alertsData, error: alertsError },
        { data: attachmentsData, error: attachmentsError },
      ] =
        await Promise.all([
          supabase
            .from("trip_stops")
            .select("id,trip_id,stop_order,name,arrival_date,arrival_time,departure_date,departure_time,notes,lat,lng,created_by,created_at,updated_by")
            .in("trip_id", tripIds)
            .order("trip_id", { ascending: true })
            .order("stop_order", { ascending: true }),
          supabase
            .from("trip_links")
            .select("id,trip_id,stop_id,sort_order,title,url,category,notes,created_by,created_at,updated_by")
            .in("trip_id", tripIds)
            .order("trip_id", { ascending: true })
            .order("sort_order", { ascending: true }),
          supabase
            .from("trip_itinerary_items")
            .select("id,trip_id,stop_id,sort_order,event_date,start_time,end_time,title,location,category,notes,created_by,created_at,updated_by")
            .in("trip_id", tripIds)
            .order("trip_id", { ascending: true })
            .order("sort_order", { ascending: true }),
          supabase
            .from("trip_expenses")
            .select("id,trip_id,destination_index,amount,category,paid_by,spent_at,notes,created_by")
            .in("trip_id", tripIds)
            .order("trip_id", { ascending: true })
            .order("spent_at", { ascending: true }),
          supabase
            .from("trip_alerts")
            .select("id,trip_id,destination_index,title,alert_at,alert_type,notes,dismissed_at,created_by")
            .in("trip_id", tripIds)
            .order("trip_id", { ascending: true })
            .order("alert_at", { ascending: true }),
          supabase
            .from("trip_attachments")
            .select("id,trip_id,destination_index,scope_type,reference_index,file_name,file_path,mime_type,size_bytes,notes,created_by,created_at")
            .in("trip_id", tripIds)
            .order("trip_id", { ascending: true })
            .order("created_at", { ascending: true }),
        ]);

      if (stopsError) throw stopsError;
      if (linksError) throw linksError;
      if (itineraryError) throw itineraryError;
      if (expensesError) throw expensesError;
      if (alertsError) throw alertsError;
      if (attachmentsError) throw attachmentsError;

      const stopsByTrip = (stopsData ?? []).reduce(
        (acc, row) => {
          const tripId = String(row.trip_id);
          if (!acc[tripId]) acc[tripId] = [];
          acc[tripId].push(row as Record<string, unknown>);
          return acc;
        },
        {} as Record<string, Array<Record<string, unknown>>>,
      );
      const linksByTrip = (linksData ?? []).reduce(
        (acc, row) => {
          const tripId = String(row.trip_id);
          if (!acc[tripId]) acc[tripId] = [];
          acc[tripId].push(row as Record<string, unknown>);
          return acc;
        },
        {} as Record<string, Array<Record<string, unknown>>>,
      );
      const itineraryByTrip = (itineraryData ?? []).reduce(
        (acc, row) => {
          const tripId = String(row.trip_id);
          if (!acc[tripId]) acc[tripId] = [];
          acc[tripId].push(row as Record<string, unknown>);
          return acc;
        },
        {} as Record<string, Array<Record<string, unknown>>>,
      );
      const expensesByTrip = (expensesData ?? []).reduce(
        (acc, row) => {
          const tripId = String(row.trip_id);
          if (!acc[tripId]) acc[tripId] = [];
          acc[tripId].push(row as Record<string, unknown>);
          return acc;
        },
        {} as Record<string, Array<Record<string, unknown>>>,
      );
      const alertsByTrip = (alertsData ?? []).reduce(
        (acc, row) => {
          const tripId = String(row.trip_id);
          if (!acc[tripId]) acc[tripId] = [];
          acc[tripId].push(row as Record<string, unknown>);
          return acc;
        },
        {} as Record<string, Array<Record<string, unknown>>>,
      );
      const attachmentsByTrip = (attachmentsData ?? []).reduce(
        (acc, row) => {
          const tripId = String(row.trip_id);
          if (!acc[tripId]) acc[tripId] = [];
          acc[tripId].push(row as Record<string, unknown>);
          return acc;
        },
        {} as Record<string, Array<Record<string, unknown>>>,
      );

      const hydratedTrips: TripRecord[] = baseTrips.map((trip) => {
        const normalizedStopsRows = stopsByTrip[trip.id] ?? [];
        const normalizedStops =
          normalizedStopsRows.length > 0
            ? normalizeDestinations(normalizedStopsRows)
            : normalizeDestinations(trip.destinations, trip.destination);

        const legacyNotes = normalizeTripNotes(trip.notes);
        const normalizedLinksRows = linksByTrip[trip.id] ?? [];
        const normalizedItineraryRows = itineraryByTrip[trip.id] ?? [];
        const normalizedLinks =
          normalizedLinksRows.length > 0
            ? normalizeLinksFromRows(normalizedLinksRows, normalizedStopsRows as Array<{ id: string }>)
            : normalizeLinks(trip.links);
        const normalizedItinerary =
          normalizedItineraryRows.length > 0
            ? normalizeItineraryFromRows(normalizedItineraryRows, normalizedStopsRows as Array<{ id: string }>)
            : legacyNotes.itinerary;
        const normalizedExpenses = normalizeExpensesFromRows(expensesByTrip[trip.id] ?? []);
        const normalizedAlerts = normalizeAlertsFromRows(alertsByTrip[trip.id] ?? []);
        const normalizedAttachments = normalizeAttachmentsFromRows(attachmentsByTrip[trip.id] ?? []);

        return {
          ...trip,
          normalized_stops: normalizedStops,
          normalized_links: normalizedLinks,
          normalized_itinerary: normalizedItinerary,
          normalized_notes: legacyNotes.notes,
          normalized_expenses: normalizedExpenses,
          normalized_alerts: normalizedAlerts,
          normalized_attachments: normalizedAttachments,
        };
      });

      setTrips(hydratedTrips);
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
          ...destination,
          name,
          lat: destination.lat,
          lng: destination.lng,
        });
        continue;
      }

      if (!token) {
        output.push({ ...destination, name, lat: null, lng: null });
        continue;
      }

      const resolved = await geocodeDestination(name, token);
      output.push({
        ...destination,
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

      const destinationsInput = form.destinations.map((destination) => ({
        name: destination.name.trim(),
        lat: destination.lat,
        lng: destination.lng,
        arrival_date: destination.arrival_date,
        arrival_time: destination.arrival_time,
        departure_date: destination.departure_date,
        departure_time: destination.departure_time,
        notes: destination.notes.trim(),
      }));

      const validDestinations = destinationsInput.filter((destination) => destination.name);
      if (validDestinations.length === 0) {
        setErrorMessage("Adicione pelo menos um destino para a viagem.");
        return;
      }

      const computedRange = getDestinationDateRange(validDestinations, form.start_date, form.end_date);
      if (!computedRange.start_date || !computedRange.end_date) {
        setErrorMessage("Informe pelo menos uma data de chegada ou saida nos destinos da viagem.");
        return;
      }

      if (computedRange.end_date < computedRange.start_date) {
        setErrorMessage("As datas dos destinos precisam seguir uma ordem valida.");
        return;
      }

      const destinations = await resolveDestinationsWithCoordinates(validDestinations);
      const checklist = form.checklist
        .map((item) => ({ text: item.text.trim(), done: Boolean(item.done) }))
        .filter((item) => item.text);

      const destinationSummary = destinations.map((destination) => destination.name).join(" -> ");
      const coupleBudgetValue = Number(form.couple_budget) || 0;
      const individualBudgetValue = Number(form.individual_budget) || 0;
      const totalBudgetValue = calculateTotalBudget(coupleBudgetValue, individualBudgetValue);

      const payload = {
        couple_id: profile.couple_id,
        destination: destinationSummary,
        destinations,
        checklist,
        start_date: computedRange.start_date,
        end_date: computedRange.end_date,
        couple_budget: coupleBudgetValue,
        individual_budget: individualBudgetValue,
        estimated_budget: totalBudgetValue,
        daily_budget: Number(form.daily_budget) || 0,
        meal_budget: Number(form.meal_budget) || 0,
        links: serializeLinks(form.links),
        notes: serializeTripNotes(form.notes, form.itinerary),
        status: form.status,
      };

      const tripResult = editingTripId
        ? await supabase.from("trips").update(payload).eq("id", editingTripId).select("id").single()
        : await supabase
            .from("trips")
            .insert({
              ...payload,
              created_at: new Date().toISOString(),
            })
            .select("id")
            .single();

      if (tripResult.error) throw tripResult.error;

      const tripId = String(tripResult.data.id);

      const stopPayload = destinations.map((destination, index) => ({
        trip_id: tripId,
        stop_order: index + 1,
        name: destination.name.trim(),
        arrival_date: destination.arrival_date || null,
        arrival_time: destination.arrival_time || null,
        departure_date: destination.departure_date || null,
        departure_time: destination.departure_time || null,
        notes: destination.notes.trim() || null,
        lat: destination.lat,
        lng: destination.lng,
      }));

      const { error: deleteItineraryError } = await supabase
        .from("trip_itinerary_items")
        .delete()
        .eq("trip_id", tripId);
      if (deleteItineraryError) throw deleteItineraryError;

      const { error: deleteLinksError } = await supabase.from("trip_links").delete().eq("trip_id", tripId);
      if (deleteLinksError) throw deleteLinksError;

      const { error: deleteStopsError } = await supabase.from("trip_stops").delete().eq("trip_id", tripId);
      if (deleteStopsError) throw deleteStopsError;

      const { data: insertedStops, error: insertStopsError } = await supabase
        .from("trip_stops")
        .insert(stopPayload)
        .select("id,stop_order");
      if (insertStopsError) throw insertStopsError;

      const stopIdByOrder = new Map<number, string>();
      (insertedStops ?? []).forEach((stop) => {
        stopIdByOrder.set(Number(stop.stop_order), String(stop.id));
      });

      const normalizedLinks = form.links
        .map((link) => ({
          title: link.title.trim() || null,
          url: link.url.trim(),
          category: link.category.trim() || "outro",
          notes: link.notes.trim() || null,
          destination_index: normalizeDestinationIndex(link.destination_index),
        }))
        .filter((link) => Boolean(link.url));

      if (normalizedLinks.length > 0) {
        const linksPayload = normalizedLinks.map((link, index) => ({
          trip_id: tripId,
          stop_id:
            link.destination_index === "general"
              ? null
              : (stopIdByOrder.get(Number(link.destination_index) + 1) ?? null),
          sort_order: index + 1,
          title: link.title,
          url: link.url,
          category: link.category,
          notes: link.notes,
        }));

        const { error: insertLinksError } = await supabase.from("trip_links").insert(linksPayload);
        if (insertLinksError) throw insertLinksError;
      }

      const normalizedItinerary = form.itinerary
        .map((item) => ({
          destination_index: normalizeDestinationIndex(item.destination_index),
          event_date: item.date || null,
          start_time: item.start_time || null,
          end_time: item.end_time || null,
          title: item.title.trim(),
          location: item.location.trim() || null,
          category: item.category.trim() || "outro",
          notes: item.notes.trim() || null,
        }))
        .filter((item) => item.title);

      if (normalizedItinerary.length > 0) {
        const itineraryPayload = normalizedItinerary.map((item, index) => ({
          trip_id: tripId,
          stop_id:
            item.destination_index === "general"
              ? null
              : (stopIdByOrder.get(Number(item.destination_index) + 1) ?? null),
          sort_order: index + 1,
          event_date: item.event_date,
          start_time: item.start_time,
          end_time: item.end_time,
          title: item.title,
          location: item.location,
          category: item.category,
          notes: item.notes,
        }));

        const { error: insertItineraryError } = await supabase
          .from("trip_itinerary_items")
          .insert(itineraryPayload);
        if (insertItineraryError) throw insertItineraryError;
      }

      const { error: deleteExpensesError } = await supabase.from("trip_expenses").delete().eq("trip_id", tripId);
      if (deleteExpensesError) throw deleteExpensesError;

      const normalizedExpenses = form.expenses
        .map((expense) => ({
          destination_index: normalizeDestinationIndex(expense.destination_index),
          amount: Number(expense.amount) || 0,
          category: expense.category.trim() || "outro",
          paid_by: expense.paid_by.trim() || "casal",
          spent_at: expense.spent_at || null,
          notes: expense.notes.trim() || null,
        }))
        .filter((expense) => expense.amount > 0);

      if (normalizedExpenses.length > 0) {
        const expensesPayload = normalizedExpenses.map((expense) => ({
          trip_id: tripId,
          destination_index: expense.destination_index === "general" ? null : Number(expense.destination_index),
          amount: expense.amount,
          category: expense.category,
          paid_by: expense.paid_by,
          spent_at: expense.spent_at,
          notes: expense.notes,
        }));

        const { error: insertExpensesError } = await supabase.from("trip_expenses").insert(expensesPayload);
        if (insertExpensesError) throw insertExpensesError;
      }

      const { error: deleteAlertsError } = await supabase.from("trip_alerts").delete().eq("trip_id", tripId);
      if (deleteAlertsError) throw deleteAlertsError;

      const normalizedAlerts = form.alerts
        .map((alert) => ({
          destination_index: normalizeDestinationIndex(alert.destination_index),
          title: alert.title.trim(),
          alert_at: alert.alert_at || null,
          alert_type: alert.alert_type.trim() || "outro",
          notes: alert.notes.trim() || null,
        }))
        .filter((alert) => alert.title && alert.alert_at);

      if (normalizedAlerts.length > 0) {
        const alertsPayload = normalizedAlerts.map((alert) => ({
          trip_id: tripId,
          destination_index: alert.destination_index === "general" ? null : Number(alert.destination_index),
          title: alert.title,
          alert_at: alert.alert_at,
          alert_type: alert.alert_type,
          notes: alert.notes,
        }));

        const { error: insertAlertsError } = await supabase.from("trip_alerts").insert(alertsPayload);
        if (insertAlertsError) throw insertAlertsError;
      }

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

  const handleEditTrip = (trip: TripRecord) => {
    setEditingTripId(trip.id);
    setSelectedTripId(trip.id);
    const destinations = trip.normalized_stops ?? normalizeDestinations(trip.destinations, trip.destination);
    const legacyNotes = normalizeTripNotes(trip.notes);
    const links = trip.normalized_links ?? normalizeLinks(trip.links);
    const itinerary = trip.normalized_itinerary ?? legacyNotes.itinerary;
    const notes = trip.normalized_notes ?? legacyNotes.notes;
    const expenses = trip.normalized_expenses ?? [];
    const alerts = trip.normalized_alerts ?? [];
    setForm({
      destinations,
      start_date: trip.start_date ? String(trip.start_date).slice(0, 10) : "",
      end_date: trip.end_date ? String(trip.end_date).slice(0, 10) : "",
      couple_budget:
        Number.isFinite(Number(trip.couple_budget)) && Number(trip.couple_budget) > 0
          ? Number(trip.couple_budget).toFixed(2)
          : "",
      individual_budget:
        Number.isFinite(Number(trip.individual_budget)) && Number(trip.individual_budget) > 0
          ? Number(trip.individual_budget).toFixed(2)
          : "",
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
      links,
      notes,
      status: trip.status ?? "planejando",
      checklist: normalizeChecklist(trip.checklist),
      itinerary,
      expenses,
      alerts,
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

  const updateDestination = (index: number, key: keyof TripDestination, value: string) => {
    setForm((prev) => {
      const next = [...prev.destinations];
      next[index] = {
        ...next[index],
        [key]: value,
        ...(key === "name" ? { lat: null, lng: null } : {}),
      };
      return { ...prev, destinations: next };
    });
  };

  const addDestination = () => {
    setForm((prev) => ({
      ...prev,
      destinations: [...prev.destinations, createBlankDestination()],
    }));
  };

  const removeDestination = (index: number) => {
    const reassignDestinationIndex = (value: string) => {
      const normalized = normalizeDestinationIndex(value);
      if (normalized === "general") return "general";
      const numeric = Number(normalized);
      if (numeric === index) return "general";
      if (numeric > index) return String(numeric - 1);
      return normalized;
    };

    setForm((prev) => ({
      ...prev,
      destinations: prev.destinations.length <= 1 ? prev.destinations : prev.destinations.filter((_, i) => i !== index),
      links: prev.links.map((link) => ({
        ...link,
        destination_index: reassignDestinationIndex(link.destination_index),
      })),
      itinerary: prev.itinerary.map((item) => ({
        ...item,
        destination_index: reassignDestinationIndex(item.destination_index),
      })),
      expenses: prev.expenses.map((item) => ({
        ...item,
        destination_index: reassignDestinationIndex(item.destination_index),
      })),
      alerts: prev.alerts.map((item) => ({
        ...item,
        destination_index: reassignDestinationIndex(item.destination_index),
      })),
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

  const updateLink = (index: number, key: keyof TripLink, value: string) => {
    setForm((prev) => {
      const next = [...prev.links];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, links: next };
    });
  };

  const addLink = () => {
    setForm((prev) => ({
      ...prev,
      links: [...prev.links, createBlankLink()],
    }));
  };

  const removeLink = (index: number) => {
    setForm((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
  };

  const updateItineraryItem = (index: number, key: keyof TripItineraryItem, value: string) => {
    setForm((prev) => {
      const next = [...prev.itinerary];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, itinerary: next };
    });
  };

  const addItineraryItem = () => {
    setForm((prev) => ({
      ...prev,
      itinerary: [...prev.itinerary, createBlankItineraryItem()],
    }));
  };

  const removeItineraryItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, i) => i !== index),
    }));
  };

  const updateExpenseItem = (index: number, key: keyof TripExpense, value: string) => {
    setForm((prev) => {
      const next = [...prev.expenses];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, expenses: next };
    });
  };

  const addExpenseItem = () => {
    setForm((prev) => ({
      ...prev,
      expenses: [...prev.expenses, createBlankExpense()],
    }));
  };

  const removeExpenseItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index),
    }));
  };

  const updateAlertItem = (index: number, key: keyof TripAlert, value: string) => {
    setForm((prev) => {
      const next = [...prev.alerts];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, alerts: next };
    });
  };

  const addAlertItem = () => {
    setForm((prev) => ({
      ...prev,
      alerts: [...prev.alerts, createBlankAlert()],
    }));
  };

  const removeAlertItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((_, i) => i !== index),
    }));
  };

  const handleUploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !editingTripId || !user) return;

    try {
      setUploadingAttachment(true);
      setErrorMessage(null);
      const profile = await ensureProfileAndSettings(user.id, user.email);
      if (!profile?.couple_id) return;

      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      if (!ATTACHMENT_ALLOWED_EXTENSIONS.has(extension)) {
        setErrorMessage("Tipo de arquivo nao permitido. Use: PDF, JPG, PNG, WEBP, TXT ou ZIP.");
        return;
      }

      if (file.name.includes("/") || file.name.includes("\\")) {
        setErrorMessage("Nome de arquivo invalido.");
        return;
      }

      if (file.size <= 0 || file.size > ATTACHMENT_MAX_SIZE_BYTES) {
        setErrorMessage("Arquivo deve ter entre 1 byte e 20 MB.");
        return;
      }

      const mimeType = resolveAttachmentMimeType(file, extension);
      if (!mimeType) {
        setErrorMessage("Nao foi possivel validar o tipo do arquivo.");
        return;
      }

      const storagePath = `${profile.couple_id}/${editingTripId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("trip-attachments")
        .upload(storagePath, file, {
          upsert: false,
          cacheControl: "3600",
          contentType: mimeType,
        });
      if (uploadError) throw uploadError;

      const referenceIndexValue = attachmentReferenceIndex ? Number(attachmentReferenceIndex) : null;
      const payload = {
        trip_id: editingTripId,
        destination_index:
          attachmentDestinationIndex === "general" ? null : Number(attachmentDestinationIndex),
        scope_type: attachmentScopeType,
        reference_index:
          Number.isFinite(referenceIndexValue as number) && (referenceIndexValue as number) > 0
            ? referenceIndexValue
            : null,
        file_name: file.name,
        file_path: storagePath,
        mime_type: mimeType,
        size_bytes: file.size,
        notes: attachmentNotes.trim() || null,
      };

      const { error: insertError } = await supabase.from("trip_attachments").insert(payload);
      if (insertError) {
        await supabase.storage.from("trip-attachments").remove([storagePath]);
        throw insertError;
      }

      setAttachmentReferenceIndex("");
      setAttachmentNotes("");
      await fetchTrips();
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.CREATE, "trip_attachments", user);
      setErrorMessage(message);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (trip: TripRecord, attachment: TripAttachment) => {
    if (!user || !editingTripId) return;
    if (!window.confirm("Deseja remover este anexo?")) return;

    try {
      setErrorMessage(null);
      const { error: deleteRowError } = await supabase
        .from("trip_attachments")
        .delete()
        .eq("trip_id", trip.id)
        .eq("file_path", attachment.file_path);
      if (deleteRowError) throw deleteRowError;

      const { error: deleteFileError } = await supabase.storage
        .from("trip-attachments")
        .remove([attachment.file_path]);
      if (deleteFileError) {
        console.warn("Attachment file remove warning:", deleteFileError.message);
      }

      await fetchTrips();
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.DELETE, "trip_attachments", user);
      setErrorMessage(message);
    }
  };

  const handleOpenAttachment = async (attachment: TripAttachment) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.storage
        .from("trip-attachments")
        .createSignedUrl(attachment.file_path, 60 * 30);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = handleDatabaseError(error, OperationType.GET, "trip_attachments", user);
      setErrorMessage(message);
    }
  };

  const getAuthorLabel = (authorId?: string | null) => {
    if (!authorId) return "autor desconhecido";
    if (authorId === user?.id) return "voce";
    return memberDirectory[authorId] ?? "parceiro";
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
      const destinations = trip.normalized_stops ?? normalizeDestinations(trip.destinations, trip.destination);
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
    const destinations =
      activeTripForMap.normalized_stops ??
      normalizeDestinations(activeTripForMap.destinations, activeTripForMap.destination);
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

  const computedTripRange = useMemo(
    () => getDestinationDateRange(form.destinations, form.start_date, form.end_date),
    [form.destinations, form.start_date, form.end_date],
  );
  const editingTripRecord = useMemo(
    () => (editingTripId ? trips.find((trip) => trip.id === editingTripId) ?? null : null),
    [editingTripId, trips],
  );

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
                <div className="space-y-3">
                  {form.destinations.map((destination, index) => (
                    <div key={`destination-${index}`} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
                          Parada {index + 1}
                        </span>
                        {form.destinations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDestination(index)}
                            aria-label="Remover destino"
                            className="min-h-11 px-3 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        required={index === 0}
                        placeholder={`Destino ${index + 1} (ex: La Paz)`}
                        className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        value={destination.name}
                        onChange={(e) => updateDestination(index, "name", e.target.value)}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 block font-bold">
                            Chegada
                          </label>
                          <input
                            type="date"
                            value={destination.arrival_date}
                            onChange={(e) => updateDestination(index, "arrival_date", e.target.value)}
                            className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 block font-bold">
                            Hora chegada
                          </label>
                          <input
                            type="time"
                            value={destination.arrival_time}
                            onChange={(e) => updateDestination(index, "arrival_time", e.target.value)}
                            className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 block font-bold">
                            Saida
                          </label>
                          <input
                            type="date"
                            value={destination.departure_date}
                            onChange={(e) => updateDestination(index, "departure_date", e.target.value)}
                            className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 block font-bold">
                            Hora saida
                          </label>
                          <input
                            type="time"
                            value={destination.departure_time}
                            onChange={(e) => updateDestination(index, "departure_time", e.target.value)}
                            className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-rose-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={destination.notes}
                        onChange={(e) => updateDestination(index, "notes", e.target.value)}
                        placeholder="Observacao da parada (ex: onibus para Uyuni sai as 21h)"
                        className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-rose-500/50 transition-colors text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
                <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 px-4 py-3">
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">
                    Periodo total calculado
                  </label>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {computedTripRange.start_date && computedTripRange.end_date
                      ? `${formatDateLabel(computedTripRange.start_date)} - ${formatDateLabel(computedTripRange.end_date)}`
                      : "Preencha as datas de chegada ou saida nas paradas para calcular o periodo."}
                  </p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Orcamento casal</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={formatCurrencyInput(form.couple_budget)}
                    onChange={(e) => setForm({ ...form, couple_budget: parseCurrencyInput(e.target.value) })}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">
                    Orcamento individual (por pessoa)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={formatCurrencyInput(form.individual_budget)}
                    onChange={(e) => setForm({ ...form, individual_budget: parseCurrencyInput(e.target.value) })}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 mb-1 block font-bold">Orcamento total calculado</label>
                  <input
                    type="text"
                    value={formatCurrencyValue(calculateTotalBudget(Number(form.couple_budget) || 0, Number(form.individual_budget) || 0))}
                    readOnly
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-amber-500/50 transition-colors text-slate-900 dark:text-slate-100"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 block font-bold">
                      Links da viagem
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Classifique hospedagem, onibus, tours, passagens e documentos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addLink}
                    className="min-h-11 px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-medium"
                  >
                    Adicionar link
                  </button>
                </div>
                <div className="space-y-3">
                  {form.links.length === 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-3 border border-slate-200 dark:border-white/10">
                      Nenhum link cadastrado. Ex: hotel em La Paz, empresa de onibus para Uyuni ou passeio no Salar.
                    </div>
                  )}
                  {form.links.map((link, index) => (
                    <div key={`trip-link-${index}`} className="grid grid-cols-1 lg:grid-cols-[180px_160px_1fr_1fr_auto] gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
                      <select
                        value={link.destination_index}
                        onChange={(e) => updateLink(index, "destination_index", e.target.value)}
                        className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-blue-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        aria-label="Parada vinculada ao link"
                      >
                        <option value="general">Geral da viagem</option>
                        {form.destinations.map((destination, destinationIndex) => (
                          <option key={`link-destination-${destinationIndex}`} value={String(destinationIndex)}>
                            {getDestinationOptionLabel(form.destinations, String(destinationIndex))}
                          </option>
                        ))}
                      </select>
                      <select
                        value={link.category}
                        onChange={(e) => updateLink(index, "category", e.target.value)}
                        className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-blue-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                      >
                        {LINK_CATEGORIES.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={link.title}
                        onChange={(e) => updateLink(index, "title", e.target.value)}
                        placeholder="Nome (ex: Hotel Sagarnaga)"
                        className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-blue-500/50 transition-colors text-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateLink(index, "url", e.target.value)}
                        placeholder="https://..."
                        className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-blue-500/50 transition-colors text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(index)}
                        aria-label="Remover link"
                        className="min-h-11 px-3 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        value={link.notes}
                        onChange={(e) => updateLink(index, "notes", e.target.value)}
                        placeholder="Observacao opcional (ex: comparar preco, horarios, bagagem...)"
                        className="lg:col-span-5 min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-blue-500/50 transition-colors text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  ))}
                </div>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 block font-bold">
                      Roteiro detalhado
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Monte blocos por data e horario, inclusive chegada tarde, manha livre e deslocamentos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addItineraryItem}
                    className="min-h-11 px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium"
                  >
                    Adicionar roteiro
                  </button>
                </div>
                <div className="space-y-3">
                  {form.itinerary.length === 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-3 border border-slate-200 dark:border-white/10">
                      Sem roteiro detalhado ainda. Ex: dia 18 em La Paz, dia 19 ate 21h antes do onibus para Uyuni.
                    </div>
                  )}
                  {form.itinerary.map((item, index) => (
                    <div key={`itinerary-${index}`} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[180px_1fr_1fr_1fr_1fr] gap-2">
                        <select
                          value={item.destination_index}
                          onChange={(e) => updateItineraryItem(index, "destination_index", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                          aria-label="Parada vinculada ao roteiro"
                        >
                          <option value="general">Geral da viagem</option>
                          {form.destinations.map((destination, destinationIndex) => (
                            <option key={`itinerary-destination-${destinationIndex}`} value={String(destinationIndex)}>
                              {getDestinationOptionLabel(form.destinations, String(destinationIndex))}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => updateItineraryItem(index, "date", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="time"
                          value={item.start_time}
                          onChange={(e) => updateItineraryItem(index, "start_time", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="time"
                          value={item.end_time}
                          onChange={(e) => updateItineraryItem(index, "end_time", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        />
                        <select
                          value={item.category}
                          onChange={(e) => updateItineraryItem(index, "category", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        >
                          {ITINERARY_CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItineraryItem(index, "title", e.target.value)}
                          placeholder="Atividade (ex: city tour em La Paz)"
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-emerald-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          value={item.location}
                          onChange={(e) => updateItineraryItem(index, "location", e.target.value)}
                          placeholder="Local (ex: La Paz, terminal de onibus)"
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-emerald-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeItineraryItem(index)}
                          aria-label="Remover item do roteiro"
                          className="min-h-11 px-3 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={item.notes}
                        onChange={(e) => updateItineraryItem(index, "notes", e.target.value)}
                        placeholder="Detalhes: horario de chegada, reserva, custo, plano B..."
                        className="w-full h-20 resize-none bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 block font-bold">
                      Gastos reais
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Registre gastos efetivos por parada para comparar planejado vs realizado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addExpenseItem}
                    className="min-h-11 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-medium"
                  >
                    Adicionar gasto
                  </button>
                </div>
                <div className="space-y-3">
                  {form.expenses.length === 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-3 border border-slate-200 dark:border-white/10">
                      Nenhum gasto real registrado ainda.
                    </div>
                  )}
                  {form.expenses.map((expense, index) => (
                    <div key={`expense-${index}`} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[180px_140px_140px_1fr_auto] gap-2">
                        <select
                          value={expense.destination_index}
                          onChange={(e) => updateExpenseItem(index, "destination_index", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-amber-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        >
                          <option value="general">Geral da viagem</option>
                          {form.destinations.map((destination, destinationIndex) => (
                            <option key={`expense-destination-${destinationIndex}`} value={String(destinationIndex)}>
                              {getDestinationOptionLabel(form.destinations, String(destinationIndex))}
                            </option>
                          ))}
                        </select>
                        <select
                          value={expense.category}
                          onChange={(e) => updateExpenseItem(index, "category", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-amber-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        >
                          {EXPENSE_CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={expense.paid_by}
                          onChange={(e) => updateExpenseItem(index, "paid_by", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-amber-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        >
                          {PAID_BY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatCurrencyInput(expense.amount)}
                          onChange={(e) => updateExpenseItem(index, "amount", parseCurrencyInput(e.target.value))}
                          placeholder="Valor gasto"
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-amber-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeExpenseItem(index)}
                          className="min-h-11 px-3 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2">
                        <input
                          type="datetime-local"
                          value={expense.spent_at}
                          onChange={(e) => updateExpenseItem(index, "spent_at", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-amber-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          value={expense.notes}
                          onChange={(e) => updateExpenseItem(index, "notes", e.target.value)}
                          placeholder="Observacao do gasto"
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-amber-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 block font-bold">
                      Alertas de horario
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Configure lembretes para saida, check-in, passeio e reservas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addAlertItem}
                    className="min-h-11 px-3 py-2 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-sm font-medium"
                  >
                    Adicionar alerta
                  </button>
                </div>
                <div className="space-y-3">
                  {form.alerts.length === 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-3 border border-slate-200 dark:border-white/10">
                      Nenhum alerta configurado ainda.
                    </div>
                  )}
                  {form.alerts.map((alert, index) => (
                    <div key={`alert-${index}`} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[180px_160px_220px_1fr_auto] gap-2">
                        <select
                          value={alert.destination_index}
                          onChange={(e) => updateAlertItem(index, "destination_index", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-purple-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        >
                          <option value="general">Geral da viagem</option>
                          {form.destinations.map((destination, destinationIndex) => (
                            <option key={`alert-destination-${destinationIndex}`} value={String(destinationIndex)}>
                              {getDestinationOptionLabel(form.destinations, String(destinationIndex))}
                            </option>
                          ))}
                        </select>
                        <select
                          value={alert.alert_type}
                          onChange={(e) => updateAlertItem(index, "alert_type", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-purple-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        >
                          {ALERT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="datetime-local"
                          value={alert.alert_at}
                          onChange={(e) => updateAlertItem(index, "alert_at", e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-purple-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          value={alert.title}
                          onChange={(e) => updateAlertItem(index, "title", e.target.value)}
                          placeholder="Titulo do alerta"
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-purple-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeAlertItem(index)}
                          className="min-h-11 px-3 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={alert.notes}
                        onChange={(e) => updateAlertItem(index, "notes", e.target.value)}
                        placeholder="Observacao do alerta"
                        className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-purple-500/50 transition-colors text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-700 dark:text-slate-400 block font-bold">
                      Anexos da viagem
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Vouchers, reservas e comprovantes por escopo (PDF, JPG, PNG, WEBP, TXT ou ZIP ate 20 MB).
                    </p>
                  </div>
                </div>

                {!editingTripId && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-3 border border-slate-200 dark:border-white/10">
                    Salve a viagem primeiro para habilitar upload de anexos.
                  </div>
                )}

                {editingTripId && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[140px_180px_180px_1fr] gap-2">
                        <select
                          value={attachmentScopeType}
                          onChange={(e) => setAttachmentScopeType(e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        >
                          {ATTACHMENT_SCOPE_OPTIONS.map((scope) => (
                            <option key={scope.value} value={scope.value}>
                              {scope.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={attachmentDestinationIndex}
                          onChange={(e) => setAttachmentDestinationIndex(e.target.value)}
                          className="min-h-11 w-full bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        >
                          <option value="general">Geral da viagem</option>
                          {form.destinations.map((destination, destinationIndex) => (
                            <option key={`attachment-destination-${destinationIndex}`} value={String(destinationIndex)}>
                              {getDestinationOptionLabel(form.destinations, String(destinationIndex))}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={attachmentReferenceIndex}
                          onChange={(e) => setAttachmentReferenceIndex(e.target.value)}
                          placeholder="Indice ref. (link/roteiro)"
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50 transition-colors text-sm text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          value={attachmentNotes}
                          onChange={(e) => setAttachmentNotes(e.target.value)}
                          placeholder="Observacao do anexo"
                          className="min-h-11 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-cyan-500/50 transition-colors text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <label className="inline-flex items-center justify-center min-h-11 px-4 py-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-sm font-medium cursor-pointer">
                        {uploadingAttachment ? "Enviando..." : "Selecionar arquivo"}
                        <input
                          type="file"
                          className="hidden"
                          disabled={uploadingAttachment}
                          onChange={handleUploadAttachment}
                        />
                      </label>
                    </div>
                    <div className="space-y-2">
                      {(editingTripRecord?.normalized_attachments ?? []).length === 0 && (
                        <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-3 border border-slate-200 dark:border-white/10">
                          Sem anexos para esta viagem.
                        </div>
                      )}
                      {(editingTripRecord?.normalized_attachments ?? []).map((attachment, index) => (
                        <div key={`attachment-${index}`} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{attachment.file_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {attachment.scope_type} · {attachment.destination_index === "general" ? "geral" : `parada ${Number(attachment.destination_index) + 1}`}
                              {attachment.reference_index ? ` · ref ${attachment.reference_index}` : ""}
                            </p>
                            {attachment.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{attachment.notes}</p>}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenAttachment(attachment)}
                              className="text-xs px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingTripRecord) handleDeleteAttachment(editingTripRecord, attachment);
                              }}
                              className="text-xs px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              const destinations = (trip.normalized_stops ?? normalizeDestinations(trip.destinations, trip.destination)).filter(
                (item) => item.name,
              );
              const checklist = normalizeChecklist(trip.checklist);
              const links = trip.normalized_links ?? normalizeLinks(trip.links);
              const normalizedNotes = trip.normalized_notes ?? normalizeTripNotes(trip.notes).notes;
              const itinerary = [...(trip.normalized_itinerary ?? normalizeTripNotes(trip.notes).itinerary)].sort((a, b) =>
                `${a.date || "9999-12-31"} ${a.start_time || "99:99"}`.localeCompare(`${b.date || "9999-12-31"} ${b.start_time || "99:99"}`),
              );
              const expenses = trip.normalized_expenses ?? [];
              const alerts = trip.normalized_alerts ?? [];
              const attachments = trip.normalized_attachments ?? [];
              const generalLinks = getGeneralItems(links);
              const generalItinerary = getGeneralItems(itinerary);
              const totalSpent = expenses.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
              const pendingAlerts = alerts.filter((item) => !item.dismissed_at).length;
              const coupleBudget = Number(trip.couple_budget) || 0;
              const individualBudget = Number(trip.individual_budget) || 0;
              const calculatedTotalBudget =
                coupleBudget > 0 || individualBudget > 0
                  ? calculateTotalBudget(coupleBudget, individualBudget)
                  : Number(trip.estimated_budget) || 0;
              const hasStopDetails = destinations.some(
                (destination, index) =>
                  destination.arrival_date ||
                  destination.departure_date ||
                  destination.notes ||
                  getItemsForDestination(links, index).length > 0 ||
                  getItemsForDestination(itinerary, index).length > 0,
              );
              const doneChecklist = checklist.filter((item) => item.done).length;

              return (
                <motion.div
                  variants={childVariants}
                  key={trip.id}
                  className="glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all group relative overflow-hidden"
                >
                  <h4 className="text-xl font-serif mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                    <MapPin className="w-5 h-5 text-rose-500" />
                    {destinations.map((destination) => getDestinationDisplayName(destination.name)).join(" -> ")}
                  </h4>

                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      {new Date(`${trip.start_date}T00:00:00`).toLocaleDateString("pt-BR")} -{" "}
                      {new Date(`${trip.end_date}T00:00:00`).toLocaleDateString("pt-BR")}
                    </div>

                    {hasStopDetails && (
                      <div className="pt-3 border-t border-slate-200/50 dark:border-white/5 mt-3">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium mb-3">
                          <Route className="w-4 h-4 text-rose-500 shrink-0" />
                          Paradas e deslocamentos
                        </div>
                        <div className="space-y-2">
                          {destinations.map((destination, index) => {
                            const stopLinks = getItemsForDestination(links, index);
                            const stopItinerary = getItemsForDestination(itinerary, index);

                            return (
                              <div key={`${trip.id}-destination-${index}`} className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <p className="font-medium text-slate-800 dark:text-slate-100">{getDestinationDisplayName(destination.name)}</p>
                                  <span className="text-[10px] uppercase tracking-widest text-rose-600 dark:text-rose-400">
                                    Parada {index + 1}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs text-slate-600 dark:text-slate-300">
                                  <span>Chegada: {formatDateTimeLabel(destination.arrival_date, destination.arrival_time)}</span>
                                  <span>Saida: {formatDateTimeLabel(destination.departure_date, destination.departure_time)}</span>
                                </div>
                                {destination.notes && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{destination.notes}</p>}

                                {stopLinks.length > 0 && (
                                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {stopLinks.map((link, linkIndex) => (
                                      <a
                                        key={`${trip.id}-destination-${index}-link-${linkIndex}`}
                                        href={normalizeExternalUrl(link.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-3 py-2 text-blue-600 dark:text-blue-300 hover:border-blue-500/40 transition-colors"
                                      >
                                        <span className="flex items-center justify-between gap-2">
                                          <span className="text-[10px] uppercase tracking-widest text-blue-500">
                                            {getCategoryLabel(LINK_CATEGORIES, link.category)}
                                          </span>
                                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                        </span>
                                        <span className="block font-medium break-words mt-1">{link.title || link.url}</span>
                                        {link.notes && <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">{link.notes}</span>}
                                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                          adicionado por {getAuthorLabel(link.created_by)}
                                        </span>
                                      </a>
                                    ))}
                                  </div>
                                )}

                                {stopItinerary.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    {stopItinerary.map((item, itineraryIndex) => (
                                      <div
                                        key={`${trip.id}-destination-${index}-itinerary-${itineraryIndex}`}
                                        className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                          <div>
                                            <span className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                              {item.date ? formatDateLabel(item.date) : "Sem data"} · {getCategoryLabel(ITINERARY_CATEGORIES, item.category)}
                                            </span>
                                            <p className="font-medium text-slate-800 dark:text-slate-100 mt-1">{item.title || "Atividade sem titulo"}</p>
                                          </div>
                                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatTimeRange(item.start_time, item.end_time)}
                                          </span>
                                        </div>
                                        {item.location && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{item.location}</p>}
                                        {item.notes && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{item.notes}</p>}
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                                          adicionado por {getAuthorLabel(item.created_by)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(coupleBudget > 0 || individualBudget > 0 || Number(trip.estimated_budget) > 0) && (
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        Orcamento total: <strong className="text-slate-800 dark:text-white">{formatCurrencyValue(calculatedTotalBudget)}</strong>
                      </div>
                    )}

                    {coupleBudget > 0 && (
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        Orcamento casal: <strong>{formatCurrencyValue(coupleBudget)}</strong>
                      </div>
                    )}

                    {individualBudget > 0 && (
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-teal-500" />
                        Orcamento individual (por pessoa): <strong>{formatCurrencyValue(individualBudget)}</strong>
                      </div>
                    )}

                    {expenses.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-orange-500" />
                        Gasto real total: <strong>{formatCurrencyValue(totalSpent)}</strong>
                      </div>
                    )}

                    {alerts.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-violet-500" />
                        Alertas: <strong>{pendingAlerts} pendentes</strong>
                      </div>
                    )}

                    {attachments.length > 0 && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-cyan-500" />
                        Anexos: <strong>{attachments.length}</strong>
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

                    {generalLinks.length > 0 && (
                      <div className="pt-3 border-t border-slate-200/50 dark:border-white/5 mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                          <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />
                          Links gerais ({generalLinks.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {generalLinks.map((link, index) => (
                            <a
                              key={`${trip.id}-link-${index}`}
                              href={normalizeExternalUrl(link.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-3 py-2 text-blue-600 dark:text-blue-300 hover:border-blue-500/40 transition-colors"
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-blue-500">
                                  {getCategoryLabel(LINK_CATEGORIES, link.category)}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </span>
                              <span className="block font-medium break-words mt-1">{link.title || link.url}</span>
                              {link.notes && <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">{link.notes}</span>}
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                adicionado por {getAuthorLabel(link.created_by)}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {generalItinerary.length > 0 && (
                      <div className="pt-3 border-t border-slate-200/50 dark:border-white/5 mt-3">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium mb-3">
                          <Route className="w-4 h-4 text-emerald-500 shrink-0" />
                          Roteiro geral
                        </div>
                        <div className="space-y-2">
                          {generalItinerary.map((item, index) => (
                            <div
                              key={`${trip.id}-itinerary-${index}`}
                              className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div>
                                  <span className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                    {item.date ? formatDateLabel(item.date) : "Sem data"} ·{" "}
                                    {getCategoryLabel(ITINERARY_CATEGORIES, item.category)}
                                  </span>
                                  <p className="font-medium text-slate-800 dark:text-slate-100 mt-1">{item.title || "Atividade sem titulo"}</p>
                                </div>
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatTimeRange(item.start_time, item.end_time)}
                                </span>
                              </div>
                              {item.location && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{item.location}</p>}
                              {item.notes && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{item.notes}</p>}
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                                adicionado por {getAuthorLabel(item.created_by)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {normalizedNotes && (
                      <div className="pt-3 border-t border-slate-200/50 dark:border-white/5 mt-3">
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{normalizedNotes}</p>
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
