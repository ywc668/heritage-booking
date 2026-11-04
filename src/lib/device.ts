import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Admin device binding.
 * When ADMIN_DEVICE_SECRET is set, the admin console (pages + server actions) additionally requires a
 * long-lived httpOnly cookie that is only issued to a browser where the secret was entered once
 * (/enroll-device). Rotating the secret invalidates every enrolled device.
 * When the variable is unset (local development) the check is skipped.
 */
export const DEVICE_COOKIE = "heritage_admin_device";

export function deviceBindingEnabled() {
  return Boolean(process.env.ADMIN_DEVICE_SECRET);
}

function expectedCookieValue() {
  return createHmac("sha256", process.env.ADMIN_DEVICE_SECRET ?? "").update("admin-device-v1").digest("hex");
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function isDeviceEnrolled() {
  if (!deviceBindingEnabled()) return true;
  const value = (await cookies()).get(DEVICE_COOKIE)?.value;
  return Boolean(value) && safeEqual(value!, expectedCookieValue());
}

export function enrollmentKeyMatches(key: string) {
  const secret = process.env.ADMIN_DEVICE_SECRET ?? "";
  return secret.length > 0 && safeEqual(key, secret);
}

export async function setDeviceCookie() {
  (await cookies()).set(DEVICE_COOKIE, expectedCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearDeviceCookie() {
  (await cookies()).delete(DEVICE_COOKIE);
}
