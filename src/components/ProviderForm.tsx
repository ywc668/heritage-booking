"use client";

import { useActionState } from "react";
import { Alert } from "@/components/Alert";
import type { FormState } from "@/lib/actions/admin";

type Values = { name: string; title: string; email: string; slotMinutes: number; bufferMinutes: number; active: boolean };

export function ProviderForm({ action, initial, submitLabel }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; initial: Values; submitLabel: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  return (
    <form action={formAction} className="card grid md:grid-cols-2 gap-3">
      <div><label className="label">Name *</label><input name="name" className="input" defaultValue={initial.name} required /></div>
      <div><label className="label">Title</label><input name="title" className="input" defaultValue={initial.title} /></div>
      <div><label className="label">Email (optional)</label><input name="email" type="email" className="input" defaultValue={initial.email} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Session length (min)</label><input name="slotMinutes" type="number" min={5} max={240} step={5} className="input" defaultValue={initial.slotMinutes} /></div>
        <div><label className="label">Gap between (min)</label><input name="bufferMinutes" type="number" min={0} max={120} step={5} className="input" defaultValue={initial.bufferMinutes} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="active" defaultChecked={initial.active} /> Accepting bookings</label>
      {state?.error && <div className="md:col-span-2"><Alert>{state.error}</Alert></div>}
      {state?.success && <div className="md:col-span-2"><Alert kind="success">{state.success}</Alert></div>}
      <div className="md:col-span-2"><button className="btn-primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button></div>
    </form>
  );
}
