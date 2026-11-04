import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn, enabledSocialProviders } from "@/lib/auth";
import { Alert } from "@/components/Alert";

export const dynamic = "force-dynamic";

const social = [
  { id: "google", label: "Continue with Google" },
  { id: "microsoft-entra-id", label: "Continue with Microsoft" },
  { id: "facebook", label: "Continue with Facebook" },
] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/book";
  const session = await auth();
  if (session?.user) redirect(redirectTo);

  const anySocial = Object.values(enabledSocialProviders).some(Boolean);

  async function credentialsLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo,
      });
    } catch (e) {
      if (e instanceof AuthError) redirect(`/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(redirectTo)}`);
      throw e; // NEXT_REDIRECT
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-center">Sign in</h1>
      {error && (
        <Alert>
          {error === "CredentialsSignin" ? "Incorrect email or password." : "Sign-in failed. Please try again."}
        </Alert>
      )}

      <div className="card space-y-3">
        {anySocial ? (
          social.map((p) =>
            enabledSocialProviders[p.id] ? (
              <form
                key={p.id}
                action={async () => {
                  "use server";
                  await signIn(p.id, { redirectTo });
                }}
              >
                <button className="btn-secondary w-full">{p.label}</button>
              </form>
            ) : null,
          )
        ) : (
          <Alert kind="info">
            Social sign-in buttons appear once Google / Microsoft / Facebook credentials are set in <code>.env</code>.
          </Alert>
        )}
      </div>

      <details className="card" open={!anySocial}>
        <summary className="cursor-pointer text-sm font-medium">Staff sign-in (email &amp; password)</summary>
        <form action={credentialsLogin} className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="btn-primary w-full">Sign in</button>
        </form>
      </details>
    </div>
  );
}
