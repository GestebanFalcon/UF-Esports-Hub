import { describe, expect, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { TeamCreate } from "@uf-esports-hub/shared";
import { TeamCreateForm } from "../../src/features/teams/components/TeamCreateForm";

describe("PBI-8: Team Creation Interactions", () => {
  test("shows errors when required fields are empty", async () => {
    const user = userEvent.setup();

    render(
      <TeamCreateForm
        canCreate={true}
        onCreate={async () => ({ id: "11111111-1111-4111-8111-111111111111" })}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Create Team" })
    );

    expect(
      await screen.findByText("Please enter a team name.")
    ).toBeTruthy();

    expect(
      screen.getByText("Please enter a game.")
    ).toBeTruthy();
  });

  test("submits valid team information", async () => {
    const user = userEvent.setup();

    const submittedValues: TeamCreate[] = [];
    let createdId: string | null = null;

    render(
      <TeamCreateForm
        canCreate={true}
        onCreate={async (values) => {
          submittedValues.push(values);
          return { id: "22222222-2222-4222-8222-222222222222" };
        }}
        onCreated={(id) => {
          createdId = id;
        }}
      />
    );

    await user.type(
      screen.getByLabelText("Team Name *"),
      "Gator Esports"
    );

    await user.type(
      screen.getByLabelText("Game *"),
      "Rocket League"
    );

    await user.type(
      screen.getByLabelText("Description"),
      "A competitive UF esports team."
    );

    await user.click(
      screen.getByRole("button", { name: "Create Team" })
    );

    await waitFor(() => {
      expect(createdId).toBe("22222222-2222-4222-8222-222222222222");
    });

    expect(submittedValues).toEqual([
      {
        name: "Gator Esports",
        game: "Rocket League",
        description: "A competitive UF esports team.",
      },
    ]);
  });

  test("shows a conflict error and preserves entered values", async () => {
    const user = userEvent.setup();

    render(
      <TeamCreateForm
        canCreate={true}
        onCreate={async () => {
          throw { status: 409 };
        }}
      />
    );

    const nameInput = screen.getByLabelText(
      "Team Name *"
    ) as HTMLInputElement;

    const gameInput = screen.getByLabelText(
      "Game *"
    ) as HTMLInputElement;

    await user.type(nameInput, "Existing Team");
    await user.type(gameInput, "Valorant");

    await user.click(
      screen.getByRole("button", { name: "Create Team" })
    );

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain(
      "A team with this information already exists."
    );

    expect(nameInput.value).toBe("Existing Team");
    expect(gameInput.value).toBe("Valorant");
  });
});
