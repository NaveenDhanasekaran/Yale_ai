import { login } from "./actions";
import { Starfield } from "./Starfield";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060614] px-4">
      {/* Starfield */}
      <Starfield />

      {/* Radial gradient glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.14)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[420px] bg-[radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.10)_0%,transparent_70%)]" />
      {/* Floating orbs */}
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-[120px]" />

      {/* Card column */}
      <div className="animate-fadeup relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-5 h-16 w-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 blur-lg opacity-50" />
            <div className="animate-floaty relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-xl shadow-violet-900/40">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="10" width="16" height="11" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                <circle cx="12" cy="15.5" r="1.4" fill="white" stroke="none" />
                <path d="M12 16.9v1.6" />
              </svg>
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            IT Service First
          </h1>
          <p className="mt-1 text-sm text-slate-400">Yale Service Portal</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Yale Authorized Dealer
          </span>
        </div>

        {/* Glass card */}
        <form
          action={login}
          className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Welcome back</h2>
            <p className="mt-0.5 text-sm text-slate-400">Sign in to your dashboard</p>
          </div>

          {sp.error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Invalid email or password.
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="admin@itservicefirst.com"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <button className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-700/50">
            Sign in
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Secured
          </span>
          <span className="mx-2 text-slate-700">•</span>
          Powered by <span className="text-slate-400">LazyRabbit</span>
        </p>
      </div>
    </div>
  );
}
