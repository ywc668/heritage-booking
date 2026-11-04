import Link from "next/link";
import { prisma } from "@/lib/db";
import { minutesToHHMM } from "@/lib/time";

export default async function ProvidersPage() {
  const providers = await prisma.provider.findMany({ include: { workingHours: true }, orderBy: [{ active: "desc" }, { sortOrder: "asc" }] });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Optometrists</h1>
        <Link href="/admin/providers/new" className="btn-primary">+ Add optometrist</Link>
      </div>
      <div className="space-y-3">
        {providers.map((p) => {
          const days = p.workingHours.filter((h) => h.enabled).sort((a, b) => a.weekday - b.weekday);
          return (
            <Link key={p.id} href={`/admin/providers/${p.id}`} className="card flex items-center justify-between hover:bg-background block">
              <div>
                <div className="font-medium">{p.name} <span className="text-muted text-sm">· {p.title}</span>{!p.active && <span className="badge bg-gray-200 text-gray-700 ml-2">inactive</span>}</div>
                <div className="text-sm text-muted">
                  {p.slotMinutes} min sessions{p.bufferMinutes ? `, ${p.bufferMinutes} min buffer` : ""} · {days.length} day{days.length === 1 ? "" : "s"}/week
                  {days.length > 0 && ` · ${minutesToHHMM(Math.min(...days.map((d) => d.startMinutes)))}–${minutesToHHMM(Math.max(...days.map((d) => d.endMinutes)))}`}
                </div>
              </div>
              <span className="text-sm underline">Edit</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
