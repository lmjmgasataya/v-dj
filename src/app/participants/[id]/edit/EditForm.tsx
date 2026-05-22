"use client";

import { useState } from "react";
import { updateParticipant } from "./actions";
import { Section, Field, RadioOption, CheckboxOption, inputCls, selectCls, SERVICE_OPTIONS, FEE_CATEGORIES } from "@/components/form";
import { SubmitButton } from "@/components/SubmitButton";
import Link from "next/link";
import type { Participant } from "@/db/schema";

const LIFESTAGES = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

export function EditForm({ participant }: { participant: Participant }) {
  const isOtherChurch = participant.previousChurch != null && participant.previousChurch !== "Roman Catholic";
  const [previousChurch, setPreviousChurch] = useState(isOtherChurch ? "Others" : "Roman Catholic");
  const [discipler, setDiscipler] = useState({
    lastName: participant.disciplerLastName ?? "",
    firstName: participant.disciplerFirstName ?? "",
    mobileNumber: participant.disciplerMobileNumber ?? "",
    messengerName: participant.disciplerMessengerName ?? "",
  });

  const updateAction = updateParticipant.bind(null, participant.id);

  return (
    <form action={updateAction} className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 flex flex-col gap-2">
        <p className="text-sm font-semibold text-gray-700">
          I will register for: <span className="text-red-500">*</span>
          <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Important</span>
        </p>
        <input type="hidden" name="registrationFee" value={participant.registrationFee ?? ""} />
        <select
          disabled
          className={`${selectCls} opacity-60 cursor-not-allowed bg-gray-50`}
          value={participant.registrationFee ?? ""}
          onChange={() => {}}
        >
          <option value="">-- Select --</option>
          {FEE_CATEGORIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label} — {f.amount}</option>
          ))}
        </select>
      </div>

      <Section title="Participant Information">
        <Field label="Last Name" required>
          <input name="lastName" required defaultValue={participant.lastName} className={inputCls} />
        </Field>
        <Field label="First Name" required>
          <input name="firstName" required defaultValue={participant.firstName} className={inputCls} />
        </Field>
        <Field label="Middle Initial">
          <input name="middleInitial" maxLength={3} defaultValue={participant.middleInitial ?? ""} className={inputCls} />
        </Field>
        <Field label="Mobile Number">
          <input name="mobileNumber" type="tel" defaultValue={participant.mobileNumber ?? ""} className={inputCls} />
        </Field>
        <Field label="Facebook / Messenger Name" className="sm:col-span-2">
          <input name="facebookMessengerName" defaultValue={participant.facebookMessengerName ?? ""} className={inputCls} />
        </Field>
        <Field label="Lifestage">
          <select name="lifestage" defaultValue={participant.lifestage ?? ""} className={selectCls}>
            <option value="">-- Select --</option>
            {LIFESTAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Age" required>
          <input name="age" required type="number" min={1} max={120} defaultValue={participant.age} className={inputCls} />
        </Field>
        <Field label="Gender" required>
          <select name="gender" required defaultValue={participant.gender} className={selectCls}>
            <option value="">-- Select --</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
        <Field label="Service Attending" required>
          <select name="serviceAttending" required defaultValue={participant.serviceAttending} className={selectCls}>
            <option value="">-- Select --</option>
            {SERVICE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="I have completed One2One" className="sm:col-span-2">
          <div className="flex flex-col gap-2 mt-1">
            <RadioOption name="completedOne2One" value="yes" label="Yes" defaultChecked={participant.completedOne2One ?? false} />
            <RadioOption name="completedOne2One" value="no" label="No, but I will complete it before Victory Day" defaultChecked={!(participant.completedOne2One ?? false)} />
          </div>
        </Field>

        <Field label="I will undergo water baptism" className="sm:col-span-2">
          <div className="flex gap-6 mt-1">
            <RadioOption name="willUndergoWaterBaptism" value="yes" label="Yes" defaultChecked={participant.willUndergoWaterBaptism ?? false} />
            <RadioOption name="willUndergoWaterBaptism" value="no" label="No" defaultChecked={!(participant.willUndergoWaterBaptism ?? false)} />
          </div>
        </Field>

        <Field label="Previous Church" className="sm:col-span-2">
          <div className="flex flex-col gap-2 mt-1">
            <RadioOption
              name="previousChurch"
              value="Roman Catholic"
              label="Roman Catholic"
              checked={previousChurch === "Roman Catholic"}
              onChange={() => setPreviousChurch("Roman Catholic")}
            />
            <RadioOption
              name="previousChurch"
              value="Others"
              label="Others"
              checked={previousChurch === "Others"}
              onChange={() => setPreviousChurch("Others")}
            />
            {previousChurch === "Others" && (
              <input
                name="previousChurchOther"
                defaultValue={isOtherChurch ? (participant.previousChurch ?? "") : ""}
                placeholder="Please specify your previous church"
                className={`${inputCls} mt-1 ml-5`}
              />
            )}
          </div>
        </Field>

        <Field label="Preferred Name on ID" className="sm:col-span-2">
          <input name="preferredNameOnId" defaultValue={participant.preferredNameOnId ?? ""} className={inputCls} />
        </Field>
      </Section>

      <Section title="One2One Discipler Information" description="To be filled up by the One2One discipler">
        <Field label="Discipler's Last Name">
          <input name="disciplerLastName" className={inputCls}
            value={discipler.lastName} onChange={(e) => setDiscipler((p) => ({ ...p, lastName: e.target.value }))} />
        </Field>
        <Field label="Discipler's First Name">
          <input name="disciplerFirstName" className={inputCls}
            value={discipler.firstName} onChange={(e) => setDiscipler((p) => ({ ...p, firstName: e.target.value }))} />
        </Field>
        <Field label="Discipler's Mobile Number">
          <input name="disciplerMobileNumber" type="tel" className={inputCls}
            value={discipler.mobileNumber} onChange={(e) => setDiscipler((p) => ({ ...p, mobileNumber: e.target.value }))} />
        </Field>
        <Field label="Discipler's Messenger / Facebook Name">
          <input name="disciplerMessengerName" className={inputCls}
            value={discipler.messengerName} onChange={(e) => setDiscipler((p) => ({ ...p, messengerName: e.target.value }))} />
        </Field>
        <div className="sm:col-span-2">
          <CheckboxOption name="confirmedReadiness" defaultChecked={participant.confirmedReadiness ?? false} align="start">
            I am confirming that the participant is ready to join Victory Day, that we will
            complete/have completed One2One and Preparing for Victory before the day of the event.
          </CheckboxOption>
        </div>
      </Section>

      {participant.isWalkIn && (
        <Section title="Walk-in Info">
          <Field label="VG Leader's Last Name">
            <input name="vgLeaderLastName" defaultValue={participant.vgLeaderLastName ?? ""} className={inputCls} />
          </Field>
          <Field label="VG Leader's First Name">
            <input name="vgLeaderFirstName" defaultValue={participant.vgLeaderFirstName ?? ""} className={inputCls} />
          </Field>
          <Field label="Victory Weekend / Victory Day Date" className="sm:col-span-2">
            <input name="victoryDate" type="date" defaultValue={participant.victoryDate ?? ""} className={inputCls} />
          </Field>
        </Section>
      )}

      <Section title="Payment &amp; Admin">
        <Field label="Acknowledgement Receipt Number">
          <input name="acknowledgementReceiptNumber" defaultValue={participant.acknowledgementReceiptNumber ?? ""} className={inputCls} />
        </Field>
        <Field label="Registration Fee">
          <select
            disabled
            className={`${selectCls} opacity-60 cursor-not-allowed bg-gray-50`}
            value={participant.registrationFee ?? ""}
            onChange={() => {}}
          >
            <option value="">-- Select --</option>
            {FEE_CATEGORIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label} — {f.amount}</option>
            ))}
          </select>
        </Field>
        <Field label="Name of Admin Volunteer" className="sm:col-span-2">
          <input name="adminVolunteerName" defaultValue={participant.adminVolunteerName ?? ""} className={inputCls} />
        </Field>
      </Section>

      <div className="flex gap-3 justify-end">
        <Link
          href="/participants"
          className="bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition"
        >
          Cancel
        </Link>
        <SubmitButton
          label="Save Changes"
          pendingLabel="Saving..."
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold py-3 px-10 rounded-xl transition"
        />
      </div>
    </form>
  );
}
