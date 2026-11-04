"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlotPicker } from "@/components/SlotPicker";
import { Alert } from "@/components/Alert";
import { rescheduleAppointment } from "@/lib/actions/booking";

export function RescheduleFlow({ id, providerId }: { id: string; providerId: string }) {
  const router = useRouter();
  const [slot, setSlot] = useState<{ startsAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="card">
        <SlotPicker providerId={providerId} value={slot?.startsAt ?? null} onChange={setSlot} ignoreAppointmentId={id} />
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <button
          className="btn-primary"
          disabled={!slot || pending}
          onClick={() =>
            slot &&
            start(async () => {
              const res = await rescheduleAppointment(id, slot.startsAt);
              if (res.ok) router.push("/appointments?rescheduled=1");
              else setError(res.error);
            })
          }
        >
          {pending ? "Saving…" : "Confirm new time"}
        </button>
        <Link href="/appointments" className="btn-secondary">Back</Link>
      </div>
    </div>
  );
}
