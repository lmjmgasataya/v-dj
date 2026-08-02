"use client";

import { useActionState, useState } from "react";
import { verifyIdentity, setupSecurityQuestion, answerSecurityQuestion } from "./actions";
import { SECURITY_QUESTIONS } from "@/lib/securityQuestions";

type Verified =
  | { vgLeaderId: number; name: string; mode: "setup" }
  | { vgLeaderId: number; name: string; mode: "answer"; question: string };

export function ClaimForm() {
  const [verified, setVerified] = useState<Verified | null>(null);

  if (verified?.mode === "setup") {
    return (
      <SetupStep vgLeaderId={verified.vgLeaderId} name={verified.name} onBack={() => setVerified(null)} />
    );
  }

  if (verified?.mode === "answer") {
    return (
      <AnswerStep
        vgLeaderId={verified.vgLeaderId}
        name={verified.name}
        question={verified.question}
        onBack={() => setVerified(null)}
      />
    );
  }

  return <VerifyStep onVerified={setVerified} />;
}

function VerifyStep({ onVerified }: { onVerified: (v: Verified) => void }) {
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await verifyIdentity(_, formData);
    if (result.verified) {
      onVerified(result);
      return undefined;
    }
    return result;
  }, undefined);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col gap-6">
        <div>
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Victory Iloilo</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">VG Leader Portal</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Verify your details to access your account.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Name</label>
            <input
              name="lastName"
              autoFocus
              required
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Last 6 Digits of Mobile Number
            </label>
            <input
              name="mobileLast6"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="e.g. 123456"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            {pending ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SetupStep({
  vgLeaderId,
  name,
  onBack,
}: {
  vgLeaderId: number;
  name: string;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState(setupSecurityQuestion.bind(null, vgLeaderId), undefined);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col gap-6">
        <div>
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Victory Iloilo</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Welcome, {name}!</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Set up a security question — you&apos;ll be asked this the next time you access the portal.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Security Question</label>
            <select
              name="question"
              required
              defaultValue=""
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="" disabled>
                Choose a question…
              </option>
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Answer</label>
            <input
              name="answer"
              autoFocus
              required
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirm Answer</label>
            <input
              name="confirmAnswer"
              required
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            {pending ? "Saving…" : "Finish Setup"}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="text-xs text-center text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
}

function AnswerStep({
  vgLeaderId,
  name,
  question,
  onBack,
}: {
  vgLeaderId: number;
  name: string;
  question: string;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState(answerSecurityQuestion.bind(null, vgLeaderId), undefined);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col gap-6">
        <div>
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Victory Iloilo</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Welcome back, {name}!</h2>
          <p className="text-sm text-gray-500 mt-0.5">Answer your security question to continue.</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{question}</label>
            <input
              name="answer"
              autoFocus
              required
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            {pending ? "Checking…" : "Continue"}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="text-xs text-center text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
}
