"use client";

import { useActionState } from "react";
import { Alert } from "@/components/Alert";
import type { FormState } from "@/lib/actions/admin";

export function TimeOffForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  return (
    <form action={formAction} className="card grid md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
      <div><label className="label">From</label><input type="datetime-local" name="start" className="input" required /></div>
      <div><label className="label">To</label><input type="datetime-local" name="end" className="input" required /></div>
      <div><label className="label">Reason</label><input name="reason" className="input" placeholder="Holiday" /></div>
      <button className="btn-secondary" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
      {state?.error && <div className="md:col-span-4"><Alert>{state.error}</Alert></div>}
      {state?.success && <div className="md:col-span-4"><Alert kind="success">{state.success}</Alert></div>}
    </form>
  );
}
