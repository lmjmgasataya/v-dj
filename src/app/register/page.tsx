"use client";

import { useState } from "react";
import { registerParticipant } from "./actions";
import { Section, Field, inputCls, selectCls, SERVICE_OPTIONS } from "@/components/form";

const LIFESTAGES = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

export default function RegisterPage() {
  const [previousChurch, setPreviousChurch] = useState("Roman Catholic");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participant Registration</h2>
          <p className="text-sm text-gray-500 mt-1">
            All fields marked with <span className="text-red-500">*</span> are required.
          </p>
        </div>
        <a href="/" className="text-sm text-indigo-600 hover:underline shrink-0">← Home</a>
      </div>

      <form action={registerParticipant} className="flex flex-col gap-6">
        <Section title="Participant Information">
          <Field label="Last Name" required>
            <input name="lastName" required className={inputCls} />
          </Field>
          <Field label="First Name" required>
            <input name="firstName" required className={inputCls} />
          </Field>
          <Field label="Middle Initial">
            <input name="middleInitial" maxLength={3} className={inputCls} />
          </Field>
          <Field label="Mobile Number" required>
            <input name="mobileNumber" required type="tel" className={inputCls} />
          </Field>
          <Field label="Facebook / Messenger Name" className="sm:col-span-2">
            <input name="facebookMessengerName" className={inputCls} />
          </Field>
          <Field label="Lifestage" required>
            <select name="lifestage" required className={selectCls}>
              <option value="">-- Select --</option>
              {LIFESTAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Birthday" required>
            <input name="birthday" required type="date" className={inputCls} />
          </Field>
          <Field label="Gender" required>
            <select name="gender" required className={selectCls}>
              <option value="">-- Select --</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </Field>
          <Field label="Service Attending" required>
            <select name="serviceAttending" required className={selectCls}>
              <option value="">-- Select --</option>
              {SERVICE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Spiritual Status">
          <Field label="I have completed One2One" required className="sm:col-span-2">
            <div className="flex flex-col gap-2 mt-1">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="radio" name="completedOne2One" value="yes" required className="mt-0.5" />
                Yes
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="radio" name="completedOne2One" value="no" className="mt-0.5" />
                No, but I will complete it before Victory Day
              </label>
            </div>
          </Field>

          <Field label="I will undergo water baptism" required className="sm:col-span-2">
            <div className="flex gap-6 mt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="willUndergoWaterBaptism" value="yes" required />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="willUndergoWaterBaptism" value="no" />
                No
              </label>
            </div>
          </Field>

          <Field label="Previous Church" required className="sm:col-span-2">
            <div className="flex flex-col gap-2 mt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="previousChurch"
                  value="Roman Catholic"
                  checked={previousChurch === "Roman Catholic"}
                  onChange={() => setPreviousChurch("Roman Catholic")}
                />
                Roman Catholic
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="previousChurch"
                  value="Others"
                  checked={previousChurch === "Others"}
                  onChange={() => setPreviousChurch("Others")}
                />
                Others
              </label>
              {previousChurch === "Others" && (
                <input
                  name="previousChurchOther"
                  required
                  placeholder="Please specify your previous church"
                  className={`${inputCls} mt-1 ml-5`}
                />
              )}
            </div>
          </Field>

          <Field label="Preferred Name on ID" required className="sm:col-span-2">
            <input name="preferredNameOnId" required className={inputCls} />
          </Field>
        </Section>

        <Section title="One2One Discipler Information">
          <Field label="Discipler's Last Name" required>
            <input name="disciplerLastName" required className={inputCls} />
          </Field>
          <Field label="Discipler's First Name" required>
            <input name="disciplerFirstName" required className={inputCls} />
          </Field>
          <Field label="Discipler's Mobile Number" required>
            <input name="disciplerMobileNumber" required type="tel" className={inputCls} />
          </Field>
          <Field label="Discipler's Messenger / Facebook Name">
            <input name="disciplerMessengerName" className={inputCls} />
          </Field>
        </Section>

        <Section title="Confirmation">
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="confirmedReadiness"
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">
                I am confirming that the participant is ready to join Victory Day, that we will
                complete/have completed One2One and Preparing for Victory before the day of the event.
              </span>
            </label>
          </div>
        </Section>

        <Section title="Payment &amp; Admin">
          <Field label="Acknowledgement Receipt Number" required>
            <input name="acknowledgementReceiptNumber" required className={inputCls} />
          </Field>
          <Field label="Registration Fee" required>
            <select name="registrationFee" required className={selectCls}>
              <option value="">-- Select --</option>
              <option value="Regular">Regular — ₱1,200</option>
              <option value="Discounted">Discounted — ₱900</option>
            </select>
          </Field>
          <Field label="Name of Admin Volunteer" required className="sm:col-span-2">
            <input name="adminVolunteerName" required className={inputCls} />
          </Field>
        </Section>

        <button
          type="submit"
          className="w-full sm:w-auto self-end bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-10 rounded-xl transition"
        >
          Register Participant
        </button>
      </form>
    </div>
  );
}
