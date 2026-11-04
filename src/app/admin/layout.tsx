import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isDeviceEnrolled } from "@/lib/device";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "Today" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/providers", label: "Optometrists" },
  { href: "/admin/users", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");
  if (!(await isDeviceEnrolled())) redirect("/enroll-device");
  return (
    <div className="grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-6">
      <aside className="md:border-r border-border md:pr-4">
        <p className="text-xs uppercase tracking-wider text-muted mb-2">Admin</p>
        <nav className="flex md:flex-col gap-1 flex-wrap">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm hover:bg-card">{l.label}</Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
