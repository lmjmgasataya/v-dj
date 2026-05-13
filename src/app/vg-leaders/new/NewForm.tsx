"use client";

import { useTransition } from "react";
import { createVGLeader } from "./actions";
import { Field, Section, inputCls, selectCls, SERVICE_OPTIONS } from "@/components/form";
import { lifestageEnum } from "@/db/schema";

export function NewForm() {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => createVGLeader(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Section title="Personal Information">
        <Field label="Last Name" required>
          <input name="lastName" required className={inputCls} />
        </Field>
        <Field label="First Name" required>
          <input name="firstName" required className={inputCls} />
        </Field>
        <Field label="Middle Initial">
          <input name="middleInitial" maxLength={3} className={inputCls} placeholder="e.g. A" />
        </Field>
        <Field label="Mobile Number" required>
          <input name="mobileNumber" required className={inputCls} placeholder="e.g. 09XX XXX XXXX" />
        </Field>
        <Field label="Age" required>
          <input name="age" type="number" required min={1} max={120} className={inputCls} />
        </Field>
        <Field label="Gender" required>
          <select name="gender" required defaultValue="" className={selectCls}>
            <option value="" disabled>Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
        <Field label="Lifestage">
          <select name="lifestage" defaultValue="" className={selectCls}>
            <option value="">— Select —</option>
            {lifestageEnum.enumValues.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Service Attending">
          <select name="serviceAttending" defaultValue="" className={selectCls}>
            <option value="">— Select —</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Facebook / Messenger Name" className="sm:col-span-2">
          <input name="facebookMessengerName" className={inputCls} placeholder="e.g. Juan dela Cruz" />
        </Field>
      </Section>

      <div className="flex justify-end gap-3">
        <a href="/vg-leaders" className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition">
          Cancel
        </a>
        <button
          type="submit"
          disabled={pending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
        >
          {pending ? "Saving..." : "Save Leader"}
        </button>
      </div>
    </form>
  );
}
