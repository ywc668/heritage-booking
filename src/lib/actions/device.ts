"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { enrollmentKeyMatches, setDeviceCookie } from "@/lib/device";

export type FormState = { error?: string } | undefined;

export async function enrollDevice(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { error: "Only administrators can enrol a device." };
  const key = String(formData.get("key") ?? "").trim();
  // Small fixed delay to blunt brute-force attempts.
  await new Promise((r) => setTimeout(r, 400));
  if (!enrollmentKeyMatches(key)) return { error: "That key is not correct." };
  await setDeviceCookie();
  redirect("/admin");
}
