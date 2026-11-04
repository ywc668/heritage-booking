import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { deviceBindingEnabled, isDeviceEnrolled } from "@/lib/device";

export async function Nav() {
  const session = await auth();
  const user = session?.user;
  const adminReady = user?.role === "ADMIN" && (!deviceBindingEnabled() || (await isDeviceEnrolled()));
  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-wide text-accent">HERITAGE</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/book" className="hover:underline">Book</Link>
          {user && <Link href="/appointments" className="hover:underline">My appointments</Link>}
          {user?.role === "ADMIN" && <Link href={adminReady ? "/admin" : "/enroll-device"} className="hover:underline font-medium">Admin</Link>}
          {user ? (
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button className="btn-secondary !py-1">Sign out</button>
            </form>
          ) : (
            <Link href="/login" className="btn-primary !py-1">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
