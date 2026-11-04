"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlotPicker } from "@/components/SlotPicker";
import { Alert } from "@/components/Alert";
import { bookAppointment } from "@/lib/actions/booking";

type Provider = { id: string; name: string; title: string; slotMinutes: number };

export function BookingFlow({
  providers,
  signedIn,
  userPhone,
  cancelCutoffHours,
}: {
  providers: Provider[];
  signedIn: boolean;
  userPhone: string;
  cancelCutoffHours: number;
}) {
  const router = useRouter();
  const [providerId, setProviderId] = useState(providers[0].id);
  const [slot, setSlot] = useState<{ startsAt: string; endsAt: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState(userPhone);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const provider = providers.find((p) => p.id === providerId)!;

  function confirm() {
    if (!slot) return;
    setError(null);
    start(async () => {
      const res = await bookAppointment({ providerId, startsAt: slot.startsAt, notes, phone });
      if (res.ok) router.push(`/appointments?booked=${res.id}`);
      else setError(res.error);
    });
  }

  const slotLabel = slot
    ? new Intl.DateTimeFormat("en-AU", { dateStyle: "full", timeStyle: "short" }).format(new Date(slot.startsAt))
    : null;

  return (
    <div className="space-y-6">
      {providers.length > 1 && (
        <section className="card">
          <h2 className="font-medium mb-3">1. Choose your optometrist</h2>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setProviderId(p.id); setSlot(null); }}
                className={p.id === providerId ? "btn-primary" : "btn-secondary"}
              >
                {p.name} <span className="opacity-70 text-xs">· {p.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="font-medium mb-3">{providers.length > 1 ? "2." : "1."} Pick a time ({provider.slotMinutes} min)</h2>
        <SlotPicker providerId={providerId} value={slot?.startsAt ?? null} onChange={setSlot} />
      </section>

      <section className="card space-y-4">
        <h2 className="font-medium">{providers.length > 1 ? "3." : "2."} Confirm</h2>
        {slot ? (
          <p className="text-sm">
            <span className="font-medium">{slotLabel}</span> with {provider.name}
          </p>
        ) : (
          <p className="text-sm text-muted">Select a time above.</p>
        )}
        {!signedIn ? (
          <Alert kind="info">
            Please <Link href="/login?callbackUrl=/book" className="underline font-medium">sign in</Link> with Google, Microsoft or Facebook to confirm your booking.
          </Alert>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="phone">Mobile number (for reminders)</label>
              <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04xx xxx xxx" />
            </div>
            <div>
              <label className="label" htmlFor="notes">Anything we should know? (optional)</label>
              <textarea id="notes" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </div>
            {error && <Alert>{error}</Alert>}
            <button className="btn-primary" disabled={!slot || pending} onClick={confirm}>
              {pending ? "Booking…" : "Confirm booking"}
            </button>
            <p className="text-xs text-muted">You can reschedule or cancel online up to {cancelCutoffHours} hours before your appointment.</p>
          </>
        )}
      </section>
    </div>
  );
}
