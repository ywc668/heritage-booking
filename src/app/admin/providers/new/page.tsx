import { ProviderForm } from "@/components/ProviderForm";
import { createProvider } from "@/lib/actions/admin";

export default function NewProvider() {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Add optometrist</h1>
      <p className="text-sm text-muted">A default schedule of Monday–Friday 09:00–18:00 and Saturday 09:00–17:00 (closed Sunday) is created; adjust it on the next screen.</p>
      <ProviderForm action={createProvider} initial={{ name: "", title: "Optometrist", email: "", slotMinutes: 20, bufferMinutes: 0, active: true }} submitLabel="Create" />
    </div>
  );
}
