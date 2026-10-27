
import type { TeamSummary } from "./Teams_Page";

type TeamDetailsProps = {
  team: TeamSummary | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export default function TeamDetails({
  team,
  isLoading = false,
  error = null,
  onRetry,
}: TeamDetailsProps) {
  return (
    <main className="flex-1 py-12">
      <a
        href="/teams"
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        ← Back to Teams
      </a>

      {isLoading ? (
        <div className="mt-10" role="status">
          <p className="text-slate-400">
            Loading team details...
          </p>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-10 rounded border border-red-500/50 p-8"
        >
          <h1 className="text-2xl font-bold">
            Could not load team
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            {error}
          </p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 rounded bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Try again
            </button>
          )}
        </div>
      ) : !team ? (
        <div className="mt-10 rounded border border-slate-700 p-8">
          <h1 className="text-2xl font-bold">
            Team not found
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            This team may no longer be available.
          </p>
        </div>
      ) : (
        <section
          className="mt-10"
          aria-labelledby="team-title"
        >
          <p className="mb-4 text-xs uppercase tracking-widest text-blue-400">
            UF ESPORTS HUB / TEAM DETAILS
          </p>

          <h1
            id="team-title"
            className="text-4xl font-bold sm:text-5xl"
          >
            {team.name}
          </h1>

          <div className="mt-8 rounded border border-slate-700 bg-slate-900/60 p-8">
            <h2 className="text-lg font-semibold">
              Team Information
            </h2>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Game
              </p>
              <p className="mt-2 text-lg">
                {team.game}
              </p>
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Description
              </p>
              <p className="mt-2 leading-7 text-slate-300">
                {team.description ||
                  "No description available."}
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
