import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";

import type { Team } from "@uf-esports-hub/shared";
import { TeamList } from "../../src/features/teams/components/TeamList";
import { TeamDetails } from "../../src/features/teams/components/TeamDetails";

const testTeam: Team = {
  id: "11111111-1111-4111-8111-111111111111",
  managerId: "22222222-2222-4222-8222-222222222222",
  name: "Gator Test Team",
  game: "Rocket League",
  description: "A test team for UF Esports Hub.",
};

describe("View Teams Page", () => {
  test("shows a message when no teams are available", () => {
    const html = renderToStaticMarkup(
      createElement(TeamList, { teams: [] }),
    );

    expect(html).toContain("No teams available yet");
  });

  test("displays a team from the supplied data", () => {
    const html = renderToStaticMarkup(
      createElement(TeamList, { teams: [testTeam] }),
    );

    expect(html).toContain("Gator Test Team");
    expect(html).toContain("Rocket League");
    expect(html).toContain(
      "A test team for UF Esports Hub.",
    );
  });

  test("creates a link to the team's details", () => {
    const html = renderToStaticMarkup(
      createElement(TeamList, { teams: [testTeam] }),
    );

    expect(html).toContain("/teams/11111111-1111-4111-8111-111111111111");
    expect(html).toContain("View Team Details");
  });

  test("shows the loading message", () => {
    const html = renderToStaticMarkup(
      createElement(TeamList, {
        teams: [],
        isLoading: true,
      }),
    );

    expect(html).toContain("Loading teams...");
  });

  test("shows an error when teams cannot load", () => {
    const html = renderToStaticMarkup(
      createElement(TeamList, {
        teams: [],
        error: "Unable to fetch teams.",
      }),
    );

    expect(html).toContain("Could not load teams");
    expect(html).toContain("Unable to fetch teams.");
  });

  test("retries a failed team list request", () => {
    let retries = 0;
    render(<TeamList teams={[]} error="Unable to fetch teams." onRetry={() => { retries++; }} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retries).toBe(1);
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
  });

  test("retries a failed team detail request", () => {
    let retries = 0;
    render(<TeamDetails team={null} error="Unable to fetch team." onRetry={() => { retries++; }} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retries).toBe(1);
  });
});
