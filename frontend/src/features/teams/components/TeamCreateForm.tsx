import { teamFieldLimits, type TeamCreate } from "@uf-esports-hub/shared";
import { useTeamCreate, type TeamCreateOptions } from "../use-team-create";

export function TeamCreateForm({ canCreate = false, onCreate, onCreated }: TeamCreateOptions) {
  const form = useTeamCreate({ canCreate, onCreate, onCreated });

  function renderField(field: keyof TeamCreate, label: string, placeholder: string) {
    const error = form.errors[field];
    const props = {
      id: `team-${field}`,
      name: field,
      value: form.values[field],
      placeholder,
      maxLength: teamFieldLimits[field],
      "aria-invalid": !!error,
      "aria-describedby": error ? `team-${field}-error` : undefined,
    };

    return (
      <div className="team-field">
        <label htmlFor={props.id}>{label}</label>
        {field === "description" ? (
          <textarea
            {...props}
            rows={5}
            onChange={(event) => form.changeField(field, event.target.value)}
          />
        ) : (
          <input
            {...props}
            type="text"
            required
            onChange={(event) => form.changeField(field, event.target.value)}
          />
        )}
        {error && <p id={`team-${field}-error`} className="team-field-error">{error}</p>}
      </div>
    );
  }

  return (
    <section className="team-panel team-create-panel" aria-labelledby="team-form-heading">
      <h2 id="team-form-heading">Team Information</h2>
      <p className="team-description">Enter the information for your new team.</p>
      {!canCreate ? (
        <p role="status" className="team-status">
          Only authorized team managers can create teams.
        </p>
      ) : !onCreate ? (
        <p role="status" className="team-status">
          Team creation is unavailable right now. Please try again later.
        </p>
      ) : null}

      <form onSubmit={form.submit} noValidate className="team-form">
        {renderField("name", "Team Name *", "Enter your team name")}
        {renderField("game", "Game *", "Example: Rocket League")}
        {renderField("description", "Description", "Tell players about your team...")}
        <p className="team-description">Tell other players what your team is about.</p>
        {form.formError && <p role="alert" className="team-error">{form.formError}</p>}
        <button type="submit" disabled={!form.canSubmit} className="team-button">
          {form.isSubmitting ? "Creating Team..." : "Create Team"}
        </button>
      </form>
    </section>
  );
}
