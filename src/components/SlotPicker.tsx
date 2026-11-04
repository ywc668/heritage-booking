"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = { startsAt: string; endsAt: string };
type Day = { dateStr: string; hasSlots: boolean };

function fmtTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}
function fmtDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" }).format(d),
    day: new Intl.DateTimeFormat("en-AU", { day: "numeric", timeZone: "UTC" }).format(d),
    month: new Intl.DateTimeFormat("en-AU", { month: "short", timeZone: "UTC" }).format(d),
  };
}
function shiftDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Day strip + time grid. Fetches availability from /api/availability.
 * `admin` ignores customer booking rules; `ignoreAppointmentId` frees that appointment's slot (reschedule).
 */
export function SlotPicker({
  providerId,
  value,
  onChange,
  admin = false,
  ignoreAppointmentId,
  daysToShow = 14,
}: {
  providerId: string;
  value: string | null;
  onChange: (slot: Slot | null) => void;
  admin?: boolean;
  ignoreAppointmentId?: string;
  daysToShow?: number;
}) {
  const [from, setFrom] = useState<string | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [tz, setTz] = useState<string>("UTC");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  // Loading flags are derived: a request key is "loaded" once its response has been stored.
  const [loadedDaysKey, setLoadedDaysKey] = useState<string | null>(null);
  const [loadedSlotsKey, setLoadedSlotsKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const qsBase = useMemo(() => {
    const p = new URLSearchParams({ providerId });
    if (admin) p.set("admin", "1");
    if (ignoreAppointmentId) p.set("ignore", ignoreAppointmentId);
    return p;
  }, [providerId, admin, ignoreAppointmentId]);

  const daysKey = useMemo(() => {
    const p = new URLSearchParams(qsBase);
    p.set("days", String(daysToShow));
    if (from) p.set("from", from);
    return p.toString();
  }, [qsBase, from, daysToShow]);
  const slotsKey = useMemo(() => {
    if (!selectedDay) return null;
    const p = new URLSearchParams(qsBase);
    p.set("date", selectedDay);
    return p.toString();
  }, [qsBase, selectedDay]);
  const loadingDays = loadedDaysKey !== daysKey;
  const loadingSlots = slotsKey !== null && loadedSlotsKey !== slotsKey;

  // Load the day strip.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/availability?${daysKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setError(null);
        setTz(data.timezone);
        setDays(data.days);
        setFrom((cur) => cur ?? data.days[0]?.dateStr ?? null);
        setSelectedDay((cur) => {
          if (cur && data.days.some((d: Day) => d.dateStr === cur)) return cur;
          return data.days.find((d: Day) => d.hasSlots)?.dateStr ?? data.days[0]?.dateStr ?? null;
        });
      })
      .catch((e) => !cancelled && setError(String(e.message || e)))
      .finally(() => !cancelled && setLoadedDaysKey(daysKey));
    return () => { cancelled = true; };
  }, [daysKey]);

  // Load slots for the selected day.
  useEffect(() => {
    if (!slotsKey) return;
    let cancelled = false;
    fetch(`/api/availability?${slotsKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setSlots(data.slots);
      })
      .catch((e) => !cancelled && setError(String(e.message || e)))
      .finally(() => !cancelled && setLoadedSlotsKey(slotsKey));
    return () => { cancelled = true; };
  }, [slotsKey]);

  const today = days[0]?.dateStr;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn-secondary !px-3"
          disabled={!from || loadingDays || (today !== undefined && from <= today && !admin)}
          onClick={() => from && setFrom(shiftDate(from, -daysToShow))}
        >
          ‹ Earlier
        </button>
        <span className="text-xs text-muted">Times shown in {tz.replace("_", " ")}</span>
        <button type="button" className="btn-secondary !px-3" disabled={!from || loadingDays} onClick={() => from && setFrom(shiftDate(from, daysToShow))}>
          Later ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const f = fmtDay(d.dateStr);
          const selected = d.dateStr === selectedDay;
          return (
            <button
              key={d.dateStr}
              type="button"
              disabled={!d.hasSlots}
              onClick={() => { setSelectedDay(d.dateStr); onChange(null); }}
              className={`rounded-md border px-1 py-2 text-center text-xs leading-tight transition
                ${selected ? "border-accent bg-accent text-accent-contrast" : "border-border bg-card hover:bg-background"}
                ${!d.hasSlots ? "opacity-35 cursor-not-allowed" : ""}`}
            >
              <div>{f.weekday}</div>
              <div className="text-base font-semibold">{f.day}</div>
              <div>{f.month}</div>
            </button>
          );
        })}
        {loadingDays && days.length === 0 && <div className="col-span-7 text-sm text-muted">Loading…</div>}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div>
        {loadingSlots ? (
          <p className="text-sm text-muted">Loading times…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted">No times available on this day.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {slots.map((s) => {
              const selected = s.startsAt === value;
              return (
                <button
                  key={s.startsAt}
                  type="button"
                  onClick={() => onChange(selected ? null : s)}
                  className={`rounded-md border px-2 py-2 text-sm transition ${selected ? "border-accent bg-accent text-accent-contrast" : "border-border bg-card hover:bg-background"}`}
                >
                  {fmtTime(s.startsAt, tz)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
