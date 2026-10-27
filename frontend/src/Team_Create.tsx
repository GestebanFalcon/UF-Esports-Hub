
import { useState, type FormEvent } from "react";

export type CreateTeamValues = {
  name: string;
  game: string;
  description: string;
};

type CreateTeamProps = {
  canCreate?: boolean;
  onCreate?: (
    values: CreateTeamValues
  ) => Promise<{ id: string }>;
  onCreated?: (teamId: string) => void;
};

function getErrorMessage(error: unknown): string {
  const status =
    error &&
    typeof error === "object" &&
    "status" in error
      ? error.status
      : undefined;

  if (status === 401) {
    return "Please log in to create a team.";
  }

  if (status === 403) {
    return "You do not have permission to create a team.";
  }

  if (status === 409) {
    return "A team with this information already exists.";
  }

  if (status === 400 || status === 422) {
    return "Please review your team information and try again.";
  }

  return "Something went wrong while creating your team. Please try again.";
}

export default function CreateTeam({
  canCreate = false,
  onCreate,
  onCreated,
}: CreateTeamProps) {
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Record<string, string>
  >({});
  const [formError, setFormError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting || !canCreate || !onCreate) {
      return;
    }

    setFormError("");

    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = "Please enter a team name.";
    }

    if (!game.trim()) {
      nextErrors.game = "Please enter a game.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onCreate({
        name: name.trim(),
        game: game.trim(),
        description: description.trim(),
      });

      if (!result.id) {
        throw new Error("Team ID missing");
      }

      if (onCreated) {
        onCreated(result.id);
      } else {
        window.location.assign(
          `/teams/${encodeURIComponent(result.id)}`
        );
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit =
    canCreate && !!onCreate && !isSubmitting;

  return (
    <main className="flex-1 py-12">
      <a
        href="/teams"
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        ← Back to Teams
      </a>

      <section className="mt-10 max-w-3xl">
        <p className="mb-4 text-xs tracking-[0.2em] text-blue-400">
          UF ESPORTS HUB / CREATE TEAM
        </p>

        <h1 className="text-4xl font-bold sm:text-5xl">
          Create your team
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-400">
          Build your esports team and connect with
          players who enjoy the same games.
        </p>

        <div className="mt-10 rounded border border-slate-700 bg-slate-900/40 p-6 sm:p-8">
          <h2 className="text-xl font-semibold">
            Team Information
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Enter the information for your new team.
          </p>

          {!canCreate ? (
            <div
              role="status"
              className="mt-6 rounded border border-slate-700 p-4 text-sm text-slate-300"
            >
              Only authorized team managers can create
              teams. Manager access is not connected yet.
            </div>
          ) : !onCreate ? (
            <div
              role="status"
              className="mt-6 rounded border border-slate-700 p-4 text-sm text-slate-300"
            >
              Team creation is not connected to the
              backend yet.
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 space-y-6"
          >
            <div>
              <label
                htmlFor="team-name"
                className="mb-2 block text-sm font-medium"
              >
                Team Name *
              </label>

              <input
                id="team-name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((previous) => ({
                    ...previous,
                    name: "",
                  }));
                }}
                placeholder="Enter your team name"
                required
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name
                    ? "team-name-error"
                    : undefined
                }
                className="w-full rounded border border-slate-700 bg-transparent px-4 py-3 text-white outline-none focus:border-blue-500"
              />

              {errors.name && (
                <p
                  id="team-name-error"
                  className="mt-2 text-sm text-red-400"
                >
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="team-game"
                className="mb-2 block text-sm font-medium"
              >
                Game *
              </label>

              <input
                id="team-game"
                name="game"
                type="text"
                value={game}
                onChange={(event) => {
                  setGame(event.target.value);
                  setErrors((previous) => ({
                    ...previous,
                    game: "",
                  }));
                }}
                placeholder="Example: Rocket League"
                required
                aria-invalid={!!errors.game}
                aria-describedby={
                  errors.game
                    ? "team-game-error"
                    : undefined
                }
                className="w-full rounded border border-slate-700 bg-transparent px-4 py-3 text-white outline-none focus:border-blue-500"
              />

              {errors.game && (
                <p
                  id="team-game-error"
                  className="mt-2 text-sm text-red-400"
                >
                  {errors.game}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="team-description"
                className="mb-2 block text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="team-description"
                name="description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Tell players about your team..."
                rows={5}
                className="w-full resize-y rounded border border-slate-700 bg-transparent px-4 py-3 text-white outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-slate-500">
                Tell other players what your team is
                about.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded border border-red-500/50 p-4 text-sm text-red-400"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center rounded bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Creating Team..."
                : "Create Team"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
