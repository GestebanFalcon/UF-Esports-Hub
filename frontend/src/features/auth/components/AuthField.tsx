import type { ComponentProps, ReactNode } from "react";

type AuthFieldProps = Omit<ComponentProps<"input">, "name" | "id"> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  passwordToggle?: ReactNode;
};

export function AuthField({ name, label, error, hint, passwordToggle, ...inputProps }: AuthFieldProps) {
  const input = (
    <input
      {...inputProps}
      id={name}
      name={name}
      aria-invalid={!!error}
      aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
    />
  );

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {passwordToggle ? <div className="password-input">{input}{passwordToggle}</div> : input}
      {error ? (
        <p className="field-error" id={`${name}-error`}>{error}</p>
      ) : hint ? (
        <p className="field-hint" id={`${name}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}
