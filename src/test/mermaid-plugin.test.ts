import { describe, expect, it, vi } from "vitest";
import { createLazyMermaidPlugin } from "@/lib/mermaid-plugin";

describe("lazy Mermaid dependency isolation", () => {
  it("does not initialize graph dependencies when opening a text answer", () => {
    const load = vi.fn(() => import("@streamdown/mermaid"));
    const plugin = createLazyMermaidPlugin(load);
    plugin.getMermaid({ theme: "dark" });
    expect(load).not.toHaveBeenCalled();
  });

  it("loads on diagram render and forwards the configuration and source", async () => {
    const render = vi.fn().mockResolvedValue({ svg: "<svg></svg>" });
    const getMermaid = vi.fn().mockReturnValue({ render });
    const load = vi.fn().mockResolvedValue({ mermaid: { getMermaid } });
    const instance = createLazyMermaidPlugin(load).getMermaid({ theme: "dark" });
    await expect(instance.render("diagram-1", "graph TD; A-->B")).resolves.toEqual({ svg: "<svg></svg>" });
    await instance.render("diagram-2", "graph TD; B-->C");
    expect(load).toHaveBeenCalledTimes(1);
    expect(getMermaid).toHaveBeenCalledWith({ theme: "dark" });
    expect(render).toHaveBeenCalledWith("diagram-1", "graph TD; A-->B");
  });

  it("isolates import failure to rendering and allows a subsequent retry", async () => {
    const error = new TypeError('can\'t access property "for", r is undefined');
    const render = vi.fn().mockResolvedValue({ svg: "<svg></svg>" });
    const load = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({ mermaid: { getMermaid: () => ({ render }) } });
    const plugin = createLazyMermaidPlugin(load);
    const instance = plugin.getMermaid();
    await expect(instance.render("failed", "graph TD; A-->B")).rejects.toThrow(error);
    expect(() => plugin.getMermaid()).not.toThrow();
    await expect(instance.render("retry", "graph TD; A-->B")).resolves.toEqual({ svg: "<svg></svg>" });
  });
});