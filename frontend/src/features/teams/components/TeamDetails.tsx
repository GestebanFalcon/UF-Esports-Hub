import type { Team } from "@uf-esports-hub/shared";

type TeamDetailsProps = {
  team: Team | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function TeamDetails({ team, isLoading = false, error = null, onRetry }: TeamDetailsProps) {
  if (isLoading) {
    return <div role="status" className="team-panel">Loading team details...</div>;
  }
  if (error) {
    return (
      <div role="alert" className="team-panel team-error">
        <h1>Could not load team</h1>
        <p className="team-description">{error}</p>
        {onRetry && <button type="button" className="team-button" onClick={onRetry}>Try again</button>}
      </div>
    );
  }
  if (!team) {
    return (
      <div className="team-panel">
        <h1>Team not found</h1>
        <p className="team-description">This team may no longer be available.</p>
      </div>
    );
  }
  return (
    <section aria-labelledby="team-name-heading">
      <div className="teams-heading">
        <p className="section-number">UF ESPORTS HUB / TEAM DETAILS</p>
        <h1 id="team-name-heading">{team.name}</h1>
      </div>
      <div className="team-panel">
        <h2>Team Information</h2>
        <dl className="team-information">
          <dt>Game</dt>
          <dd>{team.game}</dd>
          <dt>Description</dt>
          <dd className="team-description">{team.description || "No description available."}</dd>
        </dl>
      </div>
    </section>
  );
}
