"use client";

import { useActionState } from "react";
import { Alert } from "@/components/Alert";
import { enrollDevice, type FormState } from "@/lib/actions/device";

export function EnrollForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(enrollDevice, undefined);
  return (
    <form action={action} className="card space-y-3">
      <div>
        <label className="label" htmlFor="key">Device key</label>
        <input id="key" name="key" type="password" className="input" required autoComplete="off" />
      </div>
      {state?.error && <Alert>{state.error}</Alert>}
      <button className="btn-primary" disabled={pending}>{pending ? "Checking…" : "Enrol this browser"}</button>
    </form>
  );
}
