import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The browser only ever talks to its own origin; Vite forwards /api to the Express server.
const apiProxy = { "/api": `http://localhost:${process.env.API_PORT ?? 3001}` };

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
});
