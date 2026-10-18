import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Keep Lovable's normal build independent of the external hosting target.
export default defineConfig({
  nitro: { preset: "vercel" },
  tanstackStart: { server: { entry: "server" } },
});