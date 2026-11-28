import { TeamDetails } from "../features/teams/components/TeamDetails";
import "../styles/teams.css";

export function TeamDetailsPage() {
  return (
    <main className="teams-page">
      <a href="/teams" className="team-back-link"><span aria-hidden="true">←</span> Back to Teams</a>
      {/* A missing API connection must not be presented as a missing team. */}
      <TeamDetails team={null} error="Team details are unavailable right now. Please try again later." />
    </main>
  );
}
