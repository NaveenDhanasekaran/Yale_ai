import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
            Y
          </div>
          <h1 className="text-xl font-bold text-slate-900">MLV Enterprise</h1>
          <p className="text-sm text-slate-500">Yale Service Portal</p>
        </div>

        <form
          action={login}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-slate-800">Sign in</h2>

          {sp.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Invalid email or password.
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="admin@itservicefirst.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <button className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-700">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
