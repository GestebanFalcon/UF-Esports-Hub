import { useState, type FormEvent } from "react";
import { loginSchema, registerSchema, registerRequestSchema } from "@uf-esports-hub/shared";
import { AuthApiError, registerAccount } from "./api";
import { authClient } from "./client";
import type { AuthMode, FieldErrors } from "./types";

function focusFirstError(form: HTMLFormElement, errors: FieldErrors) {
  const name = Object.keys(errors)[0];
  const field = name && form.elements.namedItem(name);
  if (field instanceof HTMLElement) field.focus();
}

export function useAuthForm(mode: AuthMode, ready: boolean) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !ready) return;

    const form = event.currentTarget;
    const formData = Object.fromEntries(new FormData(form));
    setMessage("");
    const result = (mode === "login" ? loginSchema : registerSchema).safeParse(formData);

    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? "form");
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      focusFirstError(form, nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await authClient.login(loginSchema.parse(result.data));
      } else {
        await registerAccount(registerRequestSchema.parse(result.data));
        setMessage("Account created successfully! You can now log in.");
      }
      form.reset();
      setShowPassword(false);
    } catch (error) {
      if (error instanceof AuthApiError) {
        const nextErrors: FieldErrors = {};
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (messages[0]) nextErrors[field] = messages[0];
        }
        setErrors(nextErrors);
        setMessage(error.message);
        focusFirstError(form, nextErrors);
      } else {
        setMessage("Could not connect to the server. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { errors, showPassword, setShowPassword, message, isSubmitting, submit };
}
