import { serve } from "bun";
import index from "./index.html";

const server = serve({
  port: process.env.PORT ?? 5173,
  routes: { "/*": index },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`UF Esports Hub running at ${server.url}`);
