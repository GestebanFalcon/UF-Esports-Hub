import type { BunPlugin } from "bun";
import { API_ORIGIN } from "../src/config/api";

export default {
  name: "api-origin",
  setup(build) {
    // Bun leaves unset public variables uninlined; browsers have no process global.
    build.config.define = {
      ...build.config.define,
      "process.env.BUN_PUBLIC_API_ORIGIN": JSON.stringify(API_ORIGIN),
    };
  },
} satisfies BunPlugin;
