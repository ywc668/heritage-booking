import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { setUserRole } from "@/lib/actions/admin";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const me = await auth();
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : undefined,
    include: { _count: { select: { appointments: true } }, accounts: { select: { provider: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers &amp; staff</h1>
      <form className="flex gap-2" method="get">
        <input name="q" className="input max-w-sm" placeholder="Search name / email / phone" defaultValue={q ?? ""} />
        <button className="btn-secondary">Search</button>
      </form>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs text-muted">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Sign-in</th><th className="p-3">Bookings</th><th className="p-3">Role</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">{u.name || "—"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.phone || "—"}</td>
                <td className="p-3 text-xs text-muted">{u.accounts.map((a) => a.provider).join(", ") || (u.passwordHash ? "password" : "—")}</td>
                <td className="p-3"><Link href={`/admin/appointments?q=${encodeURIComponent(u.email ?? "")}&range=all`} className="underline">{u._count.appointments}</Link></td>
                <td className="p-3"><span className={`badge ${u.role === "ADMIN" ? "bg-accent text-accent-contrast" : "bg-gray-100 text-gray-700"}`}>{u.role}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Link href={`/admin/appointments/new?email=${encodeURIComponent(u.email ?? "")}`} className="underline mr-3">Book</Link>
                  {u.id !== me?.user.id && (
                    <form action={setUserRole.bind(null, u.id, u.role === "ADMIN" ? "CUSTOMER" : "ADMIN")} className="inline">
                      <button className="underline">{u.role === "ADMIN" ? "Make customer" : "Make admin"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
