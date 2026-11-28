import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const frontendDirectory = fileURLToPath(new URL("..", import.meta.url));

for (const [description, configuredOrigin, expectedOrigin] of [
  ["unset", undefined, "http://localhost:3001"],
  ["blank", "   ", "http://localhost:3001"],
  ["custom with trailing slashes", " https://api.example.test:8443/// ", "https://api.example.test:8443"],
] as const) {
  test(`uses the ${description} API origin in runtime clients and browser bundles`, () => {
    const configure = configuredOrigin === undefined
      ? "delete process.env.BUN_PUBLIC_API_ORIGIN;"
      : `process.env.BUN_PUBLIC_API_ORIGIN = ${JSON.stringify(configuredOrigin)};`;
    const result = Bun.spawnSync({
      cmd: [process.execPath, "--eval", `
        ${configure}
        const config = await import("./src/config/api");
        const { default: apiOrigin } = await import("./scripts/api-origin-plugin");
        const { runInNewContext } = await import("node:vm");
        const bundle = await Bun.build({
          entrypoints: ["./src/config/api.ts"],
          plugins: [apiOrigin],
          target: "browser",
          format: "cjs",
        });
        if (!bundle.success) throw new AggregateError(bundle.logs);
        const module = { exports: {} };
        runInNewContext(await bundle.outputs[0].text(), { module, exports: module.exports });
        const browser = module.exports;
        console.log(JSON.stringify({
          origin: config.API_ORIGIN,
          auth: config.AUTH_API_URL,
          profile: config.apiUrl("/api/me/profile"),
          teams: config.apiUrl("/api/teams"),
          browserOrigin: browser.API_ORIGIN,
          browserAuth: browser.AUTH_API_URL,
          browserProfile: browser.apiUrl("/api/me/profile"),
          browserTeams: browser.apiUrl("/api/teams"),
        }));
      `],
      cwd: frontendDirectory,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(new TextDecoder().decode(result.stdout))).toEqual({
      origin: expectedOrigin,
      auth: `${expectedOrigin}/api/auth`,
      profile: `${expectedOrigin}/api/me/profile`,
      teams: `${expectedOrigin}/api/teams`,
      browserOrigin: expectedOrigin,
      browserAuth: `${expectedOrigin}/api/auth`,
      browserProfile: `${expectedOrigin}/api/me/profile`,
      browserTeams: `${expectedOrigin}/api/teams`,
    });
  });
}
