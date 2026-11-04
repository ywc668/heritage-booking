"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlotPicker } from "@/components/SlotPicker";
import { Alert } from "@/components/Alert";
import { adminCreateAppointment } from "@/lib/actions/admin";

type Provider = { id: string; name: string; slotMinutes: number };

export function NewAppointmentForm({ providers, defaultEmail }: { providers: Provider[]; defaultEmail: string }) {
  const router = useRouter();
  const [providerId, setProviderId] = useState(providers[0].id);
  const [slot, setSlot] = useState<{ startsAt: string } | null>(null);
  const [form, setForm] = useState({ email: defaultEmail, name: "", phone: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="card grid md:grid-cols-2 gap-3">
        <div><label className="label">Customer email *</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><label className="label">Optometrist</label>
          <select className="input" value={providerId} onChange={(e) => { setProviderId(e.target.value); setSlot(null); }}>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.slotMinutes} min)</option>)}
          </select></div>
        <div className="md:col-span-2"><label className="label">Notes</label><input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <div className="card">
        <SlotPicker providerId={providerId} value={slot?.startsAt ?? null} onChange={setSlot} admin />
      </div>
      {error && <Alert>{error}</Alert>}
      <button
        className="btn-primary"
        disabled={!slot || !form.email || pending}
        onClick={() =>
          slot &&
          start(async () => {
            const res = await adminCreateAppointment({ providerId, startsAt: slot.startsAt, ...form });
            if (res.ok) router.push(`/admin/appointments/${res.id}`);
            else setError(res.error);
          })
        }
      >
        {pending ? "Saving…" : "Create appointment"}
      </button>
    </div>
  );
}
