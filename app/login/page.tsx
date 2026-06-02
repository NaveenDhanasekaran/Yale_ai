import { login } from "./actions";

function RabbitMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 16a3 3 0 0 1 2.24 5" />
      <path d="M18 12h.01" />
      <path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3" />
      <path d="M20 8.54V4a2 2 0 1 0-4 0v3" />
      <path d="M7.612 12.524a3 3 0 1 0-1.6 4.3" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08060f] px-4 py-10">
      {/* ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/20 blur-[140px]" />

      <div className="animate-fadeup relative w-full max-w-3xl overflow-hidden rounded-2xl border border-violet-500/40 bg-[#14101e] shadow-[0_0_70px_-15px_rgba(139,92,246,0.6)] md:min-h-[470px]">
        {/* Purple diagonal panel — desktop */}
        <div className="hidden bg-gradient-to-br from-[#5b21b6] via-[#7c3aed] to-[#9333ea] md:block md:absolute md:inset-y-0 md:right-0 md:w-1/2 md:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]">
          {/* LazyRabbit brand — top right */}
          <div className="absolute right-6 top-5 flex items-center gap-2 text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <RabbitMark className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-semibold tracking-wide">LazyRabbit</span>
          </div>

          {/* Heading */}
          <div className="flex h-full flex-col items-end justify-center pl-[40%] pr-8 text-right">
            <h2 className="font-display text-3xl font-extrabold leading-tight text-white lg:text-4xl">
              IT Service First
            </h2>
            <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-violet-100">
              Admin Management Portal
            </p>
            <p className="mt-3 max-w-[15rem] text-xs leading-relaxed text-violet-200/70">
              Yale Authorized Dealer — secure operations console.
            </p>
          </div>
        </div>

        {/* Form panel — left */}
        <div className="relative z-10 p-8 sm:p-10 md:w-1/2">
          {/* mobile brand header */}
          <div className="mb-7 flex items-center justify-between md:hidden">
            <div>
              <div className="font-display text-lg font-bold text-white">IT Service First</div>
              <div className="text-xs font-medium text-violet-300">Admin Management Portal</div>
            </div>
            <span className="flex items-center gap-1.5 text-white/80">
              <RabbitMark className="h-4 w-4" />
              <span className="text-xs font-semibold">LazyRabbit</span>
            </span>
          </div>

          <h1 className="mb-8 text-center font-display text-2xl font-bold text-white">Login</h1>

          {sp.error && (
            <p className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
              Invalid email or password.
            </p>
          )}

          <form action={login} className="space-y-7">
            <div className="relative">
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="Email"
                className="w-full border-0 border-b border-white/25 bg-transparent px-0 py-2 pr-7 text-sm text-white placeholder-white/45 focus:border-violet-400 focus:outline-none focus:ring-0"
              />
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-white/50">
                <PersonIcon />
              </span>
            </div>

            <div className="relative">
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Password"
                className="w-full border-0 border-b border-white/25 bg-transparent px-0 py-2 pr-7 text-sm text-white placeholder-white/45 focus:border-violet-400 focus:outline-none focus:ring-0"
              />
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-white/50">
                <LockIcon />
              </span>
            </div>

            <button className="w-full rounded-full bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/50 transition-all hover:from-violet-500 hover:to-purple-500">
              Login
            </button>
          </form>

          <p className="mt-7 text-center text-xs text-white/40">
            Authorized access only · Powered by{" "}
            <span className="font-medium text-violet-300">LazyRabbit</span>
          </p>
        </div>
      </div>
    </div>
  );
}
