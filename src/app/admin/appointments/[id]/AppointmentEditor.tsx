"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlotPicker } from "@/components/SlotPicker";
import { Alert } from "@/components/Alert";
import { adminRescheduleAppointment, adminUpdateAppointment, type FormState } from "@/lib/actions/admin";
import type { AppointmentStatus } from "@prisma/client";

type Provider = { id: string; name: string; slotMinutes: number };

export function AppointmentEditor({
  appt,
  providers,
}: {
  appt: { id: string; providerId: string; status: AppointmentStatus; notes: string; adminNotes: string };
  providers: Provider[];
}) {
  const router = useRouter();
  const [state, formAction, formPending] = useActionState<FormState, FormData>(adminUpdateAppointment.bind(null, appt.id), undefined);
  const [showReschedule, setShowReschedule] = useState(false);
  const [providerId, setProviderId] = useState(appt.providerId);
  const [slot, setSlot] = useState<{ startsAt: string } | null>(null);
  const [resError, setResError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <form action={formAction} className="card space-y-3">
        <h2 className="font-medium">Status &amp; notes</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className="label">Status</label>
            <select name="status" className="input" defaultValue={appt.status}>
              {(["BOOKED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select></div>
          <div className="md:col-span-2"><label className="label">Customer note</label><input name="notes" className="input" defaultValue={appt.notes} /></div>
          <div className="md:col-span-3"><label className="label">Internal note (staff only)</label><textarea name="adminNotes" className="input" rows={2} defaultValue={appt.adminNotes} /></div>
        </div>
        {state?.error && <Alert>{state.error}</Alert>}
        {state?.success && <Alert kind="success">{state.success}</Alert>}
        <button className="btn-primary" disabled={formPending}>{formPending ? "Saving…" : "Save"}</button>
      </form>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Move to another time / optometrist</h2>
          <button className="btn-secondary" onClick={() => setShowReschedule((v) => !v)}>{showReschedule ? "Hide" : "Reschedule"}</button>
        </div>
        {showReschedule && (
          <>
            {providers.length > 1 && (
              <div><label className="label">Optometrist</label>
                <select className="input max-w-xs" value={providerId} onChange={(e) => { setProviderId(e.target.value); setSlot(null); }}>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.slotMinutes} min)</option>)}
                </select></div>
            )}
            <SlotPicker providerId={providerId} value={slot?.startsAt ?? null} onChange={setSlot} admin ignoreAppointmentId={appt.id} />
            {resError && <Alert>{resError}</Alert>}
            <button
              className="btn-primary"
              disabled={!slot || pending}
              onClick={() =>
                slot &&
                start(async () => {
                  const res = await adminRescheduleAppointment(appt.id, providerId, slot.startsAt);
                  if (res.ok) { setShowReschedule(false); setSlot(null); router.refresh(); }
                  else setResError(res.error);
                })
              }
            >
              {pending ? "Saving…" : "Confirm new time"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
