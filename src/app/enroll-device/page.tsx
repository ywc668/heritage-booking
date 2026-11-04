import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { deviceBindingEnabled, isDeviceEnrolled } from "@/lib/device";
import { EnrollForm } from "./EnrollForm";

export const dynamic = "force-dynamic";

export default async function EnrollDevicePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/enroll-device");
  if (session.user.role !== "ADMIN") redirect("/");
  if (!deviceBindingEnabled() || (await isDeviceEnrolled())) redirect("/admin");
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Enrol this device</h1>
      <p className="text-sm text-muted">
        The admin console only opens on enrolled devices. Enter the device key once in this browser; it stays
        enrolled for a year or until the key is rotated.
      </p>
      <EnrollForm />
    </div>
  );
}
