import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top navigation bar */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold">
          🛡️ CyberAware <span className="text-cyan-400">AI</span>
        </span>
        <Link
          href="/training"
          className="text-sm text-slate-300 hover:text-white"
        >
          Training
        </Link>
      </nav>

      {/* Hero section: the first thing visitors see */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="mb-4 inline-block rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-1 text-sm text-cyan-300">
          Adaptive cybersecurity training
        </p>

        <h1 className="text-5xl font-extrabold leading-tight sm:text-6xl">
          Would YOU fall for the attack?
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
          Practice against realistic phishing, scam and social-engineering
          scenarios. Our AI studies your decisions, finds your weak spots, and
          trains you on exactly what you struggle with.
        </p>

        <Link
          href="/training"
          className="mt-10 inline-block rounded-lg bg-cyan-500 px-8 py-4 text-lg font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Start Training
        </Link>
      </section>

      {/* Three attack categories */}
      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-3xl">🎣</div>
          <h2 className="mt-3 text-lg font-semibold">Phishing</h2>
          <p className="mt-2 text-sm text-slate-400">
            Fake logins, fake banks and suspicious links.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-3xl">🎭</div>
          <h2 className="mt-3 text-lg font-semibold">Social Engineering</h2>
          <p className="mt-2 text-sm text-slate-400">
            Fake IT support, fake bosses, urgency and pressure.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-3xl">💸</div>
          <h2 className="mt-3 text-lg font-semibold">Scams</h2>
          <p className="mt-2 text-sm text-slate-400">
            Fake deliveries, job offers and payment requests.
          </p>
        </div>
      </section>
    </main>
  );
}