import { LoginForm } from "./LoginForm";

// Left-panel image: drop your own smart-lock photo at /public/door.jpg to override;
// falls back to a stock image, then a dark gradient.
const SIDE_IMAGE =
  "linear-gradient(to top, rgba(8,8,15,0.80) 0%, rgba(8,8,15,0.25) 45%, rgba(8,8,15,0.12) 100%), " +
  "url('/door.jpg'), " +
  "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80')";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* LEFT — full-height smart-lock image */}
      <div
        className="relative hidden md:block"
        style={{ backgroundImage: SIDE_IMAGE, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        {/* LazyRabbit brand — top left */}
        <div className="absolute left-8 top-7 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.lazyrabbit.in/rabbit_icon.png"
              alt="LazyRabbit"
              className="h-full w-full object-contain"
            />
          </span>
          <span className="font-display text-lg font-semibold text-white drop-shadow">LazyRabbit</span>
        </div>

        {/* Tagline — bottom left */}
        <div className="absolute bottom-14 left-10 right-10">
          <h2 className="font-display text-5xl font-bold leading-[1.05] text-white drop-shadow-lg">
            Automate
            <br />
            everything.
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85 drop-shadow">
            From lead to done — Yale service handled in just a few clicks.
          </p>
          <div className="mt-6 flex gap-1.5">
            <span className="h-1.5 w-7 rounded-full bg-white" />
            <span className="h-1.5 w-2.5 rounded-full bg-white/40" />
            <span className="h-1.5 w-2.5 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* RIGHT — full-height form */}
      <div className="relative flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        {/* IT Service First tag — top right */}
        <span className="absolute right-7 top-7 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          IT Service First
        </span>

        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-bold text-slate-900">Welcome Admin 👋</h1>
          <p className="mb-8 mt-1.5 text-sm text-slate-500">Sign in to your account</p>

          <LoginForm error={Boolean(sp.error)} />

          <p className="mt-10 text-center text-xs text-slate-400">
            Authorized access only · Powered by{" "}
            <span className="font-medium text-slate-600">LazyRabbit</span>
          </p>
        </div>
      </div>
    </div>
  );
}
