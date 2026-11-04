"use client";

import { useActionState } from "react";
import { Alert } from "@/components/Alert";
import { updateWorkingHours, type FormState } from "@/lib/actions/admin";
import { minutesToHHMM, WEEKDAYS } from "@/lib/time";

type Row = { weekday: number; enabled: boolean; startMinutes: number; endMinutes: number };

export function WorkingHoursForm({ providerId, hours }: { providerId: string; hours: Row[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateWorkingHours.bind(null, providerId), undefined);
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday first
  return (
    <form action={formAction} className="card space-y-2">
      {order.map((weekday) => {
        const h = hours[weekday];
        return (
          <div key={weekday} className="grid grid-cols-[7rem_auto_1fr_auto_1fr] items-center gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name={`enabled-${weekday}`} defaultChecked={h.enabled} /> {WEEKDAYS[weekday]}</label>
            <span className="text-muted">from</span>
            <input type="time" name={`start-${weekday}`} className="input" defaultValue={minutesToHHMM(h.startMinutes)} step={300} />
            <span className="text-muted">to</span>
            <input type="time" name={`end-${weekday}`} className="input" defaultValue={minutesToHHMM(h.endMinutes)} step={300} />
          </div>
        );
      })}
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.success && <Alert kind="success">{state.success}</Alert>}
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save working hours"}</button>
    </form>
  );
}
