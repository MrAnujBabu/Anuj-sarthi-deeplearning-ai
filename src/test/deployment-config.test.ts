import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("root deployment configuration", () => {
  it("builds the root app with a separate Vercel preset", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.framework).toBe("tanstack-start");
    expect(config.buildCommand).toBe("bun run build:vercel");
    expect(pkg.scripts["build:vercel"]).toBe("vite build --config vite.vercel.config.ts");
    expect(config.outputDirectory).toBeUndefined();
    expect(readFileSync("vite.vercel.config.ts", "utf8")).toContain('preset: "vercel"');
    expect(readFileSync("vite.config.ts", "utf8")).not.toContain('preset: "vercel"');
  });
});