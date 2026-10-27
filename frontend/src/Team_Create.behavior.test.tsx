
import { describe, expect, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CreateTeam from "./Team_Create";

describe("PBI-8: Team Creation Behavior", () => {
  test("prevents duplicate submissions while creating a team", async () => {
    const user = userEvent.setup();

    let requestCount = 0;
    let createdId = "";

    let finishRequest: (result: { id: string }) => void =
      () => {};

    const pendingRequest = new Promise<{ id: string }>(
      (resolve) => {
        finishRequest = resolve;
      }
    );

    render(
      <CreateTeam
        canCreate={true}
        onCreate={async () => {
          requestCount++;
          return pendingRequest;
        }}
        onCreated={(id) => {
          createdId = id;
        }}
      />
    );

    await user.type(
      screen.getByLabelText("Team Name *"),
      "UF Rocket League"
    );

    await user.type(
      screen.getByLabelText("Game *"),
      "Rocket League"
    );

    await user.click(
      screen.getByRole("button", { name: "Create Team" })
    );

    const pendingButton = screen.getByRole("button", {
      name: "Creating Team...",
    }) as HTMLButtonElement;

    expect(pendingButton.disabled).toBe(true);
    expect(requestCount).toBe(1);

    await user.click(pendingButton);

    expect(requestCount).toBe(1);

    finishRequest({ id: "team-456" });

    await waitFor(() => {
      expect(createdId).toBe("team-456");
    });
  });

  test("shows permission errors and preserves form values", async () => {
    const user = userEvent.setup();

    render(
      <CreateTeam
        canCreate={true}
        onCreate={async () => {
          throw { status: 403 };
        }}
      />
    );

    const nameInput = screen.getByLabelText(
      "Team Name *"
    ) as HTMLInputElement;

    const gameInput = screen.getByLabelText(
      "Game *"
    ) as HTMLInputElement;

    await user.type(nameInput, "Gator Gaming");
    await user.type(gameInput, "Valorant");

    await user.click(
      screen.getByRole("button", { name: "Create Team" })
    );

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain(
      "You do not have permission to create a team."
    );

    expect(nameInput.value).toBe("Gator Gaming");
    expect(gameInput.value).toBe("Valorant");
  });
});
