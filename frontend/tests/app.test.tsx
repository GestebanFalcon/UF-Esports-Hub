import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "../src/app/App";
import { authClient } from "../src/features/auth/client";

beforeEach(() => {
  authClient.logout();
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  cleanup();
  mock.restore();
  authClient.logout();
});

async function renderApp() {
  await act(async () => { render(<App />); });
}

describe("application routes after the team merge", () => {
  for (const [path, heading] of [
    ["/", "Find your people. Play your game."],
    ["/login", /^Log in to the hub\s*\.$/],
    ["/register", /^Create your account\s*\.$/],
    ["/profile", /^Player profile\s*\.$/],
    ["/profile/edit", /^Edit player profile\s*\.$/],
    ["/teams", "Find your team"],
    ["/teams/", "Find your team"],
    ["/teams/create", "Create your team"],
    ["/teams/create/", "Create your team"],
    ["/teams/11111111-1111-4111-8111-111111111111", "Could not load team"],
    ["/missing", "This page isn’t in play."],
    ["/teams/example/nested", "This page isn’t in play."],
  ] as const) {
    test(`renders ${path}`, async () => {
      window.history.replaceState({}, "", path);
      await renderApp();
      expect(await screen.findByRole("heading", { name: heading })).toBeTruthy();
    });
  }

  test("keeps Teams active across its routes and links list to creation", async () => {
    window.history.replaceState({}, "", "/teams");
    await renderApp();
    expect(screen.getByRole("link", { name: "Teams" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Create a team" }).getAttribute("href")).toBe("/teams/create");

    act(() => {
      window.history.pushState({}, "", "/teams/create");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("heading", { name: "Create your team" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Teams" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Back to Teams" }).getAttribute("href")).toBe("/teams");
    expect((screen.getByRole("button", { name: "Create Team" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("does not present an unavailable team API as an empty collection or missing team", async () => {
    window.history.replaceState({}, "", "/teams");
    await renderApp();
    expect(screen.getByRole("alert").textContent).toContain("Teams are unavailable");
    expect(screen.queryByText("No teams available yet")).toBeNull();

    act(() => {
      window.history.pushState({}, "", "/teams/11111111-1111-4111-8111-111111111111");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("alert").textContent).toContain("Team details are unavailable");
    expect(screen.queryByText("Team not found")).toBeNull();
    expect(screen.getByRole("link", { name: "Back to Teams" }).getAttribute("href")).toBe("/teams");
  });

  test("browser navigation still selects profile editing after visiting Teams", async () => {
    window.history.replaceState({}, "", "/teams");
    await renderApp();
    act(() => {
      window.history.pushState({}, "", "/profile/edit");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("heading", { name: /^Edit player profile\s*\.$/ })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Player profile" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Teams" }).getAttribute("aria-current")).toBeNull();
  });

  test("restores the signed-in header on Teams and retains logout", async () => {
    const user = {
      id: "b48653da-1234-4567-89ab-123456789abc",
      username: "Gator",
      email: "player@ufl.edu",
      createdAt: "2026-10-20T12:00:00Z",
      updatedAt: "2026-10-20T12:00:00Z",
    };
    const request = spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({
      user, accessToken: "test-token", tokenType: "Bearer", expiresIn: 900,
    }));
    await authClient.login({ email: user.email, password: "password123" });
    request.mockResolvedValue(Response.json({ user }));
    window.history.replaceState({}, "", "/teams");
    await renderApp();
    expect(await screen.findByText("Signed in as Gator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(authClient.getSnapshot()).toBeNull();
    expect(screen.getByRole("link", { name: "Log in" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("You have been logged out");
  });
});
