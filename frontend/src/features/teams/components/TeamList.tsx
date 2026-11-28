import type { Team } from "@uf-esports-hub/shared";
import { Arrow } from "../../../components/ui/Arrow";

type TeamListProps = {
  teams: Team[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function TeamList({ teams, isLoading = false, error = null, onRetry }: TeamListProps) {
  if (isLoading) {
    return <div role="status" className="team-panel">Loading teams...</div>;
  }
  if (error) {
    return (
      <div role="alert" className="team-panel team-error">
        <h2>Could not load teams</h2>
        <p className="team-description">{error}</p>
        {onRetry && <button type="button" className="team-button" onClick={onRetry}>Try again</button>}
      </div>
    );
  }
  if (teams.length === 0) {
    return (
      <div className="team-panel">
        <h2>No teams available yet</h2>
        <p className="team-description">Check back later to see new teams.</p>
      </div>
    );
  }
  return (
    <section aria-label="Available teams">
      <h2>Available Teams ({teams.length})</h2>
      <div className="team-grid">
        {teams.map((team) => (
          <article key={team.id} className="team-panel team-card">
            <p className="team-game">{team.game}</p>
            <h3>{team.name}</h3>
            <p className="team-description">{team.description || "No description available."}</p>
            <a href={`/teams/${encodeURIComponent(team.id)}`} className="team-detail-link">
              View Team Details <Arrow />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
