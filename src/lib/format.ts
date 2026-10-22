import type {
  ApplicationStatus,
  Role,
  ShiftStatus,
  VerificationStatus,
} from "@/types";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return capitalize(dateFormatter.format(date).replace(/\./g, ""));
}

export function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return shortDateFormatter.format(date).replace(/\./g, "");
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return timeFormatter.format(date);
}

export function formatShiftRange(start: string, end: string): string {
  return `${formatDate(start)} · ${formatTime(start)} – ${formatTime(end)}`;
}

export function formatCurrency(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Por acordar";
  return currencyFormatter.format(value);
}

export function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return formatShortDate(value);
}

export function roleLabel(role: Role): string {
  return role === "nurse"
    ? "Profesional de enfermería"
    : role === "institution"
      ? "Institución de salud"
      : "Administración NURSELINK";
}

export function verificationLabel(status: VerificationStatus): string {
  return status === "verified"
    ? "Verificado"
    : status === "rejected"
      ? "Rechazado"
      : "Pendiente";
}

export function applicationStatusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    pending: "Pendiente",
    reviewing: "En revisión",
    accepted: "Aceptada",
    rejected: "Rechazada",
    withdrawn: "Retirada",
  };
  return labels[status];
}

export function shiftStatusLabel(status: ShiftStatus): string {
  const labels: Record<ShiftStatus, string> = {
    draft: "Borrador",
    open: "Abierto",
    covered: "Cubierto",
    cancelled: "Cancelado",
  };
  return labels[status];
}

export function professionalTypeLabel(type: string): string {
  return type === "nursing_assistant"
    ? "Auxiliar de enfermería"
    : "Enfermero(a) profesional";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NL";
  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function splitDateTime(iso: string): { date: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function combineDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function isFutureDate(value: string): boolean {
  return new Date(value).getTime() > Date.now();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
