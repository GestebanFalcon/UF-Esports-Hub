import { TeamCreateForm } from "../features/teams/components/TeamCreateForm";
import "../styles/teams.css";

export function TeamCreatePage() {
  return (
    <main className="teams-page">
      <a href="/teams" className="team-back-link"><span aria-hidden="true">←</span> Back to Teams</a>
      <div className="teams-heading">
        <p className="section-number">UF ESPORTS HUB / CREATE TEAM</p>
        <h1>Create your team</h1>
        <p className="team-description">
          Build your esports team and connect with players who enjoy the same games.
        </p>
      </div>
      {/* Enable creation only after verified manager access and the team API are available. */}
      <TeamCreateForm />
    </main>
  );
}
