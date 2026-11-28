import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TeamCreatePage } from "../../src/pages/TeamCreatePage";
import { TeamCreateForm } from "../../src/features/teams/components/TeamCreateForm";

function isSubmitDisabled(html: string): boolean {
  const button = html.match(
    /<button\b[^>]*type="submit"[^>]*>/
  )?.[0];

  if (!button) {
    throw new Error("Submit button was not found");
  }

  return /\sdisabled(?:=|\s|>)/.test(button);
}

describe("PBI-8: Create Team Form", () => {
  test("displays the Create Team heading", () => {
    const html = renderToStaticMarkup(
      createElement(TeamCreatePage),
    );

    expect(html).toContain("Create your team");
    expect(html).toContain("Team Information");
  });

  test("displays all required form fields", () => {
    const html = renderToStaticMarkup(
      createElement(TeamCreateForm),
    );

    expect(html).toContain("Team Name");
    expect(html).toContain("Game");
    expect(html).toContain("Description");
  });

  test("includes a link back to Teams", () => {
    const html = renderToStaticMarkup(
      createElement(TeamCreatePage),
    );

    expect(html).toContain('href="/teams"');
    expect(html).toContain("Back to Teams");
  });

  test("disables submission for unauthorized users", () => {
    const html = renderToStaticMarkup(
      createElement(TeamCreateForm, {
        canCreate: false,
        onCreate: async () => ({ id: "11111111-1111-4111-8111-111111111111" }),
      }),
    );

    expect(isSubmitDisabled(html)).toBe(true);

    expect(html).toContain(
      "Only authorized team managers",
    );
  });

  test("disables submission when the API is not connected", () => {
    const html = renderToStaticMarkup(
      createElement(TeamCreateForm, {
        canCreate: true,
      }),
    );

    expect(isSubmitDisabled(html)).toBe(true);

    expect(html).toContain(
      "Team creation is unavailable",
    );
  });

  test("enables submission when manager access and a handler are provided", () => {
    const html = renderToStaticMarkup(
      createElement(TeamCreateForm, {
        canCreate: true,
        onCreate: async () => ({
          id: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(html).toContain(">Create Team</button>");
    expect(isSubmitDisabled(html)).toBe(false);
  });
});
