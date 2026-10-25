"use client";

import { useState } from "react";
import Link from "next/link";
import { scenarios as practiceScenarios } from "../data/scenarios";
import type { Scenario, Weakness } from "../data/scenarios";
import type { Evaluation } from "../lib/evaluation";
import {
  createInitialState,
  updateState,
  chooseNextFocus,
} from "../lib/adaptive";
import type { UserState, Focus, AnswerRecord } from "../lib/adaptive";
import Results from "./Results";

type ScenarioData = Omit<Scenario, "id">;

const TOTAL = 5;

const resultStyles = {
  safe: {
    label: "SAFE",
    badge: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
    bar: "bg-emerald-500",
  },
  risky: {
    label: "RISKY",
    badge: "border-amber-500/40 bg-amber-500/20 text-amber-300",
    bar: "bg-amber-500",
  },
  dangerous: {
    label: "DANGEROUS",
    badge: "border-red-500/40 bg-red-500/20 text-red-300",
    bar: "bg-red-500",
  },
};

const categoryNames: Record<string, string> = {
  phishing: "Phishing",
  "social-engineering": "Social Engineering",
  scam: "Scam Detection",
};

function Navbar({ showBack }: { showBack: boolean }) {
  return (
    <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
      <Link href="/" className="text-xl font-bold">
        🛡️ CyberAware <span className="text-cyan-400">AI</span>
      </Link>
      {showBack && (
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          ← Back to home
        </Link>
      )}
    </nav>
  );
}

// Four bars showing how weak the user is in each area right now
function WeaknessTracker({ state }: { state: UserState }) {
  const keys = Object.keys(state.weaknessLevels) as Weakness[];
  return (
    <div>
      {keys.map((w) => (
        <div key={w} className="mt-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{w.replace("-", " ")}</span>
            <span>{state.weaknessLevels[w]}</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-red-500 transition-all"
              style={{ width: state.weaknessLevels[w] + "%" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TrainingPage() {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingPractice, setUsingPractice] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);

  // The adaptive engine's memory
  const [userState, setUserState] = useState<UserState>(createInitialState());
  const [focus, setFocus] = useState<Focus | null>(null);
  const [nextFocus, setNextFocus] = useState<Focus | null>(null);
  const [seenAttacks, setSeenAttacks] = useState<string[]>([]);

  // Ask Nemotron (through our API route) for a scenario on this focus
  async function loadScenario(f: Focus, seen: string[]) {
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setEvaluation(null);
    setEvaluating(false);
    setUsingPractice(false);

    try {
      const url =
        "/api/generate-scenario?category=" +
        f.category +
        "&weakness=" +
        f.weakness +
        "&difficulty=" +
        f.difficulty +
        "&previous=" +
        encodeURIComponent(seen.join("|"));
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      const data = await res.json();
      if (!res.ok || !data.scenario) {
        throw new Error(data.error ?? "No scenario returned");
      }
      setScenario(data.scenario);
    } catch {
      setScenario(null);
      setError("Nemotron could not create a scenario right now.");
    } finally {
      setLoading(false);
    }
  }

  // Backup: use one of our built-in practice scenarios
  function usePractice() {
    setScenario(practiceScenarios[round % practiceScenarios.length]);
    setUsingPractice(true);
    setError(null);
    setSelectedId(null);
    setEvaluation(null);
  }

  function startTraining() {
    const fresh = createInitialState();
    const first = chooseNextFocus(fresh);
    setUserState(fresh);
    setFocus(first);
    setNextFocus(null);
    setSeenAttacks([]);
    setStarted(true);
    loadScenario(first, []);
  }

  // The user picked an answer: Nemotron judges it, then the engine learns
  async function handleSelect(optionId: string) {
    if (!scenario) return;
    const option = scenario.options.find((o) => o.id === optionId);
    if (!option) return;

    setSelectedId(optionId);
    setEvaluation(null);
    setEvaluating(true);

    let result: Evaluation | null = null;
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario, selectedOptionId: optionId }),
        signal: AbortSignal.timeout(90000),
      });
      const data = await res.json();
      if (res.ok && data.evaluation) {
        result = data.evaluation;
      }
    } catch {
      result = null; // we fall back to the built-in feedback below
    }

    setEvaluation(result);
    setEvaluating(false);

    // Use AI values if we have them, built-in values if not
    const riskScore = result ? result.riskScore : option.riskScore;
    const detected: Weakness | "none" = result
      ? result.weakness
      : option.result === "safe"
      ? "none"
      : scenario.weakness;

    const record: AnswerRecord = {
      category: scenario.category,
      topic: scenario.weakness,
      detected: detected,
      riskScore: riskScore,
      attackType: scenario.attackType,
    };

    // The adaptive step: update the profile, then choose what comes next
    const updated = updateState(userState, record);
    setUserState(updated);
    setNextFocus(chooseNextFocus(updated));
    setSeenAttacks([...seenAttacks, scenario.attackType]);
    setAnswers((prev) => [...prev, record]);
  }

  function goNext() {
    if (!nextFocus) return;
    setRound(round + 1);
    setFocus(nextFocus);
    loadScenario(nextFocus, seenAttacks);
  }

  function restart() {
    setStarted(false);
    setRound(0);
    setScenario(null);
    setError(null);
    setUsingPractice(false);
    setSelectedId(null);
    setEvaluating(false);
    setEvaluation(null);
    setAnswers([]);
    setFinished(false);
    setUserState(createInitialState());
    setFocus(null);
    setNextFocus(null);
    setSeenAttacks([]);
  }

  // ---------- RESULTS SUMMARY ----------
  if (finished) {
    return <Results answers={answers} onRestart={restart} />;
  }

  // ---------- INTRO SCREEN ----------
  if (!started) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar showBack={true} />
        <section className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="text-4xl font-extrabold">Ready to be tested?</h1>
          <p className="mt-4 text-slate-300">
            You will face {TOTAL} realistic attack scenarios. Each one is
            written and judged by NVIDIA Nemotron, and each next scenario
            adapts to how you did. Every step can take up to a minute.
          </p>
          <button
            onClick={startTraining}
            className="mt-8 rounded-lg bg-cyan-500 px-8 py-4 text-lg font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Begin training
          </button>
        </section>
      </main>
    );
  }

  // ---------- LOADING SCREEN ----------
  if (loading || (!scenario && !error)) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar showBack={false} />
        <section className="mx-auto max-w-2xl px-6 py-24 text-center">
          <p className="text-sm uppercase tracking-wide text-cyan-400">
            Scenario {round + 1} of {TOTAL}
          </p>
          <h1 className="mt-4 text-2xl font-bold">
            Nemotron is writing your next scenario...
          </h1>
          {focus && <p className="mt-3 text-slate-300">{focus.reason}</p>}
          <p className="mt-3 text-slate-400">
            This can take up to a minute. Please do not refresh the page.
          </p>
          <div className="mx-auto mt-8 h-2 w-64 animate-pulse rounded-full bg-cyan-500/50" />
        </section>
      </main>
    );
  }

  // ---------- ERROR SCREEN ----------
  if (error || !scenario) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar showBack={true} />
        <section className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-slate-400">
            {error ?? "No scenario is available."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => focus && loadScenario(focus, seenAttacks)}
              className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Try again
            </button>
            <button
              onClick={usePractice}
              className="rounded-lg border border-slate-700 px-6 py-3 text-slate-200 hover:border-cyan-500"
            >
              Use a practice scenario
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ---------- TRAINING SCREEN ----------
  const selectedOption = scenario.options.find((o) => o.id === selectedId);
  const answered = selectedId !== null;
  const isLast = round === TOTAL - 1;
  const progress = ((round + (answered && !evaluating ? 1 : 0)) / TOTAL) * 100;

  // What to show: the AI evaluation if we have it, built-in feedback if not
  const shownResult = evaluation
    ? evaluation.result
    : selectedOption
    ? selectedOption.result
    : "safe";
  const shownScore = evaluation
    ? evaluation.riskScore
    : selectedOption
    ? selectedOption.riskScore
    : 0;
  const shownExplanation = evaluation
    ? evaluation.explanation
    : selectedOption
    ? selectedOption.feedback
    : "";
  const shownWeakness = evaluation
    ? evaluation.weakness
    : selectedOption && selectedOption.result !== "safe"
    ? scenario.weakness
    : "none";
  const style = resultStyles[shownResult];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar showBack={true} />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between text-sm">
          <p className="uppercase tracking-wide text-cyan-400">
            Scenario {round + 1} of {TOTAL}
          </p>
          <p className="text-slate-400">{Math.round(progress)}% complete</p>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-cyan-500 transition-all"
            style={{ width: progress + "%" }}
          />
        </div>

        {focus && !usingPractice && (
          <p className="mt-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
            Why this scenario: {focus.reason}
          </p>
        )}

        {usingPractice && (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            Using a built-in practice scenario because the AI was unavailable.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
            {categoryNames[scenario.category] ?? scenario.category}
          </span>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
            Difficulty {scenario.difficulty}
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">{scenario.context}</p>
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-5">
            <p className="text-xs text-slate-500">From: {scenario.sender}</p>
            <p className="mt-3 text-lg">{scenario.message}</p>
          </div>
        </div>

        <h2 className="mt-8 text-lg font-semibold">What do you do?</h2>
        <div className="mt-3 flex flex-col gap-3">
          {scenario.options.map((option) => {
            const isSelected = option.id === selectedId;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={answered}
                className={
                  "rounded-lg border px-5 py-4 text-left transition " +
                  (isSelected
                    ? "border-cyan-400 bg-cyan-500/20"
                    : answered
                    ? "border-slate-800 bg-slate-900 opacity-40"
                    : "border-slate-700 bg-slate-900 hover:border-cyan-500")
                }
              >
                {option.text}
              </button>
            );
          })}
        </div>

        {/* While Nemotron is judging the decision */}
        {answered && evaluating && (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
            <p className="font-semibold text-cyan-300">
              Nemotron is analysing your decision...
            </p>
            <p className="mt-2 text-sm text-slate-400">
              This can take up to a minute.
            </p>
            <div className="mx-auto mt-5 h-2 w-48 animate-pulse rounded-full bg-cyan-500/50" />
          </div>
        )}

        {/* The evaluation */}
        {answered && !evaluating && selectedOption && (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <span
                className={
                  "rounded-full border px-4 py-1 text-sm font-bold " +
                  style.badge
                }
              >
                {style.label}
              </span>
              <span className="text-sm text-slate-400">
                Risk score:{" "}
                <span className="font-bold text-white">{shownScore}/100</span>
              </span>
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-slate-800">
              <div
                className={"h-2 rounded-full " + style.bar}
                style={{ width: shownScore + "%" }}
              />
            </div>

            <p className="mt-5 text-slate-200">{shownExplanation}</p>

            {evaluation && evaluation.correctlyNoticed.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-emerald-400">
                  What you noticed
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {evaluation.correctlyNoticed.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            {evaluation && evaluation.missedRedFlags.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-red-400">
                  What you missed
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {evaluation.missedRedFlags.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
              All red flags in this message
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {scenario.redFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>

            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-slate-950 p-4">
                <p className="text-slate-500">Attack type</p>
                <p className="mt-1 font-medium">{scenario.attackType}</p>
              </div>
              <div className="rounded-lg bg-slate-950 p-4">
                <p className="text-slate-500">Detected weakness</p>
                <p className="mt-1 font-medium">
                  {shownWeakness === "none"
                    ? "None. Good decision."
                    : shownWeakness.replace("-", " ")}
                </p>
              </div>
            </div>

            {evaluation && (
              <p className="mt-4 rounded-lg bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
                Practise next: {evaluation.recommendedFocus}
              </p>
            )}

            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-semibold text-slate-300">
                Weakness tracker (updated)
              </p>
              <WeaknessTracker state={userState} />
              {!isLast && nextFocus && (
                <p className="mt-4 text-sm text-cyan-200">
                  Next scenario: {nextFocus.reason} (difficulty{" "}
                  {nextFocus.difficulty})
                </p>
              )}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              {evaluation
                ? "Evaluated by NVIDIA Nemotron on Nebius Token Factory."
                : "AI evaluation unavailable, showing built-in feedback."}
            </p>

            <button
              onClick={isLast ? () => setFinished(true) : goNext}
              className="mt-6 rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              {isLast ? "See my results" : "Next Scenario →"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}