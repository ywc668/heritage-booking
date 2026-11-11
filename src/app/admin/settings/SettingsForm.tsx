"use client";

import { useActionState } from "react";
import { Alert } from "@/components/Alert";
import { updateSettings, type FormState } from "@/lib/actions/admin";

export function SettingsForm({ initial }: { initial: { businessName: string; timezone: string; cancelCutoffHours: number; bookingWindowDays: number; minNoticeMinutes: number } }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateSettings, undefined);
  return (
    <form action={formAction} className="card grid md:grid-cols-2 gap-3">
      <div><label className="label">Business name</label><input name="businessName" className="input" defaultValue={initial.businessName} required /></div>
      <div><label className="label">Timezone (IANA)</label><input name="timezone" className="input" defaultValue={initial.timezone} list="tz" required />
        <datalist id="tz">{["America/Toronto","America/Vancouver","America/Edmonton","America/Winnipeg","America/Halifax","America/New_York","America/Los_Angeles","Europe/London","Asia/Singapore","Asia/Hong_Kong","Asia/Shanghai"].map((t) => <option key={t} value={t} />)}</datalist></div>
      <div><label className="label">Customers may reschedule/cancel up to (hours before)</label><input name="cancelCutoffHours" type="number" min={0} className="input" defaultValue={initial.cancelCutoffHours} /></div>
      <div><label className="label">Customers may book up to (days ahead)</label><input name="bookingWindowDays" type="number" min={1} max={365} className="input" defaultValue={initial.bookingWindowDays} /></div>
      <div><label className="label">Minimum notice for a new booking (minutes)</label><input name="minNoticeMinutes" type="number" min={0} className="input" defaultValue={initial.minNoticeMinutes} /></div>
      {state?.error && <div className="md:col-span-2"><Alert>{state.error}</Alert></div>}
      {state?.success && <div className="md:col-span-2"><Alert kind="success">{state.success}</Alert></div>}
      <div className="md:col-span-2"><button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button></div>
    </form>
  );
}
