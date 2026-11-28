import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { teamFieldLimits } from "@uf-esports-hub/shared";
import { TeamCreateForm } from "../../src/features/teams/components/TeamCreateForm";

const teamId = "11111111-1111-4111-8111-111111111111";

function fillForm(name = "Gator Gaming", game = "Valorant", description = "") {
  fireEvent.change(screen.getByLabelText("Team Name *"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Game *"), { target: { value: game } });
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: description } });
}

function submitForm() {
  const button = screen.getByRole("button", { name: "Create Team" });
  fireEvent.submit(button.closest("form")!);
}

describe("team form shared contracts", () => {
  for (const [field, label] of [
    ["name", "Team Name *"],
    ["game", "Game *"],
    ["description", "Description"],
  ] as const) {
    test(`rejects ${field} over the shared length limit`, () => {
      const onCreate = mock(async () => ({ id: teamId }));
      render(<TeamCreateForm canCreate onCreate={onCreate} />);
      fillForm();
      fireEvent.change(screen.getByLabelText(label), {
        target: { value: "x".repeat(teamFieldLimits[field] + 1) },
      });
      submitForm();

      const input = screen.getByLabelText(label);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBeTruthy();
      expect(onCreate).not.toHaveBeenCalled();
    });
  }

  test("trims writes, accepts all field limits, and navigates to the created team", async () => {
    const onCreate = mock(async () => ({ id: teamId }));
    const onCreated = mock();
    render(<TeamCreateForm canCreate onCreate={onCreate} onCreated={onCreated} />);
    const values = {
      name: "n".repeat(teamFieldLimits.name),
      game: "g".repeat(teamFieldLimits.game),
      description: "d".repeat(teamFieldLimits.description),
    };
    fillForm(` ${values.name} `, ` ${values.game} `, ` ${values.description} `);
    submitForm();

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(teamId));
    expect(onCreate).toHaveBeenCalledWith(values);
  });

  test("submits an empty description as required by the shared create contract", async () => {
    const onCreate = mock(async () => ({ id: teamId }));
    const onCreated = mock();
    render(<TeamCreateForm canCreate onCreate={onCreate} onCreated={onCreated} />);
    fillForm();
    submitForm();

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(teamId));
    expect(onCreate).toHaveBeenCalledWith({ name: "Gator Gaming", game: "Valorant", description: "" });
  });

  test("does not navigate when the creation handler returns an invalid ID", async () => {
    const onCreated = mock();
    render(<TeamCreateForm canCreate onCreate={async () => ({ id: "invalid" })} onCreated={onCreated} />);
    fillForm();
    submitForm();

    expect((await screen.findByRole("alert")).textContent).toContain("Something went wrong");
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Team Name *") as HTMLInputElement).value).toBe("Gator Gaming");
  });

  test("displays server field errors while retaining the draft", async () => {
    render(<TeamCreateForm canCreate onCreate={async () => {
      throw { status: 400, message: "Invalid team", fieldErrors: { name: ["Name unavailable"] } };
    }} />);
    fillForm();
    submitForm();

    expect(await screen.findByText("Name unavailable")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Please review your team information");
    expect((screen.getByLabelText("Team Name *") as HTMLInputElement).value).toBe("Gator Gaming");
  });

  test("blocks submission events when manager access is unavailable", () => {
    const onCreate = mock(async () => ({ id: teamId }));
    render(<TeamCreateForm onCreate={onCreate} />);
    fillForm();
    submitForm();
    expect(onCreate).not.toHaveBeenCalled();
  });

  test("blocks simultaneous form submissions until the request finishes", async () => {
    let finish!: (result: { id: string }) => void;
    const pending = new Promise<{ id: string }>((resolve) => { finish = resolve; });
    const onCreate = mock(() => pending);
    const onCreated = mock();
    render(<TeamCreateForm canCreate onCreate={onCreate} onCreated={onCreated} />);
    fillForm();
    const form = screen.getByRole("button", { name: "Create Team" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onCreate).toHaveBeenCalledTimes(1);

    finish({ id: teamId });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(teamId));
  });
});
