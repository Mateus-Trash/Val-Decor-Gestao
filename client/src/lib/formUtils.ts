import type React from "react";

/**
 * When the user presses Enter inside an INPUT field (not TEXTAREA),
 * blur the field to dismiss the on-screen keyboard on mobile devices
 * instead of submitting the form or jumping to the next field.
 *
 * TEXTAREA is intentionally excluded so multi-line input (e.g. observações)
 * still works with Enter for line breaks.
 */
export function dismissKeyboardOnEnter(e: React.KeyboardEvent<HTMLFormElement>) {
  const target = e.target as HTMLElement;
  if (e.key === "Enter" && target.tagName === "INPUT") {
    e.preventDefault();
    target.blur();
  }
}
