import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm initial={{ businessName: s.businessName, timezone: s.timezone, cancelCutoffHours: s.cancelCutoffHours, bookingWindowDays: s.bookingWindowDays, minNoticeMinutes: s.minNoticeMinutes }} />
    </div>
  );
}
