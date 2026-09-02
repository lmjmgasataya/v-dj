"use client";

import { useActionState, useState } from "react";
import { checkIdentity, setupPin, verifyPin, registerNewLeader } from "./actions";
import { PinInput } from "@/components/PinInput";

type Checked =
  | { matched: true; mode: "login"; vgLeaderId: number; name: string }
  | { matched: true; mode: "setup"; vgLeaderId: number; name: string }
  | { matched: false; firstName: string; lastName: string };

function Card({
  eyebrow = "Victory Iloilo",
  title,
  description,
  banner,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col gap-6">
        {banner}
        <div>
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-widest">{eyebrow}</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        {children}
      </div>
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
    <Card title="VG Leader Portal" description="Enter your name to access your account." banner={banner}>
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
