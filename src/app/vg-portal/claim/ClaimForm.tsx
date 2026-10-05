"use client";

import { useActionState, useState } from "react";
import { checkIdentity, setupPin, verifyPin, registerNewLeader } from "./actions";
import { PinInput } from "@/components/PinInput";

type Checked =
  | { matched: true; mode: "login"; vgLeaderId: number; name: string }
  | { matched: true; mode: "setup"; vgLeaderId: number; name: string }
  | { matched: false; firstName: string; lastName: string };

function Card({
  title,
  description,
  banner,
  children,
}: {
  title: string;
  description: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-full max-w-sm overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm">
        {/* Colored header so this doesn't read as the main staff login. */}
        <div className="bg-linear-to-br from-[#00428E] to-indigo-600 px-8 py-5 flex items-center gap-3 text-white">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-widest text-blue-100">Victory Iloilo</p>
            <p className="text-lg font-bold leading-tight">VG Leader Portal</p>
          </div>
          <span className="ml-auto self-start whitespace-nowrap rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-blue-50">
            For VG Leaders
          </span>
        </div>

        <div className="p-8 flex flex-col gap-6">
          {banner}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
          {children}
        </div>
      </div>

      <a href="/login" className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
        Not a VG leader? Go to the main login
      </a>
    </div>
  );
}

function EventCallbackBanner({ eventName }: { eventName: string }) {
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5">
      <p className="text-sm text-amber-800">
        Please fill in your first name, last name, and PIN first to be able to pre-register for the event{" "}
        <span className="font-semibold">{eventName}</span>.
      </p>
    </div>
  );
}

export function ClaimForm({ callbackUrl = null, eventName = null }: { callbackUrl?: string | null; eventName?: string | null }) {
  const [checked, setChecked] = useState<Checked | null>(null);
  const banner = eventName ? <EventCallbackBanner eventName={eventName} /> : undefined;

  if (checked?.matched === true && checked.mode === "setup") {
    return (
      <SetupPinStep vgLeaderId={checked.vgLeaderId} name={checked.name} callbackUrl={callbackUrl} banner={banner} onBack={() => setChecked(null)} />
    );
  }

  if (checked?.matched === true && checked.mode === "login") {
    return (
      <LoginPinStep vgLeaderId={checked.vgLeaderId} name={checked.name} callbackUrl={callbackUrl} banner={banner} onBack={() => setChecked(null)} />
    );
  }

  if (checked?.matched === false) {
    return (
      <RegisterStep
        firstName={checked.firstName}
        lastName={checked.lastName}
        callbackUrl={callbackUrl}
        banner={banner}
        onBack={() => setChecked(null)}
      />
    );
  }

  return <NameStep onChecked={setChecked} banner={banner} />;
}

function NameStep({ onChecked, banner }: { onChecked: (v: Checked) => void; banner?: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await checkIdentity(_, formData);
    if (result.checked) {
      onChecked(result);
      return undefined;
    }
    return result;
  }, undefined);

  return (
    <Card title="Hi, VG Leader!" description="Enter your first and last name to log in or set up your account — no username needed." banner={banner}>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">First Name <span className="text-red-500">*</span></label>
          <input
            name="firstName"
            autoFocus
            required
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Name <span className="text-red-500">*</span></label>
          <input
            name="lastName"
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
      </form>
    </Card>
  );
}

function LoginPinStep({
  vgLeaderId,
  name,
  callbackUrl,
  banner,
  onBack,
}: {
  vgLeaderId: number;
  name: string;
  callbackUrl: string | null;
  banner?: React.ReactNode;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState(verifyPin.bind(null, vgLeaderId, callbackUrl), undefined);

  return (
    <Card title={`Welcome back, ${name}!`} description="Enter your 5-digit PIN to continue." banner={banner}>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PIN <span className="text-red-500">*</span></label>
          <PinInput name="pin" autoFocus />
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
    </Card>
  );
}

function SetupPinStep({
  vgLeaderId,
  name,
  callbackUrl,
  banner,
  onBack,
}: {
  vgLeaderId: number;
  name: string;
  callbackUrl: string | null;
  banner?: React.ReactNode;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState(setupPin.bind(null, vgLeaderId, callbackUrl), undefined);

  return (
    <Card
      title={`Welcome, ${name}!`}
      description="Set up a 5-digit PIN — you'll use this the next time you access the portal."
      banner={banner}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PIN <span className="text-red-500">*</span></label>
          <PinInput name="pin" autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirm PIN <span className="text-red-500">*</span></label>
          <PinInput name="confirmPin" />
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
    </Card>
  );
}

function RegisterStep({
  firstName,
  lastName,
  callbackUrl,
  banner,
  onBack,
}: {
  firstName: string;
  lastName: string;
  callbackUrl: string | null;
  banner?: React.ReactNode;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState(registerNewLeader.bind(null, firstName, lastName, callbackUrl), undefined);

  return (
    <Card
      title="Let's get you set up"
      description={`We couldn't find "${firstName} ${lastName}" on file. Choose a 5-digit PIN to create your account — you can fill in the rest of your profile after.`}
      banner={banner}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PIN <span className="text-red-500">*</span></label>
          <PinInput name="pin" autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirm PIN <span className="text-red-500">*</span></label>
          <PinInput name="confirmPin" />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
        >
          {pending ? "Creating…" : "Create Account"}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="text-xs text-center text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          Back
        </button>
      </form>
    </Card>
  );
}
