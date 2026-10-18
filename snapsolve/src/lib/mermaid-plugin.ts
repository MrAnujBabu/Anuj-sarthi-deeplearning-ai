import type { DiagramPlugin, MermaidConfig } from "@streamdown/mermaid";

// Mermaid's graph dependencies must not execute while a chat route initializes.
// Load them only when a Mermaid code block is actually rendered. Streamdown
// handles a rejected render locally, leaving the rest of the answer readable.
export function createLazyMermaidPlugin(
  load = () => import("@streamdown/mermaid"),
): DiagramPlugin {
  let config: MermaidConfig = {};
  let pending: ReturnType<typeof load> | undefined;
  const instance = {
    initialize(next: MermaidConfig) {
      config = { ...config, ...next };
    },
    async render(id: string, source: string) {
      pending ??= load().catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
      const { mermaid } = await pending;
      return mermaid.getMermaid(config).render(id, source);
    },
  };
  return {
    name: "mermaid",
    type: "diagram",
    language: "mermaid",
    getMermaid(next) {
      if (next) instance.initialize(next);
      return instance;
    },
  };
}

export const lazyMermaid = createLazyMermaidPlugin();