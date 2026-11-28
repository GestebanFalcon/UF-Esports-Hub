import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach } from "bun:test";

GlobalRegistrator.register({ url: "http://localhost:5173" });

// Register the DOM before Testing Library captures document for screen queries.
const { cleanup } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});
