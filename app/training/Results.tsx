"use client";

import Link from "next/link";
import type { Weakness } from "../data/scenarios";
import type { AnswerRecord } from "../lib/adaptive";

const WEAKNESSES: Weakness[] = [
  "urgency",
  "authority",
  "suspicious-links",
  "fake-offers",
];

const categoryNames: Record<string, string> = {
  phishing: "Phishing",
  "social-engineering": "Social Engineering",
  scam: "Scam Detection",
};

function label(w: string): string {
  return w.replace("-", " ");
}

// Turn a risk score into a colour and a word
function riskStyle(risk: number) {
  if (risk <= 30) {
    return {
      text: "SAFE",
      cls: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
    };
  }
  if (risk < 70) {
    return {
      text: "RISKY",
      cls: "border-amber-500/40 bg-amber-500/20 text-amber-300",
    };
  }
  return {
    text: "DANGEROUS",
    cls: "border-red-500/40 bg-red-500/20 text-red-300",
  };
}

export default function Results({
  answers,
  onRestart,
}: {
  answers: AnswerRecord[];
  onRestart: () => void;
}) {
  // Overall score: 100 minus the average risk
  const totalRisk = answers.reduce((sum, a) => sum + a.riskScore, 0);
  const overall = Math.round(100 - totalRisk / answers.length);

  // Score per category
  const categoryRows: { key: string; name: string; score: number }[] = [];
  for (const cat of Object.keys(categoryNames)) {
    const list = answers.filter((a) => a.category === cat);
    if (list.length === 0) continue;
    const avgRisk = list.reduce((s, a) => s + a.riskScore, 0) / list.length;
    categoryRows.push({
      key: cat,
      name: categoryNames[cat],
      score: Math.round(100 - avgRisk),
    });
  }

  // Average risk for each topic that was tested in this session
  const topicRows = WEAKNESSES.map((w) => {
    const list = answers.filter((a) => a.topic === w);
    if (list.length === 0) return { weakness: w, avg: null as number | null, count: 0 };
    const avg = Math.round(
      list.reduce((s, a) => s + a.riskScore, 0) / list.length
    );
    return { weakness: w, avg: avg, count: list.length };
  });
  const tested = topicRows.filter((r) => r.avg !== null) as {
    weakness: Weakness;
    avg: number;
    count: number;
  }[];

  const byRiskHigh = [...tested].sort((a, b) => b.avg - a.avg);
  const byRiskLow = [...tested].sort((a, b) => a.avg - b.avg);

  const primary = byRiskHigh.length > 0 && byRiskHigh[0].avg >= 30 ? byRiskHigh[0] : null;
  const strengthCandidate = byRiskLow.length > 0 ? byRiskLow[0] : null;
  const strength =
    strengthCandidate &&
    strengthCandidate.avg <= 30 &&
    (!primary || strengthCandidate.weakness !== primary.weakness)
      ? strengthCandidate
      : null;

  // A simple recommendation (the next task replaces this with an AI one)
  const weakestCategory = [...categoryRows].sort((a, b) => a.score - b.score)[0];
  const recommendation = primary
    ? "Practise " +
      label(primary.weakness) +
      " scenarios" +
      (weakestCategory ? ", especially in " + weakestCategory.name : "") +
      "."
    : "Great work. Try harder scenarios across all three categories.";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold">
          🛡️ CyberAware <span className="text-cyan-400">AI</span>
        </Link>
      </nav>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm uppercase tracking-wide text-cyan-400">
          Cyber Awareness Profile
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">
          Overall score: {overall}/100
        </h1>

        {/* Category scores */}
        <div className="mt-8 flex flex-col gap-4">
          {categoryRows.map((r) => (
            <div key={r.key}>
              <div className="flex justify-between text-sm">
                <span>{r.name}</span>
                <span className="text-slate-400">{r.score}%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-cyan-500"
                  style={{ width: r.score + "%" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Primary weakness and strength */}
        <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-500">Primary weakness</p>
            <p className="mt-1 font-medium">
              {primary
                ? label(primary.weakness) + " (avg risk " + primary.avg + ")"
                : "No major weakness found"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-500">Strength</p>
            <p className="mt-1 font-medium">
              {strength
                ? label(strength.weakness) + " awareness (avg risk " + strength.avg + ")"
                : "Keep practising to build a strength"}
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="mt-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-sm font-semibold text-cyan-300">Recommendation</p>
          <p className="mt-1 text-slate-200">{recommendation}</p>
        </div>

        {/* Weakness profile for the whole session */}
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm font-semibold text-slate-300">
            Weakness profile (average risk per topic)
          </p>
          {topicRows.map((r) => (
            <div key={r.weakness} className="mt-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{label(r.weakness)}</span>
                <span>
                  {r.avg === null ? "not tested" : r.avg + " risk"}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-red-500"
                  style={{ width: (r.avg ?? 0) + "%" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* The journey: shows how the training adapted */}
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm font-semibold text-slate-300">
            Your training journey
          </p>
          <ol className="mt-3 space-y-3">
            {answers.map((a, i) => {
              const s = riskStyle(a.riskScore);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {i + 1}. {a.attackType}
                    </p>
                    <p className="text-xs text-slate-500">
                      {categoryNames[a.category] ?? a.category} · tested{" "}
                      {label(a.topic)}
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-bold " +
                      s.cls
                    }
                  >
                    {s.text} · {a.riskScore}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <button
          onClick={onRestart}
          className="mt-8 rounded-lg bg-cyan-500 px-8 py-4 text-lg font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Train Again
        </button>
      </section>
    </main>
  );
}