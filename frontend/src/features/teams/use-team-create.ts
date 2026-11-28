import { useRef, useState, type FormEvent } from "react";
import {
  teamCreateSchema,
  teamErrorSchema,
  teamParamsSchema,
  type Team,
  type TeamCreate,
} from "@uf-esports-hub/shared";

export type TeamCreateOptions = {
  canCreate?: boolean;
  onCreate?: (values: TeamCreate) => Promise<Pick<Team, "id">>;
  onCreated?: (teamId: string) => void;
};

type TeamFieldErrors = Partial<Record<keyof TeamCreate, string>>;

function getErrorMessage(error: unknown): string {
  const status = error && typeof error === "object" && "status" in error
    ? error.status
    : undefined;

  if (status === 401) return "Please log in to create a team.";
  if (status === 403) return "You do not have permission to create a team.";
  if (status === 409) return "A team with this information already exists.";
  if (status === 400 || status === 422) {
    return "Please review your team information and try again.";
  }
  return "Something went wrong while creating your team. Please try again.";
}

export function useTeamCreate({ canCreate = false, onCreate, onCreated }: TeamCreateOptions) {
  const [values, setValues] = useState<TeamCreate>({ name: "", game: "", description: "" });
  const [errors, setErrors] = useState<TeamFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  function changeField(field: keyof TeamCreate, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !canCreate || !onCreate) return;

    const form = event.currentTarget;
    setFormError("");
    const result = teamCreateSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: TeamFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field !== "name" && field !== "game" && field !== "description") continue;
        nextErrors[field] ??= issue.code === "too_small"
          ? field === "name" ? "Please enter a team name." : "Please enter a game."
          : issue.message;
      }
      setErrors(nextErrors);
      const firstField = Object.keys(nextErrors)[0];
      const input = firstField && form.elements.namedItem(firstField);
      if (input instanceof HTMLElement) input.focus();
      return;
    }

    setErrors({});
    submitting.current = true;
    setIsSubmitting(true);
    try {
      const created = await onCreate(result.data);
      const teamId = teamParamsSchema.shape.id.parse(created.id);
      if (onCreated) onCreated(teamId);
      else window.location.assign(`/teams/${encodeURIComponent(teamId)}`);
    } catch (error) {
      const failure = teamErrorSchema.safeParse(error);
      if (failure.success) {
        const fieldErrors: TeamFieldErrors = {};
        for (const field of ["name", "game", "description"] as const) {
          const message = failure.data.fieldErrors?.[field]?.[0];
          if (message) fieldErrors[field] = message;
        }
        setErrors(fieldErrors);
      }
      setFormError(getErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return {
    values, errors, formError, isSubmitting, changeField, submit,
    canSubmit: canCreate && !!onCreate && !isSubmitting,
  };
}
