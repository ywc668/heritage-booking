"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAppointment } from "@/lib/actions/booking";

export function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming)
    return <button className="btn-danger" onClick={() => setConfirming(true)}>Cancel</button>;

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-700">{error}</span>}
      <button
        className="btn-danger"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await cancelAppointment(id);
            if (res.ok) router.refresh();
            else setError(res.error);
          })
        }
      >
        {pending ? "Cancelling…" : "Yes, cancel"}
      </button>
      <button className="btn-secondary" onClick={() => setConfirming(false)}>Keep</button>
    </div>
  );
}
