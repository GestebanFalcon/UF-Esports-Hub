import { TeamList } from "../features/teams/components/TeamList";
import { Arrow } from "../components/ui/Arrow";
import "../styles/teams.css";

export function TeamsPage() {
  return (
    <main className="teams-page">
      <div className="teams-heading">
        <p className="section-number">UF ESPORTS HUB / TEAMS</p>
        <h1>Find your team</h1>
        <p className="team-description">
          Browse esports teams at UF and find one that matches the games you enjoy playing.
        </p>
        <a href="/teams/create" className="team-detail-link">Create a team <Arrow /></a>
      </div>
      {/* Replace the unavailable state when the authenticated team routes are mounted. */}
      <TeamList teams={[]} error="Teams are unavailable right now. Please try again later." />
    </main>
  );
}
