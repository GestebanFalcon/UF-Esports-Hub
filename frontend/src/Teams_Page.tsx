
export type TeamSummary = {
  id: string;
  name: string;
  game: string;
  description?: string | null;
};

type TeamsPageProps = {
  teams: TeamSummary[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export default function TeamsPage({
  teams,
  isLoading = false,
  error = null,
  onRetry,
}: TeamsPageProps) {
  return (
    <main className="flex-1 py-12">
      <section className="mb-10">
        <p className="mb-4 text-xs tracking-[0.2em] text-blue-400">
          UF ESPORTS HUB / TEAMS
        </p>

        <h1 className="text-4xl font-bold sm:text-5xl">
          Find your team
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
          Browse esports teams at UF and find one that
          matches the games you enjoy playing.
        </p>
      </section>

      {isLoading ? (
        <div role="status" className="rounded border border-slate-700 p-8">
          <p className="text-slate-300">Loading teams...</p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded border border-red-500/50 p-8">
          <h2 className="text-lg font-semibold">
            Could not load teams
          </h2>

          <p className="mt-2 text-sm text-slate-400">
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
      ) : teams.length === 0 ? (
        <div className="rounded border border-slate-700 p-8">
          <h2 className="text-xl font-semibold">
            No teams available yet
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Check back later to see new teams.
          </p>
        </div>
      ) : (
        <section aria-label="Available teams">
          <h2 className="mb-5 text-lg font-semibold">
            Available Teams ({teams.length})
          </h2>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <article
                key={team.id}
                className="rounded border border-slate-700 bg-slate-900/60 p-6"
              >
                <p className="mb-3 text-xs uppercase tracking-widest text-blue-400">
                  {team.game}
                </p>

                <h3 className="text-xl font-bold">
                  {team.name}
                </h3>

                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                  {team.description || "No description available."}
                </p>

                <a
                  href={`/teams/${encodeURIComponent(team.id)}`}
                  className="mt-6 inline-flex items-center gap-3 text-sm font-semibold text-blue-400 hover:text-blue-300"
                >
                  View Team Details
                  <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
