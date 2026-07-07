"use client";

import { useState } from "react";
import { updateParticipant } from "./actions";
import { Section, Field, RadioOption, CheckboxOption, inputCls, selectCls, SERVICE_OPTIONS, FEE_CATEGORIES } from "@/components/form";
import { DatePickerField } from "@/components/DatePickerField";
import { SubmitButton } from "@/components/SubmitButton";
import { VgLeaderFields } from "@/components/VgLeaderFields";
import { DisciplerFields } from "@/components/DisciplerFields";
import Link from "next/link";
import type { Participant } from "@/db/schema";

type ParticipantWithRelations = Participant & {
  disciplerLastName: string | null;
  disciplerFirstName: string | null;
  disciplerMobileNumber: string | null;
  disciplerMessengerName: string | null;
  vgLeaderLastName: string | null;
  vgLeaderFirstName: string | null;
  vgLeaderMobileNumber: string | null;
  vgLeaderMessengerName: string | null;
};

const LIFESTAGES = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

const STUDENT_LIFESTAGES = ["Student (JHS/SHS)", "Student (College)"];

export function EditForm({
  participant,
  newDatePicker,
  vgLeaderAutocomplete,
  disciplerAutocomplete,
}: {
  participant: ParticipantWithRelations;
  newDatePicker: boolean;
  vgLeaderAutocomplete: boolean;
  disciplerAutocomplete: boolean;
}) {
  const isOtherChurch = participant.previousChurch != null && participant.previousChurch !== "Roman Catholic";
  const [previousChurch, setPreviousChurch] = useState(isOtherChurch ? "Others" : "Roman Catholic");
  const [isDoneWithVictoryWeekend, setIsDoneWithVictoryWeekend] = useState(participant.isDoneWithVictoryWeekend ?? false);
  const [lifestage, setLifestage] = useState(participant.lifestage ?? "");

  const isAB = participant.registrationFee === "A" || participant.registrationFee === "B";
  const needsVictoryDate = participant.registrationFee === "C" || participant.registrationFee === "D";
  const showVgLeader = needsVictoryDate || isDoneWithVictoryWeekend;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

  const updateAction = updateParticipant.bind(null, participant.id);

  return (
    <form action={updateAction} className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 flex flex-col gap-3">
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
        {isAB && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-700">Have you gone through Victory Weekend before?</span>
            <div className="flex gap-4">
              <RadioOption name="isDoneWithVictoryWeekend" value="yes" label="Yes" checked={isDoneWithVictoryWeekend} onChange={() => setIsDoneWithVictoryWeekend(true)} />
              <RadioOption name="isDoneWithVictoryWeekend" value="no" label="No" checked={!isDoneWithVictoryWeekend} onChange={() => setIsDoneWithVictoryWeekend(false)} />
            </div>
          </div>
        )}
      </div>

      <Section title="Participant Information">
        {needsVictoryDate && (
          <div className="sm:col-span-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-5 py-4 flex flex-col gap-1">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Required</p>
            <p className="text-xs text-amber-600 mb-2">Please enter the date when the participant completed Victory Weekend.</p>
            <Field label="Victory Weekend Date" required>
              <DatePickerField name="victoryDate" required max={today} defaultValue={participant.victoryDate ?? ""} className={inputCls} newDatePicker={newDatePicker} />
            </Field>
          </div>
        )}
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
        <Field label="Facebook / Messenger Name">
          <input name="facebookMessengerName" defaultValue={participant.facebookMessengerName ?? ""} className={inputCls} />
        </Field>
        <Field label="Email Address">
          <input name="email" type="email" defaultValue={participant.email ?? ""} className={inputCls} />
        </Field>
        <Field label="Lifestage">
          <select
            name="lifestage"
            className={selectCls}
            value={lifestage}
            onChange={(e) => setLifestage(e.target.value)}
          >
            <option value="">-- Select --</option>
            {LIFESTAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
        {STUDENT_LIFESTAGES.includes(lifestage) && (
          <Field label="School">
            <input name="school" defaultValue={participant.school ?? ""} className={inputCls} />
          </Field>
        )}
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

        {!showVgLeader && (
          <Field label="I have completed One2One" className="sm:col-span-2">
            <div className="flex flex-col gap-2 mt-1">
              <RadioOption name="completedOne2One" value="yes" label="Yes" defaultChecked={participant.completedOne2One ?? false} />
              <RadioOption name="completedOne2One" value="no" label="No, but I will complete it before Victory Day" defaultChecked={!(participant.completedOne2One ?? false)} />
            </div>
          </Field>
        )}

        {isAB && (
          <Field label="I will undergo water baptism" className="sm:col-span-2">
            <div className="flex gap-6 mt-1">
              <RadioOption name="willUndergoWaterBaptism" value="yes" label="Yes" defaultChecked={participant.willUndergoWaterBaptism ?? false} />
              <RadioOption name="willUndergoWaterBaptism" value="no" label="No" defaultChecked={!(participant.willUndergoWaterBaptism ?? false)} />
            </div>
          </Field>
        )}

        {!showVgLeader && (
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
        )}

        <Field label="Preferred Name on ID" className="sm:col-span-2">
          <input name="preferredNameOnId" defaultValue={participant.preferredNameOnId ?? ""} className={inputCls} />
        </Field>
      </Section>

      {showVgLeader ? (
        <Section title="Victory Group Leader Information">
          <VgLeaderFields
            enabled={vgLeaderAutocomplete}
            defaultLastName={participant.vgLeaderLastName ?? ""}
            defaultFirstName={participant.vgLeaderFirstName ?? ""}
            defaultMobileNumber={participant.vgLeaderMobileNumber ?? ""}
            defaultMessengerName={participant.vgLeaderMessengerName ?? ""}
          />
        </Section>
      ) : (
        <Section title="One2One Discipler Information" important="To be filled up by the One2One discipler">
          <DisciplerFields
            enabled={disciplerAutocomplete}
            defaultLastName={participant.disciplerLastName ?? ""}
            defaultFirstName={participant.disciplerFirstName ?? ""}
            defaultMobileNumber={participant.disciplerMobileNumber ?? ""}
            defaultMessengerName={participant.disciplerMessengerName ?? ""}
          />
          <div className="sm:col-span-2">
            <CheckboxOption name="confirmedReadiness" defaultChecked={participant.confirmedReadiness ?? false} align="start" labelClassName="text-red-800 font-bold">
              I am confirming that the participant is ready to join Victory Day, that we will
              complete/have completed One2One and Preparing for Victory before the day of the event.
            </CheckboxOption>
          </div>
        </Section>
      )}

      <Section title="Payment &amp; Admin">
        <Field label="Acknowledgement Receipt Number">
          <input name="acknowledgementReceiptNumber" defaultValue={participant.acknowledgementReceiptNumber ?? ""} className={inputCls} />
        </Field>
        <Field label="Worship Service Registered">
          <select name="worshipServiceRegistered" defaultValue={participant.worshipServiceRegistered ?? ""} className={selectCls}>
            <option value="">-- Select --</option>
            {SERVICE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
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
        <Field label="Name of Admin Service Team Member" className="sm:col-span-2">
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
          className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-70 text-white font-semibold py-3 px-10 rounded-xl transition"
        />
      </div>
    </form>
  );
}
