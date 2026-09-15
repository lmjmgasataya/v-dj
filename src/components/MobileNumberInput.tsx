"use client";

import { MOBILE_NUMBER_PATTERN, MOBILE_NUMBER_HELP } from "@/lib/phone";

export function MobileNumberInput({
  name = "mobileNumber",
  required,
  defaultValue,
  className,
  placeholder = "09XXXXXXXXX",
}: {
  name?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      name={name}
      type="tel"
      required={required}
      defaultValue={defaultValue}
      placeholder={placeholder}
      pattern={MOBILE_NUMBER_PATTERN}
      className={className}
      onInvalid={(e) => {
        const input = e.currentTarget;
        if (input.validity.patternMismatch) {
          input.setCustomValidity(MOBILE_NUMBER_HELP);
        } else {
          input.setCustomValidity("");
        }
      }}
      onInput={(e) => e.currentTarget.setCustomValidity("")}
    />
  );
}
