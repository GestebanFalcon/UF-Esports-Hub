
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import TeamsPage, {
  type TeamSummary,
} from "./Teams_Page";
import TeamDetails from "./Teams_Detailed";

// Sample team used only for automated testing
const testTeam: TeamSummary = {
  id: "test-team-1",
  name: "Gator Test Team",
  game: "Rocket League",
  description: "A test team for UF Esports Hub.",
};

describe("View Teams Page", () => {
  test("shows a message when no teams are available", () => {
    const html = renderToStaticMarkup(
      createElement(TeamsPage, { teams: [] }),
    );

    expect(html).toContain("No teams available yet");
  });

  test("displays a team from the supplied data", () => {
    const html = renderToStaticMarkup(
      createElement(TeamsPage, { teams: [testTeam] }),
    );

    expect(html).toContain("Gator Test Team");
    expect(html).toContain("Rocket League");
    expect(html).toContain(
      "A test team for UF Esports Hub.",
    );
  });

  test("creates a link to the team's details", () => {
    const html = renderToStaticMarkup(
      createElement(TeamsPage, { teams: [testTeam] }),
    );

    expect(html).toContain("/teams/test-team-1");
    expect(html).toContain("View Team Details");
  });

  test("shows the loading message", () => {
    const html = renderToStaticMarkup(
      createElement(TeamsPage, {
        teams: [],
        isLoading: true,
      }),
    );

    expect(html).toContain("Loading teams...");
  });

  test("shows an error when teams cannot load", () => {
    const html = renderToStaticMarkup(
      createElement(TeamsPage, {
        teams: [],
        error: "Unable to fetch teams.",
      }),
    );

    expect(html).toContain("Could not load teams");
    expect(html).toContain("Unable to fetch teams.");
  });
});

describe("Team Details Page", () => {
  test("displays the selected team's information", () => {
    const html = renderToStaticMarkup(
      createElement(TeamDetails, { team: testTeam }),
    );

    expect(html).toContain("Gator Test Team");
    expect(html).toContain("Rocket League");
    expect(html).toContain(
      "A test team for UF Esports Hub.",
    );
  });

  test("shows a message when the team is missing", () => {
    const html = renderToStaticMarkup(
      createElement(TeamDetails, { team: null }),
    );

    expect(html).toContain("Team not found");
    expect(html).toContain("Back to Teams");
  });
});
