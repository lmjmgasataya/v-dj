"use client";

import { useState } from "react";
import { updateParticipant } from "./actions";
import { Section, Field, inputCls, selectCls, SERVICE_OPTIONS } from "@/components/form";
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
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="radio" name="completedOne2One" value="yes" className="mt-0.5"
                defaultChecked={participant.completedOne2One ?? false} />
              Yes
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="radio" name="completedOne2One" value="no" className="mt-0.5"
                defaultChecked={!(participant.completedOne2One ?? false)} />
              No, but I will complete it before Victory Day
            </label>
          </div>
        </Field>

        <Field label="I will undergo water baptism" className="sm:col-span-2">
          <div className="flex gap-6 mt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="willUndergoWaterBaptism" value="yes"
                defaultChecked={participant.willUndergoWaterBaptism ?? false} />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="willUndergoWaterBaptism" value="no"
                defaultChecked={!(participant.willUndergoWaterBaptism ?? false)} />
              No
            </label>
          </div>
        </Field>

        <Field label="Previous Church" className="sm:col-span-2">
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
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="confirmedReadiness"
              defaultChecked={participant.confirmedReadiness ?? false}
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
        <Field label="Acknowledgement Receipt Number">
          <input name="acknowledgementReceiptNumber" defaultValue={participant.acknowledgementReceiptNumber ?? ""} className={inputCls} />
        </Field>
        <Field label="Registration Fee">
          <select name="registrationFee" defaultValue={participant.registrationFee ?? ""} className={selectCls}>
            <option value="">-- Select --</option>
            <option value="Regular">Regular — ₱1,200</option>
            <option value="Discounted">Discounted — ₱900</option>
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
